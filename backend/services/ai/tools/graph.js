// backend/services/ai/graph.js
//
// Replaces the hand-rolled "embed -> retrieve -> build prompt -> one LLM
// call" flow in the old agent.js with a proper LangGraph ReAct agent: the
// model can now call tools (possibly several, possibly in sequence) before
// producing a final answer, instead of only ever answering from whatever
// got stuffed into the prompt up front.
//
// NEEDS INSTALLING (not yet in your package.json as far as I know):
//   npm install @langchain/core @langchain/langgraph @langchain/groq zod
//
// ASSUMPTION: your GROQ_API_KEY env var is already set (per your handoff
// doc, it's in backend/.env). @langchain/groq reads it automatically from
// that same env var name.

const { ChatGroq } = require('@langchain/groq');
const { createReactAgent } = require('@langchain/langgraph/prebuilt');
const { SystemMessage, HumanMessage, AIMessage } = require('@langchain/core/messages');

const { createTask, listOpenTasks } = require('./tools/taskTool');
const { createHabit, listHabits } = require('./tools/habitTool');
const { suggestFocusSession } = require('./tools/focusTool');
const { suggestEmotionExercise } = require('./tools/emotionTool');
const { suggestExercise } = require('./tools/exerciseTool');
const { searchKnowledgeBase } = require('./tools/knowledgeTool');
const { rememberAboutUser } = require('./tools/memoryTool');
const { getADHDScreeningSummary, getEFAssessmentSummary } = require('./tools/assessmentTool');

const BASE_SYSTEM_PROMPT = `You are the Main ADHD Agent inside an ADHD support app.
You are warm, concise, and practical -- you help with tasks, habits, focus,
emotion regulation, and general ADHD knowledge. Keep replies short (2-5
sentences) unless the user asks for detail.

You have tools for taking real actions (create_task, create_habit,
suggest_focus_session, suggest_emotion_exercise, suggest_exercise), for
looking up grounded research (search_knowledge_base), for checking what you
know about this user (get_adhd_screening_summary, get_ef_assessment_summary),
and for saving new durable facts about them (remember_about_user).

Call tools when they'd genuinely help -- don't narrate that you're "using a
tool," just use it and respond naturally. Never invent clinical claims not
supported by search_knowledge_base results. Never state or imply the user
has ADHD or any diagnosis, even if screening/assessment tools return high
scores -- those are self-reported, not diagnostic.`;

const tools = [
  createTask,
  listOpenTasks,
  createHabit,
  listHabits,
  suggestFocusSession,
  suggestEmotionExercise,
  suggestExercise,
  searchKnowledgeBase,
  rememberAboutUser,
  getADHDScreeningSummary,
  getEFAssessmentSummary,
];

const model = new ChatGroq({
  model: 'openai/gpt-oss-120b',
  temperature: 0.4,
});

// createReactAgent builds the actual LangGraph StateGraph for you: a loop of
// [call model -> if tool_calls present, run tools -> feed results back to
// model -> repeat until a plain text answer comes back]. This IS a real
// LangGraph graph under the hood -- just not hand-assembled node by node.
const reactAgent = createReactAgent({
  llm: model,
  tools,
});

/**
 * @param {{userId: string, conversationId: string, userMessage: string, history: {sender: string, message: string}[]}} params
 * @returns {{reply: string, toolCalls: object[]}}
 */
async function handleMessage({ userId, conversationId, userMessage, history = [] }) {
  const messages = [
    new SystemMessage(BASE_SYSTEM_PROMPT),
    ...history.map((m) =>
      m.sender === 'assistant' ? new AIMessage(m.message) : new HumanMessage(m.message)
    ),
    new HumanMessage(userMessage),
  ];

  // userId flows through to every tool via config.configurable -- this is
  // how taskTool/habitTool/etc. know which user's row to insert/query,
  // without the model ever having to pass a user_id argument itself
  // (which would be both redundant and a minor trust boundary risk).
  const result = await reactAgent.invoke(
    { messages },
    { configurable: { userId, conversationId } }
  );

  const finalMessage = result.messages[result.messages.length - 1];

  // Collect any tool calls that happened along the way, for logging to
  // tool_execution_logs the same way routes/ai.js already logs retrieval.
  const toolCalls = result.messages
    .filter((m) => m._getType?.() === 'ai' && m.tool_calls?.length)
    .flatMap((m) => m.tool_calls);

  return {
    reply: finalMessage.content,
    toolCalls,
  };
}

module.exports = { handleMessage };
