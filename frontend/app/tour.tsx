import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../constants/api';

const { width } = Dimensions.get('window');
const CASTLE_IMAGE = `${API_BASE_URL}/uploads/images/spis_castle_hero.jpg`;

// stop_number pre tour zastávky: 1-13
// stop_number pre legendy: 101-104
const TOUR_DEFS: Record<string, { stops: number[]; legends: number[] }> = {
  express:  { stops: [1, 2, 3, 7, 8, 11, 12],              legends: [103] },
  family:   { stops: [1, 2, 4, 8, 9, 11, 12],              legends: [101, 104] },
  complete: { stops: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], legends: [101, 102, 103, 104] },
};

const STOP_ICONS: Record<number, { icon: string; bg: string }> = {
  1:  { icon: 'flag',         bg: '#D4A017' },  // Vstup / Vitajte
  2:  { icon: 'camera',       bg: '#D4A017' },  // Fotografia hradu
  3:  { icon: 'map',          bg: '#D4A017' },  // Model hradu
  4:  { icon: 'restaurant',   bg: '#D4A017' },  // Kuchyňa
  5:  { icon: 'earth',        bg: '#D4A017' },  // UNESCO / Terasa
  6:  { icon: 'shield',       bg: '#D4A017' },  // Románske predhradie / Obrana
  7:  { icon: 'telescope',    bg: '#D4A017' },  // Horná terasa / Panoráma
  8:  { icon: 'people',       bg: '#D4A017' },  // Dolné nádvorie
  9:  { icon: 'skull',        bg: '#D4A017' },  // Mučiareň
  10: { icon: 'library',      bg: '#D4A017' },  // Zápoľský palác
  11: { icon: 'watch',        bg: '#D4A017' },  // Veža Nebojsa
  12: { icon: 'medal',        bg: '#D4A017' },  // Románsky palác - unikát
  13: { icon: 'sunny',        bg: '#D4A017' },  // Výhľad z akropoly
};

