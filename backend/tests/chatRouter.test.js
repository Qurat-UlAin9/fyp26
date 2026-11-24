// Run with:  node --test backend/tests/chatRouter.test.js

const test = require('node:test');
const assert = require('node:assert/strict');

const { routeMessage, applyLanePolicy } = require('../services/ai/chatRouter');
const { analyzeMessage } = require('../services/ai/perception');

const laneOf = (message, extra = {}) =>
  routeMessage({ message, hints: analyzeMessage(message).hints, ...extra }).lane;

test('the message from the screenshot is a feeling plus a why-question, never a task', () => {
  const lane = laneOf(
    'whenever a deadline approaches why I feel so much feared that I just want that day dont come or things get delayed so I can be on time'
  );
  assert.equal(lane, 'support');
});

test('plain ADHD knowledge questions go to the knowledge lane', () => {
  [
    'What is time blindness?',
    'Why do people with ADHD struggle to start tasks',
    'explain executive dysfunction',
    'what are the types of ADHD',
    'how does dopamine affect motivation',
    'tips for focusing while studying',
    'kya hai adhd',
  ].forEach((m) => assert.equal(laneOf(m), 'knowledge', m));
});

test('task requests go to the task lane', () => {
  [
    'create a task for my physics assignment due friday',
    'break it down into steps',
    'help me start my essay task',
    'what are my tasks',
    "what's due this week",
    'I finished the first step',
    'mark the step as done',
    'reschedule my report task',
  ].forEach((m) => assert.equal(laneOf(m), 'task', m));
});

test('habit, focus and reward requests go to the action lane', () => {
  [
    'add a habit to drink water every morning',
    'create a habit for evening journaling',
    'start a focus session for 25 minutes',
    'how many coins do I have',
    'I want to buy a new theme',
    'I did my walk today',
  ].forEach((m) => assert.equal(laneOf(m), 'action', m));
});

test('feelings about oneself go to the support lane', () => {
  [
    "I'm overwhelmed",
    "I'm feeling low",
    'I feel so anxious about my exam',
    'I am stressed and cannot focus',
    'mujhe bohat ghabrahat ho rahi hai',
  ].forEach((m) => assert.equal(laneOf(m), 'support', m));
});

test('the app message after an exercise is support, but a finished step is a task', () => {
  assert.equal(laneOf('I finished Grounding. I feel a bit calmer.', { fromOption: true }), 'support');
  assert.equal(laneOf('I finished the second step of my essay task'), 'task');
});

test('small talk goes to chat', () => {
  ['hi', 'hello there', 'Just chatting', 'thanks'].forEach((m) => assert.equal(laneOf(m), 'chat', m));
});

test('Ask coach on a step is always the task lane', () => {
  assert.equal(laneOf('Help me with this step: "Learn B2B marketing"', { focusContext: { subtaskId: 's1' } }), 'task');
});

test('short replies and tapped buttons stay in the lane of the last answer', () => {
  assert.equal(laneOf('yes', { lastLane: 'task' }), 'task');
  assert.equal(laneOf('Science topics', { lastLane: 'task', fromOption: true }), 'task');
  assert.equal(laneOf('ok', { lastLane: 'knowledge' }), 'knowledge');
  assert.equal(laneOf('tell me more', { lastLane: 'knowledge' }), 'knowledge');
});

test('a clear new request still wins over the previous lane', () => {
  assert.equal(laneOf('add a habit to stretch', { lastLane: 'task' }), 'action');
  assert.equal(laneOf('create a task for my report', { lastLane: 'support' }), 'task');
});

test('lane policy: knowledge and chat never get buttons or links; others only their own links', () => {
  const links = [{ key: 'Tasks', label: 'Open tasks' }, { key: 'Grounding', label: 'Try grounding' }];
  const options = ['A', 'B'];
  assert.deepEqual(applyLanePolicy('knowledge', { options, links }), { options: [], links: [] });
  assert.deepEqual(applyLanePolicy('chat', { options, links }), { options: [], links: [] });
  assert.deepEqual(applyLanePolicy('task', { options, links }).links.map((l) => l.key), ['Tasks']);
  assert.deepEqual(applyLanePolicy('support', { options, links }).links.map((l) => l.key), ['Tasks', 'Grounding']);
  assert.deepEqual(applyLanePolicy('task', { options, links }).options, options);
});
