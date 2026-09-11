// backend/services/ai/tools/emotionTool.js
//
// ASSUMPTION: there's no backend table for emotion-regulation sessions --
// these are entirely client-side interactive screens (BallonSession.js,
// GroundingSession.js, HarmonicRipples.js, MeditationSession.js,
// SplashSession.js, per your screens/Emotion/ folder). This tool doesn't
// touch the database; it just picks the best-matching screen name so the
// agent's reply can tell the frontend which one to deep-link to. Confirm
// the mapping below matches what each screen is actually for -- I'm
// guessing from filenames alone.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');

const SCREEN_MAP = {
  overwhelmed: 'GroundingSession',
  anxious: 'GroundingSession',
  angry: 'BalloonSession',
  frustrated: 'BalloonSession',
  sad: 'HarmonicRipples',
  restless: 'MeditationSession',
  racing_thoughts: 'MeditationSession',
};

const suggestEmotionExercise = tool(
  async ({ feeling, intensity }) => {
    const screen = SCREEN_MAP[feeling] || 'GroundingSession';
    return (
      `Suggest the "${screen}" exercise` +
      (intensity ? ` (intensity noted: ${intensity}/10)` : '') +
      `. Tell the user to open it from the Emotion Regulation section.`
    );
  },
  {
    name: 'suggest_emotion_exercise',
    description:
      "Suggest a short in-app emotion-regulation exercise based on how the user says they feel " +
      "right now. Use this for acute in-the-moment distress, not general mood tracking.",
    schema: z.object({
      feeling: z
        .enum(['overwhelmed', 'anxious', 'angry', 'frustrated', 'sad', 'restless', 'racing_thoughts'])
        .describe('Closest match to what the user described'),
      intensity: z.number().min(1).max(10).optional(),
    }),
  }
);

module.exports = { suggestEmotionExercise };
