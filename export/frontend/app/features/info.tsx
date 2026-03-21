import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Linking, Image, Modal, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, getFullUrl } from '../../constants/api';
import axios from 'axios';

const GPS_LAT = 48.9998;
const GPS_LNG = 20.7680;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PriceRow {
  label: string;
  price: string;
  highlight?: boolean;
}

const PRICES: PriceRow[] = [
  { label: 'Adults', price: '12.00 \u20AC' },
  { label: 'Children (6-15 years)', price: '7.00 \u20AC' },
  { label: 'Students, seniors', price: '9.00 \u20AC' },
  { label: 'Family ticket (2+2)', price: '26.00 \u20AC', highlight: true },
  { label: 'ZTP child (up to 18 years)', price: '5.00 \u20AC' },
  { label: 'ZTP adults', price: '7.00 \u20AC' },
  { label: 'Night tour for adults', price: '15.00 \u20AC' },
  { label: 'Night tour for families', price: '34.00 \u20AC' },
];

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  website?: string;
}

export default function VisitorInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [castleMapUrl, setCastleMapUrl] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/site-settings`);
      if (res.data?.social_links) setSocialLinks(res.data.social_links);
      if (res.data?.castle_map_url) setCastleMapUrl(res.data.castle_map_url);
    } catch {}
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Visitor Information</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={styles.mainTitle}>Important information for your visit to Spi{'\u0161'} Castle</Text>

        {/* ========== ENTRANCE ========== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="ticket" size={18} color="#fff" />
            </View>
            <Text style={styles.sectionTitle}>Entrance</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Entrance price list</Text>

          <View style={styles.priceTable}>
            {PRICES.map((row, idx) => (
              <View
                key={idx}
                style={[
                  styles.priceRow,
                  idx % 2 === 0 && styles.priceRowAlt,
                  row.highlight && styles.priceRowHighlight,
                ]}
              >
                <Text style={[styles.priceLabel, row.highlight && styles.priceLabelHighlight]}>{row.label}</Text>
                <Text style={[styles.priceValue, row.highlight && styles.priceValueHighlight]}>{row.price}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ========== OPENING HOURS ========== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FF9800' }]}>
              <Ionicons name="time" size={18} color="#fff" />
            </View>
            <Text style={styles.sectionTitle}>Opening Hours</Text>
          </View>

          <View style={styles.hoursCard}>
            <View style={styles.hoursRow}>
              <Ionicons name="sunny" size={20} color="#FF9800" />
              <View style={styles.hoursInfo}>
                <Text style={styles.hoursLabel}>Summer season (June - September)</Text>
                <Text style={styles.hoursValue}>Monday - Sunday: 9:00 - 18:00</Text>
              </View>
            </View>
            <View style={styles.hoursDivider} />
            <View style={styles.hoursRow}>
              <Ionicons name="rainy" size={20} color="#607D8B" />
              <View style={styles.hoursInfo}>
                <Text style={styles.hoursLabel}>Winter season (October, November and April)</Text>
                <Text style={styles.hoursValue}>Monday - Sunday: 09:00 - 16:00</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ========== EVENTS ========== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#E91E63' }]}>
              <Ionicons name="calendar" size={18} color="#fff" />
            </View>
            <Text style={styles.sectionTitle}>Events</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Current events and exhibitions</Text>

          <View style={styles.eventCard}>
            <View style={styles.eventBadge}>
              <Text style={styles.eventBadgeText}>UPCOMING</Text>
            </View>
            <Text style={styles.eventTitle}>Historical days of the castle</Text>
            <Text style={styles.eventDate}>15 - 17 July 2025</Text>
          </View>

          <View style={styles.eventCard}>
            <View style={[styles.eventBadge, { backgroundColor: '#1A237E' }]}>
              <Text style={styles.eventBadgeText}>RECURRING</Text>
            </View>
            <Text style={styles.eventTitle}>Night tour of the castle</Text>
            <Text style={styles.eventDate}>Every second Friday in July and August{'\n'}from 8:30 pm to 10:30 pm</Text>
          </View>

          <View style={styles.eventCard}>
            <Text style={styles.eventTitle}>A demonstration of historical fencing</Text>
            <View style={[styles.eventBadge, { backgroundColor: '#4CAF50' }]}>
              <Text style={styles.eventBadgeText}>PERMANENT</Text>
            </View>
          </View>

          {/* Social Media Links */}
          {(socialLinks.facebook || socialLinks.instagram || socialLinks.website) && (
            <View style={styles.socialRow}>
              {socialLinks.website && (
                <Pressable style={styles.socialButton} onPress={() => Linking.openURL(socialLinks.website!)}>
                  <Ionicons name="globe-outline" size={20} color="#fff" />
                  <Text style={styles.socialText}>Website</Text>
                </Pressable>
              )}
              {socialLinks.facebook && (
                <Pressable style={[styles.socialButton, { backgroundColor: '#1877F2' }]} onPress={() => Linking.openURL(socialLinks.facebook!)}>
                  <Ionicons name="logo-facebook" size={20} color="#fff" />
                  <Text style={styles.socialText}>Facebook</Text>
                </Pressable>
              )}
              {socialLinks.instagram && (
                <Pressable style={[styles.socialButton, { backgroundColor: '#E1306C' }]} onPress={() => Linking.openURL(socialLinks.instagram!)}>
                  <Ionicons name="logo-instagram" size={20} color="#fff" />
                  <Text style={styles.socialText}>Instagram</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* ========== CASTLE MAP ========== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#795548' }]}>
              <Ionicons name="map" size={18} color="#fff" />
            </View>
            <Text style={styles.sectionTitle}>Castle Complex Map</Text>
          </View>
          {castleMapUrl ? (
            <Pressable onPress={() => setShowMapModal(true)} style={styles.mapImageContainer}>
              <Image
                source={{ uri: getFullUrl(castleMapUrl) }}
                style={styles.mapImage}
                resizeMode="contain"
              />
              <View style={styles.mapTapOverlay}>
                <Ionicons name="expand" size={18} color="#fff" />
                <Text style={styles.mapTapText}>Tap to enlarge</Text>
              </View>
              <Text style={styles.mapCaption}>Spi{'\u0161'} Castle complex layout</Text>
            </Pressable>
          ) : (
            <View style={styles.mapImageContainer}>
              <Image
                source={{ uri: `${API_BASE_URL}/uploads/images/castle_map.png` }}
                style={styles.mapImage}
                resizeMode="contain"
              />
              <Text style={styles.mapCaption}>Spi{'\u0161'} Castle complex layout</Text>
            </View>
          )}
        </View>

        {/* ========== RECONSTRUCTION ========== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FF5722' }]}>
              <Ionicons name="construct" size={18} color="#fff" />
            </View>
            <Text style={styles.sectionTitle}>Reconstruction</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Ongoing reconstruction work</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Currently, the renovation, rescue and restoration of the Romanesque Palace in the northern part of the Upper Castle complex is underway, after which the reconstruction of the entrance arcade corridor, which was not only the entrance to the interior, but also served as a museum, will continue. For these reasons, the interior of Spi{'\u0161'} Castle is closed and some parts of the castle are inaccessible.
            </Text>
          </View>

          <View style={styles.closedCard}>
            <Ionicons name="warning" size={20} color={Colors.error} />
            <View style={styles.closedInfo}>
              <Text style={styles.closedTitle}>Closed areas</Text>
              <Text style={styles.closedItem}>{'\u2022'} Museum (until 04/2030)</Text>
              <Text style={styles.closedItem}>{'\u2022'} Romanesque Palace (until 04/2028)</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ===== MAP MODAL ===== */}
      <Modal visible={showMapModal} transparent animationType="fade">
        <View style={styles.mapModalOverlay}>
          <Pressable style={[styles.mapModalClose, { top: insets.top + 12 }]} onPress={() => setShowMapModal(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          {castleMapUrl && (
            <Image source={{ uri: getFullUrl(castleMapUrl) }} style={styles.mapModalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  content: { paddingHorizontal: 16 },
  mainTitle: { fontSize: 20, fontWeight: '800', color: Colors.text.primary, textAlign: 'center', marginBottom: 20, lineHeight: 28 },

  // Section
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  sectionIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  sectionSubtitle: { fontSize: 13, color: Colors.text.secondary, marginBottom: 10 },

  // Price table
  priceTable: { backgroundColor: Colors.white, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  priceRowAlt: { backgroundColor: '#FAFAFA' },
  priceRowHighlight: { backgroundColor: '#FFF8E1' },
  priceLabel: { fontSize: 14, color: Colors.text.primary, flex: 1 },
  priceLabelHighlight: { fontWeight: '600' },
  priceValue: { fontSize: 15, fontWeight: '700', color: Colors.accent, minWidth: 70, textAlign: 'right' },
  priceValueHighlight: { fontSize: 16, color: '#E65100' },

  // Hours
  hoursCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  hoursRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  hoursInfo: { flex: 1 },
  hoursLabel: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary },
  hoursValue: { fontSize: 15, fontWeight: '700', color: Colors.text.primary, marginTop: 2 },
  hoursDivider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 12 },

  // Events
  eventCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  eventBadge: { backgroundColor: '#E91E63', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 6 },
  eventBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  eventTitle: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  eventDate: { fontSize: 13, color: Colors.text.secondary, marginTop: 4, lineHeight: 20 },

  // Map image
  mapImageContainer: { backgroundColor: Colors.white, borderRadius: 14, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  mapImage: { width: '100%', height: 220, borderRadius: 10 },
  mapCaption: { fontSize: 12, color: Colors.text.light, marginTop: 8, fontStyle: 'italic' },

  // Reconstruction
  infoCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  infoText: { fontSize: 14, color: Colors.text.secondary, lineHeight: 22 },
  closedCard: { flexDirection: 'row', backgroundColor: '#FFF3F3', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#FFCDD2', gap: 12 },
  closedInfo: { flex: 1 },
  closedTitle: { fontSize: 15, fontWeight: '700', color: Colors.error },
  closedItem: { fontSize: 14, color: Colors.text.secondary, marginTop: 4 },

  // Transport
  gpsCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  gpsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  gpsTitle: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  gpsCoords: { fontSize: 14, color: Colors.text.secondary, fontFamily: 'monospace', marginBottom: 12 },
  mapButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4285F4', borderRadius: 10, paddingVertical: 10, gap: 8 },
  mapButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  transportCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  transportHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  transportTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary },
  transportSubhead: { fontSize: 14, fontWeight: '600', color: Colors.text.primary, marginTop: 8, marginBottom: 2 },
  transportText: { fontSize: 13, color: Colors.text.secondary, lineHeight: 21 },
  transportDetail: { fontSize: 13, color: Colors.text.secondary, lineHeight: 21, marginTop: 8 },
  bold: { fontWeight: '700', color: Colors.text.primary },

  phoneButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E91E63', borderRadius: 10, paddingVertical: 10, marginTop: 10, gap: 8 },
  phoneButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Social Links
  socialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  socialButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, gap: 8 },
  socialText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  // Map tap overlay
  mapTapOverlay: { position: 'absolute', bottom: 36, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingVertical: 6 },
  mapTapText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Map Modal
  mapModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  mapModalClose: { position: 'absolute', right: 16, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  mapModalImage: { width: SCREEN_WIDTH - 24, height: SCREEN_HEIGHT * 0.7 },
});
