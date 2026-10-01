const { createUserCrudRouter } = require('../utils/crudRouteFactory');
const { supabaseAdmin } = require('../config/supabase');
const agent = require('../services/ai/tools/graph');
const { generateSubtasks } = require('../services/ai/subtaskGenerator');

const fields = ['title', 'status', 'summary', 'metadata'];

// Existing generic CRUD for ai_conversations (list/create/update/delete)
const router = createUserCrudRouter({
  table: 'ai_conversations',
  allowedInsert: fields,
  allowedUpdate: fields,
});

// POST /api/ai/chat
// Body: { conversationId?: string, message: string }
// If conversationId is omitted, a new conversation is created.
router.post('/chat', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const { message } = req.body || {};
    let { conversationId } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message (string) is required.' });
    }

    // Create a conversation if this is the first message
    if (!conversationId) {
      const { data: conv, error: convError } = await supabaseAdmin
        .from('ai_conversations')
        .insert({
          user_id: userId,
          title: message.slice(0, 60),
          status: 'active',
        })
        .select()
        .single();

      if (convError) throw convError;
      conversationId = conv.id;
    }

    // Load recent history for this conversation (last 20 messages,
    // excluding the one we're about to save).
    const { data: historyRows, error: historyError } = await supabaseAdmin
      .from('ai_messages')
      .select('sender, message, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    if (historyError) {
      console.warn('Failed to load chat history:', historyError.message);
    }

    const history = (historyRows || []).map((row) => ({
      sender: row.sender,
      message: row.message,
    }));

    // Save the user's message
    const { error: userMsgError } = await supabaseAdmin
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        sender: 'user',
        message: message.trim(),
      });
    if (userMsgError) throw userMsgError;

    // Run the LangGraph ReAct agent (context injection + tool calling)
    const { reply, toolCalls } = await agent.handleMessage({
      userId,
      conversationId,
      userMessage: message.trim(),
      history,
    });

    // Save the assistant's reply
    const { data: aiMsg, error: aiMsgError } = await supabaseAdmin
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        sender: 'assistant',
        message: reply,
      })
      .select()
      .single();
    if (aiMsgError) throw aiMsgError;

    // Log every tool call that happened during this turn.
    // Execution time is not currently tracked per-tool in graph.js;
    // leave execution_time_ms null for now, or add timing later.
    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      const logs = toolCalls.map((tc) => ({
        conversation_id: conversationId,
        message_id: aiMsg.id,
        tool_name: tc.name,
        tool_input: tc.args || {},
        tool_output: {}, // populated later if we capture tool results per-call
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
      },
    });
  } catch (error) {
    console.error('POST /api/ai/chat failed:', error);
    return res.status(500).json({ error: error.message || 'Chat failed.' });
  }
});

// POST /api/ai/suggest-subtasks
// Body: { title: string }
// Returns: { data: { subtasks: string[] } }
//
// Used by the Add Task sheet to generate meaningful subtasks instead of
// the generic research/plan/execute template. Falls back to the generic
// template if the LLM is unreachable.
router.post('/suggest-subtasks', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const { title, category, subject } = req.body || {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title (string) is required.' });
    }

    const subtasks = await generateSubtasks(title.trim(), {
      category: typeof category === 'string' ? category : undefined,
      subject: typeof subject === 'string' ? subject : undefined,
    });
    return res.json({ data: { subtasks } });
  } catch (error) {
    console.error('POST /api/ai/suggest-subtasks failed:', error);
    return res.status(500).json({ error: error.message || 'Failed.' });
  }
});

module.exports = router;