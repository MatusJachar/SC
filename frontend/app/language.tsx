import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ImageBackground, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

const HERO_IMAGE = 'https://images.pexels.com/photos/2832039/pexels-photo-2832039.jpeg?auto=compress&w=1200';

export default function LanguageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { languages, setSelectedLanguage } = useApp();

  const handleLanguageSelect = (langCode: string) => {
    setSelectedLanguage(langCode);
    router.push('/tour-select');
  };

  return (
    <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.container} resizeMode="cover">
      <View style={styles.overlay} />
      <View style={[styles.content, { paddingTop: insets.top + 8 }]}>
        {/* Back button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="language" size={40} color={Colors.accent} />
          <Text style={styles.title}>Choose Language</Text>
          <Text style={styles.subtitle}>Select your preferred language</Text>
        </View>

        {/* Language List */}
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
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
              <Text style={styles.flag}>{lang.flag_emoji}</Text>
              <View style={styles.languageInfo}>
                <Text style={styles.languageName}>{lang.native_name}</Text>
                <Text style={styles.languageNameEn}>{lang.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.light} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 26, 0.8)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.accent,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  listContainer: {
    flex: 1,
    marginTop: 12,
  },
  listContent: {
    paddingBottom: 32,
    gap: 8,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 33, 62, 0.9)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  languageItemPressed: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: Colors.accent,
  },
  flag: {
    fontSize: 32,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  languageNameEn: {
    fontSize: 13,
    color: Colors.text.light,
    marginTop: 2,
  },
});
