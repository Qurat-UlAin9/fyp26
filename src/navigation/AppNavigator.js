import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashIntroScreen from '../screens/Auth/SplashIntroScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import OnboardingScreen from '../screens/Auth/OnboardingScreen';
import WelcomeScreen from '../screens/Auth/WelcomeScreen';
import TabNavigator from './TabNavigator';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import EditProfileScreen from '../screens/Profile/EditProfileScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import RewardsScreen from '../screens/Rewards/RewardsScreen';
import EmotionRegulationScreen from '../screens/Emotion/EmotionRegulationScreen';
import ImmediateReliefScreen from '../screens/Emotion/ImmediateReliefScreen';
import MindfulGrowthScreen from '../screens/Emotion/MindfulGrowthScreen';
import CognitivePowerScreen from '../screens/Emotion/CognitivePowerScreen';
import ChatbotScreen from '../screens/Chatbot/ChatbotScreen';
import QuestionnaireScreen from '../screens/Detection/QuestionnaireScreen';
import AssessmentResultScreen from '../screens/Detection/AssessmentResultScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerTintColor: '#8B5CF6',
        headerTitleStyle: { fontWeight: '700' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Splash" component={SplashIntroScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="Rewards" component={RewardsScreen} options={{ title: 'Rewards' }} />
      <Stack.Screen name="EmotionRegulation" component={EmotionRegulationScreen} options={{ title: 'Emotion Regulation' }} />
      <Stack.Screen name="ImmediateRelief" component={ImmediateReliefScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MindfulGrowth" component={MindfulGrowthScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CognitivePower" component={CognitivePowerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chatbot" component={ChatbotScreen} options={{ title: 'AI Coach' }} />
      <Stack.Screen name="Questionnaire" component={QuestionnaireScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AssessmentResult" component={AssessmentResultScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
