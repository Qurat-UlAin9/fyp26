import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, CheckSquare, Target, Clock, BarChart2 } from 'lucide-react-native';
import HomeScreen from '../screens/Home/HomeScreen';
import TasksScreen from '../screens/Tasks/TasksScreen';
import FocusScreen from '../screens/Focus/FocusScreen';
import TimelineScreen from '../screens/Timeline/TimelineScreen';
import ReportsScreen from '../screens/Reports/ReportsScreen';
import { useTheme } from '../contexts/ThemeContext';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { theme } = useTheme();
  const colors = theme === 'dark' 
    ? { background: '#1E1B4B', text: '#E0E7FF' } 
    : { background: '#F3E8FF', text: '#4B5563' };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // Add this to prevent header errors
        tabBarStyle: { 
          backgroundColor: colors.background, 
          borderTopWidth: 0, 
          elevation: 5 
        },
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: colors.text,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
          tabBarLabel: 'Home', // Explicit label
        }} 
      />
      <Tab.Screen 
        name="Tasks" 
        component={TasksScreen} 
        options={{ 
          tabBarIcon: ({ color }) => <CheckSquare color={color} size={24} />,
          tabBarLabel: 'Tasks',
        }} 
      />
      <Tab.Screen 
        name="Focus" 
        component={FocusScreen} 
        options={{ 
          tabBarIcon: ({ color }) => <Target color={color} size={24} />,
          tabBarLabel: 'Focus',
        }} 
      />
      <Tab.Screen 
        name="Timeline" 
        component={TimelineScreen} 
        options={{ 
          tabBarIcon: ({ color }) => <Clock color={color} size={24} />,
          tabBarLabel: 'Timeline',
        }} 
      />
      <Tab.Screen 
        name="Reports" 
        component={ReportsScreen} 
        options={{ 
          tabBarIcon: ({ color }) => <BarChart2 color={color} size={24} />,
          tabBarLabel: 'Reports',
        }} 
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;

/** 
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons'; // Assuming installed; matches Expo setup
import { useTheme } from '../contexts/ThemeContext';
import HomeScreen from '../screens/Home/HomeScreen';
import TasksScreen from '../screens/Tasks/TasksScreen';
import FocusScreen from '../screens/Focus/FocusScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const tabBarBackground = isDark ? '#1E293B' : '#FFFFFF';
  const activeTintColor = isDark ? '#A78BFA' : '#8B5CF6';
  const inactiveTintColor = isDark ? '#94A3B8' : '#6B7280';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: tabBarBackground,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 60,
          borderRadius: 30, // Rounded like your UI
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: activeTintColor,
        tabBarInactiveTintColor: inactiveTintColor,
        tabBarLabelStyle: {
          fontFamily: 'Poppins',
          fontSize: 12,
          paddingBottom: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Focus"
        component={FocusScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="aperture-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
*/