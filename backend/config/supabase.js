const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

// Required install: npm install express cors dotenv @supabase/supabase-js ws
// Required .env values for backend:
// SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
// SUPABASE_ANON_KEY=your-anon-key
// SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server only; never expose to React Native
// PORT=5000
// CORS_ORIGIN=http://localhost:8081                 # comma-separated origins, or * while testing

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing SUPABASE_URL or SUPABASE_ANON_KEY. Add them to backend/.env before running the API.');
}

if (!supabaseServiceRoleKey) {
  console.warn('Missing SUPABASE_SERVICE_ROLE_KEY. Admin/server routes that write protected tables may fail.');
}

const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'missing-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      transport: ws,
    },
  }
);

const supabaseAdmin = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseServiceRoleKey || supabaseAnonKey || 'missing-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      transport: ws,
    },
  }
);

async function checkSupabaseConnection() {
  if (!supabaseUrl || !supabaseServiceRoleKey) return false;

  const { error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Supabase connection check failed:', error.message);
    return false;
  }

  return true;
}

/**
async function checkSupabaseConnection() {
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const { error } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  return !error;
}*/

module.exports = {
  supabase,
  supabaseAdmin,
  checkSupabaseConnection,
};