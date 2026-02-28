import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, ListChecks, Timer, LayoutGrid, Leaf } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import HomeScreen from '../screens/Home/HomeScreen';
import TasksScreen from '../screens/Tasks/TasksScreen';
import FocusScreen from '../screens/Focus/FocusScreen';
import TimelineScreen from '../screens/Timeline/TimelineScreen';
import HabitsScreen from '../screens/Habits/HabitsScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let Icon;
          if (route.name === 'Home') Icon = Home;
          else if (route.name === 'Tasks') Icon = ListChecks;
          else if (route.name === 'Focus') Icon = Timer;
          else if (route.name === 'Timeline') Icon = LayoutGrid;
          else if (route.name === 'Habits') Icon = Leaf;
          return <Icon color={color} size={size} />;
        },
        tabBarActiveTintColor: theme.accentGradient[0],
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Focus" component={FocusScreen} />
      <Tab.Screen name="Timeline" component={TimelineScreen} />
      <Tab.Screen name="Habits" component={HabitsScreen} />
    </Tab.Navigator>
  );
}