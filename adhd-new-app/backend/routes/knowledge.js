const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const router = express.Router();
router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'q query parameter is required' });
  const { data, error } = await supabaseAdmin.from('knowledge_chunks').select('id,title,content,summary,metadata').textSearch('search_vector', q).limit(20);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data });
});
module.exports = router;
