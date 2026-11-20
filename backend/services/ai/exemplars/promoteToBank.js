const { supabaseAdmin } = require('../../../config/supabase');
const { embedQuery } = require('../rag/embeddings');
const { upsertExemplar, deleteExemplar } = require('../rag/pineconeClient');
const { analyzeMessage } = require('../perception');

async function promoteToBank({ messageId }) {
  const { data: aiMsg } = await supabaseAdmin
    .from('ai_messages')
    .select('id, conversation_id, sender, message, created_at')
    .eq('id', messageId).single();
  if (!aiMsg || aiMsg.sender !== 'assistant') return;

  const { data: prev } = await supabaseAdmin
    .from('ai_messages').select('message')
    .eq('conversation_id', aiMsg.conversation_id).eq('sender', 'user')
    .lt('created_at', aiMsg.created_at)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!prev) return;

  const userText = prev.message;
  const reply = aiMsg.message;

  // Safety filters: never store crisis chats or very long text
  if (analyzeMessage(userText).crisis) return;
  if (userText.length > 400 || reply.length > 1200) return;

  const { data: row, error } = await supabaseAdmin
    .from('exemplar_bank')
    .upsert(
      { message_id: messageId, user_message: userText, assistant_reply: reply,
        source: 'user_feedback', is_active: true },
      { onConflict: 'message_id' }
    ).select('id').single();
  if (error) throw error;

  const vector = await embedQuery(userText);
  await upsertExemplar({
    id: row.id,
    vector,
    metadata: { user_message: userText, assistant_reply: reply, source: 'user_feedback' },
  });
}

async function demoteFromBank({ messageId }) {
  const { data: row } = await supabaseAdmin
    .from('exemplar_bank').select('id').eq('message_id', messageId).maybeSingle();
  if (!row) return;
  await supabaseAdmin.from('exemplar_bank').update({ is_active: false }).eq('id', row.id);
  await deleteExemplar(row.id);
}

module.exports = { promoteToBank, demoteFromBank };