const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const { promoteToBank, demoteFromBank } = require('../services/ai/exemplars/promoteToBank');

router.use(requireAuth);

router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

    const { messageId, rating } = req.body || {};
    if (!messageId || ![1, -1].includes(rating)) {
      return res.status(400).json({ error: 'Valid messageId and rating (1 or -1) are required.' });
    }

    const { data: msg, error: msgError } = await supabaseAdmin
      .from('ai_messages')
      .select('conversation_id, prompt_version_id')
      .eq('id', messageId)
      .single();
    if (msgError) return res.status(404).json({ error: 'Message not found.' });

    const { error } = await supabaseAdmin
      .from('feedback_events')
      .upsert(
        {
          user_id: userId,
          message_id: messageId,
          conversation_id: msg.conversation_id,
          rating,
          prompt_version_id: msg.prompt_version_id || null,
        },
        { onConflict: 'user_id,message_id' }
      );
    if (error) throw error;

    // Fire-and-forget: never block or fail the vote
    const job = rating === 1 ? promoteToBank({ messageId }) : demoteFromBank({ messageId });
    job.catch((e) => console.warn('[exemplars] bank update failed:', e.message));

    return res.json({ success: true });
  } catch (error) {
    console.error('POST /api/feedback failed:', error);
    return res.status(500).json({ error: 'Failed to save feedback.' });
  }
});

module.exports = router;