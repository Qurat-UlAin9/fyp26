// Run with:  node --test backend/tests/reframe.test.js
// reframeThought(): model stubbed; checks JSON handling, clean-up, crisis pass-through and retry.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const answers = [];
const stub = (rel, exports) => {
  const file = require.resolve(path.join('..', rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
};
stub('services/ai/llmProvider.js', {
  createChatModel: () => ({ invoke: async () => ({ content: answers.shift() }) }),
  textOf: (c) => String(c),
});
const { reframeThought } = require('../services/ai/reframe');

const good = {
  validation: 'That sounds exhausting.',
  thought: 'I always mess everything up.',
  distortions: [{ name: 'Overgeneralising', why: 'The word "always" covers every case.' }],
  questions: ['q1', 'q2', 'q3', 'q4'],
  evidence: { for: ['a', 'b', 'c', 'd'], against: ['x'] },
  balanced: 'I made a mistake today, and I have also got things right before.',
  action: 'Write down one thing that went fine today.',
};

test('valid answer is cleaned and trimmed', async () => {
  answers.push('```json\n' + JSON.stringify(good) + '\n```');
  const r = await reframeThought({ thought: 'I always mess up' });
  assert.equal(r.questions.length, 3);
  assert.equal(r.evidence.for.length, 3);
  assert.equal(r.distortions[0].name, 'Overgeneralising');
  assert.ok(r.balanced);
});

test('text around the JSON is tolerated', async () => {
  answers.push('Here you go: ' + JSON.stringify(good) + ' Hope it helps');
  const r = await reframeThought({ thought: 'x' });
  assert.equal(r.thought, good.thought);
});

test('bad first answer is retried once', async () => {
  answers.push('not json at all');
  answers.push(JSON.stringify(good));
  const r = await reframeThought({ thought: 'x' });
  assert.ok(r.balanced);
});

test('two bad answers throw a friendly error', async () => {
  answers.push('nope');
  answers.push('{"validation":"only this"}'); // no balanced thought
  await assert.rejects(() => reframeThought({ thought: 'x' }), /Could not restructure/);
});

test('crisis flag is passed through', async () => {
  answers.push('{"crisis": true}');
  const r = await reframeThought({ thought: 'x' });
  assert.deepEqual(r, { crisis: true });
});
