import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/* =========================================================
   CONFIGURATION
========================================================= */

function detectHostIp() {
  const hostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.extra?.expoClient?.hostUri ||
    Constants?.manifest?.debuggerHost;

  if (!hostUri) {
    return null;
  }

  return hostUri.split(':')[0];
}

function getApiUrl() {
  // If EXPO_PUBLIC_API_URL exists, use it.
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  // Physical device / Expo development
  const hostIp = detectHostIp();

  if (hostIp) {
    return `http://${hostIp}:5000`;
  }

  // Android emulator
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  // Web / iOS simulator / fallback
  return 'http://127.0.0.1:5000';
}

const API_URL = getApiUrl();

/* =========================================================
   STORAGE KEYS
========================================================= */

const USER_STORAGE_KEY = 'aimdb_current_user';
const SESSION_STORAGE_KEY = 'aimdb_session';

/* =========================================================
   SESSION STORAGE
========================================================= */

async function saveUser(user) {
  if (!user) return;

  await AsyncStorage.setItem(
    USER_STORAGE_KEY,
    JSON.stringify(user)
  );
}

async function saveSession(session) {
  if (!session) return;

  await AsyncStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify(session)
  );
}

async function getStoredSession() {
  const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse stored session:', error);
    return null;
  }
}

async function getAccessToken() {
  const session = await getStoredSession();

  return session?.access_token || null;
}

async function clearSession() {
  await AsyncStorage.multiRemove([
    USER_STORAGE_KEY,
    SESSION_STORAGE_KEY,
  ]);
}

/* =========================================================
   GENERIC API REQUEST
========================================================= */

async function request(path, options = {}) {
  const token = await getAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  /*
   * Protected backend routes use requireAuth middleware.
   * Therefore send the Supabase access token.
   */
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new Error(
      `Cannot connect to backend at ${API_URL}. ` +
      `Make sure the backend is running and the device can reach your computer.`
    );
  }

  const contentType = response.headers.get('content-type') || '';

  let data;

  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => ({}));
  } else {
    const text = await response.text().catch(() => '');
    data = text ? { message: text } : {};
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
      data?.message ||
      `Request failed with status ${response.status}`
    );
  }

  return data;
}

/* =========================================================
   HEALTH
========================================================= */

export async function checkHealth() {
  return request('/health');
}

/* =========================================================
   AUTH
========================================================= */

/*
 * Register
 *
 * Backend:
 * POST /api/auth/register
 *
 * Example:
 * {
 *   email,
 *   password,
 *   full_name,
 *   username
 * }
 */
export async function registerUser(payload) {
  const data = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (data?.user) {
    await saveUser(data.user);
  }

  if (data?.session) {
    await saveSession(data.session);
  }

  return data;
}

/*
 * Login
 *
 * Backend:
 * POST /api/auth/login
 */
export async function loginUser(payload) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (data?.user) {
    await saveUser(data.user);
  }

  if (data?.session) {
    await saveSession(data.session);
  }

  return data;
}

/*
 * Logout
 *
 * Your current backend does not have a logout route,
 * so we clear the locally stored user/session.
 */
export async function logoutUser() {
  await clearSession();
}

/*
 * Get locally stored user.
 */
export async function getCurrentUser() {
  const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse stored user:', error);
    return null;
  }
}

/*
 * Get locally stored session.
 */
export async function getSession() {
  return getStoredSession();
}

/*
 * Verify token with backend.
 *
 * Backend:
 * GET /api/auth/me
 */
export async function getMe() {
  return request('/api/auth/me');
}

/* =========================================================
   PROFILE
========================================================= */

/*
 * GET /api/profile
 */
export async function getProfile() {
  return request('/api/profile');
}

/*
 * PUT /api/profile
 */
