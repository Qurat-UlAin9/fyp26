import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Coins } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function CoinBalancePill() {
  const { coins, theme } = useTheme();

  return (
    <View style={[styles.pill, { backgroundColor: theme.card, borderColor: theme.border }]}> 
      <Coins color={theme.accentGradient[0]} size={16} />
      <Text style={[styles.value, { color: theme.text }]}>{coins}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  value: { fontSize: 13, fontWeight: '800' },
});
