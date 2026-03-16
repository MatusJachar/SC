import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../constants/api';

const CASTLE_IMAGE = `${API_BASE_URL}/uploads/images/spis_castle_hero.jpg`;

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
      {/* Hero */}
      <View style={styles.heroContainer}>
        <Image source={{ uri: CASTLE_IMAGE }} style={styles.heroImage} resizeMode="cover" />
        <View style={styles.heroOverlay} />
        <View style={[styles.heroContent, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <View style={styles.heroInfo}>
            {isLegend ? (
              <View style={styles.badge}>
                <Ionicons name="book" size={14} color="#FFD700" />
                <Text style={styles.badgeText}>Legend</Text>
              </View>
            ) : (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Stop {stop.stop_number}</Text>
              </View>
            )}
            <Text style={styles.heroTitle}>{translation?.title || 'Tour Stop'}</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentInner} showsVerticalScrollIndicator={false}>
          <Text style={styles.description}>{translation?.description || ''}</Text>
        </ScrollView>

        {/* Audio Player */}
        {hasAudio && (
          <View style={[styles.audioPlayer, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{isCurrentStop ? formatTime(playbackPosition) : '0:00'}</Text>
              <Text style={styles.timeText}>{isCurrentStop ? formatTime(playbackDuration) : '--:--'}</Text>
            </View>
            <View style={styles.controls}>
              <Pressable onPress={skipBackward} style={styles.controlButton}>
                <Ionicons name="play-back" size={26} color={Colors.text.primary} />
              </Pressable>
              <Pressable onPress={handlePlayPause} style={styles.playButton}>
                <Ionicons
                  name={isCurrentStop && isPlaying ? 'pause' : 'play'}
                  size={32}
                  color={Colors.white}
                />
              </Pressable>
              <Pressable onPress={skipForward} style={styles.controlButton}>
                <Ionicons name="play-forward" size={26} color={Colors.text.primary} />
              </Pressable>
            </View>
          </View>
        )}

        {!hasAudio && (
          <View style={[styles.noAudio, { paddingBottom: insets.bottom + 12 }]}>
            <Ionicons name="volume-mute" size={22} color={Colors.text.light} />
            <Text style={styles.noAudioText}>Audio can be uploaded via admin panel</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  heroContainer: { height: 240, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  heroContent: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', paddingHorizontal: 20 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  heroInfo: { paddingBottom: 20 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 6 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#FFD700', letterSpacing: 1 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', lineHeight: 32, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  contentContainer: { flex: 1 },
  scrollContent: { flex: 1 },
  scrollContentInner: { padding: 20, paddingBottom: 32 },
  description: { fontSize: 16, color: Colors.text.primary, lineHeight: 28, fontWeight: '400' },
  audioPlayer: { backgroundColor: Colors.white, paddingTop: 8, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  progressContainer: { height: 4, backgroundColor: '#E8E8E8', borderRadius: 2, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: Colors.accent, borderRadius: 2 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  timeText: { fontSize: 11, color: Colors.text.light },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, paddingVertical: 8 },
  controlButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  playButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },
  noAudio: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 20, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  noAudioText: { fontSize: 13, color: Colors.text.light },
});