export default function TourScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tourStops, legends, selectedLanguage, selectedTourType } = useApp();

  const tourDef = useMemo(() => TOUR_DEFS[selectedTourType] || TOUR_DEFS.complete, [selectedTourType]);

  const filteredStops = useMemo(() => {
    return tourStops
      .filter(s => tourDef.stops.includes(s.stop_number))
      .sort((a, b) => a.stop_number - b.stop_number);
  }, [tourStops, tourDef]);

  const filteredLegends = useMemo(() => {
    return legends
      .filter(l => tourDef.legends.includes(l.stop_number))
      .sort((a, b) => a.stop_number - b.stop_number);
  }, [legends, tourDef]);

  const getTranslation = (stop: any) => {
    const lang = selectedLanguage;
    const fallback = 'en';
    const content = stop.content?.[lang] || stop.content?.[fallback] || Object.values(stop.content || {})[0] || {};
    const audioUrl = stop.audio?.[lang] || stop.audio?.[fallback] || Object.values(stop.audio || {})[0] || null;
    return {
      title: content?.title || '',
      description: content?.description || '',
      short_description: content?.short_description || content?.description || '',
      audio_url: audioUrl,
    };
  };

  const tourLabel = selectedTourType === 'express' ? 'Express Tour' :
                    selectedTourType === 'family'  ? 'Family Tour'  : 'Complete Tour';
  const tourColor = selectedTourType === 'express' ? '#FF6B35' :
                    selectedTourType === 'family'  ? '#4ECDC4' : '#D4A017';

  return (
    <View style={styles.container}>
      <Image source={{ uri: CASTLE_IMAGE }} style={styles.bgImage} resizeMode="cover" blurRadius={Platform.OS === 'web' ? 0 : 5} />
      <View style={styles.bgOverlay} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={[styles.tourBadge, { backgroundColor: tourColor }]}>
          <Text style={styles.tourBadgeText}>{tourLabel}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Tour Stops */}
        <View style={styles.sectionHeader}>
          <Ionicons name="navigate" size={18} color="#D4A017" />
          <Text style={styles.sectionTitle}>Tour Stops</Text>
          <Text style={styles.sectionCount}>{filteredStops.length}</Text>
        </View>

        {filteredStops.map((stop) => {
          const trans = getTranslation(stop);
          const iconDef = STOP_ICONS[stop.stop_number] || { icon: 'location', bg: '#666' };
          const hasAudio = !!trans.audio_url;

          return (
            <Pressable
              key={stop.id}
              style={({ pressed }) => [styles.stopCard, pressed && styles.stopCardPressed]}
              onPress={() => router.push(`/tour/${stop.id}`)}
            >
              <View style={[styles.stopIcon, { backgroundColor: iconDef.bg }]}>
                <Ionicons name={iconDef.icon as any} size={20} color="#1A1A2E" />
              </View>
              <View style={styles.stopContent}>
                <View style={styles.stopTopRow}>
                  <Text style={styles.stopNumber}>#{stop.stop_number}</Text>
                  {hasAudio && (
                    <View style={styles.audioBadge}>
                      <Ionicons name="headset" size={10} color="#D4A017" />
                    </View>
                  )}
                </View>
                <Text style={styles.stopTitle} numberOfLines={1}>{trans.title || 'Tour Stop'}</Text>
                <Text style={styles.stopDesc} numberOfLines={2}>{trans.short_description}</Text>
              </View>
              <View style={styles.playIcon}>
                <Ionicons name="chevron-forward" size={18} color="#D4A017" />
              </View>
            </Pressable>
          );
        })}

        {/* Legends */}
        {filteredLegends.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 28 }]}>
              <Ionicons name="book" size={18} color="#D4A017" />
              <Text style={styles.sectionTitle}>Legends</Text>
              <Text style={styles.sectionCount}>{filteredLegends.length}</Text>
            </View>

            {filteredLegends.map((legend) => {
              const trans = getTranslation(legend);
              const hasAudio = !!trans.audio_url;

              return (
                <Pressable
                  key={legend.id}
                  style={({ pressed }) => [styles.legendCard, pressed && styles.legendCardPressed]}
                  onPress={() => router.push(`/tour/${legend.id}`)}
                >
                  <View style={styles.legendIcon}>
                    <Ionicons name="book" size={22} color="#1A1A2E" />
                  </View>
                  <View style={styles.legendContent}>
                    <Text style={styles.legendTitle} numberOfLines={1}>{trans.title || 'Legend'}</Text>
                    <Text style={styles.legendDesc} numberOfLines={2}>{trans.short_description}</Text>
                  </View>
                  <View style={styles.legendRight}>
                    {hasAudio && <Ionicons name="headset" size={20} color="#D4A017" />}
                  </View>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  bgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20, 20, 40, 0.65)' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, zIndex: 2 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  tourBadge: { flex: 1, alignSelf: 'center', marginHorizontal: 12, paddingVertical: 6, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center' },
  tourBadgeText: { fontSize: 14, fontWeight: '800', color: '#1A1A2E' },
  scrollView: { flex: 1, zIndex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  sectionCount: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' },
  stopCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30, 30, 55, 0.88)', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  stopCardPressed: { backgroundColor: 'rgba(40, 40, 70, 0.95)', borderColor: 'rgba(212,160,23,0.3)' },
  stopIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stopContent: { flex: 1 },
  stopTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  stopNumber: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.4)' },
  audioBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(212,160,23,0.2)', justifyContent: 'center', alignItems: 'center' },
  stopTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 3 },
  stopDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 17 },
  playIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(212,160,23,0.15)', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  legendCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(40, 35, 20, 0.88)', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(212,160,23,0.15)' },
  legendCardPressed: { backgroundColor: 'rgba(50, 45, 30, 0.95)', borderColor: 'rgba(212,160,23,0.4)' },
  legendIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#D4A017', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  legendContent: { flex: 1 },
  legendTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 3 },
  legendDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 17 },
  legendRight: { marginLeft: 8 },
});
