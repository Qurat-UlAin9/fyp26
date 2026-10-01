// backend/services/ai/tools/exerciseTool.js
//
// Column names match Migration 12 (exercise_library).
// Mood/energy enums match the seed data in File 20.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { supabaseAdmin } = require('../../../config/supabase');

const suggestExercise = tool(
  async ({ mood, energy_level, max_duration_minutes, reason }, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    let query = supabaseAdmin
      .from('exercise_library')
      .select(
        'id, name, description, exercise_type, duration_minutes, ' +
        'benefits, recommended_moods, recommended_energy_levels, ' +
        'recommended_stress_levels, instructions'
      )
      .eq('is_active', true);

    if (max_duration_minutes) {
      query = query.lte('duration_minutes', max_duration_minutes);
    }

    // Pool is small (seeded + a few user-added), so fetch a reasonable
    // candidate set and filter array columns in JS. Supabase's PostgREST
    // array-contains is per-column only, so multi-filter is easier here.
    const { data, error } = await query.limit(30);
    if (error) return `Error fetching exercises: ${error.message}`;
    if (!data || data.length === 0) return 'No exercises available right now.';

    const filtered = data.filter((ex) => {
      const moodMatch =
        !mood || !ex.recommended_moods || ex.recommended_moods.includes(mood);
      const energyMatch =
        !energy_level || !ex.recommended_energy_levels ||
        ex.recommended_energy_levels.includes(energy_level);
      return moodMatch && energyMatch;
    });

    const pool = filtered.length > 0 ? filtered : data;
    const picked = pool.slice(0, 3);

    // Structured return so the frontend can deep-link by `id`, and the
    // LLM has a readable list to reference in the reply.
    const formatted = picked
      .map(
        (ex) =>
          `- ${ex.name} (${ex.duration_minutes} min, ${ex.exercise_type})` +
          ` [id: ${ex.id}] — ${ex.description || ''}`
      )
      .join('\n');

    return (
      `Suggested exercises:\n${formatted}\n\n` +
      (reason ? `Reason: ${reason}\n` : '') +
      `Tell the user to open the Exercise section to start one.`
    );
  },
  {
    name: 'suggest_exercise',
    description:
      "Suggest one of the in-app guided exercises (breathing, grounding, focus " +
      "reset) based on the user's current mood, energy level, or available time. " +
      "Use when the user asks for a break, a short reset, or mentions that a " +
      "guided exercise helps them. This does NOT start the exercise -- it just " +
      "recommends one for the user to open.",
    schema: z.object({
      mood: z
        .enum([
          'overwhelmed',
          'stressed',
          'anxious',
          'distracted',
          'unmotivated',
          'restless',
        ])
        .optional()
        .describe('Closest match to what the user said they feel'),
      energy_level: z.enum(['low', 'medium', 'high']).optional(),
      max_duration_minutes: z
        .number()
        .optional()
        .describe('If the user said they only have X minutes'),
      reason: z
        .string()
        .optional()
        .describe('One short phrase: why this suggestion fits the user right now'),
    }),
  }
);

module.exports = { suggestExercise };