import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Dimensions, ActivityIndicator, ScrollView, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../constants/api';

const { width, height } = Dimensions.get('window');
const CASTLE_IMAGE = `${API_BASE_URL}/uploads/images/spis_castle_hero.jpg`;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loadData, isLoading, tourStops, legends, languages } = useApp();

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D4A017" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} bounces={false} showsVerticalScrollIndicator={false}>
      {/* ===== HERO SECTION - Full screen with blurred background ===== */}
      <View style={[styles.heroSection, { paddingTop: insets.top + 20 }]}>
        <Image source={{ uri: CASTLE_IMAGE }} style={styles.heroBackground} resizeMode="cover" blurRadius={Platform.OS === 'web' ? 0 : 3} />
        <View style={styles.heroOverlay} />

        <View style={styles.heroContent}>
          {/* Castle Logo */}
          <View style={styles.logoContainer}>
            <Ionicons name="business" size={48} color="#D4A017" />
          </View>

          {/* Title */}
          <Text style={styles.title}>{'Spi\u0161 Castle'}</Text>
          <Text style={styles.subtitle}>Audio Tour Guide</Text>

          {/* Description */}
          <Text style={styles.descWhite}>
            Explore, Discover and Immerse yourself in the largest U.N.E.S.C.O castle complexes in Europe.
          </Text>
          <Text style={styles.descYellow}>
            Our audio guide will take you through centuries of history, architecture and legends.
          </Text>

          {/* Start Tour Button */}
          <Pressable
            style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
            onPress={() => router.push('/language')}
          >
            <Text style={styles.startButtonText}>Start Tour</Text>
            <Ionicons name="arrow-forward" size={22} color="#fff" />
          </Pressable>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{languages.length}</Text>
              <Text style={styles.statLabel}>Languages</Text>
            </View>
            <View style={styles.statDot} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{tourStops.length}</Text>
              <Text style={styles.statLabel}>Stops</Text>
            </View>
            <View style={styles.statDot} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{legends.length}</Text>
              <Text style={styles.statLabel}>Legends</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ===== QUICK MENU ===== */}
      <View style={styles.menuSection}>
        <View style={styles.menuGrid}>
          <Pressable style={styles.menuItem} onPress={() => router.push('/features/info')}>
            <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="information-circle" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.menuText}>Visitor Info</Text>
            <Text style={styles.menuSubtext}>Hours & Prices</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => router.push('/features/shop')}>
            <View style={[styles.menuIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="bag" size={24} color="#FF9800" />
            </View>
            <Text style={styles.menuText}>Souvenir Shop</Text>
            <Text style={styles.menuSubtext}>21 Items</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => router.push('/features/video')}>
            <View style={[styles.menuIcon, { backgroundColor: '#FCE4EC' }]}>
              <Ionicons name="videocam" size={24} color="#E91E63" />
            </View>
            <Text style={styles.menuText}>Castle Videos</Text>
            <Text style={styles.menuSubtext}>3 Films</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => router.push('/features/info')}>
            <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="map" size={24} color="#2196F3" />
            </View>
            <Text style={styles.menuText}>Transport</Text>
            <Text style={styles.menuSubtext}>How to get here</Text>
          </Pressable>
        </View>
        <Pressable style={styles.adminLink} onPress={() => router.push('/admin')}>
          <Ionicons name="settings-outline" size={16} color={Colors.text.light} />
          <Text style={styles.adminLinkText}>Admin Panel</Text>
        </Pressable>
      </View>

      {/* ===== OPENING HOURS QUICK VIEW ===== */}
      <View style={styles.infoSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time" size={22} color="#D4A017" />
          <Text style={styles.sectionTitle}>Opening Hours</Text>
        </View>
        <View style={styles.hoursCard}>
          <View style={styles.hoursRow}>
            <Ionicons name="sunny" size={18} color="#FF9800" />
            <View style={styles.hoursInfo}>
              <Text style={styles.hoursLabel}>Summer (June - September)</Text>
              <Text style={styles.hoursValue}>Mon - Sun: 9:00 - 18:00</Text>
            </View>
          </View>
          <View style={styles.hoursDivider} />
          <View style={styles.hoursRow}>
            <Ionicons name="rainy" size={18} color="#607D8B" />
            <View style={styles.hoursInfo}>
              <Text style={styles.hoursLabel}>Winter (Oct, Nov & April)</Text>
              <Text style={styles.hoursValue}>Mon - Sun: 9:00 - 16:00</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ===== RECONSTRUCTION NOTICE ===== */}
      <View style={styles.infoSection}>
        <View style={styles.reconstructionCard}>
          <View style={styles.reconstructionHeader}>
            <Ionicons name="construct" size={18} color={Colors.error} />
            <Text style={styles.reconstructionTitle}>Closed Areas</Text>
          </View>
          <Text style={styles.reconstructionItem}>{'\u2022'} Museum (until 04/2030)</Text>
          <Text style={styles.reconstructionItem}>{'\u2022'} Romanesque Palace (until 04/2028)</Text>
        </View>
      </View>

      {/* ===== NEARBY ATTRACTIONS ===== */}
      <View style={styles.infoSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="compass" size={22} color="#D4A017" />
          <Text style={styles.sectionTitle}>Nearby Attractions</Text>
        </View>

        <Pressable
          style={styles.attractionCard}
          onPress={() => Linking.openURL('https://www.google.com/maps/search/?api=1&query=Levoca+Slovakia')}
        >
          <View style={[styles.attractionIcon, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="business" size={22} color="#4CAF50" />
          </View>
          <View style={styles.attractionInfo}>
            <Text style={styles.attractionName}>{'Levo\u010Da'}</Text>
            <Text style={styles.attractionDesc}>UNESCO World Heritage town, historic center with medieval architecture</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={Colors.text.light} />
        </Pressable>

        <Pressable
          style={styles.attractionCard}
          onPress={() => Linking.openURL('https://www.google.com/maps/search/?api=1&query=Bazilika+sv+Jakuba+Levoca')}
        >
          <View style={[styles.attractionIcon, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="home" size={22} color="#FF9800" />
          </View>
          <View style={styles.attractionInfo}>
            <Text style={styles.attractionName}>{'Bazilika sv. Jakuba'}</Text>
            <Text style={styles.attractionDesc}>Basilica of St. James - Gothic church with the tallest wooden altar in the world by Master Paul</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={Colors.text.light} />
        </Pressable>

        <Pressable
          style={styles.attractionCard}
          onPress={() => Linking.openURL('https://www.google.com/maps/search/?api=1&query=Historicka+radnica+Levoca')}
        >
          <View style={[styles.attractionIcon, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="library" size={22} color="#2196F3" />
          </View>
          <View style={styles.attractionInfo}>
            <Text style={styles.attractionName}>{'Historick\u00E1 radnica'}</Text>
            <Text style={styles.attractionDesc}>{'Historic Town Hall of Levo\u010Da - Renaissance building from 15th century, now a museum'}</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={Colors.text.light} />
        </Pressable>
      </View>

      {/* ===== ENTRANCE PRICES ===== */}
      <View style={styles.infoSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="ticket" size={22} color="#D4A017" />
          <Text style={styles.sectionTitle}>Entrance Prices</Text>
        </View>
        <View style={styles.priceTable}>
          {[
            { label: 'Adults', price: '12.00 \u20AC' },
            { label: 'Children (6-15)', price: '7.00 \u20AC' },
            { label: 'Students, seniors', price: '9.00 \u20AC' },
            { label: 'Family (2+2)', price: '26.00 \u20AC', highlight: true },
            { label: 'Night tour adults', price: '15.00 \u20AC' },
            { label: 'Night tour families', price: '34.00 \u20AC' },
          ].map((row, idx) => (
            <View key={idx} style={[styles.priceRow, row.highlight && styles.priceRowHighlight]}>
              <Text style={[styles.priceLabel, row.highlight && styles.priceLabelBold]}>{row.label}</Text>
              <Text style={[styles.priceValue, row.highlight && styles.priceValueBold]}>{row.price}</Text>
            </View>
          ))}
        </View>
        <Pressable style={styles.moreInfoBtn} onPress={() => router.push('/features/info')}>
          <Text style={styles.moreInfoText}>Full Info & Transport Details</Text>
          <Ionicons name="arrow-forward" size={16} color="#D4A017" />
        </Pressable>
      </View>

      <View style={{ height: insets.bottom + 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },

  // ===== HERO =====
  heroSection: {
    minHeight: height * 0.85,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 20, 40, 0.55)',
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 28,
    zIndex: 1,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 160, 23, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitle: {
    fontSize: 18,
    color: '#D4A017',
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  descWhite: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '600',
    marginTop: 24,
  },
  descYellow: {
    fontSize: 15,
    color: '#D4A017',
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
    marginTop: 12,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4A017',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    marginTop: 32,
    gap: 10,
  },
  startButtonPressed: {
    backgroundColor: '#B8860B',
    transform: [{ scale: 0.97 }],
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4A017',
  },

  // ===== QUICK MENU =====
  menuSection: {
    backgroundColor: Colors.background,
    paddingTop: 24,
    paddingHorizontal: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  menuItem: {
    width: (width - 42) / 2,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  menuSubtext: {
    fontSize: 11,
    color: Colors.text.light,
    marginTop: 2,
  },
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  adminLinkText: {
    fontSize: 13,
    color: Colors.text.light,
    fontWeight: '600',
  },

  // ===== INFO SECTIONS =====
  infoSection: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },

  // Hours
  hoursCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  hoursRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  hoursInfo: { flex: 1 },
  hoursLabel: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary },
  hoursValue: { fontSize: 15, fontWeight: '700', color: Colors.text.primary, marginTop: 2 },
  hoursDivider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 12 },

  // Reconstruction
  reconstructionCard: {
    backgroundColor: '#FFF3F3',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  reconstructionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  reconstructionTitle: { fontSize: 15, fontWeight: '700', color: Colors.error },
  reconstructionItem: { fontSize: 13, color: Colors.text.secondary, marginTop: 3, paddingLeft: 4 },

  // Attractions
  attractionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  attractionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attractionInfo: { flex: 1, marginRight: 8 },
  attractionName: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  attractionDesc: { fontSize: 12, color: Colors.text.light, marginTop: 3, lineHeight: 17 },

  // Prices
  priceTable: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  priceRowHighlight: { backgroundColor: '#FFF8E1' },
  priceLabel: { fontSize: 14, color: Colors.text.primary },
  priceLabelBold: { fontWeight: '700' },
  priceValue: { fontSize: 14, fontWeight: '700', color: '#D4A017' },
  priceValueBold: { fontSize: 15, color: '#E65100' },
  moreInfoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  moreInfoText: { fontSize: 14, fontWeight: '600', color: '#D4A017' },
});
