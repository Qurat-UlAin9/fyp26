import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { io } from 'socket.io-client';

const USER_STORAGE_KEY = 'adhd_current_user';
const SESSION_STORAGE_KEY = 'adhd_auth_session';

function detectHostIp() {
  const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoClient?.hostUri || Constants?.manifest?.debuggerHost;
  return hostUri ? hostUri.split(':')[0] : null;
}

function getApiUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (configuredUrl) return configuredUrl.replace(/\/api$/, '');
  const hostIp = detectHostIp();
  if (hostIp) return `http://${hostIp}:5000`;
  if (Platform.OS === 'android') return 'http://10.0.2.2:5000';
  return 'http://127.0.0.1:5000';
}

export const API_URL = getApiUrl();
const API_PREFIX = `${API_URL}/api`;

async function getSession() {
  const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function request(path, options = {}) {
  const session = await getSession();
  const response = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed. Please try again.');
  return data;
}

async function saveAuth(data) {
  if (data.user) await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
  if (data.session) await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data.session));
  return data.user;
}

export async function registerUser(payload) {
  return saveAuth(await request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }));
}

export async function loginUser(payload) {
  return saveAuth(await request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }));
}

export async function getCurrentUser() {
  const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function logoutUser() {
  await AsyncStorage.multiRemove([USER_STORAGE_KEY, SESSION_STORAGE_KEY]);
}

export async function getProfile() { return request('/profile'); }
export async function updateRemoteProfile(profile) { return request('/profile', { method: 'PUT', body: JSON.stringify(profile) }); }
export async function listTasks() { return request('/tasks'); }
export async function createTask(task) { return request('/tasks', { method: 'POST', body: JSON.stringify(task) }); }
export async function updateTaskRemote(id, task) { return request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(task) }); }
export async function deleteTaskRemote(id) { return request(`/tasks/${id}`, { method: 'DELETE' }); }
export async function listHabits() { return request('/habits'); }
export async function createHabit(habit) { return request('/habits', { method: 'POST', body: JSON.stringify(habit) }); }
export async function updateHabitRemote(id, habit) { return request(`/habits/${id}`, { method: 'PATCH', body: JSON.stringify(habit) }); }
export async function deleteHabitRemote(id) { return request(`/habits/${id}`, { method: 'DELETE' }); }
export async function createFocusSession(session) { return request('/focus-sessions', { method: 'POST', body: JSON.stringify(session) }); }

export function connectRealtime(userId, handlers = {}) {
  const socket = io(API_URL, { transports: ['websocket', 'polling'] });
  socket.on('connect', () => socket.emit('subscribe', userId));
  Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
  return () => socket.disconnect();
}

export async function submitAssessment(answers, userId) {
  return request('/detection/predict', { method: 'POST', body: JSON.stringify({ answers, user_id: userId }) });
}
