// Run with:  node --test backend/tests/lanePrompt.test.js
// Checks that each chat lane gets its own prompt sections, context and tools.
// Third-party libraries (LangChain, zod, Pinecone) and the database are stubbed, so no network or
// extra packages are needed. The model itself is not called.

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// ---- stubs ---------------------------------------------------------------------------------------
const chain = () => {
  const p = new Proxy(function () {}, { get: () => p, apply: () => p });
  return p;
};
const calls = { knowledgeSearches: 0 };

const realLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (/^@langchain\//.test(request)) {
    if (request === '@langchain/core/tools') return { tool: (fn, meta) => ({ name: meta.name, invoke: fn }) };
    if (request === '@langchain/core/messages') {
      const M = class { constructor(content) { this.content = content; } };
      return { SystemMessage: M, HumanMessage: M, AIMessage: M };
    }
    if (request === '@langchain/langgraph/prebuilt') return { createReactAgent: () => ({ invoke: async () => ({ messages: [] }) }) };
    return chain();
  }
  if (request === 'zod') return { z: chain() };
  if (/^@pinecone-database|^dotenv$|^@supabase\//.test(request)) return chain();
  return realLoad.apply(this, arguments);
};

const path = require('node:path');
const stub = (rel, exports) => {
  const file = require.resolve(path.join('..', rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
};
const emptyQuery = () => {
  const q = { select: () => q, eq: () => q, neq: () => q, gte: () => q, order: () => q, limit: () => q, in: () => q, ilike: () => q,
    maybeSingle: async () => ({ data: null, error: null }), single: async () => ({ data: null, error: null }),
    then: (res) => Promise.resolve({ data: [], error: null }).then(res) };
  return q;
};
stub('config/supabase.js', { supabaseAdmin: { from: emptyQuery } });
stub('services/ai/llmProvider.js', { createChatModel: () => ({ invoke: async () => ({ content: 'ok' }) }) });
stub('services/ai/rag/embeddings.js', { embedQuery: async () => [0] });
stub('services/ai/rag/pineconeClient.js', { queryKnowledge: async () => [] });
stub('services/ai/prompts/promptService.js', { getActivePrompt: async () => ({ id: 'p1', text: 'BASE PERSONA' }) });
stub('services/ai/exemplars/exemplarRetrieval.js', { fetchExemplars: async () => [], formatExemplarBlock: () => '' });
stub('services/ai/memory/memoryRetrieval.js', { fetchUserMemories: async () => [], formatMemoryBlock: () => '' });
stub('services/ai/context/moodContext.js', { fetchRecentMoods: async () => [], formatMoodBlock: () => '\nMOOD BLOCK\n' });
stub('services/ai/context/taskContext.js', { fetchOpenTasks: async () => [], formatTaskBlock: () => '\nOPEN TASKS BLOCK\n' });
stub('services/ai/context/appState.js', { formatAppBlock: () => '\nAIMS APP STATE BLOCK\n', wantsFullApp: () => false });
stub('services/ai/context/knowledgeContext.js', {
  fetchKnowledgeContext: async () => { calls.knowledgeSearches += 1; return { items: [{ id: 'k1', title: 'T', text: 'x' }], ids: ['k1'] }; },
  formatKnowledgeBlock: () => '\nREFERENCE KNOWLEDGE BLOCK\n',
});
stub('services/ai/tools/assessmentTool.js', { fetchADHDScreening: async () => null, fetchEFSummary: async () => null });
stub('services/ai/tools/nameTool.js', { setCoachName: { name: 'set_coach_name' }, fetchCoachName: async () => null, formatNameBlock: () => '' });
stub('services/rewards/rewardsService.js', { getAppState: async () => ({}), applyEvent: async () => ({ delta: 0 }) });
stub('services/ai/tools/appActions.js', { pushAppAction: () => {} });

const graph = require('../services/ai/tools/graph');
const { LANE_TOOLS, LANE_NEEDS } = graph;

const build = (lane, extra = {}) =>
  graph.buildSystemPrompt('u1', extra.hints || null, extra.message || 'hello there friend', extra.focus || null, [], { configurable: { retrievedChunkIds: [] } }, lane)
    .then((r) => r.promptText);

const names = (lane) => LANE_TOOLS[lane].map((t) => t.name).sort();

test('knowledge lane: library + teaching rules only; no tools, no buttons, no task or app context', async () => {
  const p = await build('knowledge');
  assert.match(p, /REFERENCE KNOWLEDGE BLOCK/);
  assert.match(p, /wants to understand something/);
  assert.match(p, /NO buttons/);
  assert.doesNotMatch(p, /OPEN TASKS BLOCK|AIMS APP STATE BLOCK|MOOD BLOCK/);
  assert.doesNotMatch(p, /TASK COACHING|Clarifying questions|REWARDS AND THE APP|SCREEN BUTTONS/);
  assert.deepEqual(names('knowledge'), []);
});

test('task lane: task planner rules and the task list; no library, no emotional or reward rules', async () => {
  const p = await build('task', { focus: { taskTitle: 'Essay', subtaskTitle: 'Outline', taskId: 't1', subtaskId: 's1' } });
  assert.match(p, /OPEN TASKS BLOCK/);
  assert.match(p, /TASK COACHING/);
  assert.match(p, /HEADS UP/); // the coach is told what to do with a tight plan
  assert.match(p, /CURRENT FOCUS/);
  assert.match(p, /Clarifying questions/);
  assert.doesNotMatch(p, /REFERENCE KNOWLEDGE BLOCK|AIMS APP STATE BLOCK|MOOD BLOCK|REWARDS AND THE APP|AFTER AN EXERCISE/);
  const t = names('task');
  ['create_task', 'update_task', 'delete_task', 'list_open_tasks', 'complete_subtask', 'get_task_details'].forEach((n) => assert.ok(t.includes(n), n));
  assert.ok(!t.includes('create_habit'));
});

test('action lane: habits, focus, rewards and the app state; no library', async () => {
  const p = await build('action');
  assert.match(p, /AIMS APP STATE BLOCK/);
  assert.match(p, /REWARDS AND THE APP/);
  assert.match(p, /clock_time/);
  assert.doesNotMatch(p, /REFERENCE KNOWLEDGE BLOCK|TASK COACHING/);
  const t = names('action');
  ['create_habit', 'complete_habit', 'start_focus_session', 'buy_reward'].forEach((n) => assert.ok(t.includes(n), n));
  assert.ok(!t.includes('create_task'));
});

test('support lane: library, mood and exercises; no task creation tools or task list', async () => {
  const p = await build('support', { hints: { language: 'english', intent: 'chat', urgency: 'high' } });
  assert.match(p, /REFERENCE KNOWLEDGE BLOCK/);
  assert.match(p, /MOOD BLOCK/);
  assert.match(p, /AFTER AN EXERCISE/);
  assert.match(p, /Do not create tasks or habits/);
  assert.doesNotMatch(p, /OPEN TASKS BLOCK|TASK COACHING|REWARDS AND THE APP/);
  const t = names('support');
  assert.ok(t.includes('log_mood'));
  assert.ok(!t.includes('create_task') && !t.includes('create_habit'));
});

test('chat lane: short prompt with nothing else', async () => {
  const p = await build('chat');
  assert.match(p, /small talk/);
  assert.doesNotMatch(p, /REFERENCE KNOWLEDGE BLOCK|OPEN TASKS BLOCK|TASK COACHING|SCREEN BUTTONS/);
  assert.deepEqual(names('chat'), []);
});

test('the library is only searched in the lanes that use it', async () => {
  calls.knowledgeSearches = 0;
  await build('task'); await build('action'); await build('chat');
  assert.equal(calls.knowledgeSearches, 0);
  await build('knowledge'); await build('support');
  assert.equal(calls.knowledgeSearches, 2);
  assert.deepEqual(Object.keys(LANE_NEEDS).sort(), ['action', 'chat', 'knowledge', 'support', 'task']);
});

test('every lane keeps the shared persona and style rules', async () => {
  for (const lane of Object.keys(LANE_NEEDS)) {
    const p = await build(lane);
    assert.match(p, /BASE PERSONA/, lane);
    assert.match(p, /Who you are: a warm, knowledgeable friend/, lane);
    assert.match(p, /Honesty:/, lane);
  }
});
