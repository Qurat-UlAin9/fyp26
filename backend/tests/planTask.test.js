// Run with:  node --test backend/tests/planTask.test.js
// planTask(): the model is stubbed, so this checks only our parsing, cleaning and fallback rules.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

let nextAnswer = '';
const stub = (rel, exports) => {
  const file = require.resolve(path.join('..', rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
};
stub('config/supabase.js', { supabaseAdmin: { from: () => ({}) } });
stub('services/ai/llmProvider.js', {
  createChatModel: () => ({
    invoke: async () => {
      if (nextAnswer instanceof Error) throw nextAnswer;
      return { content: nextAnswer };
    },
  }),
  textOf: (c) => (Array.isArray(c) ? c.map((p) => p?.text || p).join('') : String(c)),
});

const { planTask, planSteps } = require('../services/ai/subtaskPlanner');

test('do task: keeps the prepare step, materials and details', async () => {
  nextAnswer = JSON.stringify({
    taskType: 'do',
    materials: ['200 g rice', '1 onion', 'pot'],
    steps: [
      { title: 'Gather the ingredients for biryani', detail: '200 g rice, 1 onion, pot', minutes: 20, kind: 'prepare' },
      { title: 'Fry the onion until golden', detail: 'Medium heat, about 8 minutes.', minutes: 15, kind: 'do' },
      { title: 'Check the rice and serve', detail: 'Taste and adjust salt.', minutes: 10, kind: 'review' },
    ],
  });
  const plan = await planTask({ title: 'Cook biryani' }, 25);
  assert.equal(plan.taskType, 'do');
  assert.deepEqual(plan.materials, ['200 g rice', '1 onion', 'pot']);
  assert.equal(plan.steps[0].kind, 'prepare');
  assert.ok(plan.steps[0].minutes <= 10, 'first step is capped at 10 minutes');
  assert.ok(plan.steps.every((s) => s.minutes <= 25), 'every step fits the time cap');
  assert.ok(plan.steps[1].detail.includes('Medium heat'));
});

test('do task: a missing prepare step is added from the materials', async () => {
  nextAnswer = JSON.stringify({
    taskType: 'do',
    materials: ['paper', 'pen'],
    steps: [
      { title: 'Write the first paragraph', minutes: 10, kind: 'do' },
      { title: 'Read it aloud and fix one line', minutes: 10, kind: 'review' },
    ],
  });
  const plan = await planTask({ title: 'Write a letter' }, 25);
  assert.equal(plan.steps[0].kind, 'prepare');
  assert.equal(plan.steps[0].detail, 'paper, pen');
});

test('understand task: sub-topic steps, no materials', async () => {
  nextAnswer = '```json\n' + JSON.stringify({
    taskType: 'understand',
    materials: ['ignored'],
    steps: [
      { title: 'Learn what a force is with Compass', detail: 'Push or pull.', minutes: 10, kind: 'learn' },
      { title: "Learn Newton's second law with Compass", detail: 'F = m a.', minutes: 15, kind: 'learn' },
      { title: 'Explain F = m a back in your words', minutes: 10, kind: 'do' },
    ],
  }) + '\n```';
  const plan = await planTask({ title: 'Learn Newtonian mechanics' }, 25);
  assert.equal(plan.taskType, 'understand');
  assert.equal(plan.steps.filter((s) => s.kind === 'learn').length, 2);
  assert.ok(!plan.steps.some((s) => s.kind === 'prepare'), 'no gather step for an understanding task');
});

test('old array answer shape still works', async () => {
  nextAnswer = JSON.stringify([
    { title: 'Write what you know about plants', minutes: 8, kind: 'do' },
    { title: 'Learn photosynthesis with Compass', minutes: 15, kind: 'learn' },
  ]);
  const steps = await planSteps({ title: 'Plants' }, 25);
  assert.equal(steps.length, 2);
});

test('outside material is replaced even if the model keeps sending it', async () => {
  nextAnswer = JSON.stringify({
    taskType: 'understand',
    materials: [],
    steps: [
      { title: 'Watch a YouTube video about atoms', minutes: 10, kind: 'learn' },
      { title: 'Explain atoms in your words', minutes: 10, kind: 'do' },
    ],
  });
  const plan = await planTask({ title: 'Atoms' }, 25);
  assert.ok(!plan.steps.some((s) => /youtube/i.test(s.title)));
});

test('model failure: a fallback plan that fits the task type', async () => {
  nextAnswer = new Error('boom');
  const learn = await planTask({ title: 'Learn photosynthesis' }, 25);
  assert.equal(learn.taskType, 'understand');
  assert.ok(learn.steps.length >= 4);

  const make = await planTask({ title: 'Clean the kitchen' }, 25);
  assert.equal(make.taskType, 'do');
  assert.equal(make.steps[0].kind, 'prepare');
});
