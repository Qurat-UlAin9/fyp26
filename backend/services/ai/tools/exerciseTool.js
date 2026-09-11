// backend/services/ai/tools/exerciseTool.js
//
// ASSUMPTION -- HIGHEST RISK FILE, PLEASE VERIFY:
// I don't have routes/exercises.js or the exercise_library schema. Guessing
// column names from your project's own description ("categories, exercises,
// difficulty, duration, instructions, benefits, suitable moods/stress/energy
// levels, exercise steps"). Likely wrong field names below (mood_tags,
// energy_level, etc.) -- send me routes/exercises.js or the migration that
// creates exercise_library and I'll fix this in one pass.
//
// This tool is also where exercise_nma_adhd_ef and exercise_open_closed_skill_ef
// (your two exercise papers in Pinecone) should eventually connect: e.g. after
// picking an exercise, the agent could cite the NMA paper's ranking for why
// that modality helps EF. Not wired yet -- flagging as a natural next step.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { supabaseAdmin } = require('../../../config/supabase');

const suggestExercise = tool(
  async ({ mood, energy_level, max_duration_minutes }) => {
    let query = supabaseAdmin.from('exercise_library').select('*').eq('is_active', true);

    if (max_duration_minutes) {
      query = query.lte('duration', max_duration_minutes);
    }

    const { data, error } = await query.limit(5);
    if (error) return `Error fetching exercises: ${error.message}`;
    if (!data || data.length === 0) return 'No matching exercises found in the library.';

    // Best-effort client-side filter since I'm not sure of the exact
    // mood/energy column names or whether they're arrays or single values.
    const filtered = data.filter((ex) => {
      const moodMatch = !mood || !ex.suitable_moods || ex.suitable_moods.includes(mood);
      const energyMatch = !energy_level || !ex.suitable_energy_levels || ex.suitable_energy_levels.includes(energy_level);
      return moodMatch && energyMatch;
    });

    const results = filtered.length > 0 ? filtered : data;
    return results
      .slice(0, 3)
      .map((ex) => `- ${ex.name} (${ex.duration} min): ${ex.benefits || ex.description || ''}`)
      .join('\n');
  },
  {
    name: 'suggest_exercise',
    description:
      'Suggest one of the in-app guided exercises based on the user\'s current mood, energy level, ' +
      'or how much time they have. Use when the user asks for a break, movement suggestion, or ' +
      'says exercise helps them focus.',
    schema: z.object({
      mood: z.string().optional(),
      energy_level: z.enum(['low', 'medium', 'high']).optional(),
      max_duration_minutes: z.number().optional(),
    }),
  }
);

module.exports = { suggestExercise };
