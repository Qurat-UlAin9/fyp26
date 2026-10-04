import AsyncStorage from '@react-native-async-storage/async-storage';

const ASSESSMENT_ON_START_KEY = 'assessment_on_start_v1';

export async function getAssessmentOnStart() {
  const value = await AsyncStorage.getItem(ASSESSMENT_ON_START_KEY);
  return value === null ? true : value === 'true';
}

export async function setAssessmentOnStart(enabled) {
  await AsyncStorage.setItem(ASSESSMENT_ON_START_KEY, String(Boolean(enabled)));
}