import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ChevronLeft, Circle, Droplets, Sparkles } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');
const CARD_HORIZONTAL_MARGIN = 14;
const CARD_WIDTH = screenWidth - 64;
const SNAP_INTERVAL = CARD_WIDTH + CARD_HORIZONTAL_MARGIN * 2;

const EXERCISES = [
  {
    id: 'balloon-breath',
    title: 'Balloon Breathing',
    duration: '60 seconds',
    icon: Circle,
    iconColor: '#E2ECFF',
    accent: 'rgba(129, 201, 255, 0.9)',
  },
  {
    id: 'grounding-54321',
    title: '5-4-3-2-1 Grounding',
    duration: '90 seconds',
    icon: Sparkles,
    iconColor: '#E8EFFF',
    accent: 'rgba(154, 221, 255, 0.92)',
  },
  {
    id: 'cold-water',
    title: 'Cold Water Splash',
    duration: '30 seconds',
    icon: Droplets,
    iconColor: '#D8F0FF',
    accent: 'rgba(111, 195, 255, 0.95)',
  },
];

function ExerciseCard({ exercise, isCentered, onStart }) {
  const IconComponent = exercise.icon;

  return (
    <View style={styles.cardOuterWrap}>
      <View
        style={[
          styles.cardGlow,
          isCentered && {
            shadowColor: exercise.accent,
            shadowOpacity: 0.62,
            shadowRadius: 24,
            elevation: 12,
            borderColor: 'rgba(255,255,255,0.48)',
          },
        ]}
      >
        <BlurView intensity={44} tint="light" style={styles.cardBlur}>
          <LinearGradient
            colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.09)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.badgeWrap}>
              <Text style={styles.badgeText}>{exercise.duration}</Text>
            </View>

            <View style={styles.iconArea}>
              <View style={[styles.iconOrb, isCentered && styles.iconOrbCentered]}>
                <IconComponent size={74} color={exercise.iconColor} strokeWidth={1.5} />
              </View>
            </View>

            <Text style={styles.cardTitle}>{exercise.title}</Text>

            <Pressable style={styles.startButton} onPress={() => onStart(exercise)}>
              <Text style={styles.startText}>Start</Text>
            </Pressable>
          </LinearGradient>
        </BlurView>
      </View>
    </View>
  );
}

export default function ImmediateReliefScreen({ navigation }) {
  const flatListRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length) {
      const centered = viewableItems[0];
      if (centered?.index != null) {
        setActiveIndex(centered.index);
      }
    }
  }).current;

  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 65,
    }),
    []
  );

  const handleQuickExit = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    BackHandler.exitApp();
  }, [navigation]);

  const handleStart = useCallback((exercise) => {
    // Keeping this modular for future deep-linking to dedicated exercise experiences.
    console.log(`Start requested for: ${exercise.id}`);
  }, []);

  return (
    <LinearGradient
      colors={['#DCEAFF', '#CFE2FF', '#DDEEFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color="#23344E" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Quick Calm</Text>

          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.encouragement}>Just breathe, Ain. You&apos;ve got this.</Text>

        <View style={styles.carouselSection}>
          <FlatList
            ref={flatListRef}
            data={EXERCISES}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            snapToInterval={SNAP_INTERVAL}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            renderItem={({ item, index }) => (
              <ExerciseCard
                exercise={item}
                isCentered={index === activeIndex}
                onStart={handleStart}
              />
            )}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
          />
        </View>

        <Pressable style={styles.quickExitButton} onPress={handleQuickExit}>
          <Text style={styles.quickExitText}>Quick Exit</Text>
        </Pressable>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 22,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    minWidth: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  backText: {
    fontSize: 16,
    color: '#23344E',
    fontWeight: '500',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginRight: 72,
    fontSize: 28,
    color: '#203048',
    fontFamily: 'Georgia',
    letterSpacing: 0.4,
  },
  headerSpacer: {
    width: 0,
  },
  encouragement: {
    marginTop: 14,
    color: '#2B3E59',
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  carouselSection: {
    flex: 1,
    justifyContent: 'center',
  },
  carouselContent: {
    paddingHorizontal: 4,
  },
  cardOuterWrap: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_HORIZONTAL_MARGIN,
  },
  cardGlow: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
    shadowColor: '#86B7FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 16,
    elevation: 6,
    overflow: 'hidden',
  },
  cardBlur: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  cardGradient: {
    minHeight: 420,
    borderRadius: 30,
    padding: 24,
  },
  badgeWrap: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.48)',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#274363',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  iconArea: {
    marginTop: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOrb: {
    width: 152,
    height: 152,
    borderRadius: 76,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.17)',
  },
  iconOrbCentered: {
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  cardTitle: {
    marginTop: 34,
    textAlign: 'center',
    color: '#1E3552',
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 34,
  },
  startButton: {
    marginTop: 'auto',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    paddingVertical: 14,
    alignItems: 'center',
  },
  startText: {
    color: '#1F3553',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  quickExitButton: {
    marginTop: 16,
    backgroundColor: 'rgba(29, 47, 74, 0.85)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  quickExitText: {
    color: '#F6FAFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
