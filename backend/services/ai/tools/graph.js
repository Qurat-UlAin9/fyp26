const { createChatModel } = require('../llmProvider');
const { createReactAgent } = require('@langchain/langgraph/prebuilt');
const { SystemMessage, HumanMessage, AIMessage } = require('@langchain/core/messages');

const { createTask, updateTask, deleteTask, listOpenTasks, completeSubtask, getTaskDetails } = require('./taskTool');
const { createHabit, updateHabit, deleteHabit, listHabits } = require('./habitTool');
const { startFocusSession } = require('./focusTool');
const { suggestExercise } = require('./exerciseTool');
const { searchKnowledgeBase } = require('./knowledgeTool');
const { rememberAboutUser } = require('./memoryTool');
const { logMood } = require('./moodTool');
const { completeHabit } = require('./habitCheckTool');
const { buyReward, applyReward } = require('./rewardTool');
const { formatAppBlock, wantsFullApp } = require('../context/appState');
const { getAppState } = require('../../rewards/rewardsService');
const { getUserTimezone, formatDateBlock } = require('../context/timeContext');
const { setCoachName, fetchCoachName, formatNameBlock } = require('./nameTool');
const { fetchADHDScreening, fetchEFSummary } = require('./assessmentTool');
const { formatHintsForPrompt } = require('../perception');
const { fetchUserMemories, formatMemoryBlock } = require('../memory/memoryRetrieval');

// Dynamic prompt variants (A/B), exemplar bank, mood context, app links
const { getActivePrompt } = require('../prompts/promptService');
const { fetchExemplars, formatExemplarBlock } = require('../exemplars/exemplarRetrieval');
const { fetchRecentMoods, formatMoodBlock } = require('../context/moodContext');
const { formatLinkCatalog } = require('../coachLinks');
const { fetchKnowledgeContext, formatKnowledgeBlock } = require('../context/knowledgeContext');
const { fetchOpenTasks, formatTaskBlock } = require('../context/taskContext');

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


// ---------------------------------------------------------------------------
// Lanes. chatRouter.js decides which lane a message belongs to; each lane gets its OWN prompt,
// its own tools and only the context it needs, so the answers no longer mix.
// The prompt text is written as principles on purpose: no sample replies, so the model shapes each
// answer around the user instead of copying a template.
// ---------------------------------------------------------------------------

// Shared by every lane
const CORE_STYLE = `

HOW TO RESPOND (always follow; these override anything above about length, format or style):

Who you are: a warm, knowledgeable friend who knows a lot about ADHD, focus, emotions, habits and study skills. You work WITH the user ("let's", "we"). You never lecture, never order them around, never diagnose, never give medication advice.

Length: exactly as long as the content needs, never padded. Do not repeat the user's own words back to them.

Format: conversational text. Use a short bullet or numbered list only for steps, types or stages (one line per item, at most 6 items). At most two **bold** phrases. No headings, tables or horizontal rules. At most one emoji.

Variety: do not open or close every reply the same way, and never reuse phrases from your earlier replies in this chat.

Honesty: use the reference knowledge when it is provided. Never invent studies, numbers or quotes. If you are unsure, say so. You are not a doctor: do not diagnose or advise on medication, and mention professional help only when it is genuinely warranted.`;

// Buttons: only for a real clarifying question or a yes/no confirmation
const OPTIONS_RULES = `

Clarifying questions (the ONLY use of buttons):
- Ask only when something unclear really changes your answer. Otherwise decide sensibly and answer.
- When several things are unclear, ask about the single most important one now, wait, and ask the next only if it is still needed after their answer. Stop as soon as you know enough. Normally 1 to 3 clarifications, never more.
- A clarifying reply is short: one sentence of acknowledgement, then the question. One question per reply.
- Offer buttons only for a clarifying question, or a yes/no confirmation before changing the user's data. Never add them to a normal answer, to a "what next?" menu, or to a reply that already helps.
- If the possible answers are a few clear choices, use buttons. If the answer is personal and open-ended, ask it in plain text. Never ask the user how YOU should respond or what kind of answer they want; decide that yourself.
- Button format: end the reply with exactly one line [[options: First option | Second option | Third option]] (2 to 4 options, at most 5 words each, separated by |). Never write the options anywhere else. If you ask for something the user must type (a name, a date, a title), add no options line.`;

