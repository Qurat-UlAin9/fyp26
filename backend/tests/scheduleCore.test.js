// Run with:  node --test backend/tests/scheduleCore.test.js
// Uses Node's built-in test runner -- no extra packages needed.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  scheduleSteps,
  estimateAvailableMinutes,
  describeSchedule,
  isMissedStep,
  normalizeWindow,
} = require('../services/ai/scheduleCore');
const {
  parseHHMM,
  formatHHMM,
  slotForHour,
  habitBlocksFromRows,
} = require('../services/ai/habitTimes');

const mk = (minutesList) => minutesList.map((m, i) => ({ title: `step ${i + 1}`, minutes: m, kind: 'do' }));
const stamp = (it) => `${it.scheduledDate} ${it.scheduledHour.toFixed(2).padStart(5, '0')}`;
const overlap = (a, b) => a.start < b.end && b.start < a.end;

// Properties every schedule must satisfy
function checkInvariants(res, { habitBlocks = [], deadline, label = '' } = {}) {
  const byDay = {};
  res.items.forEach((it) => {
    assert.ok(it.scheduledHour * 4 === Math.round(it.scheduledHour * 4) || res.mode === 'overloaded', `${label} not on 15 min grid`);
    (byDay[it.scheduledDate] ||= []).push({ start: it.scheduledHour, end: it.scheduledHour + it.durationMins / 60 });
  });
  if (res.mode !== 'overloaded') {
    Object.values(byDay).forEach((slots) => {
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          assert.ok(!overlap(slots[i], slots[j]), `${label} steps overlap each other`);
        }
        habitBlocks.forEach((h) => assert.ok(!overlap(slots[i], h), `${label} step overlaps a habit`));
      }
    });
    for (let i = 1; i < res.items.length; i++) {
      assert.ok(stamp(res.items[i - 1]) <= stamp(res.items[i]), `${label} order broken`);
    }
  }
  if (res.mode === 'normal' || res.mode === 'stretched') {
    res.items.forEach((it) => {
      assert.ok(it.scheduledHour >= res.window.start - 1e-9, `${label} before window`);
      assert.ok(it.scheduledHour + it.durationMins / 60 <= res.window.end + 1e-9, `${label} after window`);
      if (deadline) assert.ok(it.scheduledDate <= deadline, `${label} after deadline`);
    });
  }
}

test('normal plan: inside 6-10 PM, spare day kept, daily limits respected', () => {
  const res = scheduleSteps(mk([10, 20, 25, 20, 15]), { today: '2026-11-24', nowHour: 4.5, deadline: '2026-12-01' });
  assert.equal(res.mode, 'normal');
  assert.equal(res.tight, false);
  assert.equal(res.items.length, 5);
  checkInvariants(res, { deadline: '2026-11-30', label: 'normal' }); // 30th = spare day before the 1st
  const perDay = {};
  res.items.forEach((it) => {
    perDay[it.scheduledDate] = perDay[it.scheduledDate] || { n: 0, m: 0 };
    perDay[it.scheduledDate].n += 1;
    perDay[it.scheduledDate].m += it.durationMins;
  });
  Object.values(perDay).forEach((d) => { assert.ok(d.n <= 3); assert.ok(d.m <= 90); });
  assert.equal(res.items[0].scheduledDate, '2026-11-24'); // first step starts today, not later
});

test('steps never sit on a habit', () => {
  const habitBlocks = [{ start: 18, end: 18 + 10 / 60 }, { start: 21, end: 21 + 10 / 60 }];
  const res = scheduleSteps(mk([10, 25, 25, 25, 20, 15]), { today: '2026-11-24', nowHour: 9, deadline: '2026-12-03', habitBlocks });
  assert.equal(res.mode, 'normal');
  checkInvariants(res, { habitBlocks, label: 'habits' });
});

