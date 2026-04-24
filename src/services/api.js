import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

function detectHostIp() {
  const hostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.extra?.expoClient?.hostUri ||
    Constants?.manifest?.debuggerHost;

  if (!hostUri) return null;
  return hostUri.split(':')[0];
}

function getApiUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  const hostIp = detectHostIp();
  if (hostIp) {
    return `http://${hostIp}:5000`;
  }

  if (Platform.OS === 'android') {
    // Android emulator loopback for local dev when host IP is unavailable.
    return 'http://10.0.2.2:5000';
  }

  if (Platform.OS === 'web') {
    return 'http://127.0.0.1:5000';
  }

  return 'http://127.0.0.1:5000';
}

const API_URL = getApiUrl();
const USER_STORAGE_KEY = 'aimdb_current_user';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export async function registerUser(payload) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (data.user) await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
  return data.user;
}

export async function loginUser(payload) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (data.user) await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
  return data.user;
}

export async function getCurrentUser() {
  const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function submitAssessment(answers, userId) {
  return request('/detection/predict', {
    method: 'POST',
    body: JSON.stringify({ answers, user_id: userId }),
  });
}

export { API_URL };
