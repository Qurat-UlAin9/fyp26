const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { createUserCrudRouter } = require('../utils/crudRouteFactory');
const { supabaseAdmin } = require('../config/supabase');
const agent = require('../services/ai/tools/graph');
const { analyzeMessage } = require('../services/ai/perception');
const { checkReply } = require('../services/ai/outputGuard');
const time = require('../services/ai/context/timeContext');
const {
  getPlanningContext,
  planTask,
  scheduleSteps,
  estimateAvailableMinutes,
  rescheduleMissedForUser,
} = require('../services/ai/subtaskPlanner');
const { extractLinks } = require('../services/ai/coachLinks');
const { routeMessage, applyLanePolicy } = require('../services/ai/chatRouter');
const { buildTaskCoachContext } = require('../services/ai/context/taskCoachContext');

// Apply Auth Middleware to EVERYTHING in this file
router.use(requireAuth);

// ============================================================================
// 1. CUSTOM ROUTES (Must be defined before the CRUD router's /:id)
// ============================================================================

// GET /api/ai/history
router.get('/history', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

    const { data: conv, error: convError } = await supabaseAdmin
      .from('ai_conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convError) throw convError;
    if (!conv) return res.json({ data: { conversationId: null, messages: [] } });

    const { data: messages, error: msgError } = await supabaseAdmin
      .from('ai_messages')
      .select('id, sender, message, created_at, metadata')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });

    if (msgError) throw msgError;

    const ids = (messages || []).map((m) => m.id);
    let ratingById = {};
    if (ids.length) {
      const { data: fb } = await supabaseAdmin
        .from('feedback_events').select('message_id, rating')
        .eq('user_id', userId).in('message_id', ids);
      ratingById = Object.fromEntries((fb || []).map((f) => [f.message_id, f.rating]));
    }
    return res.json({
      data: {
        conversationId: conv.id,
        messages: (messages || []).map((m) => ({ ...m, rating: ratingById[m.id] ?? null })),
      },
    });
  } catch (error) {
    console.error('GET /api/ai/history failed:', error);
    return res.status(500).json({ error: 'Failed to load history.' });
  }
});

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { message, fromOption, context } = req.body || {};
    let { conversationId } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message (string) is required.' });
    }

    const perception = analyzeMessage(message);

    if (!perception.ok && perception.reason === 'too_long') {
      return res.json({
        data: {
          conversationId: conversationId || null,
          reply: perception.reply,
          toolCalls: [],
          rejected: 'too_long',
        },
      });
    }

    if (!conversationId) {
      const { data: conv, error: convError } = await supabaseAdmin
        .from('ai_conversations')
        .insert({
          user_id: userId,
          title: perception.crisis ? 'Chat' : message.slice(0, 60),
          status: 'active',
        })
        .select()
        .single();

      if (convError) throw convError;
      conversationId = conv.id;
    }

    const { data: historyRows, error: historyError } = await supabaseAdmin
      .from('ai_messages')
      .select('sender, message, created_at, metadata')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(8);

    if (historyError) {
      console.warn('Failed to load chat history:', historyError.message);
    }

    const orderedRows = (historyRows || []).reverse();
    const history = orderedRows.map((row) => ({
      sender: row.sender,
      message: row.message,
    }));
    // The lane of the coach's last reply, so "yes" or a tapped button stays in the same lane
    const lastLane =
      [...orderedRows].reverse().find((row) => row.sender === 'assistant' && row.metadata?.lane)?.metadata?.lane || null;

    const { error: userMsgError } = await supabaseAdmin
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        sender: 'user',
        metadata: fromOption ? { fromOption: true } : {},
        message: message.trim(),
      });
    if (userMsgError) throw userMsgError;

    if (perception.crisis) {
      console.warn(`[perception] crisis keywords matched (conversation ${conversationId})`);

      const { error: crisisMsgError } = await supabaseAdmin
        .from('ai_messages')
        .insert({
          conversation_id: conversationId,
          sender: 'assistant',
          message: perception.reply,
        });
      if (crisisMsgError) throw crisisMsgError;

      return res.json({
        data: {
          conversationId,
          reply: perception.reply,
          toolCalls: [],
          crisis: true,
        },
      });
    }

    // DEV ONLY: UI testing without spending model tokens
    if (process.env.AI_MOCK === '1') {
      const mockReply = "I hear you, that's a lot. Want to sort it out together?";
      const mockOptions = ["Yes, let's sort it", 'Show my tasks', 'Just vent'];
      const { data: mockMsg, error: mockErr } = await supabaseAdmin
        .from('ai_messages')
        .insert({ conversation_id: conversationId, sender: 'assistant', message: mockReply, metadata: { options: mockOptions } })
        .select().single();
      if (mockErr) throw mockErr;
      return res.json({ data: { conversationId, reply: mockReply, toolCalls: [], messageId: mockMsg.id, options: mockOptions } });
    }

    // Pick the lane (task / action / support / knowledge / chat) and run the agent for it
    const { lane, reason: laneReason } = routeMessage({
      message: message.trim(),
      hints: perception.hints,
      fromOption: !!fromOption,
      focusContext: context,
      lastLane,
    });
    console.log(`[route] lane=${lane} (${laneReason}) lastLane=${lastLane || 'none'}`);

    // "Ask coach" on a step: the app sends ids only; the server loads the full, current task state
    const coachFocus = context ? await buildTaskCoachContext(userId, context).catch(() => context) : null;

    const { reply: agentReply, toolCalls, retrievedChunkIds, promptVersionId, appActions } = await agent.handleMessage({
      userId,
      conversationId,
      userMessage: message.trim(),
      history,
      hints: perception.hints,
      focusContext: coachFocus,
      lane,
    });

    const guard = checkReply(agentReply || 'What would you like to do next?');
    if (!guard.ok) {
      console.warn(
        `[outputGuard] reply replaced (rules: ${guard.flags.join(', ')}; conversation ${conversationId})`
      );
    }
    // Tappable options: the model ends its reply with [[options: A | B | C]].
    // We cut that marker out of the text and return it as buttons.
    const rawReply = String(guard.reply || '');
    const optMatch = rawReply.match(/\[\[\s*options\s*:([\s\S]*?)\]\]/i);
    const parsedOptions = optMatch
      ? optMatch[1].split('|').map((o) => o.trim()).filter(Boolean).map((o) => o.slice(0, 40)).slice(0, 4)
      : [];
    // Screen links: [[link: Key | Label]] -> buttons that open an app screen
    const allLinks = extractLinks(rawReply);
    const reply =
      rawReply
        .replace(/\[\[\s*options\s*:[\s\S]*?\]\]/gi, '')
        .replace(/\[\[\s*link\s*:[\s\S]*?\]\]/gi, '')
        .replace(/\[\[[^\]]*$/, '') // an unfinished marker at the very end
        .trim() || 'What would you like to do next?';

    // Older tool-based options still work as a fallback (present_options tool)
    const optionsCall = [...(toolCalls || [])].reverse().find((tc) => tc.name === 'present_options');
    const rawOptions = parsedOptions.length
      ? parsedOptions
      : Array.isArray(optionsCall?.args?.options)
        ? optionsCall.args.options.map((o) => String(o).slice(0, 40)).slice(0, 4)
        : [];

    // The lane decides what may be on the reply: a knowledge answer never carries buttons or links,
    // a task reply only links to task screens, and so on (even if the model added a marker anyway)
    const { options, links: laneLinks } = applyLanePolicy(lane, { options: rawOptions, links: allLinks });
    const links = laneLinks;

    console.log(
      '[chat] tools:', (toolCalls || []).map((t) => t.name),
      '| options:', options,
      '| links:', links.map((l) => l.key),
      '| tail:', JSON.stringify(rawReply.slice(-100))
    );

    // Save assistant reply WITH retrieved chunk IDs AND prompt version ID
    const { data: aiMsg, error: aiMsgError } = await supabaseAdmin
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        sender: 'assistant',
        message: reply,
        retrieved_chunk_ids: retrievedChunkIds || [],
        prompt_version_id: promptVersionId,
        metadata: {
          lane,
          ...(options.length ? { options } : {}),
          ...(links.length ? { links } : {}),
        },
      })
      .select()
      .single();
    if (aiMsgError) throw aiMsgError;

    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      const logs = toolCalls.map((tc) => ({
        conversation_id: conversationId,
        message_id: aiMsg.id,
        tool_name: tc.name,
        tool_input: tc.args || {},
        tool_output: {},
        execution_time_ms: null,
        success: true,
      }));

      const { error: logError } = await supabaseAdmin
        .from('tool_execution_logs')
        .insert(logs);

      if (logError) {
        console.warn('Failed to log tool executions:', logError.message);
      }
    }

    return res.json({
      data: {
        conversationId,
        reply,
        toolCalls: Array.isArray(toolCalls) ? toolCalls : [],
        messageId: aiMsg.id,
        options,
        links,
        lane,
        appActions: Array.isArray(appActions) ? appActions : [],
      },
    });
  } catch (error) {
    console.error('POST /api/ai/chat failed:', error);
    if (error?.status === 429 || error?.status === 503) {
      return res.status(429).json({ error: 'The coach is busy for a moment. Please try again in about 30 seconds.' });
    }
    return res.status(500).json({ error: error.message || 'Chat failed.' });
  }
});