test('user prefers only a 1 hour slot: everything fits inside it, limits shown when too much', () => {
  const opts = { today: '2026-11-24', nowHour: 9, windowStart: 19, windowEnd: 20 };
  const easy = scheduleSteps(mk([10, 20, 25]), { ...opts, deadline: '2026-12-10' });
  assert.equal(easy.mode, 'normal');
  checkInvariants(easy, { label: '1h easy' });
  easy.items.forEach((it) => assert.ok(it.scheduledHour >= 19 && it.scheduledHour + it.durationMins / 60 <= 20 + 1e-9));

  // 6 steps of 25 min (150 min) but only 2 days x 1h before the deadline
  const hard = scheduleSteps(mk([25, 25, 25, 25, 25, 25]), { ...opts, deadline: '2026-11-26' });
  assert.notEqual(hard.mode, 'normal');
  assert.equal(hard.tight, true);
  assert.match(describeSchedule(hard, { deadline: '2026-11-26' }), /HEADS UP/);
  assert.match(describeSchedule(hard, { deadline: '2026-11-26' }), /longer daily time window/);
});

test('a step is never longer than the window', () => {
  const res = scheduleSteps(mk([45]), { today: '2026-11-24', nowHour: 9, deadline: '2026-11-30', windowStart: 19, windowEnd: 19.5 });
  assert.equal(res.items[0].durationMins, 30);
});

test('tight deadline: relaxes in stages and says so', () => {
  const res = scheduleSteps(mk([10, 25, 25, 25, 25, 25, 25, 25]), { today: '2026-11-24', nowHour: 9, deadline: '2026-11-25' });
  assert.ok(['stretched', 'extended', 'overloaded'].includes(res.mode), res.mode);
  assert.equal(res.tight, true);
  assert.ok(describeSchedule(res, { deadline: '2026-11-25' }).includes('HEADS UP'));
});

test('deadline today with the window still ahead: places steps today', () => {
  const res = scheduleSteps(mk([10, 15, 15]), { today: '2026-11-24', nowHour: 15, deadline: '2026-11-24' });
  assert.ok(res.items.every((it) => it.scheduledDate === '2026-11-24'));
  checkInvariants(res, { label: 'today' });
});

test('deadline today but the evening is over: honest overloaded/extended result, never a crash', () => {
  const res = scheduleSteps(mk([10, 15, 15]), { today: '2026-11-24', nowHour: 23.2, deadline: '2026-11-24' });
  assert.equal(res.items.length, 3);
  assert.equal(res.tight, true);
  assert.equal(res.pastDeadline, true);
});

test('other tasks already using a day are respected', () => {
  const busy = [
    { date: '2026-11-24', hour: 18, minutes: 25 },
    { date: '2026-11-24', hour: 19, minutes: 25 },
    { date: '2026-11-24', hour: 20, minutes: 25 },
  ];
  const res = scheduleSteps(mk([10, 20]), { today: '2026-11-24', nowHour: 9, deadline: '2026-12-05', busy });
  assert.ok(res.items.every((it) => it.scheduledDate !== '2026-11-24'), 'full day should be skipped');
});

test('today only offers times after now (plus 30 min)', () => {
  const res = scheduleSteps(mk([10, 15]), { today: '2026-11-24', nowHour: 19.1, deadline: '2026-12-05' });
  res.items.filter((it) => it.scheduledDate === '2026-11-24').forEach((it) => assert.ok(it.scheduledHour >= 19.6));
});

test('preferred hour inside the window is used; outside the window is clamped to it', () => {
  const inside = scheduleSteps(mk([20]), { today: '2026-11-24', nowHour: 9, deadline: '2026-12-05', preferredHour: 20 });
  assert.equal(inside.items[0].scheduledHour, 20);
  const outside = scheduleSteps(mk([20]), { today: '2026-11-24', nowHour: 9, deadline: '2026-12-05', preferredHour: 9 });
  assert.equal(outside.items[0].scheduledHour, 18);
});

test('invalid window falls back to 6-10 PM', () => {
  assert.deepEqual(normalizeWindow(undefined, undefined), { start: 18, end: 22 });
  assert.deepEqual(normalizeWindow(20, 20.1), { start: 18, end: 22 });
  assert.deepEqual(normalizeWindow(19, 20), { start: 19, end: 20 });
});

