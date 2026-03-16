import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function VRScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const vrExperiences = [
    { title: 'Castle in 1400s', description: 'See the castle as it looked in its medieval glory days with fully restored walls and towers' },
    { title: 'Tower Panorama', description: '360\u00B0 panoramic view from the highest tower overlooking the entire Spi\u0161 region' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>VR Experience</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <Ionicons name="glasses" size={40} color={Colors.accent} />
          <Text style={styles.bannerTitle}>Virtual Reality</Text>
          <Text style={styles.bannerText}>VR content can be uploaded through the admin panel. Support for 360\u00B0 photos and videos.</Text>
        </View>

        {vrExperiences.map((vr, idx) => (
          <View key={idx} style={styles.vrCard}>
            <View style={styles.vrIcon}>
              <Ionicons name="cube" size={26} color={Colors.accent} />
            </View>
            <View style={styles.vrInfo}>
              <Text style={styles.vrTitle}>{vr.title}</Text>
              <Text style={styles.vrDesc}>{vr.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700', color: Colors.text.primary },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  banner: { alignItems: 'center', padding: 28, backgroundColor: Colors.white, borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  bannerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text.primary, marginTop: 10 },
  bannerText: { fontSize: 13, color: Colors.text.secondary, textAlign: 'center', marginTop: 6 },
  vrCard: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  vrIcon: { width: 52, height: 52, backgroundColor: '#F3E5F5', borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  vrInfo: { flex: 1 },
  vrTitle: { fontSize: 16, fontWeight: '600', color: Colors.text.primary },
  vrDesc: { fontSize: 13, color: Colors.text.secondary, marginTop: 4, lineHeight: 20 },
});
