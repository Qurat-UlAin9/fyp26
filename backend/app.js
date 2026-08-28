require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

const app = express();

// If these packages are missing, run from the project root:
// npm install express cors dotenv @supabase/supabase-js
// Your React app API URL can later point to: http://localhost:5000/api
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map((origin) => origin.trim());
app.use(cors({ origin: allowedOrigins.includes('*') ? '*' : allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use('/health', require('./routes/health'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profiles'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/habits', require('./routes/habits'));
app.use('/api/focus-sessions', require('./routes/focusSessions'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/statistics', require('./routes/statistics'));
app.use('/api/exercises', require('./routes/exercises'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/knowledge', require('./routes/knowledge'));
app.use('/api/assessments', require('./routes/assessments'));

app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` }));
app.use((err, _req, res, _next) => res.status(500).json({ error: err.message || 'Internal server error' }));

module.exports = app;
