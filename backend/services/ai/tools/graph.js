// backend/services/ai/tools/graph.js
//
// LangGraph ReAct agent with server-side context injection.
// Assessment data is fetched BEFORE the model runs and formatted into the
// templated context block the fine-tuned student was trained on. Action tools
// (create_task, create_habit, suggest_*, search_knowledge_base,
// remember_about_user) remain in the ReAct loop.

const { ChatGroq } = require('@langchain/groq');
const { createReactAgent } = require('@langchain/langgraph/prebuilt');
const {
  SystemMessage,
  HumanMessage,
  AIMessage,
} = require('@langchain/core/messages');

const { createTask, updateTask, deleteTask, listOpenTasks } = require('./taskTool');
const { createHabit, listHabits } = require('./habitTool');
const { suggestFocusSession } = require('./focusTool');
const { suggestEmotionExercise } = require('./emotionTool');
const { suggestExercise } = require('./exerciseTool');
const { searchKnowledgeBase } = require('./knowledgeTool');
const { rememberAboutUser } = require('./memoryTool');

// Assessment queries -- used server-side, not as ReAct tools.
const {
  fetchADHDScreening,
  fetchEFSummary,
} = require('./assessmentTool');

const BASE_SYSTEM_PROMPT = `You are the Main ADHD Agent inside an ADHD support app.
You are warm, concise, and practical -- you help with tasks, habits, focus,
emotion regulation, and general ADHD knowledge. Keep replies short (2-5
sentences) unless the user asks for detail.

You have tools for taking real actions (create_task, create_habit,
suggest_focus_session, suggest_emotion_exercise, suggest_exercise), for
looking up grounded research (search_knowledge_base), and for saving new
durable facts about the user (remember_about_user).

Call tools when they'd genuinely help -- don't narrate that you're "using a
tool," just use it and respond naturally. Never invent clinical claims not
supported by search_knowledge_base results. Never state or imply the user
has ADHD or any diagnosis, even if the context block shows a High screening
level -- screening scores are self-reported, not diagnostic.`;

// =========================================================
// Context block formatting
// ---------------------------------------------------------
// MUST match, byte for byte, the template the fine-tuned student
// was trained on. If training used different wording, change the
// template here to match exactly.
// =========================================================
function formatContextBlock({ asrs_level, weak_ef_dimension, preference_style }) {
  return (
    `This user's ADHD screening level is: ${asrs_level}.\n` +
    `Their most challenged executive function area is: ${weak_ef_dimension}.\n` +
    `Their interaction preference is: ${preference_style}.`
  );
}

async function buildSystemPrompt(userId) {
  let asrs = 'Unknown';
  let weakEf = 'Unknown';
  const preference = 'Unknown'; // TODO: read from memory retrieval later

  try {
    const adhd = await fetchADHDScreening(userId);
    if (adhd?.asrs_level) asrs = adhd.asrs_level;
  } catch (e) {
    console.warn('buildSystemPrompt: ADHD summary failed:', e.message);
  }

  try {
    const ef = await fetchEFSummary(userId);
    if (ef?.weak_ef_dimension) weakEf = ef.weak_ef_dimension;
  } catch (e) {
    console.warn('buildSystemPrompt: EF summary failed:', e.message);
  }

  return BASE_SYSTEM_PROMPT + '\n\n' + formatContextBlock({
    asrs_level: asrs,
    weak_ef_dimension: weakEf,
    preference_style: preference,
  });
}

// =========================================================
// ReAct tool registry -- note: assessment tools NOT included.
// =========================================================
const tools = [
  createTask,
  updateTask,
  deleteTask,
  listOpenTasks,
  createHabit,
  listHabits,
  suggestFocusSession,
  suggestEmotionExercise,
  suggestExercise,
  searchKnowledgeBase,
  rememberAboutUser,
];

const model = new ChatGroq({
  model: 'openai/gpt-oss-120b',
  temperature: 0.4,
});

const reactAgent = createReactAgent({ llm: model, tools });

/**
 * @param {{userId: string, conversationId: string, userMessage: string,
 *          history: {sender: string, message: string}[]}} params
 * @returns {{reply: string, toolCalls: object[]}}
 */
async function handleMessage({
  userId,
  conversationId,
  userMessage,
  history = [],
}) {
  const systemPrompt = await buildSystemPrompt(userId);

  const messages = [
    new SystemMessage(systemPrompt),
    ...history.map((m) =>
      m.sender === 'assistant' ? new AIMessage(m.message) : new HumanMessage(m.message)
    ),
    new HumanMessage(userMessage),
  ];

  const result = await reactAgent.invoke(
    { messages },
    { configurable: { userId, conversationId } }
  );

  const finalMessage = result.messages[result.messages.length - 1];

  const toolCalls = result.messages
    .filter((m) => m._getType?.() === 'ai' && m.tool_calls?.length)
    .flatMap((m) => m.tool_calls)
    .map((tc) => ({
      name: tc.name,
      args: tc.args,
      // tool result isn't on the tool_call object; pull from sibling tool messages
    }));

  return {
    reply: finalMessage.content,
    toolCalls,
  };
}

module.exports = { handleMessage };