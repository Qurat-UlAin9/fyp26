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
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import HomeScreen from '../screens/Home/HomeScreen';
import TasksScreen from '../screens/Tasks/TasksScreen';
import FocusScreen from '../screens/Focus/FocusScreen';
import TimelineScreen from '../screens/Timeline/TimelineScreen';
import HabitsScreen from '../screens/Habits/HabitsScreen';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const activeTintColor = isDark ? '#F5D0FE' : '#4C1D95';
  const inactiveTintColor = isDark ? '#A5B4FC' : '#6B7280';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: [styles.tabBar, { backgroundColor: 'transparent' }],
        tabBarBackground: () => (
          <LinearGradient
            colors={isDark ? ['#111A4A', '#1E1B4B', '#1E3A8A'] : ['#FFFFFF', '#EEF2FF', '#F5F3FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tabBarBackground}
          />
        ),
        tabBarActiveTintColor: activeTintColor,
        tabBarInactiveTintColor: inactiveTintColor,
        tabBarLabelStyle: styles.label,
        tabBarIcon: ({ color, size }) => {
          let iconName = 'ellipse-outline';
          if (route.name === 'Home') iconName = 'home';
          if (route.name === 'Tasks') iconName = 'list';
          if (route.name === 'Focus') iconName = 'timer';
          if (route.name === 'Timeline') iconName = 'grid';
          if (route.name === 'Habits') iconName = 'leaf';

          return (
            <View style={styles.iconWrap}>
              <Ionicons name={iconName} size={size} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Focus" component={FocusScreen} />
      <Tab.Screen name="Timeline" component={TimelineScreen} />
      <Tab.Screen name="Habits" component={HabitsScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
*/
