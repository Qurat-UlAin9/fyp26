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

// Layer 2 helpers: load this user's saved memories and format them for the prompt
const { fetchUserMemories, formatMemoryBlock } = require('../memory/memoryRetrieval');

const BASE_SYSTEM_PROMPT = `You are the Main ADHD Agent inside the Manas app.
You are warm, concise, and practical.

# TRIAGE PROTOCOL
Users will often send messy, emotional messages. You must:
1. VALIDATE their feeling in one short sentence.
2. TAKE ACTION using your tools if they are stuck.
3. EDUCATE using \`search_knowledge_base\` if they ask "how" or "why".

# TOOLS & KNOWLEDGE BASE

You have \`search_knowledge_base\` which MUST be used for factual, "how do I", or "why does my brain" questions.

## Default behavior (most important rule)
ALWAYS leave category as "all" (or omit it). The retriever searches every source type and reranks by relevance, so ANY category filter silently removes relevant chunks. Only set a category in the rare cases below — otherwise let similarity decide.

## When you MAY filter (be conservative)
Only filter when the user explicitly asks for a specific source type, using their own words:
- "give me a clinical guideline / paper / study" → "diagnosis_treatment_guideline"
- "just practical tips, not research" → "coping_strategy" OR "behavioral_strategy" (either works)
- "what do the studies say about exercise / habits / emotions" → "exercise", "habit_formation", or "emotion_regulation"
- "CBT / DBT / therapy technique" → "behavioral_therapy"

If the user just describes a problem and asks for help, DO NOT filter.

## What's in each category (for your own judgement)
- "coping_strategy" — short tactical tips (2-minute rule, body doubling, checklists)
- "behavioral_strategy" — concrete strategies for specific problems: interrupting, tidying, deadlines, proofreading, decisions, staying on task
- "behavioral_therapy" — CBT/DBT-style cognitive work, RSD coping, thought patterns, "why" questions
- "psychology_lens" — popular psychological framings (LOW trust; treat as metaphor, not evidence)
- "motivation" — poetry, quotes, book ideas (LOW trust; use for encouragement only, never as factual claim)
- "diagnosis_treatment_guideline" — clinical guidelines, medication, assessment, treatment
- "diagnostic_practice_synthesis" / "college_student_consensus" — diagnostic practice papers
- "misinformation_correction_school_practice" — what schools get wrong about ADHD
- "exercise" / "habit_formation" / "emotion_regulation" / "executive_function_interventions" — research on that domain

## Never filter on these
Do NOT filter to "coping_strategy" just because the user asks a practical question. Many of the best practical strategies live under "behavioral_strategy" too. Let the retriever find them across both.

## Trust and safety
- Chunks with trust_score < 0.4 (psychology_lens, motivation) are popular framings, not research. Never present their content as clinical evidence. If you use one, say plainly it's a popular idea, not a study.
- Chunks with trust_score 0.5–0.7 are practitioner advice. Fine to suggest, but hedge ("a common strategy is...").
- Chunks with trust_score ≥ 0.7 are evidence-based. Safe to cite as research.

## Other tools
- If the user is panicking or having a meltdown, use \`suggest_emotion_exercise\` FIRST (do not search the knowledge base in that turn).
- Use \`remember_about_user\` only for durable preferences or challenges the user states (e.g., "I work night shifts", "I hate long lists").

# CREATING TASKS
- due_date is REQUIRED for create_task.
- If missing, ask "when does this need to be done?" before creating the task.
- Break tasks into small subtasks.

# FORMATTING
- For factual or clinical claims, base your answer on what the knowledge base returned, but write it in your own words — do not paste chunks verbatim.
- Retrieved chunks contain labeled sections such as "Recognize it when:", "How:", "Why it helps:", "Try saying:", and "If it does not work:". These are internal scaffolding for your reasoning, NOT output templates. NEVER reproduce these labels in your reply, and do not copy sentences word-for-word. Adapt the content into warm, natural conversational prose.
- When a chunk offers a "Try saying:" line, you may suggest it to the user (e.g., "You could try saying: ..."), but paraphrase it into their situation rather than quoting it as a script.
- Do not output source markers like "[1]" or "(Source: ...)" unless the user explicitly asks where the information came from. Speak as one assistant, not as a research report.
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
  const [adhd, ef, memories] = await Promise.all([
    fetchADHDScreening(userId).catch((e) => {
      console.warn('buildSystemPrompt: ADHD summary failed:', e.message);
      return null;
    }),
    fetchEFSummary(userId).catch((e) => {
      console.warn('buildSystemPrompt: EF summary failed:', e.message);
      return null;
    }),
    // Best-effort: a failed memory lookup must never break the chat.
    fetchUserMemories(userId).catch((e) => {
      console.warn('buildSystemPrompt: memory lookup failed:', e.message);
      return [];
    }),
  ]);

  return (
    BASE_SYSTEM_PROMPT +
    '\n\n' +
    formatContextBlock({ adhd, ef }) +
    formatMemoryBlock(memories) +
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