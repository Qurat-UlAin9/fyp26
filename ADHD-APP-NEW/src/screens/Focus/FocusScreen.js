import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, RotateCcw, Mic, Lock } from 'lucide-react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const TOTAL_SECONDS = 25 * 60;

export default function FocusScreen() {
  const { theme, isDark } = useTheme();
  const bottomSheetRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [isActive, setIsActive] = useState(false);
  const [selectedSound, setSelectedSound] = useState('Rain');
  const progress = useSharedValue(1);

  const sounds = useMemo(() => ['Rain', 'Forest', 'Brown Noise', 'Instrumental'], []);

  useEffect(() => {
    let timer = null;
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isActive, timeLeft]);

  useEffect(() => {
    progress.value = withTiming(timeLeft / TOTAL_SECONDS, {
      duration: 800,
      easing: Easing.linear,
    });
  }, [timeLeft, progress]);

  const size = 260;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const formatTime = () => {
    const m = Math.floor(timeLeft / 60)
      .toString()
      .padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(TOTAL_SECONDS);
  };

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: theme.text }]}>Focus Session</Text>

        <View style={styles.timerWrap}>
          <Svg width={size} height={size}>
            <Defs>
              <SvgGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor={theme.accentGradient[0]} />
                <Stop offset="50%" stopColor={theme.accentGradient[1]} />
                <Stop offset="100%" stopColor={theme.accentGradient[2]} />
              </SvgGradient>
            </Defs>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.12)'}
              strokeWidth={stroke}
              fill="none"
            />
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="url(#ringGradient)"
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              animatedProps={animatedProps}
              rotation={-90}
              originX={size / 2}
              originY={size / 2}
            />
          </Svg>

          <TouchableOpacity style={[styles.mainPlay, { backgroundColor: isDark ? '#151F45' : '#FFFFFF' }]} onPress={() => setIsActive((p) => !p)}>
            <LinearGradient colors={theme.accentGradient} style={styles.mainPlayGradient}>
              {isActive ? <Pause color="#FFFFFF" size={40} /> : <Play color="#FFFFFF" size={40} />}
            </LinearGradient>
            <Text style={styles.timerText}>{formatTime()}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity onPress={resetTimer} style={styles.smallControl}>
            <RotateCcw color={theme.textSecondary} size={26} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => bottomSheetRef.current?.expand()} style={styles.smallControl}>
            <Mic color={theme.textSecondary} size={26} />
          </TouchableOpacity>
        </View>

        <View style={[styles.unlockCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.unlockTitle, { color: theme.text }]}>Unlock Music</Text>
            <Text style={[styles.unlockText, { color: theme.textSecondary }]}>Complete 3 more sessions to unlock your playlist.</Text>
          </View>
          <Lock color={theme.accentGradient[0]} size={20} />
        </View>
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['45%']}
        enablePanDownToClose
        handleIndicatorStyle={{ backgroundColor: theme.textSecondary }}
        backgroundStyle={{ backgroundColor: isDark ? 'rgba(17,24,39,0.92)' : 'rgba(248,250,252,0.95)' }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Background Sounds</Text>
          {sounds.map((sound) => (
            <TouchableOpacity key={sound} onPress={() => setSelectedSound(sound)} activeOpacity={0.85}>
              <LinearGradient
                colors={
                  selectedSound === sound
                    ? [theme.accentGradient[0], theme.accentGradient[2]]
                    : isDark
                    ? ['#1E293B', '#334155']
                    : ['#FFFFFF', '#EEF2FF']
                }
                style={styles.soundCard}
              >
                <Text style={[styles.soundText, { color: selectedSound === sound ? '#FFFFFF' : theme.text }]}>{sound}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </BottomSheetView>
      </BottomSheet>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 18 },
  timerWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  mainPlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 72,
    width: 144,
    height: 144,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  mainPlayGradient: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  timerText: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  controlsRow: { width: '70%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  smallControl: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.12)',
  },
  unlockCard: {
    width: '100%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  unlockTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  unlockText: { fontSize: 13, paddingRight: 12 },
  sheetContent: { padding: 20, gap: 10 },
  sheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  soundCard: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16 },
  soundText: { fontSize: 15, fontWeight: '600' },
});