// POST /api/ai/suggest-subtasks
router.post('/suggest-subtasks', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { title, category, subject, deadline } = req.body || {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title (string) is required.' });
    }
    if (!deadline || typeof deadline !== 'string') {
      return res.status(400).json({
        error: 'deadline (YYYY-MM-DD) is required to schedule subtasks.',
      });
    }

    // Same planner the coach uses: small steps with a time cap, spread over free days
    const tz = await time.getUserTimezone(userId);
    const now = time.nowInTz(tz);
    let dueISO = time.resolveDueDate(deadline, tz);
    if (!dueISO) return res.status(400).json({ error: 'deadline could not be understood.' });
    if (dueISO < now.iso) dueISO = now.iso;

    const plan = await getPlanningContext(userId, tz);
    const nowHour = now.hour + now.minute / 60;
    const planned = await planTask(
      {
        title: title.trim(),
        category: typeof category === 'string' ? category : undefined,
        subject: typeof subject === 'string' ? subject : undefined,
        daysLeft: time.diffDaysISO(now.iso, dueISO),
        availableMinutes: estimateAvailableMinutes({ today: now.iso, nowHour, deadline: dueISO, ...plan.schedOpts }),
      },
      plan.maxSession
    );
    const steps = planned.steps;
    const sched = scheduleSteps(steps, { today: now.iso, nowHour, deadline: dueISO, ...plan.schedOpts });

    return res.json({
      data: {
        subtasks: sched.items.map((s, i) => ({
          id: `preview-${Date.now()}-${i}`,
          title: s.title,
          done: false,
          kind: s.kind,
          detail: s.detail || null,
          scheduledDate: s.scheduledDate,
          scheduledHour: s.scheduledHour,
          durationMins: s.durationMins,
        })),
        taskType: planned.taskType,
        materials: planned.materials,
        preferredHour: plan.preferredHour,
        tight: sched.tight,
        // extra detail for the app: normal | stretched | extended | overloaded
        mode: sched.mode,
        window: sched.window,
        shortfallMinutes: sched.shortfallMinutes,
        pastDeadline: sched.pastDeadline,
      },
    });
  } catch (error) {
    console.error('POST /api/ai/suggest-subtasks failed:', error);
    return res.status(500).json({ error: error.message || 'Failed.' });
  }
});

// POST /api/ai/reschedule-missed
// Re-plans the unfinished steps of every task that has a missed step (see rescheduleMissedForUser).
// Safe to call repeatedly: when nothing is missed it changes nothing.
router.post('/reschedule-missed', async (req, res) => {
  try {
    const userId = req.user?.id;
    // Use the phone's own timezone when it sends one, so the server and the phone agree on "now"
    const deviceTz = req.body?.timezone;
    if (time.validTz(deviceTz)) await time.rememberUserTimezone(userId, deviceTz);
    const tz = time.validTz(deviceTz) ? deviceTz : await time.getUserTimezone(userId);
    const result = await rescheduleMissedForUser(userId, tz);
    return res.json({ data: result });
  } catch (error) {
    console.error('POST /api/ai/reschedule-missed failed:', error);
    return res.status(500).json({ error: error.message || 'Failed.' });
  }
});

// ============================================================================
// 2. GENERIC CRUD ROUTES
// ============================================================================

const fields = ['title', 'status', 'summary', 'metadata'];
const crudRouter = createUserCrudRouter({
  table: 'ai_conversations',
  allowedInsert: fields,
  allowedUpdate: fields,
});

// Mount the CRUD router after our custom routes.
router.use('/', crudRouter);

module.exports = router;