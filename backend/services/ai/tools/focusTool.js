// backend/services/ai/tools/focusTool.js
//
// IMPORTANT ASSUMPTION: the actual timer/countdown lives entirely on the
// frontend (TimerRing.js, ControlButtons.js). This tool cannot "start" a
// timer server-side -- it creates a `focus_sessions` row with status
// 'planned' (matching focusSessionToApiPayload() shape from
// AppDataContext.js). Your frontend needs a small addition to actually act
// on this: e.g. FocusScreen.js polling/subscribing for a new 'planned'
// session belonging to the user and offering to start it. Tell me if you
// want that wiring built too -- it's a frontend change, not a tool change.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { supabaseAdmin } = require('../../../config/supabase');

const suggestFocusSession = tool(
  async ({ planned_minutes, session_type, reason }, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    const { data, error } = await supabaseAdmin
      .from('focus_sessions')
      .insert({
        user_id: userId,
        session_name: 'Focus Session',
        session_type: session_type || 'Focus',
        planned_minutes: planned_minutes || 25,
        status: 'planned',
      })
      .select()
      .single();

    if (error) return `Error creating focus session suggestion: ${error.message}`;
    return (
      `Suggested a ${data.planned_minutes}-minute ${data.session_type} session (id: ${data.id}).` +
      (reason ? ` Reason: ${reason}` : '') +
      ' Tell the user to open the Focus tab to start it.'
    );
  },
  {
    name: 'suggest_focus_session',
    description:
      'Suggest the user start a focus session with a specific duration and type. Use this when ' +
      'the user says they need to concentrate, are struggling to start a task, or ask for help ' +
      'focusing. This does NOT start a live timer -- it just queues a suggestion the user opens ' +
      'in the Focus tab.',
    schema: z.object({
      planned_minutes: z.number().optional().describe('Session length in minutes, e.g. 25 for a standard pomodoro'),
      session_type: z.enum(['Focus', 'Deep Work', 'Study']).optional(),
      reason: z.string().optional().describe('Why you suggested this, e.g. "user has a 6pm assignment deadline"'),
    }),
  }
);

module.exports = { suggestFocusSession };
