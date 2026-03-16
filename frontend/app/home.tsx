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
  const { siteSettings, siteInfo, tourStops, legends, selectedLanguage } = useApp();

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
            colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
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

            {/* QR Scanner button */}
            <TouchableOpacity
              style={[styles.qrButton, { top: insets.top + 10 }]}
              onPress={() => router.push('/scanner')}
            >
              <Ionicons name="qr-code" size={20} color={Colors.white} />
            </TouchableOpacity>

            {/* Welcome text on hero */}
            <View style={styles.heroContent}>
              <Text style={styles.heroSubtitle}>{siteInfo?.subtitle || 'UNESCO World Heritage'}</Text>
              <Text style={styles.heroTitle}>{siteInfo?.title || siteSettings?.site_name}</Text>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Description */}
          <Text style={styles.description}>
            {siteInfo?.description || siteSettings?.welcome_description}
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/tour')}
              activeOpacity={0.9}
            >
              <Ionicons name="headset" size={22} color={Colors.white} />
              <Text style={styles.primaryButtonText}>START TOUR</Text>
              <View style={styles.badgeSmall}>
                <Text style={styles.badgeText}>{tourStops.length}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/legends')}
              activeOpacity={0.9}
            >
              <Ionicons name="book" size={22} color={Colors.accent} />
              <Text style={styles.secondaryButtonText}>LEGENDS</Text>
              <View style={[styles.badgeSmall, styles.badgeSecondary]}>
                <Text style={[styles.badgeText, { color: Colors.accent }]}>{legends.length}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="location" size={28} color={Colors.accent} />
              <Text style={styles.statValue}>{tourStops.length}</Text>
              <Text style={styles.statLabel}>Stops</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="time" size={28} color={Colors.accent} />
              <Text style={styles.statValue}>~{totalMinutes}</Text>
              <Text style={styles.statLabel}>Minutes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="language" size={28} color={Colors.accent} />
              <Text style={styles.statValue}>9</Text>
              <Text style={styles.statLabel}>Languages</Text>
            </View>
          </View>

          {/* Feature Cards */}
          <Text style={styles.sectionTitle}>FEATURES</Text>
          <View style={styles.featureCards}>
            <TouchableOpacity style={styles.featureCard} activeOpacity={0.8}>
              <View style={[styles.featureIcon, { backgroundColor: Colors.gold[100] }]}>
                <Ionicons name="headset" size={24} color={Colors.accent} />
              </View>
              <Text style={styles.featureTitle}>Audio Guide</Text>
              <Text style={styles.featureDesc}>Professional narration</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.featureCard} 
              activeOpacity={0.8}
              onPress={() => router.push('/scanner')}
            >
              <View style={[styles.featureIcon, { backgroundColor: Colors.wood[100] }]}>
                <Ionicons name="qr-code" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.featureTitle}>QR Scanner</Text>
              <Text style={styles.featureDesc}>Scan at each stop</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.featureCard} activeOpacity={0.8}>
              <View style={[styles.featureIcon, { backgroundColor: Colors.stone[100] }]}>
                <Ionicons name="cloud-offline" size={24} color={Colors.stone[700]} />
              </View>
              <Text style={styles.featureTitle}>Offline Mode</Text>
              <Text style={styles.featureDesc}>Works without internet</Text>
            </TouchableOpacity>
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
    height: height * 0.42,
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
  qrButton: {
    position: 'absolute',
    right: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 20,
  },
  heroContent: {
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 12,
    fontFamily: 'Lato_700Bold',
    color: Colors.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: 'Cinzel_700Bold',
    color: Colors.white,
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
    fontSize: 15,
    fontFamily: 'Lato_400Regular',
    color: Colors.text.secondary,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 13,
    fontFamily: 'Cinzel_700Bold',
    color: Colors.white,
    letterSpacing: 1,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.accent,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontFamily: 'Cinzel_700Bold',
    color: Colors.accent,
    letterSpacing: 1,
  },
  badgeSmall: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeSecondary: {
    backgroundColor: Colors.gold[100],
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Lato_700Bold',
    color: Colors.white,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.stone[50],
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Cinzel_700Bold',
    color: Colors.text.primary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Lato_400Regular',
    color: Colors.text.light,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: Colors.stone[200],
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Lato_700Bold',
    color: Colors.accent,
    letterSpacing: 2,
    marginBottom: 12,
  },
  featureCards: {
    flexDirection: 'row',
    gap: 10,
  },
  featureCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.stone[200],
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 12,
    fontFamily: 'Lato_700Bold',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 10,
    fontFamily: 'Lato_400Regular',
    color: Colors.text.light,
    textAlign: 'center',
    marginTop: 2,
  },
});
