import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function VideoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const videos = [
    { title: 'History of Spi\u0161 Castle', duration: '12:30', description: 'A comprehensive overview of the castle\'s 800-year history' },
    { title: 'Architectural Marvels', duration: '8:45', description: 'Explore the Romanesque and Gothic architecture' },
    { title: 'Life in the Medieval Castle', duration: '10:15', description: 'How people lived within these walls centuries ago' },
    { title: 'Restoration Journey', duration: '15:00', description: 'The ongoing effort to preserve this UNESCO site' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Video Gallery</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.comingSoon}>
          <Ionicons name="videocam" size={48} color={Colors.accent} />
          <Text style={styles.comingSoonTitle}>Video Content</Text>
          <Text style={styles.comingSoonText}>Videos can be uploaded and managed through the admin panel</Text>
        </View>

        {videos.map((video, idx) => (
          <View key={idx} style={styles.videoCard}>
            <View style={styles.videoThumb}>
              <Ionicons name="play-circle" size={40} color={Colors.accent} />
            </View>
            <View style={styles.videoInfo}>
              <Text style={styles.videoTitle}>{video.title}</Text>
              <Text style={styles.videoDesc}>{video.description}</Text>
              <Text style={styles.videoDuration}>{video.duration}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 16 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: Colors.accent },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  comingSoon: { alignItems: 'center', padding: 32, backgroundColor: Colors.backgroundLight, borderRadius: 20, marginBottom: 20 },
  comingSoonTitle: { fontSize: 22, fontWeight: '800', color: Colors.white, marginTop: 12 },
  comingSoonText: { fontSize: 14, color: Colors.text.secondary, textAlign: 'center', marginTop: 8 },
  videoCard: { flexDirection: 'row', backgroundColor: Colors.backgroundLight, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.borderLight },
  videoThumb: { width: 80, height: 60, backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  videoInfo: { flex: 1 },
  videoTitle: { fontSize: 15, fontWeight: '700', color: Colors.white },
  videoDesc: { fontSize: 12, color: Colors.text.light, marginTop: 4 },
  videoDuration: { fontSize: 12, color: Colors.accent, marginTop: 4, fontWeight: '600' },
});
