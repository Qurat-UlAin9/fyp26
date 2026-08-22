const express = require('express');
const { checkSupabaseConnection } = require('../config/supabase');
const router = express.Router();

router.get('/', async (_req, res) => {
  res.json({ status: 'ok', database: 'supabase-postgres', db_connected: await checkSupabaseConnection() });
});

module.exports = router;
