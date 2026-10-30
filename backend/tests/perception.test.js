// Run with:  node --test backend/tests/perception.test.js
// Uses Node's built-in test runner -- no extra packages needed.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  analyzeMessage,
  formatHintsForPrompt,
  detectCrisis,
  detectLanguage,
  classifyIntent,
  detectUrgency,
  MAX_MESSAGE_LENGTH,
} = require('../services/ai/perception');

test('crisis: English phrases trigger', () => {
  [
    'I want to kill myself',
    "I don't want to live anymore",
    'sometimes I think about suicide.',
    "i can't do this, i want to die",
    'I keep wanting to hurt myself',
    "Everyone would be better off dead without me",
  ].forEach((m) => assert.equal(detectCrisis(m), true, m));
});

test('crisis: Roman Urdu phrases trigger', () => {
  [
    'main khudkushi karna chahta hoon',
    'mujhe lagta hai main mar jana chahti hoon',
    'ab jeena nahi chahta',
    'zindagi khatam kar dun',
    'main khud ko nuqsan pahunchaunga',
  ].forEach((m) => assert.equal(detectCrisis(m), true, m));
});

test('crisis: ordinary stressed messages do NOT trigger', () => {
  [
    'I am so stressed about my exam tomorrow',
    'I keep procrastinating on my assignment',
    'my deadline is killing my schedule',
    'mujhe parhai mein dhyan nahi lagta',
    'please add a task to submit my report',
    'I could die of embarrassment lol',
  ].forEach((m) => assert.equal(detectCrisis(m), false, m));
});

test('analyzeMessage: crisis returns fixed reply and is not ok', () => {
  const r = analyzeMessage('I want to end my life');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'crisis');
  assert.equal(r.crisis, true);
  assert.match(r.reply, /not alone|don't have to carry this alone/i);
  assert.match(r.reply, /akele nahi/i);
});

test('crisis reply never invents a helpline number', () => {
  delete process.env.CRISIS_HELPLINE_TEXT;
  const r = analyzeMessage('I want to die');
  assert.equal(/\d{3,}/.test(r.reply), false);
});

test('crisis reply includes the configured helpline text when set', () => {
  process.env.CRISIS_HELPLINE_TEXT = 'Example Helpline: 000-TEST';
  const r = analyzeMessage('I want to die');
  assert.match(r.reply, /Example Helpline: 000-TEST/);
  delete process.env.CRISIS_HELPLINE_TEXT;
});

test('crisis wins over the length check', () => {
  const long = 'I feel awful. '.repeat(100) + 'I want to kill myself';
  const r = analyzeMessage(long);
  assert.equal(r.reason, 'crisis');
});

test('length check', () => {
  const ok = analyzeMessage('a'.repeat(MAX_MESSAGE_LENGTH));
  assert.equal(ok.ok, true);
  const tooLong = analyzeMessage('a'.repeat(MAX_MESSAGE_LENGTH + 1));
  assert.equal(tooLong.ok, false);
  assert.equal(tooLong.reason, 'too_long');
});

test('language detection', () => {
  assert.equal(detectLanguage('I need help starting my assignment'), 'english');
  assert.equal(detectLanguage('mujhe parhai mein dhyan nahi lagta aur main bohat pareshan hoon'), 'roman_urdu');
  assert.equal(detectLanguage('مجھے مدد چاہیے'), 'urdu_script');
  assert.equal(detectLanguage('我需要帮助'), 'other');
});

test('intent classification', () => {
  assert.equal(classifyIntent('please add a task to submit my report'), 'tool_request');
  assert.equal(classifyIntent('start a focus session'), 'tool_request');
  assert.equal(classifyIntent('what are my tasks for today'), 'data_query');
  assert.equal(classifyIntent('why does my brain avoid starting tasks'), 'knowledge_query');
  assert.equal(classifyIntent('hello there'), 'chat');
});

test('urgency detection', () => {
  assert.equal(detectUrgency('I am panicking and overwhelmed'), 'high');
  assert.equal(detectUrgency('mujhe bohat ghabrahat ho rahi hai'), 'high');
  assert.equal(detectUrgency('what should I eat today'), 'normal');
});

test('formatHintsForPrompt', () => {
  assert.equal(formatHintsForPrompt({ language: 'english', intent: 'chat', urgency: 'normal' }), '');
  const block = formatHintsForPrompt({ language: 'roman_urdu', intent: 'tool_request', urgency: 'high' });
  assert.match(block, /Roman Urdu/);
  assert.match(block, /tool_request/);
  assert.match(block, /overwhelmed or panicked/);
});