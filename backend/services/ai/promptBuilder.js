// backend/services/ai/promptBuilder.js

const BASE_SYSTEM_PROMPT = `You are the Main ADHD Agent inside an ADHD support app.
You are warm, concise, and practical — you help with tasks, habits, focus,
emotion regulation, and general ADHD knowledge. Keep replies short (2-5
sentences) unless the user asks for detail. Never invent clinical claims
that aren't supported by the KNOWLEDGE section below; if it's not covered
there, answer from general supportive coaching, not medical authority.`;

// Human-readable labels for EF dimension keys, matching src/data/efQuestions.js
// on the frontend. Keep these two lists in sync if dimension names change.
const EF_DIMENSION_LABELS = {
  SistemaAtencionalSupervisor: 'Attention/Supervisory System',
  RegulacionDeliberadaEmocion: 'Emotion Regulation',
  MonitorizacionConscieteResponsabilidades: 'Monitoring Responsibilities',
  Verificaciondelaconducta: 'Verification of Conduct',
  Organizacionelemnetostareas: 'Organization of Tasks',
  Controlinhibitorio: 'Inhibitory Control',
  tomadedecisiones: 'Decision Making',
};

function buildScreeningContext(adhdContext, efContext) {
  if (!adhdContext && !efContext) return '';

  let section = '\n\nUSER SCREENING CONTEXT (self-reported, NOT a diagnosis):\n';
  section += 'Use this only to adjust tone and approach -- e.g. offer more structure or ';
  section += 'shorter steps if scores suggest that would help. NEVER state or imply the ';
  section += 'user has ADHD or any condition, and never cite these numbers back to the ';
  section += 'user as if they were clinical findings.\n';

  if (adhdContext) {
    section += `\nADHD self-screening (ASRS-based): ${adhdContext.percentage}% ` +
      `(${adhdContext.score}/${adhdContext.max_score}), model output: ${adhdContext.predicted_label}.\n`;
  }

  if (efContext && efContext.dimension_scores) {
    section += '\nExecutive function self-assessment (higher % = fewer self-reported difficulties):\n';
    Object.entries(efContext.dimension_scores).forEach(([key, score]) => {
      const label = EF_DIMENSION_LABELS[key] || key;
      const pct = Math.round(score.normalized0to100 ?? 0);
      section += `- ${label}: ${pct}%${score.status === 'partial' ? ' (approximate)' : ''}\n`;
    });
  }

  return section;
}

function buildSystemPrompt(knowledgeChunks, memories, screeningContext = {}) {
  let prompt = BASE_SYSTEM_PROMPT;

  if (knowledgeChunks && knowledgeChunks.length > 0) {
    prompt += '\n\nKNOWLEDGE (retrieved, may or may not be relevant — use only what fits):\n';
    knowledgeChunks.forEach((match, i) => {
      const md = match.metadata || {};
      prompt += `\n[${i + 1}] (source: ${md.document_title || 'unknown'}, trust: ${md.trust_score ?? '?'})\n${md.text || ''}\n`;
    });
  }

  if (memories && memories.length > 0) {
    prompt += '\n\nWHAT YOU KNOW ABOUT THIS USER:\n';
    memories.forEach((m) => {
      prompt += `- [${m.memory_type}] ${m.title ? m.title + ': ' : ''}${m.content}\n`;
    });
  }

  const { adhdContext, efContext } = screeningContext;
  prompt += buildScreeningContext(adhdContext, efContext);

  return prompt;
}

module.exports = { buildSystemPrompt };
