import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { useApp } from '../context/AppContext';

const { height, width } = Dimensions.get('window');

// Language data with flags as fallback
const LANGUAGE_FLAGS: { [key: string]: string } = {
  sk: '🇸🇰',
  en: '🇬🇧',
  de: '🇩🇪',
  pl: '🇵🇱',
  hu: '🇭🇺',
  fr: '🇫🇷',
  es: '🇪🇸',
  ru: '🇷🇺',
  zh: '🇨🇳',
};

export default function LanguageSelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { languages, siteSettings, loadData, setSelectedLanguage, isLoading } = useApp();
  const [selectedLang, setSelectedLang] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const handleLanguageSelect = (langCode: string) => {
    setSelectedLang(langCode);
    setSelectedLanguage(langCode);
    setTimeout(() => {
      router.push('/home');
    }, 300);
  };

  if (isLoading || !siteSettings) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Ionicons name="shield" size={60} color={Colors.accent} />
          <Text style={styles.loadingTitle}>Spišský Hrad</Text>
          <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 20 }} />
          <Text style={styles.loadingText}>Loading audio guide...</Text>
        </View>
      </View>
    );
  }

  const activeLanguages = languages.filter(lang => lang.is_active).sort((a, b) => a.order - b.order);

  return (
    <ImageBackground
      source={{ uri: siteSettings.default_hero_image }}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.95)']}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="shield" size={40} color={Colors.accent} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>SPIŠSKÝ HRAD</Text>
          <Text style={styles.subtitle}>AUDIO GUIDE</Text>

          {/* Description */}
          <Text style={styles.description}>
            {siteSettings.welcome_description}
          </Text>

          {/* UNESCO Badge */}
          <View style={styles.unescoBadge}>
            <Ionicons name="earth" size={16} color={Colors.accent} />
            <Text style={styles.unescoText}>UNESCO World Heritage Site</Text>
          </View>

          {/* Language Header */}
          <View style={styles.langHeader}>
            <View style={styles.headerLine} />
            <Text style={styles.langHeaderText}>SELECT YOUR LANGUAGE</Text>
            <View style={styles.headerLine} />
          </View>

          {/* Language Grid */}
          <View style={styles.langGrid}>
            {activeLanguages.map((lang) => {
              const isSelected = selectedLang === lang.code;
              const flag = lang.flag_emoji || LANGUAGE_FLAGS[lang.code] || '🏳️';
              
              return (
                <Pressable
                  key={lang.code}
                  onPress={() => handleLanguageSelect(lang.code)}
                  style={({ pressed }) => [
                    styles.langButton,
                    isSelected && styles.langButtonSelected,
                    pressed && { opacity: 0.8 }
                  ]}
                >
                  <Text>
                    <Text style={styles.langFlag}>{flag} </Text>
                    <Text style={[styles.langName, isSelected && styles.langNameSelected]}>
                      {lang.native_name}
                    </Text>
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Features */}
          <View style={styles.features}>
            <View style={styles.featureItem}>
              <Ionicons name="headset" size={16} color={Colors.gold[300]} />
              <Text style={styles.featureText}>Audio</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="book" size={16} color={Colors.gold[300]} />
              <Text style={styles.featureText}>Legends</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="qr-code" size={16} color={Colors.gold[300]} />
              <Text style={styles.featureText}>QR Scan</Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoContainer: {
    marginTop: 20,
    marginBottom: 16,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    textAlign: 'center',
    letterSpacing: 4,
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  unescoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 24,
  },
  unescoText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accent,
    marginLeft: 8,
    letterSpacing: 1,
  },
  langHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.4)',
  },
  langHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 2,
    marginHorizontal: 12,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
    width: '100%',
  },
  langButton: {
    backgroundColor: 'rgba(40, 40, 40, 0.95)',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.gold[700],
    minWidth: (width - 58) / 2,
  },
  langButtonSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  langFlag: {
    fontSize: 22,
  },
  langName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  langNameSelected: {
    color: '#1a1a1a',
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 12,
    color: Colors.gold[300],
    marginLeft: 6,
  },
});