const KNOWLEDGE_LANE = `

THIS MESSAGE: the user wants to understand something about ADHD, focus, emotions, habits, sleep or study skills.
- Answer it properly, grounded in the REFERENCE KNOWLEDGE where it fits: what it is, why it happens or matters, and how to use or apply it, in whatever order fits what they asked. When there are types, stages or steps, name each one with a single short line.
- Be accurate and complete enough to be useful on its own, never a teaser. Teaching replies can run to roughly 200 words. Skip sympathy unless they showed a feeling.
- Plain conversational text only. NO buttons, NO [[options: ...]] line, NO [[link: ...]] markers. Do not create or suggest tasks, habits, exercises or app screens in this reply.
- Finish with one plain sentence inviting them to go deeper that names one or two specific subtopics taken from what they asked.`;

const SUPPORT_LANE = `

THIS MESSAGE: the user is sharing a feeling or a struggle.
- First make them feel genuinely heard by reflecting THEIR specific situation and feeling in your own words (not a generic "that sounds hard"). Then give real help: why this tends to happen, in plain language, and one to three concrete things that could help, using the reference knowledge when it fits. If it is true, point out something positive (a strength, a small win, what they are already doing right). Emotional replies usually take about 4 to 7 sentences.
- If they are panicking or in acute distress, keep it short, calm and grounding; deeper information can wait until they are steadier.
- Do not create tasks or habits in this reply and do not turn it into a to-do list. If they want help with their work, ask in plain text whether they would like to look at it together.
- When your answer touches a topic with more depth, you may finish with one plain sentence inviting them to go deeper. Leave it out when the conversation is purely emotional.`;

const CHAT_LANE = `

THIS MESSAGE: small talk or a very short reply. Answer naturally and briefly, one to three sentences. No buttons, no [[...]] markers, no lists. Do not start tasks, habits or exercises unless they ask.`;

const TASK_LANE_INTRO = `

THIS MESSAGE is about the user's tasks or steps. Stay on the task: do not give general emotional advice or long explanations about ADHD in this reply. If they also sound stressed, acknowledge it in one short sentence and then act.`;

const TASK_COACHING_RULES = `

TASK COACHING:
- The OPEN TASKS block in your context is current. Check it before creating anything. If a matching task exists, use it. Never create duplicates. (list_open_tasks is only needed if you suspect it changed during this chat.)
- If the user is overwhelmed by work: first acknowledge how it feels, then if tasks exist name the ONE most urgent next step and ask whether they want to start it. If no tasks exist, ask what the work is and when it is due, then create it.
- After creating a task, give a one-line summary (what it is and the due day), then the first step with its time exactly as the tool printed it. Say that every step is short and you will do it together, and offer to start the first step right now. Show the full list of steps (title and time) only when the user asked to see it.
- If the tool result says HEADS UP, the plan is tight or does not fit. Say so honestly in plain words and offer the options it lists (a later deadline, fewer or shorter steps, a longer daily time window). Never hide it.
- Dates and times come from the CURRENT DATE block and from tool results. Never work them out yourself and never change how a tool printed them.
- Work on ONE step at a time. For a step about choosing or brainstorming a topic, narrow it down with clarifying questions (offer 2 to 4 areas as buttons, then narrower ones) until they settle; when they name the result, call complete_subtask with note = that result.
- After completing a step, celebrate it as the real milestone it is, say when the NEXT step is scheduled (bold the day and time), and ask what they would like to do now.
- If the user says they finished a step, call complete_subtask. If you only suspect it, ask a yes/no confirmation first. Never tick a step without confirmation.
- Never order the user to do things ("create a task", "add a habit"); do it with them.

STUDY HELP (when the user is on a step that teaches something, or wants to learn a subject for a task):
- Teach it yourself from your own general knowledge. The research library only holds ADHD and wellbeing material, so never use it or mention it for subject content.
- Explain in small pieces: what it is in plain words, why it matters, how it works in 3 to 5 short stages (one line each). Then ask one quick check question, or ask them to say it back in their own words. Give one piece at a time and ask whether they want the next; never dump a whole course.
- Keep it ADHD-friendly: short paragraphs, a concrete comparison for each hard idea, one idea at a time.
- Do not tell the user to go watch a video, read an article or search online unless they ask for resources.
- When they finish a piece (they explained it back or answered the check), tick the matching step with complete_subtask and put their result in the note.
- Get ids from the OPEN TASKS block, list_open_tasks or get_task_details. Never invent ids.`;