test('estimateAvailableMinutes shrinks as the deadline gets closer', () => {
  const far = estimateAvailableMinutes({ today: '2026-11-24', nowHour: 9, deadline: '2026-12-20' });
  const near = estimateAvailableMinutes({ today: '2026-11-24', nowHour: 9, deadline: '2026-11-25' });
  assert.ok(far > near && near > 0);
});

test('missed steps: past day, long-ago today, but not a step that is still reachable', () => {
  assert.equal(isMissedStep({ scheduledDate: '2026-11-23', scheduledHour: 19, durationMins: 20 }, '2026-11-24', 9), true);
  assert.equal(isMissedStep({ scheduledDate: '2026-11-24', scheduledHour: 18, durationMins: 20 }, '2026-11-24', 18.5), false); // still within grace
  assert.equal(isMissedStep({ scheduledDate: '2026-11-24', scheduledHour: 18, durationMins: 20 }, '2026-11-24', 21), true);
  assert.equal(isMissedStep({ scheduledDate: '2026-11-25', scheduledHour: 18, durationMins: 20 }, '2026-11-24', 21), false);
  assert.equal(isMissedStep({ done: true, scheduledDate: '2026-11-20', scheduledHour: 18 }, '2026-11-24', 9), false);
  assert.equal(isMissedStep({ title: 'no schedule' }, '2026-11-24', 9), false);
});

test('fuzz: random inputs never break overlap / order / window rules', () => {
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let run = 0; run < 400; run++) {
    const n = 2 + Math.floor(rnd() * 7);
    const steps = mk(Array.from({ length: n }, () => 5 + Math.floor(rnd() * 41)));
    const days = Math.floor(rnd() * 20);
    const deadline = `2026-12-${String(1 + Math.min(days, 28)).padStart(2, '0')}`;
    const ws = [18, 17, 19, 6][Math.floor(rnd() * 4)];
    const we = ws + [1, 2, 4][Math.floor(rnd() * 3)];
    const habitBlocks = rnd() > 0.5 ? [{ start: ws, end: ws + 0.2 }, { start: ws + 1, end: ws + 1.2 }] : [];
    const busy = rnd() > 0.5 ? [{ date: '2026-12-01', hour: ws + 0.5, minutes: 25 }] : [];
    const res = scheduleSteps(steps, {
      today: '2026-12-01', nowHour: rnd() * 24, deadline, windowStart: ws, windowEnd: we, habitBlocks, busy, preferredHour: 6 + rnd() * 16,
    });
    assert.equal(res.items.length, n, `run ${run}`);
    checkInvariants(res, { habitBlocks, label: `run ${run}` });
  }
});

test('habit times: parsing, slots, blocks', () => {
  assert.equal(parseHHMM('07:30'), 7.5);
  assert.equal(parseHHMM('7:05'), 7 + 5 / 60);
  assert.equal(parseHHMM('25:00'), null);
  assert.equal(parseHHMM('abc'), null);
  assert.equal(formatHHMM(7.5), '07:30');
  assert.equal(slotForHour(7), 'Morning');
  assert.equal(slotForHour(12), 'Noon');
  assert.equal(slotForHour(18.5), 'Evening');
  assert.equal(slotForHour(21), 'Night');

  const rows = [
    { active: true, frequency: 'Daily', metadata: { timeSlots: ['Morning', 'Evening'], slotTimes: { Morning: '06:45' }, durationMins: 5 } },
    { active: true, frequency: 'Weekly', metadata: { timeSlots: ['Noon'] } },
    { active: false, frequency: 'Daily', metadata: { timeSlots: ['Night'] } },
    { active: true, frequency: 'Daily', metadata: { timeSlots: ['Night'], startedAt: '2026-11-01', targetDays: 7 } }, // finished
  ];
  const blocks = habitBlocksFromRows(rows, '2026-11-24');
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].start, 6.75);
  assert.ok(Math.abs(blocks[0].end - (6.75 + 5 / 60)) < 1e-9);
  assert.equal(blocks[1].start, 18); // default Evening hour, default 10 min
});
