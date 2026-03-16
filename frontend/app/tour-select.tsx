import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ImageBackground, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

const HERO_IMAGE = 'https://images.pexels.com/photos/2832039/pexels-photo-2832039.jpeg?auto=compress&w=1200';

interface TourType {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  stops: number;
  duration: string;
  includes: string[];
  stopRange: number[];
  includesLegends: boolean;
}

const TOUR_TYPES: TourType[] = [
  {
    id: 'express',
    name: 'Express Tour',
    description: 'Highlights and must-see stops for visitors on the go',
    icon: 'flash',
    stops: 7,
    duration: '~45 minutes',
    includes: ['7 key tour stops', 'Essential castle highlights'],
    stopRange: [1, 2, 3, 7, 8, 11, 12],
    includesLegends: false,
  },
  {
    id: 'family',
    name: 'Family Tour',
    description: 'Kid-friendly stops with entertaining legends',
    icon: 'people',
    stops: 7,
    duration: '~1 hour',
    includes: ['7 tour stops', '4 castle legends', 'Family-friendly content'],
    stopRange: [1, 2, 4, 8, 9, 11, 12],
    includesLegends: true,
  },
  {
    id: 'complete',
    name: 'Complete Tour',
    description: 'Experience the full castle with all stops and legends',
    icon: 'trophy',
    stops: 13,
    duration: '~2.5 hours',
    includes: ['13 tour stops', '4 castle legends', 'Full castle experience'],
    stopRange: [1,2,3,4,5,6,7,8,9,10,11,12,13],
    includesLegends: true,
  },
];

export default function TourSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedTour, setSelectedTour] = useState<string>('complete');

  const handleContinue = () => {
    const selected = TOUR_TYPES.find(t => t.id === selectedTour);
    router.push({
      pathname: '/tour',
      params: {
        tourType: selectedTour,
        stopRange: JSON.stringify(selected?.stopRange || []),
        includesLegends: selected?.includesLegends ? 'true' : 'false',
      },
    });
  };

  return (
    <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.container} resizeMode="cover">
      <View style={styles.overlay} />
      <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        {/* Back */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="map" size={40} color={Colors.accent} />
          <Text style={styles.title}>Choose Your Tour</Text>
          <Text style={styles.subtitle}>Select the experience that fits your time</Text>
        </View>

        {/* Tour Cards */}
        <ScrollView
          style={styles.cardsContainer}
          contentContainerStyle={styles.cardsContent}
          showsVerticalScrollIndicator={false}
        >
          {TOUR_TYPES.map((tour) => {
            const isSelected = selectedTour === tour.id;
            return (
              <Pressable
                key={tour.id}
                style={[
                  styles.tourCard,
                  isSelected && styles.tourCardSelected,
                ]}
                onPress={() => setSelectedTour(tour.id)}
              >
                {/* Icon + Selected indicator */}
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    <Ionicons name={tour.icon} size={24} color={Colors.black} />
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
                  )}
                </View>

                {/* Info */}
                <Text style={styles.tourName}>{tour.name}</Text>
                <Text style={styles.tourDescription}>{tour.description}</Text>

                {/* Stats */}
                <View style={styles.tourStats}>
                  <View style={styles.tourStat}>
                    <Ionicons name="location" size={16} color={Colors.accent} />
                    <Text style={styles.tourStatText}>{tour.stops} stops</Text>
                  </View>
                  <View style={styles.tourStat}>
                    <Ionicons name="time" size={16} color={Colors.accent} />
                    <Text style={styles.tourStatText}>{tour.duration}</Text>
                  </View>
                </View>

                {/* Includes */}
                <View style={styles.includesSection}>
                  <Text style={styles.includesTitle}>INCLUDES:</Text>
                  {tour.includes.map((item, idx) => (
                    <Text key={idx} style={styles.includesItem}>{'\u2022'} {item}</Text>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Continue Button */}
        <Pressable
          style={({ pressed }) => [
            styles.continueButton,
            pressed && styles.continueButtonPressed,
          ]}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={24} color={Colors.black} />
        </Pressable>
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
    backgroundColor: 'rgba(13, 13, 26, 0.75)',
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
    paddingVertical: 8,
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
  cardsContainer: {
    flex: 1,
    marginTop: 12,
  },
  cardsContent: {
    gap: 16,
    paddingBottom: 16,
  },
  tourCard: {
    backgroundColor: 'rgba(22, 33, 62, 0.9)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tourCardSelected: {
    borderColor: Colors.accent,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tourName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
  },
  tourDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  tourStats: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
  },
  tourStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tourStatText: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  includesSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
  },
  includesTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 1,
    marginBottom: 4,
  },
  includesItem: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 32,
    gap: 12,
    marginTop: 8,
  },
  continueButtonPressed: {
    backgroundColor: Colors.accentDark,
    transform: [{ scale: 0.97 }],
  },
  continueButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.black,
  },
});
