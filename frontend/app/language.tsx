import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

// Flag image URLs from a CDN (reliable cross-platform rendering)
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

export default function LanguageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { languages, setSelectedLanguage } = useApp();

  const handleLanguageSelect = (langCode: string) => {
    setSelectedLanguage(langCode);
    router.push('/tour-select');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Choose Language</Text>
        <View style={{ width: 44 }} />
      </View>
      <Text style={styles.subtitle}>Select your preferred language</Text>

      {/* Language List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {languages.map((lang) => (
          <Pressable
            key={lang.code}
            style={({ pressed }) => [
              styles.languageItem,
              pressed && styles.languageItemPressed,
            ]}
            onPress={() => handleLanguageSelect(lang.code)}
          >
            <View style={styles.flagContainer}>
              {FLAG_IMAGES[lang.code] ? (
                <Image
                  source={{ uri: FLAG_IMAGES[lang.code] }}
                  style={styles.flagImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.flagEmoji}>{lang.flag_emoji}</Text>
              )}
            </View>
            <View style={styles.languageInfo}>
              <Text style={styles.languageName}>{lang.native_name}</Text>
              <Text style={styles.languageNameEn}>{lang.name}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.text.light} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    color: Colors.text.light,
    marginBottom: 8,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  languageItemPressed: {
    backgroundColor: '#FFF8E1',
  },
  flagContainer: {
    width: 42,
    height: 30,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 14,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagImage: {
    width: 42,
    height: 30,
    borderRadius: 4,
  },
  flagEmoji: {
    fontSize: 28,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  languageNameEn: {
    fontSize: 13,
    color: Colors.text.light,
    marginTop: 2,
  },
});