const TASK_LINK_RULES = `

SCREEN BUTTONS: after you create or change a task, you may add one line [[link: Tasks | See my tasks]] (or Timeline or Focus) placed before any options line. Use no other keys in this reply.`;

const ACTION_LANE = `

THIS MESSAGE asks you to do something in the app (a habit, a focus session, coins, themes, music, your name). Do it with the right tool, then say what you did in a sentence or two. Keep it short; no long explanations.
- Habits: when the user says they did a habit ("I did my walk", "I meditated"), call complete_habit, then celebrate in one short sentence (mention the streak if the tool reports one). If the user names a time for a habit (for example 7:30) pass it as clock_time; habits are short, so pass duration_mins only when they say how long.
- Focus: when the user wants to focus, call start_focus_session; the app shows a Start button under your message.
- Never claim you ticked, logged or saved something unless the tool result confirmed it.`;

const REWARD_RULES = `

REWARDS AND THE APP (use the AIMS APP STATE block; never invent items, prices or badges):
- Ticking a habit or finishing a step for the user also earns them the same coins as doing it themselves. Mention the coins briefly when it happens.
- Coins can buy themes and music. When it fits (they ask what to do with coins) you may mention ONE thing they can afford right now. Never push it.
- Spending coins needs a clear yes to that exact item. Suggest first, and call buy_reward only after they agree. After a purchase, offer to switch to it, and call apply_reward when they say yes or ask to change the theme or play a song.
- When asked what is in the app (songs, themes, badges, features), answer from the state and feature list. Open Rewards with a link only if they want to browse.`;

const ACTION_LINK_RULES = `

SCREEN BUTTONS: after you change something, you may add one line [[link: Key | Button label]] (max 2, placed before any options line) to open that screen. Keys you may use: Habits (daily habits and streaks), Focus (focus timer with background sounds), Rewards (coins, themes and music), Timeline (today's schedule), Tasks, Soundscapes (calm music). Use no other keys in this reply.`;

const SUPPORT_LINK_RULES = `

SCREEN BUTTONS (most replies need none):
- When the user is clearly stressed, anxious, angry, sad or restless (said in chat or visible in the recent mood), or asks for something calming, offer ONE fitting exercise as a line [[link: Key | Button label]], never as an order. Match the feeling: overwhelm or panic -> Grounding; anger or anxiety -> Balloon; sadness -> Ripples; racing thoughts or restlessness -> Ripples; a quick reset -> Splash; calming music -> Soundscapes; a menu of quick exercises -> ImmediateRelief; emotion skills -> EmotionRegulation. Put it before any options line. Use no other keys in this reply.
- Suggest an exercise only when the user is clearly distressed or asks for one, at most one per reply, and not in consecutive replies.

AFTER AN EXERCISE OR GAME (the user's message says they finished one and how they feel):
- React in two or three sentences that fit how they feel. Do not repeat the exercise name back like a report.
- Feeling better: celebrate it, and ask in plain text whether they want to go back to what they were working on.
- About the same or still tough: do not push tasks. Validate it, and gently suggest something different (another calming exercise as a link, music, or simply talking).

LOGGING MOOD: when the user clearly says how they feel (in words, or in a message like "I feel better now" after an exercise), call log_mood once with the closest mood (better or relaxed -> Calm, okay -> Steady, stressed, worried, angry or still tough -> Anxious, low or down -> Sad, drained -> Tired). Set trigger to after_exercise when they just finished an exercise or game, task_stress when the feeling is about their work, otherwise chat. Do not log when they did not say how they feel. Never claim you logged something unless the tool result confirmed it.`;

function formatFocusContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return '';
  const s = (v, n = 200) => String(v ?? '').slice(0, n);

  // Older / fallback shape: only ids and titles
  if (!Array.isArray(ctx.steps)) {
    return (
      `\n\nCURRENT FOCUS (the user tapped "Ask coach" on this step): task "${s(ctx.taskTitle)}" (task_id: ${s(ctx.taskId)}), ` +
      `step "${s(ctx.subtaskTitle)}" (subtask_id: ${s(ctx.subtaskId)}). ` +
      'Open with a short motivating line about why this step matters, then ask how they would like to tackle it together.\n'
    );
  }

  const cur = ctx.current;
  const mark = (st) => (st.done ? 'done' : st.missed ? 'missed' : 'todo');
  const lines = ctx.steps.map(
    (st) =>
      `  ${st.n}. [${mark(st)}] (${st.kind}) ${s(st.title, 120)}${st.detail ? ` - ${s(st.detail, 160)}` : ''}` +
      `${st.note ? ` (their result: ${s(st.note, 120)})` : ''}` +
      `${cur && st.id === cur.id ? '   <- THE STEP THE USER IS ASKING ABOUT' : ''}`
  );

  const typeRule =
    cur?.kind === 'learn'
      ? 'This is a LEARN step: teach this one sub-topic yourself, in small pieces (what it is, why it matters, how it works in 3 to 5 short stages, one concrete comparison). Give ONE piece, then a quick check question, then ask if they want the next piece.'
      : cur?.kind === 'prepare'
        ? 'This is a PREPARE step: go through the list of what to gather as a checklist, one or two items at a time, and ask them to confirm when everything is within reach.'
        : cur?.kind === 'review'
          ? 'This is a REVIEW step: ask them to show or tell you the result, point out what is good and ONE thing to fix.'
          : 'This is a DO step: guide the action one small move at a time, using the step detail, and ask them to tell you when each move is done.';

  return (
    '\n\nCURRENT FOCUS (the user tapped "Ask coach" on a step). You know everything about this task from here; never ask them to repeat it.\n' +
    `TASK: "${s(ctx.taskTitle)}" (task_id: ${s(ctx.taskId)}), type: ${s(ctx.taskType || 'unknown')}, status: ${s(ctx.taskStatus)}` +
    `${ctx.dueDate ? `, due ${s(ctx.dueDate)}` : ''}, today is ${s(ctx.today)}.\n` +
    `${ctx.taskDescription ? `DESCRIPTION: ${s(ctx.taskDescription, 300)}\n` : ''}` +
    `${ctx.materials?.length ? `MATERIALS TO GATHER: ${ctx.materials.map((m) => s(m, 80)).join('; ')}\n` : ''}` +
    `PROGRESS: ${ctx.doneSteps} of ${ctx.totalSteps} steps done.\n` +
    `ALL STEPS IN ORDER:\n${lines.join('\n')}\n` +
    (cur
      ? `CURRENT STEP: ${cur.n}. "${s(cur.title)}" (subtask_id: ${s(cur.id)}), status ${mark(cur)}` +
        `${cur.scheduledDate ? `, scheduled ${s(cur.scheduledDate)}` : ''}.\n`
      : `CURRENT STEP: "${s(ctx.subtaskTitle)}" (subtask_id: ${s(ctx.subtaskId)}).\n`) +
    `${typeRule}\n` +
    'Open with one short motivating line about why this step matters for the whole task, then start on it right away (buttons are fine only for a real choice). ' +
    'When they finish the step, call complete_subtask with this subtask_id and put their result in the note. Use the steps before and after it to connect the work; do not re-plan the task unless they ask.\n'
  );
}

