import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Coins } from 'lucide-react-native';

export default function CoinPill({ coins = 128, style }) {
  return (
    <View style={[styles.pillShadow, style]}>
      <LinearGradient colors={['#FFFFFF', '#FFF7DB']} style={styles.pill}>
        <Coins color="#D4A017" size={16} />
        <Text style={styles.value}>{coins}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  pillShadow: {
    borderRadius: 999,
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  pill: {
    backgroundColor: '#FFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.25)',
  },
  value: {
    color: '#B45309',
    fontWeight: '800',
    fontSize: 14,
  },
});
