import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, getFullUrl } from '../../constants/api';
import axios from 'axios';

interface VideoItem {
  id: string;
  name: string;
  description: string;
  video_url: string;
  order: number;
}

const VIDEO_COLORS = ['#D4A017', '#4ECDC4', '#FF6B35'];

export default function VideoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/videos`);
      setVideos(res.data);
    } catch (err) {
      console.error('Error loading videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const playVideo = (videoUrl: string) => {
    const url = getFullUrl(videoUrl);
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D4A017" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Castle Videos</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introCard}>
          <View style={styles.introIconCircle}>
            <Ionicons name="videocam" size={28} color="#1A1A2E" />
          </View>
          <Text style={styles.introTitle}>{'Spi\u0161 Castle Films'}</Text>
          <Text style={styles.introDesc}>
            Watch stunning videos of the castle — historical reconstructions, aerial drone footage, and complete overviews.
          </Text>
        </View>

        {/* Video Cards */}
        {videos.map((video, index) => {
          const color = VIDEO_COLORS[index % VIDEO_COLORS.length];
          return (
            <Pressable
              key={video.id}
              style={({ pressed }) => [styles.videoCard, pressed && styles.videoCardPressed]}
              onPress={() => playVideo(video.video_url)}
            >
              {/* Play Icon Area */}
              <View style={[styles.playArea, { backgroundColor: color + '15' }]}>
                <View style={[styles.playCircle, { backgroundColor: color }]}>
                  <Ionicons name="play" size={24} color="#1A1A2E" />
                </View>
                <View style={[styles.numberBadge, { backgroundColor: color }]}>
                  <Text style={styles.numberText}>{index + 1}</Text>
                </View>
              </View>

              {/* Video Info */}
              <View style={styles.videoInfo}>
                <Text style={styles.videoName}>{video.name}</Text>
                <Text style={styles.videoDesc} numberOfLines={2}>{video.description}</Text>
                <View style={styles.watchRow}>
                  <Ionicons name="play-circle" size={14} color={color} />
                  <Text style={[styles.watchText, { color }]}>Tap to watch</Text>
                </View>
              </View>
            </Pressable>
          );
        })}

        {videos.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="videocam-off" size={48} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>No videos available yet</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: '#D4A017' },
  scrollContent: { paddingHorizontal: 16 },

  // Intro
  introCard: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 20, marginBottom: 8 },
  introIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#D4A017', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  introTitle: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' },
  introDesc: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 8, lineHeight: 20 },

  // Video Cards
  videoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 30, 55, 0.88)',
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  videoCardPressed: { backgroundColor: 'rgba(40, 40, 70, 0.95)', borderColor: 'rgba(212,160,23,0.3)' },
  playArea: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  playCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: { fontSize: 12, fontWeight: '800', color: '#1A1A2E' },
  videoInfo: { flex: 1, padding: 14 },
  videoName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  videoDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 17, marginBottom: 6 },
  watchRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  watchText: { fontSize: 12, fontWeight: '600' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, color: 'rgba(255,255,255,0.4)', marginTop: 12 },
});
