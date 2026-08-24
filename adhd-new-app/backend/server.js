require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const app = require('./app');
const { checkSupabaseConnection } = require('./config/supabase');
const http = require('http');
const { Server } = require('socket.io');

// Server entry file only starts Express and verifies Supabase connectivity.
// Put SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, PORT, and CORS_ORIGIN in backend/.env.
const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  const dbConnected = await checkSupabaseConnection();
  console.log(`Supabase connection: ${dbConnected ? 'ok' : 'not verified - check backend/.env and RLS policies'}`);
  const server = http.createServer(app);
  const origins = (process.env.CORS_ORIGIN || '*').split(',').map((origin) => origin.trim());
  const io = new Server(server, {
    cors: { origin: origins.includes('*') ? true : origins, credentials: true },
  });

  io.on('connection', (socket) => {
    socket.on('subscribe', (userId) => {
      if (typeof userId === 'string' && userId) socket.join(`user:${userId}`);
    });
  });

  app.set('io', io);
  server.listen(PORT, () => console.log(`Backend API and WebSocket server listening on http://localhost:${PORT}`));
}

startServer().catch((error) => {
  console.error('Failed to start backend API:', error);
  process.exit(1);
});
