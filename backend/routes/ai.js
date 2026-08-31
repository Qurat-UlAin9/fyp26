const { createUserCrudRouter } = require('../utils/crudRouteFactory');
const { supabaseAdmin } = require('../config/supabase');
const agent = require('../services/ai/agent');

const fields = ['title', 'status', 'summary', 'metadata'];

// Existing generic CRUD for ai_conversations (list/create/update/delete)
// stays exactly as it was — /chat below is a new, additional route on
// the same router.
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
    // ASSUMPTION: your auth middleware sets req.user.id from the
    // Supabase JWT (mirrors the pattern crudRouteFactory must already
    // rely on for user-scoped CRUD). Adjust if your middleware uses a
    // different shape, e.g. req.auth.userId.
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

    // Save the user's message
    const { error: userMsgError } = await supabaseAdmin
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        sender: 'user',
        message: message.trim(),
      });
    if (userMsgError) throw userMsgError;

    // Run the agent (retrieval + memory + LLM)
    const { reply, knowledgeChunks, executionTimeMs } =
      await agent.handleMessage({
        userId,
        conversationId,
        userMessage: message.trim(),
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

    // Log the knowledge retrieval as a tool execution (for later analytics /
    // debugging — mirrors your tool_execution_logs schema)
    await supabaseAdmin.from('tool_execution_logs').insert({
      conversation_id: conversationId,
      message_id: aiMsg.id,
      tool_name: 'knowledge_search',
      tool_input: { query: message.trim() },
      tool_output: {
        matches: knowledgeChunks.map((c) => ({
          id: c.id,
          score: c.score,
          source: c.metadata?.document_title,
        })),
      },
      execution_time_ms: executionTimeMs,
      success: true,
    });

    return res.json({
      data: {
        conversationId,
        reply,
        sources: knowledgeChunks.map((c) => ({
          title: c.metadata?.document_title,
          trustScore: c.metadata?.trust_score,
          score: c.score,
        })),
      },
    });
  } catch (error) {
    console.error('POST /api/ai/chat failed:', error);
    return res.status(500).json({ error: error.message || 'Chat failed.' });
  }
});

module.exports = router;
