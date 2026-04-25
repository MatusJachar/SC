import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Dimensions, ActivityIndicator, ScrollView, Linking, Platform, Modal, PanResponder, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, getFullUrl } from '../constants/api';
import axios from 'axios';

const { width, height } = Dimensions.get('window');
const CASTLE_IMAGE = `${API_BASE_URL}/uploads/images/spis_castle_hero.jpg`;
const FALLBACK_CASTLE_IMAGE = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Spis_Castle_from_road_01.jpg/1280px-Spis_Castle_from_road_01.jpg';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loadData, isLoading, tourStops, legends, languages } = useApp();
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapRotation, setMapRotation] = useState(0);
  
  

  const rotateMap = () => setMapRotation(r => (r + 90) % 360);
  const resetMap = () => setMapRotation(0);

  useEffect(() => {
    loadData();
    loadMapUrl();
  }, []);

  const loadMapUrl = async () => {
    try {
      const res = {data: {castle_map_url: 'https://raw.githubusercontent.com/MatusJachar/SC/main/frontend/assets/images/castle_map.png'}};
      if (res.data?.castle_map_url) setMapUrl(res.data.castle_map_url);
    } catch {}
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D4A017" />
      </View>
    );
  }

  const displayMapUrl = mapUrl ? mapUrl : FALLBACK_CASTLE_IMAGE;

  return (
    <ScrollView style={styles.container} bounces={false} showsVerticalScrollIndicator={false}>
      {/* HERO */}
      <View style={[styles.heroSection, { paddingTop: insets.top + 20 }]}>
        <Image source={{ uri: CASTLE_IMAGE }} style={styles.heroBackground} resizeMode="cover" blurRadius={Platform.OS === 'web' ? 0 : 3} />
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="business" size={48} color="#D4A017" />
          </View>
          <Text style={styles.title}>{'Spi\u0161 Castle'}</Text>
          <Text style={styles.subtitle}>Audio Tour Guide</Text>
          <Text style={styles.descWhite}>Explore the largest UNESCO castle complex in Central Europe.</Text>
          <Text style={styles.descYellow}>Audio guides in 9 languages with offline support.</Text>
          <Pressable
            style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
            onPress={() => router.push('/language')}
          >
            <Text style={styles.startButtonText}>Start Tour</Text>
            <Ionicons name="arrow-forward" size={22} color="#fff" />
          </Pressable>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{languages.length || 9}</Text>
              <Text style={styles.statLabel}>Languages</Text>
            </View>
            <View style={styles.statDot} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{tourStops.length || 13}</Text>
              <Text style={styles.statLabel}>Stops</Text>
            </View>
            <View style={styles.statDot} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{legends.length || 4}</Text>
              <Text style={styles.statLabel}>Legends</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ICON MENU */}
      <View style={styles.menuSection}>
        <View style={styles.iconRow}>
          <Pressable style={styles.iconItem} onPress={() => router.push('/features/info')}>
            <View style={[styles.iconCircle, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="information-circle" size={26} color="#fff" />
            </View>
            <Text style={styles.iconLabel}>Info</Text>
          </Pressable>
          <Pressable style={styles.iconItem} onPress={() => router.push('/features/partners')}>
            <View style={[styles.iconCircle, { backgroundColor: '#00BCD4' }]}>
              <Ionicons name="business" size={24} color="#fff" />
            </View>
            <Text style={styles.iconLabel}>Partners</Text>
          </Pressable>
          <Pressable style={styles.iconItem} onPress={() => router.push('/features/video')}>
            <View style={[styles.iconCircle, { backgroundColor: '#E91E63' }]}>
              <Ionicons name="videocam" size={24} color="#fff" />
            </View>
            <Text style={styles.iconLabel}>Videos</Text>
          </Pressable>
          <Pressable style={styles.iconItem} onPress={() => router.push('/features/transport')}>
            <View style={[styles.iconCircle, { backgroundColor: '#2196F3' }]}>
              <Ionicons name="car" size={24} color="#fff" />
            </View>
            <Text style={styles.iconLabel}>Transport</Text>
          </Pressable>
          <Pressable style={styles.iconItem} onPress={() => router.push('/admin')}>
            <View style={[styles.iconCircle, { backgroundColor: '#9C27B0' }]}>
              <Ionicons name="settings" size={24} color="#fff" />
            </View>
            <Text style={styles.iconLabel}>Admin</Text>
          </Pressable>
        </View>
      </View>

      {/* CASTLE MAP / PHOTO */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="map" size={20} color="#D4A017" />
          <Text style={styles.sectionTitle}>{mapUrl ? 'Castle Map' : 'Spi\u0161 Castle'}</Text>
        </View>
        <Pressable onPress={() => setShowMapModal(true)} style={styles.mapThumb}>
          <Image
            source={{ uri: displayMapUrl }}
            style={styles.mapImage}
            resizeMode="contain"
          />
          <View style={styles.mapOverlay}>
            <Ionicons name="expand" size={22} color="#fff" />
            <Text style={styles.mapOverlayText}>
              {mapUrl ? 'Tap to enlarge' : 'Tap to view'}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* NEARBY */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="compass" size={20} color="#D4A017" />
          <Text style={styles.sectionTitle}>Nearby</Text>
        </View>
        <Pressable
          style={styles.levocaCard}
          onPress={() => Linking.openURL('https://www.google.com/maps/search/?api=1&query=Levoca+Slovakia')}
        >
          <View style={styles.levocaIcon}>
            <Ionicons name="business" size={20} color="#D4A017" />
          </View>
          <View style={styles.levocaInfo}>
            <Text style={styles.levocaName}>{'Levo\u010Da'}</Text>
            <Text style={styles.levocaDesc}>UNESCO World Heritage town with medieval architecture</Text>
          </View>
          <Ionicons name="open-outline" size={16} color={Colors.text.light} />
        </Pressable>
      </View>

      {/* OPENING HOURS */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time" size={20} color="#D4A017" />
          <Text style={styles.sectionTitle}>Opening Hours</Text>
        </View>
        <View style={styles.hoursCard}>
          <View style={styles.hoursRow}>
            <Ionicons name="sunny" size={16} color="#FF9800" />
            <Text style={styles.hoursLabel}>Summer (Jun-Sep)</Text>
            <Text style={styles.hoursValue}>9:00 - 18:00</Text>
          </View>
          <View style={styles.hoursDivider} />
          <View style={styles.hoursRow}>
            <Ionicons name="rainy" size={16} color="#607D8B" />
            <Text style={styles.hoursLabel}>Winter (Oct, Nov, Apr)</Text>
            <Text style={styles.hoursValue}>9:00 - 16:00</Text>
          </View>
        </View>
        <Pressable style={styles.moreBtn} onPress={() => router.push('/features/info')}>
          <Text style={styles.moreBtnText}>Full visitor info, prices & transport</Text>
          <Ionicons name="arrow-forward" size={14} color="#D4A017" />
        </Pressable>
      </View>

      <View style={{ height: insets.bottom + 32 }} />

      {/* MAP / PHOTO MODAL */}
      <Modal visible={showMapModal} transparent animationType="fade">
        <View style={styles.mapModalOverlay}>
          {/* Toolbar */}
          <View style={[styles.mapModalToolbar, { top: insets.top + 12 }]}>
            
            
            <Pressable style={styles.mapModalBtn} onPress={rotateMap}>
              <Ionicons name="refresh" size={22} color="#fff" />
              <Text style={styles.mapModalBtnText}>Rotate</Text>
            </Pressable>
            <Pressable style={[styles.mapModalBtn, { backgroundColor: 'rgba(255,50,50,0.6)' }]} onPress={() => { setShowMapModal(false); resetMap(); }}>
              <Ionicons name="close" size={22} color="#fff" />
              <Text style={styles.mapModalBtnText}>Close</Text>
            </Pressable>
          </View>
          {/* Zoomable + Rotatable image */}
          <Image source={{ uri: displayMapUrl }} style={[styles.mapModalImage, { transform: [{ rotate: `${mapRotation}deg` }, ] }]} resizeMode="contain" />
          </View>
        </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  heroSection: { minHeight: height * 0.78, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  heroBackground: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,20,40,0.55)' },
  heroContent: { alignItems: 'center', paddingHorizontal: 28, zIndex: 1 },
  logoContainer: { width: 80, height: 80, borderRadius: 20, backgroundColor: 'rgba(212,160,23,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 38, fontWeight: '800', color: '#fff', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  subtitle: { fontSize: 18, color: '#D4A017', fontWeight: '600', letterSpacing: 2, marginTop: 4, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  descWhite: { fontSize: 15, color: '#fff', textAlign: 'center', lineHeight: 22, fontWeight: '600', marginTop: 20 },
  descYellow: { fontSize: 14, color: '#D4A017', textAlign: 'center', lineHeight: 20, fontStyle: 'italic', marginTop: 8 },
  startButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#D4A017', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 30, marginTop: 28, gap: 10 },
  startButtonPressed: { backgroundColor: '#B8860B', transform: [{ scale: 0.97 }] },
  startButtonText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 16 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#D4A017' },
  menuSection: { backgroundColor: Colors.background, paddingTop: 24, paddingBottom: 16, paddingHorizontal: 12, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20 },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', rowGap: 16 },
  iconItem: { alignItems: 'center', width: '20%', paddingVertical: 4 },
  iconCircle: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  iconLabel: { fontSize: 11, fontWeight: '600', color: Colors.text.secondary, textAlign: 'center' },
  section: { backgroundColor: Colors.background, paddingHorizontal: 16, paddingTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text.primary },
  mapThumb: { height: 200, borderRadius: 14, overflow: 'hidden', position: 'relative', backgroundColor: '#E0E0E0' },
  mapImage: { width: '100%', height: '100%' },
  mapOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 8 },
  mapOverlayText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  mapModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  mapModalToolbar: { position: 'absolute', right: 16, zIndex: 10, flexDirection: 'row', gap: 12 },
  mapModalBtn: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, gap: 2 },
  mapModalBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  mapModalImage: { width: width, height: height * 0.85 },
  levocaCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  levocaIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF8E1', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  levocaInfo: { flex: 1, marginRight: 8 },
  levocaName: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  levocaDesc: { fontSize: 12, color: Colors.text.light, marginTop: 2 },
  hoursCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hoursLabel: { flex: 1, fontSize: 13, color: Colors.text.secondary },
  hoursValue: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  hoursDivider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 10 },
  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  moreBtnText: { fontSize: 13, fontWeight: '600', color: '#D4A017' },
});



