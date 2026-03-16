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
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>VR Experience</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.comingSoon}>
          <Ionicons name="glasses" size={48} color={Colors.accent} />
          <Text style={styles.comingSoonTitle}>Virtual Reality</Text>
          <Text style={styles.comingSoonText}>VR content can be uploaded through the admin panel. Support for 360\u00B0 photos and videos.</Text>
        </View>

        {vrExperiences.map((vr, idx) => (
          <View key={idx} style={styles.vrCard}>
            <View style={styles.vrIcon}>
              <Ionicons name="cube" size={28} color={Colors.accent} />
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 16 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: Colors.accent },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  comingSoon: { alignItems: 'center', padding: 32, backgroundColor: Colors.backgroundLight, borderRadius: 20, marginBottom: 20 },
  comingSoonTitle: { fontSize: 22, fontWeight: '800', color: Colors.white, marginTop: 12 },
  comingSoonText: { fontSize: 14, color: Colors.text.secondary, textAlign: 'center', marginTop: 8 },
  vrCard: { flexDirection: 'row', backgroundColor: Colors.backgroundLight, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.borderLight, alignItems: 'center' },
  vrIcon: { width: 56, height: 56, backgroundColor: 'rgba(156,39,176,0.15)', borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  vrInfo: { flex: 1 },
  vrTitle: { fontSize: 16, fontWeight: '700', color: Colors.white },
  vrDesc: { fontSize: 13, color: Colors.text.light, marginTop: 4 },
});
