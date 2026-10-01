import React from 'react';
import { BaseToast, ErrorToast } from 'react-native-toast-message';

const baseStyle = {
  borderLeftWidth: 4,
  backgroundColor: '#1E293B',
  borderRadius: 14,
};

const text1Style = {
  color: '#F1F5F9',
  fontSize: 14,
  fontWeight: '700',
};

const text2Style = {
  color: '#94A3B8',
  fontSize: 12,
  fontWeight: '500',
};

export const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ ...baseStyle, borderLeftColor: '#10B981' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={text1Style}
      text2Style={text2Style}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ ...baseStyle, borderLeftColor: '#EF4444' }}
      text1Style={text1Style}
      text2Style={text2Style}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{ ...baseStyle, borderLeftColor: '#6366F1' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={text1Style}
      text2Style={text2Style}
    />
  ),
};