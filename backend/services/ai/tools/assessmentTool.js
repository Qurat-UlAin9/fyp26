// backend/services/ai/tools/assessmentTool.js
//
// Supersedes the "USER SCREENING CONTEXT" block we added to
// promptBuilder.js earlier. That version injected ADHD + EF scores into
// EVERY system prompt regardless of relevance. Now that we're moving to
// tool-calling, this is strictly better: the model only pulls this data
// when it's actually answering something related to the user's profile,
// saving tokens on unrelated turns (e.g. "recommend a podcast").
//
// Once graph.js is wired up with these tools, you can remove the
// buildScreeningContext() call from promptBuilder.js -- keep the guardrail
// language (self-reported, not a diagnosis) here instead, since these tool
// descriptions are what the model actually reads before deciding to call them.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { supabaseAdmin } = require('../../../config/supabase');

const EF_DIMENSION_LABELS = {
  SistemaAtencionalSupervisor: 'Attention/Supervisory System',
  RegulacionDeliberadaEmocion: 'Emotion Regulation',
  MonitorizacionConscieteResponsabilidades: 'Monitoring Responsibilities',
  Verificaciondelaconducta: 'Verification of Conduct',
  Organizacionelemnetostareas: 'Organization of Tasks',
  Controlinhibitorio: 'Inhibitory Control',
  tomadedecisiones: 'Decision Making',
};

const getADHDScreeningSummary = tool(
  async (_input, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    const { data, error } = await supabaseAdmin
      .from('assessments')
      .select('score, max_score, percentage, predicted_label, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return `Error fetching ADHD screening: ${error.message}`;
    if (!data) return 'This user has not completed the ADHD screening yet.';

    return (
      `Self-reported ADHD screening (ASRS-based, NOT a diagnosis): ${data.percentage}% ` +
      `(${data.score}/${data.max_score}), model output: ${data.predicted_label}. ` +
      `Use only to adjust tone/approach -- never state or imply the user has ADHD.`
    );
  },
  {
    name: 'get_adhd_screening_summary',
    description:
      "Look up the user's most recent self-reported ADHD screening result. Use this only when " +
      "it would genuinely help tailor advice (e.g. they ask why tasks feel hard, or want more " +
      "structure) -- not on unrelated turns. Self-reported screening, never a diagnosis.",
    schema: z.object({}),
  }
);

const getEFAssessmentSummary = tool(
  async (_input, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    const { data, error } = await supabaseAdmin
      .from('ef_assessments')
      .select('dimension_scores, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return `Error fetching EF assessment: ${error.message}`;
    if (!data) return 'This user has not completed the Executive Function assessment yet.';

    const lines = Object.entries(data.dimension_scores || {}).map(([key, score]) => {
      const label = EF_DIMENSION_LABELS[key] || key;
      const pct = Math.round(score.normalized0to100 ?? 0);
      return `- ${label}: ${pct}%${score.status === 'partial' ? ' (approximate)' : ''}`;
    });

    return (
      `Self-reported Executive Function assessment (higher % = fewer self-reported difficulties, ` +
      `NOT a diagnosis):\n${lines.join('\n')}\n` +
      `Use only to tailor which tool/approach to suggest -- never cite these numbers back to the ` +
      `user as clinical findings.`
    );
  },
  {
    name: 'get_ef_assessment_summary',
    description:
      "Look up the user's most recent Executive Function assessment across all 7 dimensions " +
      "(attention, emotion regulation, organization, etc). Use this when deciding which tool to " +
      "suggest (e.g. low Organization -> lean on create_task with more structure) or when the " +
      "user asks about their own patterns. Self-reported, never a diagnosis.",
    schema: z.object({}),
  }
);

module.exports = { getADHDScreeningSummary, getEFAssessmentSummary };
