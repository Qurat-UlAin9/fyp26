// backend/services/ai/tools/nameTool.js
//
// The user can give the coach a name ("friend name"). It is stored in
// user_memories (title = 'coach_name') and read back into every prompt.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { supabaseAdmin } = require('../../../config/supabase');

const NAME_TITLE = 'coach_name';
const DEFAULT_NAME = process.env.COACH_DEFAULT_NAME || 'Compass';

async function fetchCoachName(userId) {
  const { data, error } = await supabaseAdmin
    .from('user_memories')
    .select('id, content')
    .eq('user_id', userId)
    .eq('title', NAME_TITLE)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data[0] ? String(data[0].content).slice(0, 30) : null;
}

function formatNameBlock(name) {
  if (name && name !== DEFAULT_NAME) {
    return `\nYOUR NAME: the user chose the name "${name}" for you. Answer to it and use it naturally. Never name an AI model or company as who you are.\n`;
  }
  if (name === DEFAULT_NAME) {
    return `\nYOUR NAME: you are ${DEFAULT_NAME}. The user chose to keep it, so do not ask about names again.\n`;
  }
  return (
    `\nYOUR NAME: you are ${DEFAULT_NAME}. Once, at a calm moment (never when they are stressed, overwhelmed or in distress, ` +
    'and not if you already asked in the recent messages), you may mention that they can give you a different name if they like, ' +
    'as a plain-text line with NO options line so they can type one. When they tell you a name, call set_coach_name. ' +
    `If they say they like ${DEFAULT_NAME} or want to skip, call set_coach_name with "${DEFAULT_NAME}".\n`
  );
}

const setCoachName = tool(
  async ({ name }, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';
    const clean = String(name || '').replace(/[^\p{L}\p{N} '-]/gu, '').trim().slice(0, 30);
    if (!clean) return 'Error: that is not a usable name. Ask again.';

    const { data: existing } = await supabaseAdmin
      .from('user_memories')
      .select('id')
      .eq('user_id', userId)
      .eq('title', NAME_TITLE)
      .limit(1);

    const row = { memory_type: 'preference', title: NAME_TITLE, content: clean, importance: 1, memory_source: 'conversation' };
    const { error } = existing && existing[0]
      ? await supabaseAdmin.from('user_memories').update({ content: clean }).eq('id', existing[0].id).eq('user_id', userId)
      : await supabaseAdmin.from('user_memories').insert({ user_id: userId, ...row });
    if (error) return `Error saving the name: ${error.message}`;
    return clean === DEFAULT_NAME
      ? `Okay, you stay ${DEFAULT_NAME}. Do not ask again.`
      : `Saved. From now on you are called "${clean}". Respond warmly in one sentence.`;
  },
  {
    name: 'set_coach_name',
    description: `Save the name the user chose for you (the coach). Use "${DEFAULT_NAME}" if they want to keep your default name or skip.`,
    schema: z.object({ name: z.string().min(1).max(30) }),
  }
);

module.exports = { setCoachName, fetchCoachName, formatNameBlock };
