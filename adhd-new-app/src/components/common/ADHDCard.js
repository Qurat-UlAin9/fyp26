import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from './ThemeProvider';

const ADHDCard = ({ title, subtitle, children, style }) => {
  const { colors } = useTheme();
  return (
    <View style={[
      { 
        backgroundColor: colors.card, borderRadius: 24, padding: 24, 
        marginBottom: 20, borderWidth: 1, borderColor: colors.border,
        shadowColor: colors.shadow, shadowOffset: {width:0,height:8},
        shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 
      }, style
    ]}>
      {title && <Text style={{fontSize:22, fontWeight:'800', color:colors.text, lineHeight:28}}>{title}</Text>}
      {subtitle && <Text style={{fontSize:16, marginTop:4, color:colors.textSecondary}}>{subtitle}</Text>}
      {children}
    </View>
  );
};

export default ADHDCard;
