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

export default function TabNavigator() {
  const { isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <LinearGradient
            colors={isDark ? ['#111A4A', '#1E1B4B', '#1E3A8A'] : ['#FFFFFF', '#EEF2FF', '#F5F3FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tabBackground}
          />
        ),
        tabBarActiveTintColor: isDark ? '#F5D0FE' : '#4C1D95',
        tabBarInactiveTintColor: isDark ? '#A5B4FC' : '#64748B',
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, size }) => {
          let iconName = 'ellipse';
          if (route.name === 'Home') iconName = 'home';
          if (route.name === 'Tasks') iconName = 'list';
          if (route.name === 'Focus') iconName = 'timer';
          if (route.name === 'Timeline') iconName = 'grid';
          if (route.name === 'Habits') iconName = 'leaf';

          return (
            <View style={styles.iconWrap}>
              <Ionicons name={iconName} color={color} size={size} />
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
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    borderTopWidth: 0,
    elevation: 0,
    shadowColor: '#312E81',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    borderRadius: 28,
    height: 72,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  tabBackground: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  iconWrap: {
    marginTop: 2,
  },
});