// What each lane loads. Anything not listed is not fetched, so unrelated context never leaks in.
const LANE_NEEDS = {
  task: { tasks: true, mood: false, knowledge: false, app: false },
  action: { tasks: true, mood: false, knowledge: false, app: true },
  support: { tasks: false, mood: true, knowledge: true, app: false },
  knowledge: { tasks: false, mood: false, knowledge: true, app: false },
  chat: { tasks: false, mood: true, knowledge: false, app: false },
};

function laneRules(lane) {
  switch (lane) {
    case 'task':
      return TASK_LANE_INTRO + TASK_COACHING_RULES + OPTIONS_RULES + TASK_LINK_RULES;
    case 'action':
      return ACTION_LANE + REWARD_RULES + OPTIONS_RULES + ACTION_LINK_RULES;
    case 'support':
      return SUPPORT_LANE + OPTIONS_RULES + SUPPORT_LINK_RULES;
    case 'knowledge':
      return KNOWLEDGE_LANE;
    default:
      return CHAT_LANE;
  }
}

// Only the signals that belong to the lane (language always; urgency advice only where exercises are allowed)
function hintsForLane(hints, lane) {
  if (!hints) return null;
  return {
    language: hints.language,
    intent: 'chat',
    urgency: lane === 'support' || lane === 'chat' ? hints.urgency : 'normal',
  };
}

async function buildSystemPrompt(userId, hints, userMessage, focusContext, history = [], runConfig = null, lane = 'chat') {
  const needs = LANE_NEEDS[lane] || LANE_NEEDS.chat;
  const skip = (v) => Promise.resolve(v);

  const [promptData, adhd, ef, memories, exemplars, moods, tasks, coachName, knowledge] = await Promise.all([
    getActivePrompt(userId),
    fetchADHDScreening(userId).catch((e) => { console.warn('ADHD fetch failed:', e.message); return null; }),
    fetchEFSummary(userId).catch((e) => { console.warn('EF fetch failed:', e.message); return null; }),
    fetchUserMemories(userId).catch((e) => { console.warn('Memory fetch failed:', e.message); return []; }),
    // Few-shot exemplars are OFF by default: they make replies copy a fixed shape. Set USE_EXEMPLARS=true to re-enable.
    USE_EXEMPLARS ? fetchExemplars(userMessage).catch((e) => { console.warn('Exemplar fetch failed:', e.message); return []; }) : skip([]),
    needs.mood ? fetchRecentMoods(userId).catch((e) => { console.warn('Mood fetch failed:', e.message); return []; }) : skip([]),
    needs.tasks ? fetchOpenTasks(userId).catch((e) => { console.warn('Task fetch failed:', e.message); return []; }) : skip([]),
    fetchCoachName(userId).catch((e) => { console.warn('Coach name fetch failed:', e.message); return null; }),
    needs.knowledge
      ? fetchKnowledgeContext(userMessage, history).catch((e) => { console.warn('Knowledge fetch failed:', e.message); return { items: [], ids: [] }; })
      : skip({ items: [], ids: [] }),
  ]);

  // Remember which passages were shown, so thumbs up/down can be linked to them
  if (runConfig?.configurable && knowledge.ids.length) {
    runConfig.configurable.retrievedChunkIds.push(...knowledge.ids);
  }

  const finalPromptText =
    promptData.text +
    '\n\n' +
    formatContextBlock({ adhd, ef }) +
    formatMemoryBlock(memories) +
    formatNameBlock(coachName) +
    (needs.mood ? formatMoodBlock(moods) : '') +
    formatDateBlock(runConfig?.configurable?.timezone) +
    (needs.tasks ? formatTaskBlock(tasks) : '') +
    (needs.app ? formatAppBlock(runConfig?.configurable?.appState, wantsFullApp(userMessage, history)) : '') +
    (needs.knowledge ? formatKnowledgeBlock(knowledge.items) : '') +
    formatExemplarBlock(exemplars) +
    formatHintsForPrompt(hintsForLane(hints, lane)) +
    CORE_STYLE +
    laneRules(lane) +
    (lane === 'task' ? formatFocusContext(focusContext) : '');

  return { promptVersionId: promptData.id, promptText: finalPromptText };
}

