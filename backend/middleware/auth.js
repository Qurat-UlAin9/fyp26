const { supabase } = require('../config/supabase');

// In-memory cache: token hash -> { user, expiresAt }
// Cuts Supabase Auth calls to once per token per CACHE_TTL_MS.
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

// Retry a network operation with exponential backoff.
async function withRetry(fn, { attempts = 3, baseDelayMs = 300 } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = String(err?.message || err);
      const isNetworkish =
        /ECONNRESET|ENOTFOUND|ETIMEDOUT|UND_ERR|ConnectTimeout|fetch failed|network/i.test(msg);
      if (!isNetworkish) throw err; // real error, don't retry
      if (i < attempts - 1) {
        const delay = baseDelayMs * Math.pow(2, i);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

function cacheKey(token) {
  // Cheap key; we don't need cryptographic hashing here.
  return token.slice(-32);
}

async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization bearer token' });
  }

  const key = cacheKey(token);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    req.user = cached.user;
    return next();
  }

  let data, error;

  try {
    const result = await withRetry(async () => {
      const r = await supabase.auth.getUser(token);
      if (r.error) {
        // Distinguish auth failure (bad token) from network failure
        const code = r.error.code || r.error.status || '';
        const msg = String(r.error.message || '');
        const isNetworkish =
          /ECONNRESET|ENOTFOUND|ETIMEDOUT|UND_ERR|ConnectTimeout|fetch failed|network/i.test(msg) ||
          code === 504 || code === 502;
        if (isNetworkish) {
          // throw so withRetry retries
          throw new Error(`network:${msg}`);
        }
        // Real auth error — return as-is so caller sees 401
        return r;
      }
      return r;
    });
    data = result.data;
    error = result.error;
  } catch (err) {
    console.warn('requireAuth: Supabase Auth unreachable after retries:', err?.message || err);
    return res.status(503).json({
      error: 'Auth service temporarily unreachable. Please retry.',
    });
  }

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired Supabase token' });
  }

  // Cache the successful validation
  cache.set(key, {
    user: data.user,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  // Opportunistic cleanup
  if (cache.size > 500) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (v.expiresAt <= now) cache.delete(k);
    }
  }

  req.user = data.user;
  return next();
}

module.exports = { requireAuth };