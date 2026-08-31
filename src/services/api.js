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
  /*
   * Optional:
   * EXPO_PUBLIC_API_URL=http://192.168.x.x:5000
   */
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  /*
   * Expo development on a physical device.
   * Automatically use the computer's LAN IP.
   */
  const hostIp = detectHostIp();

  if (hostIp) {
    return `http://${hostIp}:5000`;
  }

  /*
   * Android emulator -> host computer
   */
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  /*
   * Web / iOS simulator / fallback
   */
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
   GENERIC REQUEST
========================================================= */

async function request(path, options = {}) {
  const token = await getAccessToken();

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  /*
   * Protected backend routes use requireAuth.
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

  const contentType =
    response.headers.get('content-type') || '';

  let data;

  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => ({}));
  } else {
    const text = await response.text().catch(() => '');
    data = text ? { message: text } : {};
  }

  if (!response.ok) {
    /*
     * If token expired, remove local authentication.
     */
    if (response.status === 401) {
      await clearSession();
    }

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

export async function registerUser(payload) {
  const data = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (data?.user) {
    await saveUser(data.user);
  }

  /*
   * Supabase may return null session when email confirmation
   * is enabled. In that case the user must log in separately.
   */
  if (data?.session) {
    await saveSession(data.session);
  }

  return data;
}

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

export async function logoutUser() {
  await clearSession();
}

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

export async function getSession() {
  return getStoredSession();
}

export async function getMe() {
  return request('/api/auth/me');
}

/* =========================================================
   PROFILE
========================================================= */

export async function getProfile() {
  return request('/api/profile');
}

export async function updateProfile(payload) {
  return request('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/* =========================================================
   ADHD PROFILE
========================================================= */

export async function getADHDProfile() {
  return request('/api/profile/adhd');
}

export async function updateADHDProfile(payload) {
  return request('/api/profile/adhd', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/* =========================================================
   USER PREFERENCES
========================================================= */

export async function getPreferences() {
  return request('/api/profile/preferences');
}

export async function updatePreferences(payload) {
  return request('/api/profile/preferences', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/* =========================================================
   TASKS
========================================================= */

export async function getTasks() {
  return request('/api/tasks');
}

export async function getTask(id) {
  return request(`/api/tasks/${id}`);
}

export async function createTask(payload) {
  return request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTask(id, payload) {
  return request(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteTask(id) {
  return request(`/api/tasks/${id}`, {
    method: 'DELETE',
  });
}

/* =========================================================
   HABITS
========================================================= */

export async function getHabits() {
  return request('/api/habits');
}

export async function getHabit(id) {
  return request(`/api/habits/${id}`);
}

export async function createHabit(payload) {
  return request('/api/habits', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateHabit(id, payload) {
  return request(`/api/habits/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteHabit(id) {
  return request(`/api/habits/${id}`, {
    method: 'DELETE',
  });
}

/* =========================================================
   FOCUS SESSIONS
========================================================= */

export async function getFocusSessions() {
  return request('/api/focus-sessions');
}

export async function getFocusSession(id) {
  return request(`/api/focus-sessions/${id}`);
}

export async function createFocusSession(payload) {
  return request('/api/focus-sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateFocusSession(id, payload) {
  return request(`/api/focus-sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteFocusSession(id) {
  return request(`/api/focus-sessions/${id}`, {
    method: 'DELETE',
  });
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

export async function getNotifications() {
  return request('/api/notifications');
}

export async function getNotification(id) {
  return request(`/api/notifications/${id}`);
}

export async function createNotification(payload) {
  return request('/api/notifications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateNotification(id, payload) {
  return request(`/api/notifications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteNotification(id) {
  return request(`/api/notifications/${id}`, {
    method: 'DELETE',
  });
}

/* =========================================================
   STATISTICS
========================================================= */

export async function getStatisticsSummary() {
  return request('/api/statistics/summary');
}

export async function getDailyStatistics() {
  return request('/api/statistics/daily');
}

export async function getWeeklyStatistics() {
  return request('/api/statistics/weekly');
}

export async function getMonthlyStatistics() {
  return request('/api/statistics/monthly');
}

/* =========================================================
   EXERCISES
========================================================= */

export async function getExerciseCategories() {
  return request('/api/exercises/categories');
}

export async function getExercises() {
  return request('/api/exercises');
}

/* =========================================================
   KNOWLEDGE / RAG
========================================================= */

/*
 * IMPORTANT:
 *
 * The frontend does NOT communicate directly with Pinecone.
 *
 * Frontend
 *    ↓
 * Backend
 *    ↓
 * Pinecone / Supabase knowledge layer
 *
 * This endpoint currently represents the backend knowledge
 * search endpoint. When your backend RAG endpoint is upgraded
 * to Pinecone retrieval, this frontend function does not need
 * to change as long as the API contract remains the same.
 */

export async function searchKnowledge(query) {
  const value = String(query || '').trim();

  if (!value) {
    throw new Error('Knowledge search query is required');
  }

  return request(
    `/api/knowledge/search?q=${encodeURIComponent(value)}`
  );
}

/* =========================================================
   AI CONVERSATIONS
========================================================= */

export async function getAIConversations() {
  return request('/api/ai');
}

export async function getAIConversation(id) {
  return request(`/api/ai/${id}`);
}

export async function createAIConversation(payload) {
  return request('/api/ai', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAIConversation(id, payload) {
  return request(`/api/ai/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAIConversation(id) {
  return request(`/api/ai/${id}`, {
    method: 'DELETE',
  });
}


export async function sendChatMessage(conversationId, message) {
  return request('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ conversationId, message }),
  });
}

/* =========================================================
   ADHD ASSESSMENT
========================================================= */

/*
 * Your current backend app.js does NOT register:
 *
 * /detection/predict
 *
 * Therefore this remains a compatibility function only.
 *
 * Do not use it until the assessment backend route exists.
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