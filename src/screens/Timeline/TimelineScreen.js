import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import GlassCard from '../../components/common/GlassCard';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { moodData } from '../../data/moodData';

const categories = ['Mood', 'Habits', 'Tasks', 'Sleep', 'Focus'];

const TimelineScreen = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];
  const [selected, setSelected] = React.useState(null);

  return (
    <ImageBackground source={{ uri: 'cosmic_bg_url' }} style={styles.background}> {/* Placeholder */}
      <View style={[styles.container, { backgroundColor: themeColors.background + '80' }]}>
        <Text style={[styles.title, { color: themeColors.text }]}>Visualization Timeline</Text>
        <View style={styles.galaxy}>
          {categories.map(cat => (
            <TouchableOpacity key={cat} onPress={() => setSelected(cat)} style={styles.planet}>
              <View style={[styles.circle, { borderColor: themeColors.primary }]}>
                <Text style={[styles.catText, { color: themeColors.text }]}>{cat}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        {selected && (
          <GlassCard style={styles.summary}>
            <Text style={[styles.summaryTitle, { color: themeColors.text }]}>{selected} Summary</Text>
            {/* Placeholder data */}
            <Text style={[styles.description, { color: themeColors.text }]}>Data for {selected}: {moodData[0].description}</Text>
          </GlassCard>
        )}
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  galaxy: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // Add lines/animations if needed
  },
  planet: {
    position: 'absolute', // Position them like planets
    // Example positions: top: 100, left: 50, etc.
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catText: {
    fontSize: 14,
  },
  summary: {
    marginTop: 20,
  },
  summaryTitle: {
    fontSize: 18,
  },
  description: {
    fontSize: 16,
    marginTop: 10,
  },
});

export default TimelineScreen;