const USE_EXEMPLARS = String(process.env.USE_EXEMPLARS || '').toLowerCase() === 'true';

// Each lane only gets the tools it needs. knowledge and chat get none: they are one plain model call.
const LANE_TOOLS = {
  task: [createTask, updateTask, deleteTask, listOpenTasks, completeSubtask, getTaskDetails, startFocusSession, rememberAboutUser],
  action: [
    createHabit, updateHabit, deleteHabit, listHabits, completeHabit, startFocusSession, listOpenTasks,
    setCoachName, buyReward, applyReward, logMood, rememberAboutUser,
  ],
  support: [logMood, rememberAboutUser, suggestExercise],
  knowledge: [],
  chat: [],
};

const model = createChatModel({ temperature: 0.5, maxTokens: 1500, purpose: 'coach' });
const agentCache = {};
function agentFor(lane) {
  if (!agentCache[lane]) agentCache[lane] = createReactAgent({ llm: model, tools: LANE_TOOLS[lane] });
  return agentCache[lane];
}

const textOf = (content) =>
  Array.isArray(content) ? content.map((p) => (typeof p === 'string' ? p : p?.text || '')).join('') : content;

async function handleMessage({ userId, conversationId, userMessage, history = [], hints = null, focusContext = null, lane = 'chat' }) {
  if (!LANE_TOOLS[lane]) lane = 'chat';

  // Coins, themes, music and badges now live on the server (user_rewards table); only the action lane shows them
  const appState = LANE_NEEDS[lane].app
    ? await getAppState(userId).catch((e) => {
        console.warn('Rewards fetch failed (is user_rewards created?):', e.message);
        return null;
      })
    : null;
  const timezone = await getUserTimezone(userId);
  const runConfig = {
    configurable: {
      userId,
      conversationId,
      timezone,       // the user's timezone: dates are resolved in code, never guessed by the model
      retrievedChunkIds: [],
      appState,       // read-only here: used for the prompt block
      appActions: [], // notes for the app after the reply (rewards_changed: refresh, toast, play music)
    },
  };
  const { promptVersionId, promptText } = await buildSystemPrompt(userId, hints, userMessage, focusContext, history, runConfig, lane);
  console.log(`[prompt] lane=${lane} ~${Math.round(promptText.length / 4)} tokens in the system prompt`);

  // Clean history: start with a user turn and never two same-role turns in a row
  const cleanHistory = [];
  for (const m of history) {
    if (!cleanHistory.length && m.sender === 'assistant') continue;
    const last = cleanHistory[cleanHistory.length - 1];
    if (last && last.sender === m.sender) last.message += '\n' + m.message;
    else cleanHistory.push({ sender: m.sender, message: m.message });
  }

  const messages = [
    new SystemMessage(promptText),
    ...cleanHistory.map((m) => (m.sender === 'assistant' ? new AIMessage(m.message) : new HumanMessage(m.message))),
    new HumanMessage(userMessage),
  ];

  // No tools in this lane: one plain model call, no agent loop
  if (LANE_TOOLS[lane].length === 0) {
    const out = await model.invoke(messages);
    return {
      reply: textOf(out.content),
      toolCalls: [],
      retrievedChunkIds: runConfig.configurable.retrievedChunkIds,
      appActions: [],
      promptVersionId,
      lane,
    };
  }

  const result = await agentFor(lane).invoke({ messages }, runConfig);
  const finalMessage = result.messages[result.messages.length - 1];

  const toolCalls = result.messages
    .filter((m) => m._getType?.() === 'ai' && m.tool_calls?.length)
    .flatMap((m) => m.tool_calls)
    .map((tc) => ({ name: tc.name, args: tc.args }));

  return {
    reply: textOf(finalMessage.content),
    toolCalls,
    retrievedChunkIds: runConfig.configurable.retrievedChunkIds,
    appActions: runConfig.configurable.appActions,
    promptVersionId,
    lane,
  };
}

module.exports = { handleMessage, buildSystemPrompt, LANE_TOOLS, LANE_NEEDS };
