import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '../../components/common/ThemeProvider';
import ADHDCard from '../../components/common/ADHDCard';
import ADHDButton from '../../components/common/ADHDButton';
import { Globe, Sun, Moon } from 'lucide-react-native';

const LanguageThemeScreen = ({ navigation }) => {
  const { colors, toggleTheme } = useTheme();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 24 }}>
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: colors.text }}>Get Started</Text>
        <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center' }}>
          Choose your preferences
        </Text>
      </View>

      <ADHDCard title="Language" subtitle="Select your language">
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <ADHDButton title="🇺🇸 English" variant="outline" style={{ flex: 1 }} />
          <ADHDButton title="🇪🇸 Español" variant="outline" style={{ flex: 1 }} />
        </View>
      </ADHDCard>

      <ADHDCard title="Theme" subtitle="Choose your visual style">
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <ADHDButton title="Light" icon="Sun" variant="outline" style={{ flex: 1 }} onPress={toggleTheme} />
          <ADHDButton title="Dark" icon="Moon" variant="outline" style={{ flex: 1 }} onPress={toggleTheme} />
        </View>
      </ADHDCard>

      <ADHDButton title="Continue to Login" onPress={() => navigation.replace('LoginScreen')} style={{ marginTop: 20 }} />
    </ScrollView>
  );
};

export default LanguageThemeScreen;
