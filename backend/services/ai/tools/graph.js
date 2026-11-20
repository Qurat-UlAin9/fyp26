const { createChatModel } = require('../llmProvider');
const { createReactAgent } = require('@langchain/langgraph/prebuilt');
const { SystemMessage, HumanMessage, AIMessage } = require('@langchain/core/messages');

const { createTask, updateTask, deleteTask, listOpenTasks, completeSubtask, getTaskDetails } = require('./taskTool');
const { createHabit, updateHabit, deleteHabit, listHabits,} = require('./habitTool');
const { startFocusSession } = require('./focusTool');
const { suggestEmotionExercise } = require('./emotionTool');
const { suggestExercise } = require('./exerciseTool');
const { searchKnowledgeBase } = require('./knowledgeTool');
const { presentOptions } = require('./optionsTool');
const { rememberAboutUser } = require('./memoryTool');
const { fetchADHDScreening, fetchEFSummary } = require('./assessmentTool');
const { formatHintsForPrompt } = require('../perception');
const { fetchUserMemories, formatMemoryBlock } = require('../memory/memoryRetrieval');

// Phase 2 Addition: Dynamic Prompts
const { getActivePrompt } = require('../prompts/promptService');
const { fetchExemplars, formatExemplarBlock } = require('../exemplars/exemplarRetrieval');

function formatContextBlock({ adhd, ef }) {
  let block = 'USER CONTEXT (self-reported, NOT a diagnosis):\n';
  if (adhd) {
    block += `- ADHD self-screening: ${adhd.percentage}% (${adhd.score}/${adhd.max_score}). Use only to adjust tone and structure.\n`;
  } else {
    block += '- ADHD self-screening: not completed.\n';
  }
  if (ef && ef.dimensions.length > 0) {
    block += '- Executive-function self-assessment:\n';
    ef.dimensions.forEach((d) => {
      block += `  - ${d.label}: ${d.pct}% (${d.status === 'exact' ? 'exact' : 'approximate'})\n`;
    });
    block += 'EF RULES: Do NOT rank the areas or call any of them the weakest. Never quote these numbers back as clinical results.\n';
  } else {
    block += '- Executive-function self-assessment: not completed.\n';
  }
  return block;
}

const STYLE_RULES = `

CHAT STYLE RULES (always follow; they override anything above about length or format):
- You are a warm friend working WITH the user, not an instructor. Say "let's" and "we".
- Keep every reply to 1-3 short sentences. Never write long paragraphs or long lists.
- Do NOT use markdown headings (#), horizontal rules (---) or tables. At most one **bold** phrase per reply.
- Ask only ONE question per reply.
- When the user has a choice to make, call the present_options tool with 2-4 short options (max 5 words each) and do NOT write the options in your text. Then stop and wait.
- Offer options instead of giving orders ("Want to start now?" with options, never "Create a task").
- Never dump several steps at once. Give one small step, then offer options for what comes next.
- If the user is overwhelmed, acknowledge it in one sentence first, then offer options.`;

const TASK_COACHING_RULES = `

TASK COACHING (how we work through tasks together):
- Before creating a task, call list_open_tasks. If a matching task exists, use it. Never create duplicates.
- If the user is overwhelmed or says they have too much work: if tasks exist, acknowledge it in one line, name the ONE most urgent step, and offer options (start this step / pick another / just talk). If none exist, ask what the work is and when it is due, then create it.
- After creating a task, say the first step in one motivating sentence and offer options like "Start step 1 now" / "Later today".
- Work on ONE step at a time. For a step about choosing or brainstorming a topic: offer 2-4 areas as options (for example concepts vs how/why questions), then after each pick offer narrower options plus "Go deeper" and "I'm done searching". When they are done, ask which topic they liked and wait for them to type its name.
- When the user names the result (e.g. the topic), call complete_subtask with note = that result. Then celebrate in one sentence (it is a real milestone), say when the NEXT step is scheduled (bold the day and time), and offer options (start next step now / take a break / stop for today).
- If the user says they finished a step, call complete_subtask. If you only suspect they finished, ask with options ("Yes, done" / "Not yet") first. Never tick a step without confirmation.
- Never order the user to do things ("create a task", "add a habit"). Offer it as options and do it with them.
- Get ids from list_open_tasks / get_task_details. Never invent ids.`;

function formatFocusContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return '';
  const s = (v) => String(v || '').slice(0, 200);
  return (
    `\n\nCURRENT FOCUS (the user tapped "Ask coach" on this step): task "${s(ctx.taskTitle)}" (task_id: ${s(ctx.taskId)}), ` +
    `step "${s(ctx.subtaskTitle)}" (subtask_id: ${s(ctx.subtaskId)}). ` +
    'Open with one motivating sentence about why this step matters, then offer 2-4 options for how to tackle it together.\n'
  );
}

async function buildSystemPrompt(userId, hints, userMessage, focusContext) {
  // Fetch the dynamic prompt variant for this user
  const [promptData, adhd, ef, memories, exemplars] = await Promise.all([
    getActivePrompt(userId),
    fetchADHDScreening(userId).catch((e) => { console.warn('ADHD fetch failed:', e.message); return null; }),
    fetchEFSummary(userId).catch((e) => { console.warn('EF fetch failed:', e.message); return null; }),
    fetchUserMemories(userId).catch((e) => { console.warn('Memory fetch failed:', e.message); return []; }),
    fetchExemplars(userMessage).catch((e) => { console.warn('Exemplar fetch failed:', e.message); return []; }),  ]);

  const finalPromptText = 
    promptData.text +
    '\n\n' +
    formatContextBlock({ adhd, ef }) +
    formatMemoryBlock(memories) +
    formatExemplarBlock(exemplars) +
    formatHintsForPrompt(hints) +
    STYLE_RULES +
    TASK_COACHING_RULES +
    formatFocusContext(focusContext);

  return { promptVersionId: promptData.id, promptText: finalPromptText };
}

const tools = [
  createTask, updateTask, deleteTask, listOpenTasks,
  createHabit, updateHabit, deleteHabit, listHabits,
  startFocusSession, suggestEmotionExercise, suggestExercise,
  searchKnowledgeBase, rememberAboutUser, presentOptions,
];

const model = createChatModel({ temperature: 0.4, maxTokens: 1024 });
const reactAgent = createReactAgent({ llm: model, tools });

async function handleMessage({ userId, conversationId, userMessage, history = [], hints = null, focusContext = null }) {  const { promptVersionId, promptText } = await buildSystemPrompt(userId, hints, userMessage, focusContext);
  console.log(`[prompt] ~${Math.round(promptText.length / 4)} tokens in the system prompt`);

  const cleanHistory = [];
  for (const m of history) {
    if (!cleanHistory.length && m.sender === 'assistant') continue;
    const last = cleanHistory[cleanHistory.length - 1];
    if (last && last.sender === m.sender) last.message += '\n' + m.message;
    else cleanHistory.push({ sender: m.sender, message: m.message });
  }

  const messages = [
    new SystemMessage(promptText),
    ...cleanHistory.map((m) => m.sender === 'assistant' ? new AIMessage(m.message) : new HumanMessage(m.message)),
    new HumanMessage(userMessage),
  ];

  const runConfig = { configurable: { userId, conversationId, retrievedChunkIds: [] } };
  const result = await reactAgent.invoke({ messages }, runConfig);
  const finalMessage = result.messages[result.messages.length - 1];

  const toolCalls = result.messages
    .filter((m) => m._getType?.() === 'ai' && m.tool_calls?.length)
    .flatMap((m) => m.tool_calls)
    .map((tc) => ({ name: tc.name, args: tc.args }));

  return {
    reply: Array.isArray(finalMessage.content)
      ? finalMessage.content.map((p) => (typeof p === 'string' ? p : p?.text || '')).join('')
      : finalMessage.content,
    toolCalls,
    retrievedChunkIds: runConfig.configurable.retrievedChunkIds,
    promptVersionId, // <-- Returned for tracking!
  };
}

module.exports = { handleMessage };