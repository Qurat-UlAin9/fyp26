// Run with:  node --test backend/tests/outputGuard.test.js
// Uses Node's built-in test runner -- no extra packages needed.

const test = require('node:test');
const assert = require('node:assert/strict');

const { checkReply, SAFE_FALLBACK_REPLY, textOf } = require('../services/ai/outputGuard');

function flagsOf(reply) {
  return checkReply(reply).flags;
}

test('normal coaching replies pass unchanged', () => {
  [
    'Great start! Try a 2-minute version of the task, then take a short break.',
    "That sounds stressful. Let's break your report into three small steps.",
    'A short walk can help you reset before your next focus session.',
    'The best area to start is the one that takes under five minutes.',
    'Your focus streak is 4 days - nice work.',
  ].forEach((reply) => {
    const r = checkReply(reply);
    assert.equal(r.ok, true, reply);
    assert.equal(r.reply, reply);
    assert.deepEqual(r.flags, []);
  });
});

test('diagnosis claims are caught', () => {
  [
    'Based on your answers, you have ADHD.',
    'You probably have ADHD and should plan around it.',
    "You're clearly autistic, so try this.",
    'I diagnose you with bipolar disorder.',
    'Your screening confirms you have depression.',
  ].forEach((reply) => {
    assert.deepEqual(flagsOf(reply), ['diagnosis'], reply);
  });
});

test('diagnosis: denials, hypotheticals and hand-offs are allowed', () => {
  [
    "I can't tell you whether you have ADHD.",
    'I cannot diagnose you - only a doctor can do that.',
    'If you have ADHD, a professional can confirm it.',
    "This screening is not a diagnosis, and it doesn't say you have ADHD.",
  ].forEach((reply) => {
    assert.equal(checkReply(reply).ok, true, reply);
  });
});

test('medication advice and dose numbers are caught', () => {
  [
    'You could stop taking your medication for a week.',
    'Try to reduce your dose a little.',
    'Skip your meds on weekends.',
    'Take 10 mg in the morning.',
    'If you feel better, stop your meds.',
  ].forEach((reply) => {
    assert.deepEqual(flagsOf(reply), ['medication'], reply);
  });
});

test('medication: pointing to a doctor is allowed', () => {
  [
    'Please talk to your doctor before you change anything about your medication.',
    "I can't advise on your dosage - ask your pharmacist.",
  ].forEach((reply) => {
    assert.equal(checkReply(reply).ok, true, reply);
  });
});

test('EF ranking and overall scores are caught', () => {
  [
    'Your weakest executive function area is Working Memory.',
    'Your strongest dimension is Organization of Tasks.',
    'Your overall executive function score is 62%.',
    'Your EF total score looks low.',
    'Planning is your worst EF dimension.',
  ].forEach((reply) => {
    assert.deepEqual(flagsOf(reply), ['ef_scoring'], reply);
  });
});

test('EF: stating the limits is allowed', () => {
  [
    'There is no overall EF score, so I will not compare your areas.',
    "I can't say which executive-function area is weakest - those numbers are approximate.",
  ].forEach((reply) => {
    assert.equal(checkReply(reply).ok, true, reply);
  });
});

test('a flagged reply is fully replaced and never returned', () => {
  const r = checkReply('You have ADHD. Also, stop your medication.');
  assert.equal(r.ok, false);
  assert.equal(r.reply, SAFE_FALLBACK_REPLY);
  assert.deepEqual(r.flags.sort(), ['diagnosis', 'medication']);
  assert.equal(r.reply.includes('You have ADHD'), false);
});

test('the safe fallback itself passes the guard (no loop / self-flag)', () => {
  assert.equal(checkReply(SAFE_FALLBACK_REPLY).ok, true);
});

test('array content blocks are handled', () => {
  const clean = [{ type: 'text', text: 'Try a 2-minute start.' }];
  const cleanResult = checkReply(clean);
  assert.equal(cleanResult.ok, true);
  assert.equal(cleanResult.reply, clean);

  const bad = [{ type: 'text', text: 'You have ADHD.' }];
  const badResult = checkReply(bad);
  assert.equal(badResult.ok, false);
  assert.equal(typeof badResult.reply, 'string');
});

test('empty or odd input does not throw', () => {
  assert.equal(checkReply('').ok, true);
  assert.equal(checkReply(null).ok, true);
  assert.equal(checkReply(undefined).ok, true);
  assert.equal(textOf(42), '');
});