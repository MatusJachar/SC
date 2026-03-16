import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Colors } from '../constants/colors';
import { useApp } from '../context/AppContext';
import { LanguageButton } from '../components/LanguageButton';

const { height, width } = Dimensions.get('window');

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

  // Split languages into two columns
  const activeLanguages = languages.filter(lang => lang.is_active).sort((a, b) => a.order - b.order);
  
  console.log('Languages loaded:', languages.length, 'Active:', activeLanguages.length);

  return (
    <ImageBackground
      source={{ uri: siteSettings.default_hero_image }}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / Icon */}
          <View style={styles.logoContainer}>
            {siteSettings.logo_url ? (
              <Image
                source={{ uri: siteSettings.logo_url }}
                style={styles.logo}
                contentFit="contain"
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="shield" size={50} color={Colors.accent} />
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>{siteSettings.site_name}</Text>
          <Text style={styles.subtitle}>{siteSettings.site_subtitle}</Text>

          {/* Description */}
          <Text style={styles.description}>{siteSettings.welcome_description}</Text>

          {/* UNESCO Badge */}
          <View style={styles.unescoBadge}>
            <Ionicons name="earth" size={16} color={Colors.accent} />
            <Text style={styles.unescoText}>UNESCO World Heritage Site</Text>
          </View>

          {/* Language selection header */}
          <View style={styles.languageHeader}>
            <View style={styles.goldLine} />
            <Text style={styles.selectLanguage}>SELECT YOUR LANGUAGE</Text>
            <View style={styles.goldLine} />
          </View>
          
          {/* Language grid - show all 9 languages */}
          <View style={styles.languageGrid}>
            {activeLanguages.length > 0 ? (
              activeLanguages.map(language => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageItem,
                    selectedLang === language.code && styles.selectedLanguageItem,
                  ]}
                  onPress={() => handleLanguageSelect(language.code)}
                  activeOpacity={0.8}
                >
                  <View style={styles.languageContent}>
                    <Text style={styles.flag}>{language.flag_emoji}</Text>
                    <Text style={[
                      styles.languageName,
                      selectedLang === language.code && styles.selectedLanguageName,
                    ]}>
                      {language.native_name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.loadingLangs}>
                <Text style={styles.loadingLangsText}>Loading languages...</Text>
              </View>
            )}
          </View>

          {/* Feature badges */}
          <View style={styles.featureBadges}>
            <View style={styles.featureBadge}>
              <Ionicons name="headset" size={16} color={Colors.gold[300]} />
              <Text style={styles.featureText}>Audio Guide</Text>
            </View>
            <View style={styles.featureBadge}>
              <Ionicons name="book" size={16} color={Colors.gold[300]} />
              <Text style={styles.featureText}>Legends</Text>
            </View>
            <View style={styles.featureBadge}>
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
    backgroundColor: Colors.stone[900],
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 28,
    fontFamily: 'Cinzel_700Bold',
    color: Colors.white,
    marginTop: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.stone[400],
    fontFamily: 'Lato_400Regular',
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
  logo: {
    width: 80,
    height: 80,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Cinzel_700Bold',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Cinzel_600SemiBold',
    color: Colors.accent,
    textAlign: 'center',
    letterSpacing: 4,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 15,
    fontFamily: 'Lato_400Regular',
    color: Colors.stone[300],
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  unescoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
    marginBottom: 24,
  },
  unescoText: {
    fontSize: 12,
    fontFamily: 'Lato_700Bold',
    color: Colors.accent,
    letterSpacing: 1,
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  goldLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gold[700],
  },
  selectLanguage: {
    fontSize: 11,
    fontFamily: 'Lato_700Bold',
    color: Colors.stone[400],
    letterSpacing: 2,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  languageItem: {
    backgroundColor: 'rgba(50, 50, 50, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gold[700],
    minWidth: (width - 68) / 2,
    minHeight: 48,
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedLanguageItem: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  flag: {
    fontSize: 26,
    marginRight: 10,
    lineHeight: 30,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectedLanguageName: {
    color: Colors.stone[900],
  },
  featureBadges: {
    flexDirection: 'row',
    gap: 16,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    fontFamily: 'Lato_400Regular',
    color: Colors.gold[300],
  },
  loadingLangs: {
    padding: 20,
    alignItems: 'center',
  },
  loadingLangsText: {
    color: Colors.stone[400],
    fontFamily: 'Lato_400Regular',
    fontSize: 14,
  },
});
