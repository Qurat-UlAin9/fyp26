import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

export default function TimerRing({ progress }) {
  const { theme } = useTheme();
  const size = 250;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        stroke={theme.textSecondary + '40'}
        fill="none"
        cx={size/2}
        cy={size/2}
        r={radius}
        strokeWidth={strokeWidth}
      />
      <Circle
        stroke={theme.accentGradient[0]}
        fill="none"
        cx={size/2}
        cy={size/2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size/2}, ${size/2}`}
      />
    </Svg>
  );
}