import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../constants/api';

const CASTLE_IMAGE = `${API_BASE_URL}/uploads/images/spis_castle_hero.jpg`;

// Flag images from CDN
const FLAG_IMAGES: Record<string, string> = {
  sk: 'https://flagcdn.com/w80/sk.png',
  en: 'https://flagcdn.com/w80/gb.png',
  de: 'https://flagcdn.com/w80/de.png',
  pl: 'https://flagcdn.com/w80/pl.png',
  hu: 'https://flagcdn.com/w80/hu.png',
  fr: 'https://flagcdn.com/w80/fr.png',
  es: 'https://flagcdn.com/w80/es.png',
  ru: 'https://flagcdn.com/w80/ru.png',
  zh: 'https://flagcdn.com/w80/cn.png',
};

// Hardcoded fallback languages — always show all 9
const FALLBACK_LANGUAGES = [
  { code: 'sk', name: 'Slovak',    native_name: 'Slovenčina' },
  { code: 'en', name: 'English',   native_name: 'English' },
  { code: 'de', name: 'German',    native_name: 'Deutsch' },
  { code: 'pl', name: 'Polish',    native_name: 'Polski' },
  { code: 'hu', name: 'Hungarian', native_name: 'Magyar' },
  { code: 'fr', name: 'French',    native_name: 'Français' },
  { code: 'es', name: 'Spanish',   native_name: 'Español' },
  { code: 'ru', name: 'Russian',   native_name: 'Русский' },
  { code: 'zh', name: 'Chinese',   native_name: '中文' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { languages, setSelectedLanguage } = useApp();

  // Use hardcoded fallback if API hasn't loaded languages yet
  const displayLanguages = languages.length > 0 ? languages : FALLBACK_LANGUAGES;

  const handleLanguageSelect = (langCode: string) => {
    setSelectedLanguage(langCode);
    router.push('/tour-select');
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <Image source={{ uri: CASTLE_IMAGE }} style={styles.bgImage} resizeMode="cover" blurRadius={Platform.OS === 'web' ? 0 : 4} />
      <View style={styles.bgOverlay} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
        </View>

        {/* Globe Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="globe" size={36} color="#D4A017" />
        </View>

        <Text style={styles.title}>Choose Language</Text>
        <Text style={styles.subtitle}>Select your preferred language</Text>

        {/* Language List */}
        {displayLanguages.map((lang) => (
          <Pressable
            key={lang.code}
            style={({ pressed }) => [styles.langCard, pressed && styles.langCardPressed]}
            onPress={() => handleLanguageSelect(lang.code)}
          >
            <View style={styles.flagContainer}>
              {FLAG_IMAGES[lang.code] ? (
                <Image source={{ uri: FLAG_IMAGES[lang.code] }} style={styles.flagImage} resizeMode="cover" />
              ) : (
                <Text style={styles.flagEmoji}>{lang.flag_emoji}</Text>
              )}
            </View>
            <View style={styles.langInfo}>
              <Text style={styles.langName}>{lang.native_name}</Text>
              <Text style={styles.langNameEn}>{lang.name}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  bgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20, 20, 40, 0.75)' },
  scrollView: { flex: 1, zIndex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  header: { flexDirection: 'row', marginBottom: 12 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },

  iconContainer: { alignSelf: 'center', marginBottom: 8 },
  title: { fontSize: 30, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 24 },

  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 55, 0.88)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  langCardPressed: { backgroundColor: 'rgba(40, 40, 70, 0.95)', borderColor: 'rgba(212,160,23,0.3)' },

  flagContainer: {
    width: 48,
    height: 34,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagImage: { width: 48, height: 34, borderRadius: 6 },
  flagEmoji: { fontSize: 28 },

  langInfo: { flex: 1 },
  langName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  langNameEn: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
});
