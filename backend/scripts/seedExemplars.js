require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { supabaseAdmin } = require('../config/supabase');
const { embedQuery } = require('../services/ai/rag/embeddings');
const { upsertExemplar } = require('../services/ai/rag/pineconeClient');

const SEEDS = [
  { category: 'task_initiation', user: "I can't make myself start my assignment.",
    reply: "That stuck feeling is really common with ADHD, and it's not laziness.\n\n**Try this:** set a 5-minute timer and only open the document and write one sentence. You're allowed to stop after that.\n\nWhat's the first tiny step of the assignment?" },
  { category: 'overwhelm', user: "I have so many tasks I don't know where to begin.",
    reply: "That's a lot to carry. Let's shrink it.\n\n* Pick just **one** task that's due soonest\n* Break it into a 10-minute first step\n\nWant me to help you pick the one?" },
  { category: 'procrastination', user: "I keep putting things off until the last minute.",
    reply: "Last-minute pressure often works because urgency wakes up the ADHD brain, but it's exhausting.\n\n**Try this:** make a mini-deadline today, like \"outline by 4pm\", and tell me so we can check in.\n\nWhich task should we start with?" },
  { category: 'emotion', user: "I feel so frustrated with myself today.",
    reply: "That sounds heavy, and I'm glad you said it out loud.\n\nBeing hard on yourself usually makes starting harder. Would a short breathing exercise help first, or would you rather talk about what happened?" },
  { category: 'focus', user: "I get distracted every few minutes when I study.",
    reply: "Frequent distraction is a typical ADHD pattern, so you're not doing it wrong.\n\n**Try this:** a 15-minute focus session with your phone out of reach, then a real 5-minute break.\n\nShall I start a 15-minute session for you?" },
  { category: 'habits', user: "I can't stick to a routine for more than a few days.",
    reply: "Most people with ADHD struggle with this, and it usually means the routine is too big.\n\n**Try this:** attach one tiny habit to something you already do, like 2 minutes of tidying right after brushing your teeth.\n\nWhich habit matters most to you?" },
];

(async () => {
  for (const s of SEEDS) {
    const { data: existing } = await supabaseAdmin
      .from('exemplar_bank').select('id').eq('source', 'seed').eq('user_message', s.user).maybeSingle();
    if (existing) { console.log('skip (exists):', s.user); continue; }

    const { data: row, error } = await supabaseAdmin.from('exemplar_bank')
      .insert({ category: s.category, user_message: s.user, assistant_reply: s.reply, source: 'seed' })
      .select('id').single();
    if (error) throw error;

    const vector = await embedQuery(s.user);
    await upsertExemplar({ id: row.id, vector,
      metadata: { user_message: s.user, assistant_reply: s.reply, source: 'seed', category: s.category } });
    console.log('seeded:', s.user);
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });