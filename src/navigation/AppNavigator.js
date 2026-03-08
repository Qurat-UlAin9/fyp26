/** 
import React from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TabNavigator from './TabNavigator';

import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import OnboardingScreen from '../screens/Auth/OnboardingScreen';
import LanguageThemeScreen from '../screens/Auth/LanguageThemeScreen';

import ChatbotScreen from '../screens/Chatbot/ChatbotScreen';

import QuestionnaireScreen from '../screens/Detection/QuestionnaireScreen';

import EmotionRegulationScreen from '../screens/Emotion/EmotionRegulationScreen';

import SessionSummaryScreen from '../screens/Focus/SessionSummaryScreen';

import HabitsScreen from '../screens/Habits/HabitsScreen';

import ProfileScreen from '../screens/Profile/ProfileScreen'; // Already in tabs, but included if needed for direct nav
import EditProfileScreen from '../screens/Profile/EditProfileScreen';

import RewardsScreen from '../screens/Rewards/RewardsScreen';
import BadgesScreen from '../screens/Rewards/BadgesScreen';

import SettingsScreen from '../screens/Settings/SettingsScreen';

import CreateTaskScreen from '../screens/Tasks/CreateTaskScreen';
import TaskDetailsScreen from '../screens/Tasks/TaskDetailsScreen';

import TimelineScreen from '../screens/Timeline/TimelineScreen'; // Added for your structure

import { useTheme } from '../contexts/ThemeContext';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  const LightAppTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: '#F3E8FF',      // Soft lavender (like image)
      card: '#FFFFFF',
      text: '#1F2937',
      border: 'transparent',
      primary: '#8B5CF6',         // Purple accent
      notification: '#8B5CF6',
    },
    fonts: {
      regular: {
        fontFamily: 'Poppins',
        fontWeight: '400',
      },
      medium: {
        fontFamily: 'Poppins',
        fontWeight: '500',
      },
      bold: {
        fontFamily: 'Poppins-Bold',
        fontWeight: '700',
      },
    },
  };

  const DarkAppTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#0F172A',      // Deep navy (like image)
      card: '#1E293B',
      text: '#E2E8F0',
      border: 'transparent',
      primary: '#A78BFA',         // Soft purple glow
      notification: '#A78BFA',
    },
    fonts: {
      regular: {
        fontFamily: 'Poppins',
        fontWeight: '400',
      },
      medium: {
        fontFamily: 'Poppins',
        fontWeight: '500',
      },
      bold: {
        fontFamily: 'Poppins-Bold',
        fontWeight: '700',
      },
    },
  };

  return (
    <NavigationContainer theme={isDark ? DarkAppTheme : LightAppTheme}>
      <Stack.Navigator
        initialRouteName="Tabs"
        screenOptions={{
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />

        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LanguageTheme" component={LanguageThemeScreen} options={{ headerShown: false }} />

        <Stack.Screen name="Chatbot" component={ChatbotScreen} options={{ headerShown: true }} />
        <Stack.Screen name="Questionnaire" component={QuestionnaireScreen} options={{ headerShown: true }} />
        <Stack.Screen name="EmotionRegulation" component={EmotionRegulationScreen} options={{ headerShown: true }} />
        <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} options={{ headerShown: true }} />

        <Stack.Screen name="Habits" component={HabitsScreen} options={{ headerShown: true }} />

        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: true }} />

        <Stack.Screen name="Rewards" component={RewardsScreen} options={{ headerShown: true }} />
        <Stack.Screen name="Badges" component={BadgesScreen} options={{ headerShown: true }} />

        <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true }} />

        <Stack.Screen name="CreateTask" component={CreateTaskScreen} options={{ headerShown: true }} />
        <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} options={{ headerShown: true }} />

        <Stack.Screen name="Timeline" component={TimelineScreen} options={{ headerShown: true }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

*/



import React from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TabNavigator from './TabNavigator';

import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import OnboardingScreen from '../screens/Auth/OnboardingScreen';
import LanguageThemeScreen from '../screens/Auth/LanguageThemeScreen';

import ChatbotScreen from '../screens/Chatbot/ChatbotScreen';

import QuestionnaireScreen from '../screens/Detection/QuestionnaireScreen';

import EmotionRegulationScreen from '../screens/Emotion/EmotionRegulationScreen';

import SessionSummaryScreen from '../screens/Focus/SessionSummaryScreen';

import HabitsScreen from '../screens/Habits/HabitsScreen';

import ProfileScreen from '../screens/Profile/ProfileScreen';
import EditProfileScreen from '../screens/Profile/EditProfileScreen';

import RewardsScreen from '../screens/Rewards/RewardsScreen';
import BadgesScreen from '../screens/Rewards/BadgesScreen';

import SettingsScreen from '../screens/Settings/SettingsScreen';

import CreateTaskScreen from '../screens/Tasks/CreateTaskScreen';
import TaskDetailsScreen from '../screens/Tasks/TaskDetailsScreen';

import { useTheme } from '../contexts/ThemeContext';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { theme } = useTheme();

  const isDark = theme === 'dark';

 
 const LightAppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#F3E8FF',
    card: '#FFFFFF',
    text: '#1F2937',
    border: 'transparent',
    primary: '#8B5CF6',
    notification: '#8B5CF6',
  },
  fonts: {
    regular: {
      fontFamily: 'Poppins',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'Poppins-Medium',  // ✅ FIXED: Use 'Poppins-Medium' not 'Poppins'
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'Poppins-Bold',
      fontWeight: '700',
    },
  },
};

const DarkAppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0F172A',
    card: '#1E293B',
    text: '#E2E8F0',
    border: 'transparent',
    primary: '#A78BFA',
    notification: '#A78BFA',
  },
  fonts: {
    regular: {
      fontFamily: 'Poppins',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'Poppins-Medium',  // ✅ FIXED: Use 'Poppins-Medium' not 'Poppins'
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'Poppins-Bold',
      fontWeight: '700',
    },
  },
};

  return (
    <NavigationContainer theme={isDark ? DarkAppTheme : LightAppTheme}>
      <Stack.Navigator
        initialRouteName="Tabs"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        
        <Stack.Screen name="Tabs" component={TabNavigator} />

       
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="LanguageTheme" component={LanguageThemeScreen} />

        
        <Stack.Screen name="Chatbot" component={ChatbotScreen} />
        <Stack.Screen name="Questionnaire" component={QuestionnaireScreen} />
        <Stack.Screen name="EmotionRegulation" component={EmotionRegulationScreen} />
        <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />

   
        <Stack.Screen name="Habits" component={HabitsScreen} />

    
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />

     
        <Stack.Screen name="Rewards" component={RewardsScreen} />
        <Stack.Screen name="Badges" component={BadgesScreen} />

  
        <Stack.Screen name="Settings" component={SettingsScreen} />

      
        <Stack.Screen name="CreateTask" component={CreateTaskScreen} />
        <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
