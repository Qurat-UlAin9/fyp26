// Removes the 6 old seed exemplars from Pinecone (namespace "exemplars") and Supabase.
// Real exemplars (source = 'user_feedback', added on 👍) are NOT touched.
// Run from the backend folder:  node scripts/removeSeedExemplars.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { supabaseAdmin } = require('../config/supabase');
const { deleteExemplar } = require('../services/ai/rag/pineconeClient');

(async () => {
  const { data: seeds, error } = await supabaseAdmin
    .from('exemplar_bank').select('id, user_message').eq('source', 'seed');
  if (error) throw error;
  if (!seeds || seeds.length === 0) { console.log('No seed exemplars found. Nothing to do.'); process.exit(0); }

  for (const s of seeds) {
    await deleteExemplar(s.id);                                   // Pinecone
    await supabaseAdmin.from('exemplar_bank').delete().eq('id', s.id); // Supabase
    console.log('removed:', s.user_message);
  }
  console.log(`Done. Removed ${seeds.length} seed exemplars.`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
