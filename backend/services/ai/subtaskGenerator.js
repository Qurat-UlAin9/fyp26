// backend/services/ai/subtaskGenerator.js
//
// Breaks a task title (+ optional category/subject) into concrete subtasks.
// Not a LangChain tool -- just a focused generation call.

const { ChatGroq } = require('@langchain/groq');

const FALLBACK_SUBTASKS = (title) => [
  `Research ${title}`,
  'Plan approach',
  'Execute & review',
];

const model = new ChatGroq({
  model: 'openai/gpt-oss-120b',
  temperature: 0.6,
});

const SYSTEM_PROMPT = `You break down tasks into concrete, actionable subtasks for someone with ADHD.

Rules:
- Return 3 to 5 subtasks.
- Each is a short, specific action (max 12 words).
- Order them in the sequence they should be done.
- Use specific verbs and nouns from the task title, category, and subject.
- Do NOT use generic filler like "Plan approach" or "Execute and review".
- Do NOT repeat the task title as a subtask.
- Prefer concrete physical or mental actions the user can just start doing.

Category guidance:
- Academic: reference the subject matter. e.g. "Skim abstract and section headings first".
- Work: reference the professional context. e.g. "Draft a 3-bullet status update for the team".
- Health: reference the physical/mental action. e.g. "Fill water bottle and set out shoes the night before".
- Home: reference physical location or objects. e.g. "Clear kitchen counter and gather trash bags".
- Social: reference the person or event. e.g. "Text Sam to confirm the time".
- Finance: reference the specific task. e.g. "Log into bank and download the last month's statement".
- Creative: reference the medium. e.g. "Open the notebook and write 3 rough lines".
- Personal: keep it gentle and self-directed. e.g. "Set a 10-minute timer and start with the easiest part".
- If category is missing, infer from the title. If you cannot tell, keep subtasks concrete but general.

Return ONLY a JSON array of strings. No explanation. No markdown fences.

Example output:
["Open syllabus and find professor's email", "Draft a 3-sentence request for extension", "Send the email and set a follow-up reminder"]`;

function parseSubtasks(raw) {
  const text = String(raw || '').trim();
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.map(String);
    if (parsed && Array.isArray(parsed.subtasks)) return parsed.subtasks.map(String);
  } catch (_) {}

  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch (_) {}
  }

  const lines = cleaned
    .split(/\n/)
    .map((l) => l.replace(/^\s*[-*•\d.)]+\s*/, '').trim())
    .filter((l) => l.length > 0 && l.length < 120);

  return lines.length >= 2 ? lines.slice(0, 5) : null;
}

async function generateSubtasks(
  title,
  { category, subject, timeoutMs = 8000 } = {}
) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) return FALLBACK_SUBTASKS(title);

  const lines = [`Task title: "${cleanTitle}"`];
  if (category) lines.push(`Category: ${category}`);
  if (subject) lines.push(`Subject / focus: ${subject}`);
  lines.push('');
  lines.push('Return the JSON array now.');

  const userPrompt = lines.join('\n');

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), timeoutMs)
  );

  try {
    const result = await Promise.race([
      model.invoke([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ]),
      timeoutPromise,
    ]);

    const raw = typeof result === 'string' ? result : result.content;
    const parsed = parseSubtasks(raw);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 5);
    }

    return FALLBACK_SUBTASKS(cleanTitle);
  } catch (err) {
    console.warn('generateSubtasks failed, using fallback:', err.message);
    return FALLBACK_SUBTASKS(cleanTitle);
  }
}

module.exports = { generateSubtasks };