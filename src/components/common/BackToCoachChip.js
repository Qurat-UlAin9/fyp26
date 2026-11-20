import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getCoachReturn, setCoachReturn, subscribeCoachReturn } from '../../utils/coachNav';

// Floating chip shown over the bottom-tab screens after the coach sent the
// user there. Tapping it goes back to the chat.
export default function BackToCoachChip({ route, navigation }) {
  const [active, setActive] = useState(getCoachReturn());

  useEffect(() => subscribeCoachReturn(setActive), []);

  if (!active || route?.name !== 'MainTabs') return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.chip}>
        <TouchableOpacity
          style={styles.main}
          activeOpacity={0.85}
          onPress={() => {
            setCoachReturn(false);
            navigation.navigate('Chatbot');
          }}
        >
          <Text style={styles.text}>💬 Back to coach</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.close} hitSlop={8} onPress={() => setCoachReturn(false)}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, bottom: 104, zIndex: 50, elevation: 20 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 22,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  main: { paddingVertical: 2 },
  text: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  close: { marginLeft: 8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  closeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});