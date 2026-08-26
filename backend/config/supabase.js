const {
  createClient,
} = require('@supabase/supabase-js');

const ws = require('ws');

const supabaseUrl =
  process.env.SUPABASE_URL;

const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (
  !supabaseUrl ||
  !supabaseAnonKey
) {
  console.warn(
    'Missing SUPABASE_URL or SUPABASE_ANON_KEY. Add them to backend/.env.'
  );
}

if (
  !supabaseServiceRoleKey
) {
  console.warn(
    'Missing SUPABASE_SERVICE_ROLE_KEY.'
  );
}

const supabase =
  createClient(
    supabaseUrl ||
      'http://localhost:54321',

    supabaseAnonKey ||
      'missing-key',

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

const supabaseAdmin =
  createClient(
    supabaseUrl ||
      'http://localhost:54321',

    supabaseServiceRoleKey ||
      supabaseAnonKey ||
      'missing-key',

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
  if (
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    return false;
  }

  const {
    error,
  } =
    await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1);

  if (error) {
    console.error(
      'Supabase connection check failed:',
      error.message
    );

    return false;
  }

  return true;
}

module.exports = {
  supabase,
  supabaseAdmin,
  checkSupabaseConnection,
};