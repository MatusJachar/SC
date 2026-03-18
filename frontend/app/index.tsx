import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Dimensions, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../constants/api';

const { width } = Dimensions.get('window');
const CASTLE_IMAGE = `${API_BASE_URL}/uploads/images/spis_castle_hero.jpg`;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loadData, isLoading, tourStops, legends, languages } = useApp();

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <Image source={{ uri: CASTLE_IMAGE }} style={styles.heroImage} resizeMode="cover" />
        <View style={styles.heroOverlay} />
        <View style={[styles.heroContent, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.heroTitle}>{'Spi\u0161 Castle'}</Text>
          <Text style={styles.heroSubtitle}>Audio Tour Guide</Text>
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.contentSection}>
        {/* Description */}
        <Text style={styles.description}>
          Explore, Discover and Immerse yourself in the largest U.N.E.S.C.O castle complex in Europe.
        </Text>
        <Text style={styles.subDescription}>
          Our audio guide will take you through centuries of history, architecture and legends.
        </Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="language" size={22} color={Colors.accent} />
            </View>
            <Text style={styles.statNumber}>{languages.length}</Text>
            <Text style={styles.statLabel}>Languages</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="location" size={22} color={Colors.accent} />
            </View>
            <Text style={styles.statNumber}>{tourStops.length}</Text>
            <Text style={styles.statLabel}>Stops</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="book" size={22} color={Colors.accent} />
            </View>
            <Text style={styles.statNumber}>{legends.length}</Text>
            <Text style={styles.statLabel}>Legends</Text>
          </View>
        </View>

        {/* Start Tour Button */}
        <Pressable
          style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
          onPress={() => router.push('/language')}
        >
          <Text style={styles.startButtonText}>Start Tour</Text>
          <Ionicons name="arrow-forward" size={22} color={Colors.white} />
        </Pressable>

        {/* Quick Links */}
        <View style={styles.quickLinks}>
          <Pressable style={styles.quickLink} onPress={() => router.push('/features/info')}>
            <Ionicons name="information-circle" size={20} color={Colors.accent} />
            <Text style={styles.quickLinkText}>Visitor Info</Text>
          </Pressable>
          <Pressable style={styles.quickLink} onPress={() => router.push('/features/shop')}>
            <Ionicons name="bag" size={20} color={Colors.accent} />
            <Text style={styles.quickLinkText}>Souvenir Shop</Text>
          </Pressable>
          <Pressable style={styles.quickLink} onPress={() => router.push('/admin')}>
            <Ionicons name="settings" size={20} color={Colors.accent} />
            <Text style={styles.quickLinkText}>Admin</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroContainer: {
    height: 320,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  contentSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  description: {
    fontSize: 17,
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '600',
  },
  subDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.light,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.borderLight,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 28,
    marginTop: 28,
    gap: 10,
  },
  startButtonPressed: {
    backgroundColor: Colors.accentDark,
    transform: [{ scale: 0.97 }],
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  adminLinkText: {
    fontSize: 13,
    color: Colors.text.light,
  },
  quickLinks: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  quickLink: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  quickLinkText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
});
