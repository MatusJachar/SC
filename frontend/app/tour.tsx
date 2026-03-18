import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { TourStop } from '../types';

export default function TourScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tourType, stopRange, includesLegends } = useLocalSearchParams<{
    tourType: string;
    stopRange: string;
    includesLegends: string;
  }>();
  const { tourStops, legends, selectedLanguage } = useApp();

  const allowedStops = useMemo(() => {
    try { return JSON.parse(stopRange || '[]') as number[]; } catch { return []; }
  }, [stopRange]);

  const filteredStops = useMemo(() => {
    if (allowedStops.length === 0) return tourStops;
    return tourStops.filter(s => allowedStops.includes(s.stop_number));
  }, [tourStops, allowedStops]);

  const showLegends = includesLegends === 'true';

  const getTranslation = (stop: TourStop) => {
    return stop.translations.find(t => t.language_code === selectedLanguage)
      || stop.translations.find(t => t.language_code === 'en')
      || stop.translations[0];
  };

  const navigateToStop = (stop: TourStop) => {
    router.push({ pathname: '/tour/[id]', params: { id: stop.id } });
  };

  const tourTypeNames: Record<string, string> = {
    express: 'Express Tour', family: 'Family Tour', complete: 'Complete Tour',
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{tourTypeNames[tourType || 'complete'] || 'Tour'}</Text>
          <Text style={styles.headerSubtitle}>{filteredStops.length} stops{showLegends ? ` + ${legends.length} legends` : ''}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {/* Tour Stops */}
        {filteredStops.map((stop) => {
          const translation = getTranslation(stop);
          const hasAudio = !!translation?.audio_url;
          return (
            <Pressable
              key={stop.id}
              style={({ pressed }) => [styles.stopCard, pressed && styles.stopCardPressed]}
              onPress={() => navigateToStop(stop)}
            >
              <View style={styles.stopNumber}>
                <Text style={styles.stopNumberText}>{stop.stop_number}</Text>
              </View>
              <View style={styles.stopInfo}>
                <Text style={styles.stopTitle} numberOfLines={1}>{translation?.title || 'Stop ' + stop.stop_number}</Text>
                <Text style={styles.stopDesc} numberOfLines={2}>{translation?.short_description || ''}</Text>
              </View>
              <View style={styles.stopIcons}>
                {hasAudio && <Ionicons name="headset" size={16} color={Colors.accent} />}
                <Ionicons name="chevron-forward" size={18} color={Colors.text.light} />
              </View>
            </Pressable>
          );
        })}

        {/* Legends Section */}
        {showLegends && legends.length > 0 && (
          <>
            <View style={styles.legendDivider}>
              <View style={styles.dividerLine} />
              <Ionicons name="book" size={20} color={Colors.accent} />
              <Text style={styles.sectionTitleLegend}>Legends</Text>
              <View style={styles.dividerLine} />
            </View>
            {legends.map((legend) => {
              const translation = getTranslation(legend);
              return (
                <Pressable
                  key={legend.id}
                  style={({ pressed }) => [styles.stopCard, pressed && styles.stopCardPressed]}
                  onPress={() => navigateToStop(legend)}
                >
                  <View style={styles.legendIcon}>
                    <Ionicons name="book" size={18} color={Colors.accent} />
                  </View>
                  <View style={styles.stopInfo}>
                    <Text style={styles.stopTitle} numberOfLines={1}>{translation?.title || 'Legend'}</Text>
                    <Text style={styles.stopDesc} numberOfLines={2}>{translation?.short_description || ''}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.text.light} />
                </Pressable>
              );
            })}
          </>
        )}

        {/* Extra Features */}
        <View style={styles.extraSection}>
          <Text style={styles.sectionTitle}>More</Text>

          <Pressable style={styles.extraCard} onPress={() => router.push('/features/info')}>
            <View style={[styles.extraIcon, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="information-circle" size={20} color={Colors.white} />
            </View>
            <View style={styles.extraInfo}>
              <Text style={styles.extraTitle}>Visitor Information</Text>
              <Text style={styles.extraDesc}>Prices, hours, transport & more</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.text.light} />
          </Pressable>

          <Pressable style={styles.extraCard} onPress={() => router.push('/features/video')}>
            <View style={[styles.extraIcon, { backgroundColor: '#E91E63' }]}>
              <Ionicons name="videocam" size={20} color={Colors.white} />
            </View>
            <View style={styles.extraInfo}>
              <Text style={styles.extraTitle}>Video Gallery</Text>
              <Text style={styles.extraDesc}>Watch castle documentaries</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.text.light} />
          </Pressable>

          <Pressable style={styles.extraCard} onPress={() => router.push('/features/vr')}>
            <View style={[styles.extraIcon, { backgroundColor: '#9C27B0' }]}>
              <Ionicons name="glasses" size={20} color={Colors.white} />
            </View>
            <View style={styles.extraInfo}>
              <Text style={styles.extraTitle}>VR Experience</Text>
              <Text style={styles.extraDesc}>Virtual reality castle tour</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.text.light} />
          </Pressable>

          <Pressable style={styles.extraCard} onPress={() => router.push('/features/shop')}>
            <View style={[styles.extraIcon, { backgroundColor: '#FF9800' }]}>
              <Ionicons name="bag-handle" size={20} color={Colors.white} />
            </View>
            <View style={styles.extraInfo}>
              <Text style={styles.extraTitle}>Souvenir Shop</Text>
              <Text style={styles.extraDesc}>Castle memorabilia & gifts</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.text.light} />
          </Pressable>

          <Pressable style={styles.extraCard} onPress={() => router.push('/features/nearby')}>
            <View style={[styles.extraIcon, { backgroundColor: '#2196F3' }]}>
              <Ionicons name="compass" size={20} color={Colors.white} />
            </View>
            <View style={styles.extraInfo}>
              <Text style={styles.extraTitle}>What's Nearby</Text>
              <Text style={styles.extraDesc}>Restaurants, parking & transport</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.text.light} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text.primary },
  headerSubtitle: { fontSize: 12, color: Colors.text.light, marginTop: 2 },
  listContainer: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary, marginTop: 16, marginBottom: 10 },
  stopCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  stopCardPressed: { backgroundColor: '#FFF8E1' },
  stopNumber: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFF3CD', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stopNumberText: { fontSize: 15, fontWeight: '800', color: Colors.accent },
  legendIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFF3CD', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stopInfo: { flex: 1 },
  stopTitle: { fontSize: 15, fontWeight: '600', color: Colors.text.primary },
  stopDesc: { fontSize: 12, color: Colors.text.light, marginTop: 2 },
  stopIcons: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  legendDivider: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 10, gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
  sectionTitleLegend: { fontSize: 14, fontWeight: '700', color: Colors.accent, letterSpacing: 1 },
  extraSection: { marginTop: 8 },
  extraCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  extraIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  extraInfo: { flex: 1 },
  extraTitle: { fontSize: 14, fontWeight: '600', color: Colors.text.primary },
  extraDesc: { fontSize: 12, color: Colors.text.light, marginTop: 2 },
});
