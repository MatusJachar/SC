import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ImageBackground, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const HERO_IMAGE = 'https://images.pexels.com/photos/2832039/pexels-photo-2832039.jpeg?auto=compress&w=1200';

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
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={{ uri: HERO_IMAGE }}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <View style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        {/* Castle Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="business" size={56} color={Colors.accent} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{'Spi\u0161 Castle'}</Text>
        <Text style={styles.subtitle}>Audio Tour Guide</Text>

        {/* Description */}
        <Text style={styles.description}>
          Explore, Discover and Immerse yourself in the largest U.N.E.S.C.O castle complexes in Europe.
        </Text>
        <Text style={styles.subDescription}>
          Our audio guide will take you through centuries of history, architecture and legends.
        </Text>

        {/* Start Tour Button */}
        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            pressed && styles.startButtonPressed,
          ]}
          onPress={() => router.push('/language')}
        >
          <Text style={styles.startButtonText}>Start Tour</Text>
          <Ionicons name="arrow-forward" size={24} color={Colors.black} />
        </Pressable>

        {/* Bottom Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="language" size={24} color={Colors.accent} />
            <Text style={styles.statText}>{languages.length} Languages</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="location" size={24} color={Colors.accent} />
            <Text style={styles.statText}>{tourStops.length} Stops</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="cloud-offline" size={24} color={Colors.accent} />
            <Text style={styles.statText}>Offline Mode</Text>
          </View>
        </View>
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
    backgroundColor: 'rgba(13, 13, 26, 0.65)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    color: Colors.text.secondary,
    fontSize: 16,
    marginTop: 16,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.accent,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 2,
  },
  description: {
    fontSize: 17,
    color: Colors.white,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 26,
    fontWeight: '700',
  },
  subDescription: {
    fontSize: 15,
    color: Colors.accent,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 32,
    marginTop: 40,
    gap: 12,
  },
  startButtonPressed: {
    backgroundColor: Colors.accentDark,
    transform: [{ scale: 0.97 }],
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.black,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 48,
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
});
