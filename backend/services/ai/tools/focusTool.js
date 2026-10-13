// backend/services/ai/tools/focusTool.js
//
// The tool does NOT write to focus_sessions. It returns a signal that the
// frontend reads from `toolCalls` and turns into an action chip in the chat.
// FocusScreen remains the single owner of focus_sessions rows.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');

const startFocusSession = tool(
  async ({ planned_minutes, task_title, session_type, reason }, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    const minutes = planned_minutes || 25;
    const typePart =
      session_type && session_type !== 'Focus' ? ` (${session_type})` : '';
    const taskPart = task_title ? ` on "${task_title}"` : '';

    return (
      `Ready to start a ${minutes}-minute focus session${taskPart}${typePart}. ` +
      `The app will show a Start button below this message.` +
      (reason ? ` Reason: ${reason}` : '')
    );
  },
  {
    name: 'start_focus_session',
    description:
      'Prepare a focus session for the user. Use when the user says they want to focus, ' +
      'start a timer, do deep work, or asks for help concentrating. Include task_title if ' +
      'they mention a specific task; otherwise omit it for a general session. The timer ' +
      'runs on-device -- this just configures and offers to start it.',
    schema: z.object({
      planned_minutes: z
        .number()
        .optional()
        .describe('Session length in minutes. Default 25 if unspecified.'),
      task_title: z
        .string()
        .optional()
        .describe(
          'Exact or partial title of the task to focus on. Only set if the user ' +
          'named a specific task, e.g. "start a 15 minute focus on the report".'
        ),
      session_type: z.enum(['Focus', 'Deep Work', 'Study']).optional(),
      reason: z.string().optional(),
    }),
  }
);

module.exports = { startFocusSession };