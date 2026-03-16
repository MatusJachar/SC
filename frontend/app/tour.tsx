import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ImageBackground, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { TourStop } from '../types';

const HERO_IMAGE = 'https://images.pexels.com/photos/2832039/pexels-photo-2832039.jpeg?auto=compress&w=1200';

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
    try {
      return JSON.parse(stopRange || '[]') as number[];
    } catch {
      return [];
    }
  }, [stopRange]);

  const filteredStops = useMemo(() => {
    if (allowedStops.length === 0) return tourStops;
    return tourStops.filter(s => allowedStops.includes(s.stop_number));
  }, [tourStops, allowedStops]);

  const showLegends = includesLegends === 'true';

  const getTranslation = (stop: TourStop) => {
    const t = stop.translations.find(t => t.language_code === selectedLanguage);
    return t || stop.translations.find(t => t.language_code === 'en') || stop.translations[0];
  };

  const navigateToStop = (stop: TourStop) => {
    router.push({
      pathname: '/tour/[id]',
      params: { id: stop.id },
    });
  };

  const tourTypeNames: Record<string, string> = {
    express: 'Express Tour',
    family: 'Family Tour',
    complete: 'Complete Tour',
  };

  return (
    <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.container} resizeMode="cover">
      <View style={styles.overlay} />
      <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{tourTypeNames[tourType || 'complete'] || 'Tour'}</Text>
            <Text style={styles.headerSubtitle}>{filteredStops.length} stops{showLegends ? ` + ${legends.length} legends` : ''}</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Tour Stops Section */}
          <Text style={styles.sectionTitle}>Tour Stops</Text>
          {filteredStops.map((stop) => {
            const translation = getTranslation(stop);
            const hasAudio = !!translation?.audio_url;
            return (
              <Pressable
                key={stop.id}
                style={({ pressed }) => [
                  styles.stopCard,
                  pressed && styles.stopCardPressed,
                ]}
                onPress={() => navigateToStop(stop)}
              >
                <View style={styles.stopNumber}>
                  <Text style={styles.stopNumberText}>{stop.stop_number}</Text>
                </View>
                <View style={styles.stopInfo}>
                  <Text style={styles.stopTitle} numberOfLines={1}>
                    {translation?.title || 'Stop ' + stop.stop_number}
                  </Text>
                  <Text style={styles.stopDesc} numberOfLines={2}>
                    {translation?.short_description || ''}
                  </Text>
                </View>
                <View style={styles.stopIcons}>
                  {hasAudio && <Ionicons name="headset" size={18} color={Colors.accent} />}
                  <Ionicons name="chevron-forward" size={20} color={Colors.text.light} />
                </View>
              </Pressable>
            );
          })}

          {/* Legends Section */}
          {showLegends && legends.length > 0 && (
            <>
              <View style={styles.legendDivider}>
                <View style={styles.dividerLine} />
                <Ionicons name="book" size={24} color={Colors.accent} />
                <Text style={styles.sectionTitleLegend}>Legends</Text>
                <View style={styles.dividerLine} />
              </View>
              {legends.map((legend) => {
                const translation = getTranslation(legend);
                return (
                  <Pressable
                    key={legend.id}
                    style={({ pressed }) => [
                      styles.stopCard,
                      styles.legendCard,
                      pressed && styles.stopCardPressed,
                    ]}
                    onPress={() => navigateToStop(legend)}
                  >
                    <View style={[styles.stopNumber, styles.legendIcon]}>
                      <Ionicons name="book" size={20} color={Colors.accent} />
                    </View>
                    <View style={styles.stopInfo}>
                      <Text style={styles.stopTitle} numberOfLines={1}>
                        {translation?.title || 'Legend'}
                      </Text>
                      <Text style={styles.stopDesc} numberOfLines={2}>
                        {translation?.short_description || ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.text.light} />
                  </Pressable>
                );
              })}
            </>
          )}

          {/* Extra Sections */}
          <View style={styles.extraSection}>
            <Text style={styles.sectionTitle}>More</Text>
            
            <Pressable style={styles.extraCard} onPress={() => router.push('/features/video')}>
              <View style={[styles.extraIcon, { backgroundColor: '#E91E63' }]}>
                <Ionicons name="videocam" size={22} color={Colors.white} />
              </View>
              <View style={styles.extraInfo}>
                <Text style={styles.extraTitle}>Video Gallery</Text>
                <Text style={styles.extraDesc}>Watch castle documentaries</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.light} />
            </Pressable>

            <Pressable style={styles.extraCard} onPress={() => router.push('/features/vr')}>
              <View style={[styles.extraIcon, { backgroundColor: '#9C27B0' }]}>
                <Ionicons name="glasses" size={22} color={Colors.white} />
              </View>
              <View style={styles.extraInfo}>
                <Text style={styles.extraTitle}>VR Experience</Text>
                <Text style={styles.extraDesc}>Virtual reality castle tour</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.light} />
            </Pressable>

            <Pressable style={styles.extraCard} onPress={() => router.push('/features/shop')}>
              <View style={[styles.extraIcon, { backgroundColor: '#FF9800' }]}>
                <Ionicons name="bag-handle" size={22} color={Colors.white} />
              </View>
              <View style={styles.extraInfo}>
                <Text style={styles.extraTitle}>Souvenir Shop</Text>
                <Text style={styles.extraDesc}>Castle memorabilia & gifts</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.light} />
            </Pressable>

            <Pressable style={styles.extraCard} onPress={() => router.push('/features/nearby')}>
              <View style={[styles.extraIcon, { backgroundColor: '#2196F3' }]}>
                <Ionicons name="compass" size={22} color={Colors.white} />
              </View>
              <View style={styles.extraInfo}>
                <Text style={styles.extraTitle}>What's Nearby</Text>
                <Text style={styles.extraDesc}>Restaurants, parking & transport</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.light} />
            </Pressable>
          </View>
        </ScrollView>
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
    backgroundColor: 'rgba(13, 13, 26, 0.82)',
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.accent,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 33, 62, 0.85)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  stopCardPressed: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: Colors.accent,
  },
  legendCard: {
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  stopNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stopNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.accent,
  },
  legendIcon: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
  },
  stopInfo: {
    flex: 1,
  },
  stopTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  stopDesc: {
    fontSize: 12,
    color: Colors.text.light,
    marginTop: 2,
  },
  stopIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  legendDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  sectionTitleLegend: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 1,
  },
  extraSection: {
    marginTop: 24,
  },
  extraCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 33, 62, 0.7)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  extraIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  extraInfo: {
    flex: 1,
  },
  extraTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  extraDesc: {
    fontSize: 12,
    color: Colors.text.light,
    marginTop: 2,
  },
});
