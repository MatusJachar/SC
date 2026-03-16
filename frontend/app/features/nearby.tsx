import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function NearbyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const nearby = [
    { category: 'Getting Back', icon: 'bus' as const, color: '#4CAF50', items: [
      { name: 'Bus Stop (Spi\u0161sk\u00E9 Podhradie)', detail: '10 min walk downhill from castle' },
      { name: 'Parking Lot', detail: 'Large parking area at castle entrance' },
      { name: 'Taxi Service', detail: 'Call +421 xxx xxx xxx' },
    ]},
    { category: 'Food & Drink', icon: 'restaurant' as const, color: '#FF9800', items: [
      { name: 'Castle Restaurant', detail: 'Traditional Slovak cuisine, 200m from entrance' },
      { name: 'Cafe Pod Hradom', detail: 'Coffee & refreshments at the foot of the hill' },
      { name: 'Pizzeria Spi\u0161', detail: 'In Spi\u0161sk\u00E9 Podhradie village, 1km' },
    ]},
    { category: 'Accommodation', icon: 'bed' as const, color: '#2196F3', items: [
      { name: 'Hotel Pod Hradom', detail: 'Views of the castle, 500m' },
      { name: 'Penzion Spi\u0161', detail: 'Budget-friendly, in the village' },
    ]},
    { category: 'Attractions', icon: 'star' as const, color: '#9C27B0', items: [
      { name: 'Spi\u0161sk\u00E1 Kapitula', detail: 'UNESCO site, medieval ecclesiastical town, 2km' },
      { name: '\u017Dehra Church', detail: 'Romanesque church with unique frescoes, 3km' },
      { name: 'Dreven\u00FD kostol\u00EDk', detail: 'Wooden church UNESCO heritage' },
    ]},
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>What's Nearby</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {nearby.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: section.color }]}>
                <Ionicons name={section.icon} size={20} color={Colors.white} />
              </View>
              <Text style={styles.sectionTitle}>{section.category}</Text>
            </View>
            {section.items.map((item, iidx) => (
              <View key={iidx} style={styles.itemCard}>
                <View style={styles.itemDot} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDetail}>{item.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.emergencyBox}>
          <Ionicons name="call" size={24} color={Colors.error} />
          <View style={styles.emergencyInfo}>
            <Text style={styles.emergencyTitle}>Emergency</Text>
            <Text style={styles.emergencyText}>EU Emergency: 112</Text>
            <Text style={styles.emergencyText}>Police: 158 | Ambulance: 155</Text>
          </View>
        </View>
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
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.white },
  itemCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.backgroundLight, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.borderLight },
  itemDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent, marginTop: 6, marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', color: Colors.white },
  itemDetail: { fontSize: 13, color: Colors.text.light, marginTop: 4 },
  emergencyBox: { flexDirection: 'row', backgroundColor: 'rgba(255,82,82,0.1)', borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 1, borderColor: 'rgba(255,82,82,0.3)' },
  emergencyInfo: { marginLeft: 14, flex: 1 },
  emergencyTitle: { fontSize: 16, fontWeight: '800', color: Colors.error },
  emergencyText: { fontSize: 13, color: Colors.text.secondary, marginTop: 4 },
});
