import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ImageBackground, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1660544773706-2e41ec6c45b8?w=1200&q=80';

export default function TourDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    tourStops,
    legends,
    selectedLanguage,
    isPlaying,
    currentStopId,
    playbackPosition,
    playbackDuration,
    playAudio,
    pauseAudio,
    resumeAudio,
    stopAudio,
    seekAudio,
    skipForward,
    skipBackward,
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
      {/* Hero Image */}
      <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.heroImage} resizeMode="cover">
        <View style={styles.heroOverlay} />
        <View style={[styles.heroContent, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </Pressable>
          <View style={styles.heroInfo}>
            {isLegend ? (
              <View style={styles.legendBadge}>
                <Ionicons name="book" size={16} color={Colors.accent} />
                <Text style={styles.legendBadgeText}>Legend</Text>
              </View>
            ) : (
              <View style={styles.stopBadge}>
                <Text style={styles.stopBadgeText}>Stop {stop.stop_number}</Text>
              </View>
            )}
            <Text style={styles.heroTitle}>{translation?.title || 'Tour Stop'}</Text>
          </View>
        </View>
      </ImageBackground>

      {/* Content */}
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentInner}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.description}>{translation?.description || ''}</Text>
        </ScrollView>

        {/* Audio Player */}
        {hasAudio && (
          <View style={[styles.audioPlayer, { paddingBottom: insets.bottom + 12 }]}>
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{isCurrentStop ? formatTime(playbackPosition) : '0:00'}</Text>
              <Text style={styles.timeText}>{isCurrentStop ? formatTime(playbackDuration) : '--:--'}</Text>
            </View>
            {/* Controls */}
            <View style={styles.controls}>
              <Pressable onPress={skipBackward} style={styles.controlButton}>
                <Ionicons name="play-back" size={28} color={Colors.white} />
              </Pressable>
              <Pressable onPress={handlePlayPause} style={styles.playButton}>
                <Ionicons
                  name={isCurrentStop && isPlaying ? 'pause' : 'play'}
                  size={36}
                  color={Colors.black}
                />
              </Pressable>
              <Pressable onPress={skipForward} style={styles.controlButton}>
                <Ionicons name="play-forward" size={28} color={Colors.white} />
              </Pressable>
            </View>
          </View>
        )}

        {!hasAudio && (
          <View style={[styles.noAudio, { paddingBottom: insets.bottom + 12 }]}>
            <Ionicons name="volume-mute" size={24} color={Colors.text.light} />
            <Text style={styles.noAudioText}>Audio available via admin panel upload</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroImage: {
    height: 260,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 26, 0.5)',
  },
  heroContent: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: {
    paddingBottom: 20,
  },
  stopBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  stopBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accent,
    letterSpacing: 1,
  },
  legendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  legendBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accent,
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
    lineHeight: 34,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentInner: {
    padding: 20,
    paddingBottom: 32,
  },
  description: {
    fontSize: 16,
    color: Colors.text.secondary,
    lineHeight: 26,
  },
  audioPlayer: {
    backgroundColor: Colors.backgroundLight,
    paddingTop: 8,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    color: Colors.text.light,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 8,
  },
  controlButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noAudio: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  noAudioText: {
    fontSize: 13,
    color: Colors.text.light,
  },
});
