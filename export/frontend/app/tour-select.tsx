import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../constants/api';

const { width, height } = Dimensions.get('window');
const CASTLE_IMAGE = `${API_BASE_URL}/uploads/images/spis_castle_hero.jpg`;

// Tour type definitions
const TOUR_TYPES = [
  {
    id: 'express',
    name: 'Express Tour',
    icon: 'flash',
    description: 'Quick highlights of the castle. Perfect when you have limited time.',
    duration: '~30 min',
    stops: [1, 2, 3, 7, 8, 11, 12],
    legends: [3], // Ghost of Spiš Castle
    color: '#FF6B35',
  },
  {
    id: 'family',
    name: 'Family Tour',
    icon: 'people',
    description: 'Fun and educational route ideal for families with children.',
    duration: '~60 min',
    stops: [1, 2, 4, 8, 9, 11, 12],
    legends: [1, 4], // Brave Monk, Gypsy Princess
    color: '#4ECDC4',
  },
  {
    id: 'complete',
    name: 'Complete Tour',
    icon: 'trophy',
    description: 'Experience the full castle with all stops and legendary tales.',
    duration: '~90 min',
    stops: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    legends: [1, 2, 3, 4], // All legends
    color: '#D4A017',
  },
];

export default function TourSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setSelectedTourType } = useApp();
  const [selected, setSelected] = useState('complete');

  const selectedTour = useMemo(() => TOUR_TYPES.find(t => t.id === selected)!, [selected]);

  const handleContinue = () => {
    setSelectedTourType(selected);
    router.push('/tour');
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

        {/* Map Icon */}
        <View style={styles.mapIconContainer}>
          <Ionicons name="map" size={36} color="#D4A017" />
        </View>

        <Text style={styles.title}>Choose Your Tour</Text>
        <Text style={styles.subtitle}>Select the experience that fits your time</Text>

        {/* Tour Type Cards */}
        {TOUR_TYPES.map((tour) => {
          const isSelected = selected === tour.id;
          return (
            <Pressable
              key={tour.id}
              style={[
                styles.tourCard,
                isSelected && { borderColor: tour.color, borderWidth: 2 },
              ]}
              onPress={() => setSelected(tour.id)}
            >
              {/* Selection indicator */}
              {isSelected && (
                <View style={[styles.checkBadge, { backgroundColor: '#4CAF50' }]}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}

              {/* Icon */}
              <View style={[styles.tourIconCircle, { backgroundColor: tour.color }]}>
                <Ionicons name={tour.icon as any} size={26} color="#1A1A2E" />
              </View>

              {/* Name */}
              <Text style={[styles.tourName, { color: tour.color }]}>{tour.name}</Text>

              {/* Description */}
              <Text style={styles.tourDesc}>{tour.description}</Text>

              {/* Duration */}
              <View style={styles.durationRow}>
                <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.6)" />
                <Text style={styles.durationText}>{tour.duration}</Text>
              </View>
            </Pressable>
          );
        })}

        {/* Includes Info Box */}
        <View style={styles.includesCard}>
          <Text style={styles.includesTitle}>INCLUDES:</Text>
          <Text style={styles.includesItem}>{'\u2022'} {selectedTour.stops.length} tour stops</Text>
          <Text style={styles.includesItem}>{'\u2022'} {selectedTour.legends.length} legend {selectedTour.legends.length === 1 ? 'story' : 'stories'}</Text>
          <Text style={styles.includesItem}>{'\u2022'} Audio narration in selected language</Text>
          <Text style={styles.includesItem}>{'\u2022'} Full offline access</Text>
        </View>

        {/* Continue Button */}
        <Pressable
          style={({ pressed }) => [styles.continueButton, pressed && styles.continueButtonPressed]}
          onPress={handleContinue}
        >
          <Text style={styles.continueText}>Continue</Text>
          <Ionicons name="arrow-forward" size={22} color="#1A1A2E" />
        </Pressable>
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

  mapIconContainer: { alignSelf: 'center', marginBottom: 8 },
  title: { fontSize: 30, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 24 },

  // Tour Cards
  tourCard: {
    backgroundColor: 'rgba(30, 30, 55, 0.88)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tourIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  tourName: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  tourDesc: { fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 20, marginBottom: 8 },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  durationText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

  // Includes
  includesCard: {
    backgroundColor: 'rgba(30, 30, 55, 0.88)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  includesTitle: { fontSize: 14, fontWeight: '800', color: '#D4A017', marginBottom: 8, letterSpacing: 1 },
  includesItem: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 4, paddingLeft: 4 },

  // Continue
  continueButton: {
    backgroundColor: '#D4A017',
    borderRadius: 28,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  continueButtonPressed: { backgroundColor: '#B8860B', transform: [{ scale: 0.97 }] },
  continueText: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
});
