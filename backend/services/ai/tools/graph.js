// backend/services/ai/tools/graph.js

const { ChatGroq } = require('@langchain/groq');
const { createReactAgent } = require('@langchain/langgraph/prebuilt');
const {
  SystemMessage,
  HumanMessage,
  AIMessage,
} = require('@langchain/core/messages');

const { createTask, updateTask, deleteTask, listOpenTasks } = require('./taskTool');
const { createHabit, updateHabit, deleteHabit, listHabits } = require('./habitTool');
const { startFocusSession } = require('./focusTool');
const { suggestEmotionExercise } = require('./emotionTool');
const { suggestExercise } = require('./exerciseTool');
const { searchKnowledgeBase } = require('./knowledgeTool');
const { rememberAboutUser } = require('./memoryTool');

// Import the plain async functions (not the tools) for context injection
const { fetchADHDScreening, fetchEFSummary } = require('./assessmentTool');

// Layer 1 helper: turns language/intent/urgency hints into a prompt block
const { formatHintsForPrompt } = require('../perception');

const BASE_SYSTEM_PROMPT = `You are the Main ADHD Agent inside the Manas app.
You are warm, concise, and practical.

# TRIAGE PROTOCOL
Users will often send messy, emotional messages. You must:
1. VALIDATE their feeling in one short sentence.
2. TAKE ACTION using your tools if they are stuck.
3. EDUCATE using \`search_knowledge_base\` if they ask "how" or "why".

# TOOLS & KNOWLEDGE BASE
You have \`search_knowledge_base\` which MUST be used for factual/advice questions.
Usually leave \`category\` empty so every source is searched. Only filter when the topic is clearly one of these:
- practical tips for starting a task or stopping procrastination: "coping_strategy"
- thought patterns and behaviour techniques ("why does my brain do this"): "behavioral_therapy"
- diagnosis, assessment, medication or treatment questions: "diagnosis_treatment_guideline"
- exercise: "exercise"; habits: "habit_formation"; emotions: "emotion_regulation"
- If the user is panicking or having a meltdown, use \`suggest_emotion_exercise\` first (do not search the knowledge base).
- Use \`remember_about_user\` only for durable preferences or challenges the user states.

# CREATING TASKS
- due_date is REQUIRED for create_task.
- If missing, ask "when does this need to be done?" before creating the task.
- Break tasks into small subtasks.

# FORMATTING
- For factual or clinical claims, base your answer strictly on the text returned by the knowledge base.
- Use Markdown formatting (bold, bullets).
- Do not narrate that you are using a tool.

# SAFETY & LIMITS
- This is a support and self-reflection app, NOT a diagnostic tool. Never state or imply that the user has ADHD or any condition, even if the context below shows a high screening result.
- Screening and executive-function numbers are self-reported context only. Never present them as clinical findings; use them only to choose a gentler or more structured approach.
- Never invent clinical claims. If the knowledge base has nothing relevant, say so plainly and suggest talking to a doctor or other professional for anything clinical.
- Do not give medication advice (starting, stopping or changing doses); point the user to their doctor.
- If the user talks about harming themselves or not wanting to live, respond with warmth, encourage them to reach a trusted person or local emergency services, and do not use task, habit or focus tools.`;

// EF scores are shown with their status only. There is deliberately NO
// "weakest area": only Organization of Tasks is an exact score, the other six
// are approximate recoveries, and no overall EF score exists.
function formatContextBlock({ adhd, ef }) {
  let block = 'USER CONTEXT (self-reported, NOT a diagnosis):\n';

  if (adhd) {
    block +=
      `- ADHD self-screening (ASRS-based): ${adhd.percentage}% ` +
      `(${adhd.score}/${adhd.max_score}), model output: ${adhd.predicted_label}. ` +
      'Use only to adjust tone and structure.\n';
  } else {
    block += '- ADHD self-screening: not completed or unavailable.\n';
  }

  if (ef && ef.dimensions.length > 0) {
    block += '- Executive-function self-assessment (higher % = fewer self-reported difficulties):\n';
    ef.dimensions.forEach((d) => {
      block += `  - ${d.label}: ${d.pct}% (${d.status === 'exact' ? 'exact' : 'approximate'})\n`;
    });
    block +=
      'EF RULES: Only "Organization of Tasks" is an exact score; the other dimensions are ' +
      'approximate. There is no overall EF score. Do NOT rank the areas or call any of them ' +
      'the weakest, worst, best or strongest, and never compute or mention an overall score. ' +
      'Never quote these numbers back as clinical results.\n';
  } else {
    block += '- Executive-function self-assessment: not completed or unavailable.\n';
  }

  return block;
}

async function buildSystemPrompt(userId, hints) {
  const [adhd, ef] = await Promise.all([
    fetchADHDScreening(userId).catch((e) => {
      console.warn('buildSystemPrompt: ADHD summary failed:', e.message);
      return null;
    }),
    fetchEFSummary(userId).catch((e) => {
      console.warn('buildSystemPrompt: EF summary failed:', e.message);
      return null;
    }),
  ]);

  return (
    BASE_SYSTEM_PROMPT +
    '\n\n' +
    formatContextBlock({ adhd, ef }) +
    formatHintsForPrompt(hints)
  );
}

const tools = [
  createTask,
  updateTask,
  deleteTask,
  listOpenTasks,
  createHabit,
  updateHabit,
  deleteHabit,
  listHabits,
  startFocusSession,
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

async function handleMessage({
  userId,
  conversationId,
  userMessage,
  history = [],
  hints = null,
}) {
  const systemPrompt = await buildSystemPrompt(userId, hints);

  const messages = [
    new SystemMessage(systemPrompt),
    ...history.map((m) =>
      m.sender === 'assistant'
        ? new AIMessage(m.message)
        : new HumanMessage(m.message)
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
    .map((tc) => ({ name: tc.name, args: tc.args }));

  return { reply: finalMessage.content, toolCalls };
}

module.exports = { handleMessage };