export async function updateProfile(payload) {
  return request('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/* =========================================================
   ADHD PROFILE
========================================================= */

/*
 * GET /api/profile/adhd
 */
export async function getADHDProfile() {
  return request('/api/profile/adhd');
}

/*
 * PUT /api/profile/adhd
 */
export async function updateADHDProfile(payload) {
  return request('/api/profile/adhd', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/* =========================================================
   USER PREFERENCES
========================================================= */

/*
 * GET /api/profile/preferences
 */
export async function getPreferences() {
  return request('/api/profile/preferences');
}

/*
 * PUT /api/profile/preferences
 */
export async function updatePreferences(payload) {
  return request('/api/profile/preferences', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/* =========================================================
   TASKS
========================================================= */

/*
 * GET /api/tasks
 */
export async function getTasks() {
  return request('/api/tasks');
}

/*
 * GET /api/tasks/:id
 */
export async function getTask(id) {
  return request(`/api/tasks/${id}`);
}

/*
 * POST /api/tasks
 */
export async function createTask(payload) {
  return request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/*
 * PATCH /api/tasks/:id
 */
export async function updateTask(id, payload) {
  return request(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/*
 * DELETE /api/tasks/:id
 */
export async function deleteTask(id) {
  return request(`/api/tasks/${id}`, {
    method: 'DELETE',
  });
}

/* =========================================================
   HABITS
========================================================= */

/*
 * GET /api/habits
 */
export async function getHabits() {
  return request('/api/habits');
}

/*
 * GET /api/habits/:id
 */
export async function getHabit(id) {
  return request(`/api/habits/${id}`);
}

/*
 * POST /api/habits
 */
export async function createHabit(payload) {
  return request('/api/habits', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/*
 * PATCH /api/habits/:id
 */
export async function updateHabit(id, payload) {
  return request(`/api/habits/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/*
 * DELETE /api/habits/:id
 */
export async function deleteHabit(id) {
  return request(`/api/habits/${id}`, {
    method: 'DELETE',
  });
}

/* =========================================================
   FOCUS SESSIONS
========================================================= */

/*
 * GET /api/focus-sessions
 */
export async function getFocusSessions() {
  return request('/api/focus-sessions');
}

/*
 * GET /api/focus-sessions/:id
 */
export async function getFocusSession(id) {
  return request(`/api/focus-sessions/${id}`);
}

/*
 * POST /api/focus-sessions
 */
export async function createFocusSession(payload) {
  return request('/api/focus-sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/*
 * PATCH /api/focus-sessions/:id
 */
export async function updateFocusSession(id, payload) {
  return request(`/api/focus-sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/*
 * DELETE /api/focus-sessions/:id
 */
export async function deleteFocusSession(id) {
  return request(`/api/focus-sessions/${id}`, {
    method: 'DELETE',
  });
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

/*
 * GET /api/notifications
 */
export async function getNotifications() {
  return request('/api/notifications');
}

/*
 * GET /api/notifications/:id
 */
export async function getNotification(id) {
  return request(`/api/notifications/${id}`);
}

/*
 * POST /api/notifications
 */
export async function createNotification(payload) {
  return request('/api/notifications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/*
 * PATCH /api/notifications/:id
 */
export async function updateNotification(id, payload) {
  return request(`/api/notifications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/*
 * DELETE /api/notifications/:id
 */
export async function deleteNotification(id) {
  return request(`/api/notifications/${id}`, {
    method: 'DELETE',
  });
}

/* =========================================================
   STATISTICS
========================================================= */

/*
 * GET /api/statistics/summary
 */
export async function getStatisticsSummary() {
  return request('/api/statistics/summary');
}

/*
 * GET /api/statistics/daily
 */
export async function getDailyStatistics() {
  return request('/api/statistics/daily');
}

/*
 * GET /api/statistics/weekly
 */
export async function getWeeklyStatistics() {
  return request('/api/statistics/weekly');
}

/*
 * GET /api/statistics/monthly
 */
export async function getMonthlyStatistics() {
  return request('/api/statistics/monthly');
}

/* =========================================================
   EXERCISES
========================================================= */

/*
 * GET /api/exercises/categories
 */
export async function getExerciseCategories() {
  return request('/api/exercises/categories');
}

/*
 * GET /api/exercises
 */
export async function getExercises() {
  return request('/api/exercises');
}

/* =========================================================
   KNOWLEDGE / RAG
========================================================= */

/*
 * GET /api/knowledge/search?q=...
 */
export async function searchKnowledge(query) {
  const encodedQuery = encodeURIComponent(String(query || '').trim());

  if (!encodedQuery) {
    throw new Error('Knowledge search query is required');
  }

  return request(`/api/knowledge/search?q=${encodedQuery}`);
}

/* =========================================================
   AI CONVERSATIONS
========================================================= */

/*
 * GET /api/ai
 */
export async function getAIConversations() {
  return request('/api/ai');
}

/*
 * GET /api/ai/:id
 */
export async function getAIConversation(id) {
  return request(`/api/ai/${id}`);
}

/*
 * POST /api/ai
 */
export async function createAIConversation(payload) {
  return request('/api/ai', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/*
 * PATCH /api/ai/:id
 */
export async function updateAIConversation(id, payload) {
  return request(`/api/ai/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/*
 * DELETE /api/ai/:id
 */
export async function deleteAIConversation(id) {
  return request(`/api/ai/${id}`, {
    method: 'DELETE',
  });
}

/* =========================================================
   ADHD ASSESSMENT
========================================================= */

/*
 * NOTE:
 * Your current app.js does NOT register a /detection route.
 *
 * Therefore this function is kept only for compatibility with
 * your old frontend code. It will NOT work until you add the
 * corresponding backend route.
 */
export async function submitAssessment(answers, userId) {
  return request('/detection/predict', {
    method: 'POST',
    body: JSON.stringify({
      answers,
      user_id: userId,
    }),
  });
}

/* =========================================================
   API URL
========================================================= */

export { API_URL };