import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

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
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Choose Your Tour</Text>
        <View style={{ width: 44 }} />
      </View>
      <Text style={styles.subtitle}>Select the experience that fits your time</Text>

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
              style={[styles.tourCard, isSelected && styles.tourCardSelected]}
              onPress={() => setSelectedTour(tour.id)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Ionicons name={tour.icon} size={22} color={Colors.white} />
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={26} color={Colors.success} />
                )}
              </View>
              <Text style={styles.tourName}>{tour.name}</Text>
              <Text style={styles.tourDescription}>{tour.description}</Text>
              <View style={styles.tourStats}>
                <View style={styles.tourStat}>
                  <Ionicons name="location" size={14} color={Colors.accent} />
                  <Text style={styles.tourStatText}>{tour.stops} stops</Text>
                </View>
                <View style={styles.tourStat}>
                  <Ionicons name="time" size={14} color={Colors.accent} />
                  <Text style={styles.tourStatText}>{tour.duration}</Text>
                </View>
              </View>
              <View style={styles.includesSection}>
                {tour.includes.map((item, idx) => (
                  <Text key={idx} style={styles.includesItem}>{'\u2022'} {item}</Text>
                ))}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.bottomBar}>
        <Pressable
          style={({ pressed }) => [styles.continueButton, pressed && styles.continueButtonPressed]}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={22} color={Colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700', color: Colors.text.primary },
  subtitle: { textAlign: 'center', fontSize: 14, color: Colors.text.light, marginBottom: 8 },
  cardsContainer: { flex: 1 },
  cardsContent: { paddingHorizontal: 16, gap: 12, paddingBottom: 16 },
  tourCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tourCardSelected: { borderColor: Colors.accent },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },
  tourName: { fontSize: 20, fontWeight: '700', color: Colors.text.primary },
  tourDescription: { fontSize: 13, color: Colors.text.secondary, marginTop: 4 },
  tourStats: { flexDirection: 'row', gap: 20, marginTop: 10 },
  tourStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tourStatText: { color: Colors.text.secondary, fontSize: 13, fontWeight: '600' },
  includesSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 10 },
  includesItem: { fontSize: 13, color: Colors.text.secondary, lineHeight: 20 },
  bottomBar: { paddingHorizontal: 16, paddingTop: 8 },
  continueButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accent, paddingVertical: 16, borderRadius: 28, gap: 10 },
  continueButtonPressed: { backgroundColor: Colors.accentDark, transform: [{ scale: 0.97 }] },
  continueButtonText: { fontSize: 18, fontWeight: '700', color: Colors.white },
});
