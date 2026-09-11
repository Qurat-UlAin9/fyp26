// backend/services/ai/tools/memoryTool.js
//
// Closes the gap flagged in your handoff doc: "user_memories is currently
// read-only from the agent's perspective; nothing writes new memories from
// conversations yet." This adds the write side as an explicit tool (the
// model decides when something's worth remembering), while memory READING
// stays as always-injected context in promptBuilder.js/graph.js -- recall
// is cheap and near-always relevant, so it doesn't need to be a deliberate
// tool call the way writing does.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { supabaseAdmin } = require('../../../config/supabase');

const rememberAboutUser = tool(
  async ({ memory_type, title, content, importance }, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    const { error } = await supabaseAdmin.from('user_memories').insert({
      user_id: userId,
      memory_type,
      title: title || null,
      content,
      importance: importance ?? 3,
      source: 'conversation',
    });

    if (error) return `Error saving memory: ${error.message}`;
    return `Remembered: ${content}`;
  },
  {
    name: 'remember_about_user',
    description:
      'Save a durable fact about the user for future conversations -- e.g. a stated preference ' +
      '("prefers short task lists"), a recurring challenge ("struggles most in the evenings"), or ' +
      'context that would help personalize future responses. Do NOT save one-off details that ' +
      'won\'t matter later, and never save anything that sounds like a clinical diagnosis claim.',
    schema: z.object({
      memory_type: z.enum(['preference', 'challenge', 'goal', 'context']),
      title: z.string().optional(),
      content: z.string().describe('The fact to remember, written plainly'),
      importance: z.number().min(1).max(5).optional().describe('1 = minor, 5 = very important, default 3'),
    }),
  }
);

module.exports = { rememberAboutUser };
