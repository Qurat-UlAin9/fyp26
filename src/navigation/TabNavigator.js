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

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    borderTopWidth: 0,
    elevation: 0,
    height: 72,
    paddingBottom: 8,
    paddingTop: 6,
    borderRadius: 28,
    shadowColor: '#312E81',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  tabBarBackground: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  label: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  iconWrap: {
    marginTop: 2,
  },
});

export default TabNavigator;
