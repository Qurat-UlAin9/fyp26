// Run with:  node --test backend/tests/reschedule.test.js
// End-to-end test of getPlanningContext + rescheduleMissedForUser against an in-memory fake database.
// Supabase and the LLM client are stubbed, so no network, keys or extra packages are needed.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// ---- tiny in-memory stand-in for supabaseAdmin -------------------------------------------------
const tables = {};
function fakeFrom(table) {
  const filters = [];
  const state = { op: 'select', patch: null };
  const run = () => {
    const rows = (tables[table] || []).filter((r) => filters.every((f) => f(r)));
    if (state.op === 'update') rows.forEach((r) => Object.assign(r, state.patch));
    return { data: rows, error: null };
  };
  const api = {
    select: () => api,
    eq: (c, v) => { filters.push((r) => r[c] === v); return api; },
    neq: (c, v) => { filters.push((r) => r[c] !== v); return api; },
    gte: (c, v) => { filters.push((r) => r[c] >= v); return api; },
    update: (patch) => { state.op = 'update'; state.patch = patch; return api; },
    maybeSingle: async () => ({ data: run().data[0] || null, error: null }),
    then: (res, rej) => Promise.resolve(run()).then(res, rej),
  };
  return api;
}
const stub = (rel, exports) => {
  const file = require.resolve(path.join('..', rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
};
stub('config/supabase.js', { supabaseAdmin: { from: fakeFrom } });
stub('services/ai/llmProvider.js', { createChatModel: () => ({ invoke: async () => { throw new Error('no model in tests'); } }) });

const time = require('../services/ai/context/timeContext');
const { getPlanningContext, rescheduleMissedForUser } = require('../services/ai/subtaskPlanner');

const TZ = 'Asia/Karachi';
const U = 'user-1';
const iso = (n) => time.addDaysISO(time.nowInTz(TZ).iso, n);
const step = (id, title, date, hour, extra = {}) => ({ id, title, done: false, kind: 'do', scheduledDate: date, scheduledHour: hour, durationMins: 20, ...extra });

function reset() {
  Object.keys(tables).forEach((k) => delete tables[k]);
  tables.adhd_profile = [{ user_id: U, preferred_focus_length: 25 }];
  tables.user_preferences = [{ user_id: U, task_window_start: 19, task_window_end: 21 }];
  tables.focus_sessions = [];
  tables.habits = [
    { user_id: U, active: true, frequency: 'Daily', metadata: { timeSlots: ['Evening'], slotTimes: { Evening: '19:00' }, durationMins: 10 } },
  ];
  tables.tasks = [
    {
      id: 'A', user_id: U, title: 'Essay', status: 'Pending', due_date: iso(6),
      metadata: { subtasks: [
        step('a0', 'done already', iso(-3), 19, { done: true }),
        step('a1', 'missed one', iso(-1), 19),
        step('a2', 'missed two', iso(-1), 19.5),
        step('a3', 'future one', iso(3), 19),
      ] },
    },
    {
      id: 'B', user_id: U, title: 'Lab report', status: 'Pending', due_date: iso(2),
      metadata: { subtasks: [step('b1', 'missed b', iso(-2), 19), step('b2', 'later b', iso(1), 19)] },
    },
    {
      id: 'C', user_id: U, title: 'Nothing missed', status: 'Pending', due_date: iso(4),
      metadata: { subtasks: [step('c1', 'on track', iso(2), 20)] },
    },
    { id: 'D', user_id: U, title: 'Finished', status: 'Completed', due_date: iso(-9), metadata: { subtasks: [step('d1', 'old', iso(-9), 19, { done: true })] } },
  ];
}

test('planning context reads window, habits and busy steps', async () => {
  reset();
  const plan = await getPlanningContext(U, TZ, { excludeTaskId: 'A' });
  assert.deepEqual(plan.window, { start: 19, end: 21 });
  assert.equal(plan.maxSession, 25);
  assert.equal(plan.habitBlocks.length, 1);
  assert.equal(plan.habitBlocks[0].start, 19);
  // A is excluded; B and C are open with future steps
  assert.ok(plan.busy.some((b) => b.date === iso(1)));
  assert.ok(!plan.busy.some((b) => b.date === iso(3)), 'excluded task must not count as busy');
});

test('a 1-hour window caps the step length', async () => {
  reset();
  tables.user_preferences[0].task_window_start = 19;
  tables.user_preferences[0].task_window_end = 19.25;
  const plan = await getPlanningContext(U, TZ);
  assert.equal(plan.window.end - plan.window.start >= 0.5, true); // 15 min window is invalid -> default
  assert.deepEqual(plan.window, { start: 18, end: 22 });
});

test('missing preferences row or columns falls back to 6-10 PM', async () => {
  reset();
  tables.user_preferences = [];
  assert.deepEqual((await getPlanningContext(U, TZ)).window, { start: 18, end: 22 });
  tables.user_preferences = [{ user_id: U, theme: 'dark' }];
  assert.deepEqual((await getPlanningContext(U, TZ)).window, { start: 18, end: 22 });
});

test('reschedule moves missed steps into the future, keeps order, leaves done and finished tasks alone', async () => {
  reset();
  const now = time.nowInTz(TZ);
  const nowHour = now.hour + now.minute / 60;
  const doneBefore = JSON.stringify(tables.tasks[0].metadata.subtasks[0]);
  const cBefore = JSON.stringify(tables.tasks[2]);
  const dBefore = JSON.stringify(tables.tasks[3]);

  const res = await rescheduleMissedForUser(U, TZ);

  assert.equal(res.moved, 3); // a1, a2, b1
  assert.deepEqual(res.tasks.map((t) => t.taskId), ['B', 'A']); // earliest deadline first
  res.tasks.forEach((t) => assert.equal(t.overdue, false));

  const A = tables.tasks[0].metadata.subtasks;
  const B = tables.tasks[1].metadata.subtasks;
  assert.equal(JSON.stringify(A[0]), doneBefore, 'done step untouched');
  assert.equal(JSON.stringify(tables.tasks[2]), cBefore, 'task without missed steps untouched');
  assert.equal(JSON.stringify(tables.tasks[3]), dBefore, 'completed task untouched');

  const when = (s) => s.scheduledDate + ' ' + s.scheduledHour.toFixed(2).padStart(5, '0');
  [A.slice(1), B].forEach((list) => {
    list.forEach((s) => {
      const future = s.scheduledDate > now.iso || (s.scheduledDate === now.iso && s.scheduledHour >= nowHour + 0.49);
      assert.ok(future, `${s.title} must be in the future, got ${when(s)}`);
      assert.ok(s.scheduledHour >= 19 - 1e-9 || res.tasks.length === 0, 'inside the 7-9 PM window unless the plan had to stretch');
    });
    for (let i = 1; i < list.length; i++) assert.ok(when(list[i - 1]) <= when(list[i]), 'order kept');
  });

  // reasons and counters
  assert.equal(A[1].rescheduledReason, 'missed');
  assert.equal(A[1].rescheduleCount, 1);
  assert.equal(A[3].rescheduledReason, 'replanned'); // not missed, but moved to keep order
  assert.equal(A[3].rescheduleCount || 0, 0);
  // ids and titles preserved
  assert.deepEqual(A.map((s) => s.id), ['a0', 'a1', 'a2', 'a3']);
  assert.deepEqual(B.map((s) => s.title), ['missed b', 'later b']);

  // nothing lands on the habit at 19:00 on any day
  [...A.slice(1), ...B].forEach((s) => {
    const clash = s.scheduledHour < 19 + 10 / 60 + 0.25 && 19 < s.scheduledHour + s.durationMins / 60 + 0.25;
    assert.equal(clash, false, `${s.title} clashes with the 19:00 habit`);
  });
});

test('running it twice changes nothing the second time', async () => {
  reset();
  await rescheduleMissedForUser(U, TZ);
  const snapshot = JSON.stringify(tables.tasks);
  const second = await rescheduleMissedForUser(U, TZ);
  assert.equal(second.moved, 0);
  assert.deepEqual(second.tasks, []);
  assert.equal(JSON.stringify(tables.tasks), snapshot);
});

test('an overdue task is re-planned without crashing and is flagged', async () => {
  reset();
  tables.tasks = [
    { id: 'X', user_id: U, title: 'Late', status: 'Pending', due_date: iso(-2), metadata: { subtasks: [step('x1', 'one', iso(-3), 19), step('x2', 'two', iso(-3), 19.5)] } },
  ];
  const res = await rescheduleMissedForUser(U, TZ);
  assert.equal(res.moved, 2);
  assert.equal(res.tasks[0].overdue, true);
  tables.tasks[0].metadata.subtasks.forEach((s) => assert.ok(s.scheduledDate >= time.nowInTz(TZ).iso));
});
