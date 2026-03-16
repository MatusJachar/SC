import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { useApp } from '../context/AppContext';

const { height, width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { siteSettings, siteInfo, tourStops, selectedLanguage } = useApp();

  // Calculate total duration
  const totalDuration = tourStops.reduce((sum, stop) => sum + stop.duration_seconds, 0);
  const totalMinutes = Math.ceil(totalDuration / 60);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image Section */}
        <ImageBackground
          source={{ uri: siteSettings?.default_hero_image }}
          style={styles.heroImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.heroGradient}
          >
            {/* Language switch button */}
            <TouchableOpacity
              style={[styles.languageButton, { top: insets.top + 10 }]}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.languageCode}>{selectedLanguage.toUpperCase()}</Text>
              <Ionicons name="chevron-down" size={16} color={Colors.white} />
            </TouchableOpacity>

            {/* Welcome text on hero */}
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>{siteInfo?.title || siteSettings?.site_name}</Text>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Description */}
          <Text style={styles.description}>{siteInfo?.description || siteSettings?.welcome_description}</Text>

          {/* Start Tour Button */}
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => router.push('/tour')}
            activeOpacity={0.9}
          >
            <Text style={styles.startButtonText}>START TOUR</Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.white} />
          </TouchableOpacity>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="location" size={24} color={Colors.accent} />
              <Text style={styles.statValue}>{tourStops.length}</Text>
              <Text style={styles.statLabel}>Stops</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="time" size={24} color={Colors.accent} />
              <Text style={styles.statValue}>~{totalMinutes}</Text>
              <Text style={styles.statLabel}>Minutes</Text>
            </View>
          </View>

          {/* Info Cards */}
          <View style={styles.infoCards}>
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="headset" size={24} color={Colors.accent} />
              </View>
              <Text style={styles.infoTitle}>Audio Guide</Text>
              <Text style={styles.infoText}>Listen to narrated history at each stop</Text>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="walk" size={24} color={Colors.accent} />
              </View>
              <Text style={styles.infoTitle}>Self-Paced</Text>
              <Text style={styles.infoText}>Explore at your own speed</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroImage: {
    height: height * 0.45,
    width: '100%',
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
  },
  languageButton: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  languageCode: {
    fontSize: 14,
    fontFamily: 'Lato_700Bold',
    color: Colors.white,
  },
  heroContent: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Cinzel_700Bold',
    color: Colors.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  contentSection: {
    padding: 24,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Lato_400Regular',
    color: Colors.text.secondary,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  startButtonText: {
    fontSize: 16,
    fontFamily: 'Cinzel_700Bold',
    color: Colors.white,
    letterSpacing: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.stone[100],
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'Cinzel_700Bold',
    color: Colors.text.primary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: Colors.text.light,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: Colors.stone[300],
  },
  infoCards: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.stone[200],
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gold[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'Lato_700Bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Lato_400Regular',
    color: Colors.text.light,
    textAlign: 'center',
  },
});
