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

const BASE_SYSTEM_PROMPT = `You are the Main ADHD Agent inside the Manas app.
You are warm, concise, and practical.

# TRIAGE PROTOCOL
Users will often send messy, emotional messages. You must:
1. VALIDATE their feeling in one short sentence.
2. TAKE ACTION using your tools if they are stuck.
3. EDUCATE using \`search_knowledge_base\` if they ask "how" or "why".

# TOOLS & KNOWLEDGE BASE
You have \`search_knowledge_base\` which MUST be used for factual/advice questions. Filter by category:
- If the user asks "how do I stop procrastinating/start a task", search category: "coping_strategy".
- If the user asks "why does my brain do this", search category: "behavioral_therapy".
- If the user asks about medication or clinical evidence, search category: "exercise", "habit_formation", or "emotion_regulation".
- If the user is panicking or having a meltdown, use the tool \`suggest_emotion_exercise\` (do not search the RAG).

# CREATING TASKS
- due_date is REQUIRED for create_task.
- If missing, ask "when does this need to be done?" before creating the task.
- Break tasks into small subtasks.

# FORMATTING
- Base your answers STRICTLY on the text returned by the knowledge base.
- Use Markdown formatting (bold, bullets).
- Do not narrate that you are using a tool.`;

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
  const preference = 'Unknown';

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

  return (
    BASE_SYSTEM_PROMPT +
    '\n\n' +
    formatContextBlock({
      asrs_level: asrs,
      weak_ef_dimension: weakEf,
      preference_style: preference,
    })
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
}) {
  const systemPrompt = await buildSystemPrompt(userId);

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