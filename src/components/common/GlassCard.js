import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const GlassCard = ({ children, style }) => {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  return (
    <LinearGradient colors={colors.gradients} style={[styles.gradient, style]}>
      <BlurView intensity={50} tint={theme} style={styles.blur}>
        <View style={[styles.card, { backgroundColor: themeColors.card + '80' }]}>
          {children}
        </View>
      </BlurView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  blur: {
    flex: 1,
  },
  card: {
    flex: 1,
    padding: 20,
    borderRadius: 30,
  },
});

export default GlassCard;