const { supabaseAdmin } = require('../../../config/supabase');

let cachedPrompts = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

// Simple deterministic hash so the same user always gets the same variant
function getUserVariant(userId, variants) {
  if (!variants || variants.length === 0) return null;
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % variants.length;
  return variants[index];
}

async function getActivePrompt(userId) {
  try {
    const now = Date.now();
    // Fetch from DB if cache is empty or expired
    if (!cachedPrompts || (now - lastCacheTime > CACHE_TTL_MS)) {
      const { data, error } = await supabaseAdmin
        .from('prompt_versions')
        .select('id, prompt_text')
        .eq('is_active', true)
        .order('id');

      if (error) throw error;
      
      cachedPrompts = data;
      lastCacheTime = now;
      console.log(`[PromptService] Cached ${data.length} active prompt versions.`);
    }

    if (!cachedPrompts || cachedPrompts.length === 0) {
      return { id: null, text: 'You are a helpful ADHD assistant.' }; // Fallback
    }

    const variant = getUserVariant(userId, cachedPrompts);
    return { id: variant.id, text: variant.prompt_text };
  } catch (err) {
    console.error('[PromptService] Failed to get prompt:', err.message);
    return { id: null, text: 'You are a helpful ADHD assistant.' };
  }
}

module.exports = { getActivePrompt };