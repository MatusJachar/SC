import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors } from '../constants/colors';
import { useApp } from '../context/AppContext';

const { width } = Dimensions.get('window');

interface AudioPlayerProps {
  stopTitle: string;
  stopNumber: number;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ stopTitle, stopNumber }) => {
  const {
    isPlaying,
    playbackPosition,
    playbackDuration,
    pauseAudio,
    resumeAudio,
    stopAudio,
    skipForward,
    skipBackward,
  } = useApp();

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0;

  return (
    <BlurView intensity={95} tint="light" style={styles.container}>
      <View style={styles.content}>
        {/* Stop badge and title */}
        <View style={styles.header}>
          <View style={styles.stopBadge}>
            <Text style={styles.stopNumber}>{stopNumber}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>{stopTitle}</Text>
          <TouchableOpacity onPress={stopAudio} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.stone[700]} />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(playbackPosition)}</Text>
            <Text style={styles.timeText}>{formatTime(playbackDuration)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={skipBackward} style={styles.controlButton}>
            <Ionicons name="play-back" size={28} color={Colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={isPlaying ? pauseAudio : resumeAudio}
            style={styles.playButton}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color={Colors.white}
            />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={skipForward} style={styles.controlButton}>
            <Ionicons name="play-forward" size={28} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stopBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stopNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.stone[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: Colors.text.light,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  controlButton: {
    padding: 8,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
