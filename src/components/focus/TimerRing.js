import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { Circle } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const TimerRing = ({ progress, isPlaying }) => {
  const { theme } = useTheme();
  const themeColors = colors[theme];
  const glow = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  React.useEffect(() => {
    if (isPlaying) {
      glow.value = withRepeat(withTiming(0.5, { duration: 1000 }), -1, true);
    } else {
      glow.value = 1;
    }
  }, [isPlaying]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.ring, animatedStyle, { borderColor: themeColors.primary }]}>
        <Circle cx="100" cy="100" r="90" stroke={themeColors.accent} strokeWidth="10" fill="none" strokeDasharray={`${progress * 565}, 565`} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    borderWidth: 10,
    borderRadius: 100,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
});

export default TimerRing;