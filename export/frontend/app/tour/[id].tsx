import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, getFullUrl } from '../../constants/api';

const CASTLE_IMAGE = `${API_BASE_URL}/uploads/images/spis_castle_hero.jpg`;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TourDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    tourStops, legends, selectedLanguage,
    isPlaying, currentStopId, playbackPosition, playbackDuration,
    playAudio, pauseAudio, resumeAudio, skipForward, skipBackward,
  } = useApp();

  const allStops = useMemo(() => [...tourStops, ...legends], [tourStops, legends]);
  const stop = useMemo(() => allStops.find(s => s.id === id), [allStops, id]);

  const translation = useMemo(() => {
    if (!stop) return null;
    return stop.translations.find(t => t.language_code === selectedLanguage)
      || stop.translations.find(t => t.language_code === 'en')
      || stop.translations[0];
  }, [stop, selectedLanguage]);

  const isCurrentStop = currentStopId === id;
  const hasAudio = !!translation?.audio_url;

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = playbackDuration > 0 ? (playbackPosition / playbackDuration) : 0;

  const handlePlayPause = async () => {
    if (!hasAudio || !translation?.audio_url) return;
    if (isCurrentStop && isPlaying) {
      await pauseAudio();
    } else if (isCurrentStop) {
      await resumeAudio();
    } else {
      await playAudio(id || '', translation.audio_url);
    }
  };

  if (!stop) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const isLegend = stop.stop_type === 'legend';

  return (
    <View style={styles.container}>
      {/* Compact Header with Back Button */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          {isLegend ? (
            <View style={styles.headerBadge}>
              <Ionicons name="book" size={12} color={Colors.accent} />
              <Text style={styles.headerBadgeText}>Legend</Text>
            </View>
          ) : (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>Stop {stop.stop_number}</Text>
            </View>
          )}
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Compact Hero Image */}
      <View style={styles.heroContainer}>
        <Image source={{ uri: stop.image_url ? getFullUrl(stop.image_url) : CASTLE_IMAGE }} style={styles.heroImage} resizeMode="cover" />
        <View style={styles.heroOverlay} />
        <View style={styles.heroTitleContainer}>
          <Text style={styles.heroTitle} numberOfLines={2}>{translation?.title || 'Tour Stop'}</Text>
        </View>
      </View>

      {/* Description - Scrollable */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={[styles.scrollContentInner, { paddingBottom: hasAudio ? 16 : insets.bottom + 20 }]}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.description}>{translation?.description || ''}</Text>
      </ScrollView>

      {/* Audio Player - Fixed at Bottom */}
      {hasAudio && (
        <View style={[styles.audioPlayer, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{isCurrentStop ? formatTime(playbackPosition) : '0:00'}</Text>
            <Text style={styles.timeText}>{isCurrentStop ? formatTime(playbackDuration) : '--:--'}</Text>
          </View>
          <View style={styles.controls}>
            <Pressable onPress={skipBackward} style={styles.controlButton}>
              <Ionicons name="play-back" size={24} color={Colors.text.primary} />
            </Pressable>
            <Pressable onPress={handlePlayPause} style={styles.playButton}>
              <Ionicons
                name={isCurrentStop && isPlaying ? 'pause' : 'play'}
                size={28}
                color={Colors.white}
              />
            </Pressable>
            <Pressable onPress={skipForward} style={styles.controlButton}>
              <Ionicons name="play-forward" size={24} color={Colors.text.primary} />
            </Pressable>
          </View>
        </View>
      )}

      {!hasAudio && (
        <View style={[styles.noAudio, { paddingBottom: insets.bottom + 8 }]}>
          <Ionicons name="volume-mute" size={20} color={Colors.text.light} />
          <Text style={styles.noAudioText}>Audio not available for this stop</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 6, backgroundColor: Colors.background },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF3CD', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  headerBadgeText: { fontSize: 13, fontWeight: '800', color: Colors.accent },

  // Hero - Compact
  heroContainer: { height: 160, position: 'relative', marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  heroTitleContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', lineHeight: 28, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },

  // Content
  scrollContent: { flex: 1 },
  scrollContentInner: { paddingHorizontal: 20, paddingTop: 16 },
  description: { fontSize: 15, color: Colors.text.primary, lineHeight: 24, fontWeight: '400', letterSpacing: 0.2 },

  // Audio Player
  audioPlayer: { backgroundColor: Colors.white, paddingTop: 8, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  progressContainer: { height: 3, backgroundColor: '#E8E8E8', borderRadius: 2, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: Colors.accent, borderRadius: 2 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  timeText: { fontSize: 11, color: Colors.text.light },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, paddingVertical: 6 },
  controlButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  playButton: { width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },
  noAudio: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 20, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  noAudioText: { fontSize: 13, color: Colors.text.light },
});
