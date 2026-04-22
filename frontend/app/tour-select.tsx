import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Dimensions, Platform, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const { width, height } = Dimensions.get('window');
const CASTLE_IMAGE = `${API_BASE_URL}/uploads/images/spis_castle_hero.jpg`;

// Legendy majú stop_number 101-104 v DB
const TOUR_TYPES = [
  {
    id: 'express',
    name: 'Express Tour',
    icon: 'flash',
    description: 'Quick highlights of the castle. Perfect when you have limited time.',
    duration: '~30 min',
    stops: [1, 2, 3, 7, 8, 11, 12],
    legends: [103],
    color: '#FF6B35',
  },
  {
    id: 'family',
    name: 'Family Tour',
    icon: 'people',
    description: 'Fun and educational route ideal for families with children.',
    duration: '~60 min',
    stops: [1, 2, 4, 8, 9, 11, 12],
    legends: [101, 104],
    color: '#4ECDC4',
  },
  {
    id: 'complete',
    name: 'Complete Tour',
    icon: 'trophy',
    description: 'Experience the full castle with all stops and legendary tales.',
    duration: '~90 min',
    stops: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    legends: [101, 102, 103, 104],
    color: '#D4A017',
  },
];

export default function TourSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setSelectedTourType } = useApp();
  const [selected, setSelected] = useState('complete');
  const [unlockedProducts, setUnlockedProducts] = useState<string[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [prices, setPrices] = useState<any>(null);

  useEffect(() => {
    initPremium();
  }, []);

  const initPremium = async () => {
    try {
      let id = await AsyncStorage.getItem('@spis_device_id');
      if (!id) {
        id = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('@spis_device_id', id);
      }
      setDeviceId(id);
      const cached = await AsyncStorage.getItem('@spis_unlocks');
      if (cached) setUnlockedProducts(JSON.parse(cached));
      const [statusRes, pricesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/premium/status/${id}`),
        axios.get(`${API_BASE_URL}/premium/settings`),
      ]);
      const unlocked = statusRes.data?.unlocked || [];
      setUnlockedProducts(unlocked);
      await AsyncStorage.setItem('@spis_unlocks', JSON.stringify(unlocked));
      setPrices(pricesRes.data);
    } catch {}
  };

  const isTourUnlocked = (tourId: string) => {
    if (tourId === 'express') return true;
    return unlockedProducts.includes('complete_tour') || unlockedProducts.includes('bundle');
  };

  const selectedTour = useMemo(() => TOUR_TYPES.find(t => t.id === selected)!, [selected]);

  const handleContinue = () => {
    if (!isTourUnlocked(selected)) {
      setShowRedeemModal(true);
      return;
    }
    setSelectedTourType(selected);
    router.push('/tour');
  };

  const handleRedeemCode = async () => {
    if (!redeemCode.trim()) return;
    setRedeemLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/premium/redeem`, {
        code: redeemCode.trim(),
        product_type: 'complete_tour',
        device_id: deviceId,
      });
      const newUnlocks = [...unlockedProducts, 'complete_tour'];
      setUnlockedProducts(newUnlocks);
      await AsyncStorage.setItem('@spis_unlocks', JSON.stringify(newUnlocks));
      setShowRedeemModal(false);
      setRedeemCode('');
      Alert.alert('Success!', 'Complete Tour unlocked! Enjoy the full experience.');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid or expired code';
      Alert.alert('Error', msg);
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri: CASTLE_IMAGE }} style={styles.bgImage} resizeMode="cover" blurRadius={Platform.OS === 'web' ? 0 : 4} />
      <View style={styles.bgOverlay} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.mapIconContainer}>
          <Ionicons name="map" size={36} color="#D4A017" />
        </View>

        <Text style={styles.title}>Choose Your Tour</Text>
        <Text style={styles.subtitle}>Select the experience that fits your time</Text>

        {TOUR_TYPES.map((tour) => {
          const isSelected = selected === tour.id;
          return (
            <Pressable
              key={tour.id}
              style={[styles.tourCard, isSelected && { borderColor: tour.color, borderWidth: 2 }]}
              onPress={() => setSelected(tour.id)}
            >
              {isSelected && (
                <View style={[styles.checkBadge, { backgroundColor: '#4CAF50' }]}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}

              <View style={[styles.tourIconCircle, { backgroundColor: tour.color }]}>
                <Ionicons name={tour.icon as any} size={26} color="#1A1A2E" />
              </View>

              <Text style={[styles.tourName, { color: tour.color }]}>{tour.name}</Text>

              {tour.id !== 'express' && !isTourUnlocked(tour.id) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Ionicons name="lock-closed" size={12} color="#D4A017" />
                  <Text style={{ fontSize: 11, color: '#D4A017', fontWeight: '700' }}>
                    Premium{prices ? ` — ${prices.complete_tour_price}€` : ''}
                  </Text>
                </View>
              )}
              {tour.id !== 'express' && isTourUnlocked(tour.id) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                  <Text style={{ fontSize: 11, color: '#4CAF50', fontWeight: '700' }}>Unlocked</Text>
                </View>
              )}
              {tour.id === 'express' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Ionicons name="gift" size={12} color="#4CAF50" />
                  <Text style={{ fontSize: 11, color: '#4CAF50', fontWeight: '700' }}>Free</Text>
                </View>
              )}

              <Text style={styles.tourDesc}>{tour.description}</Text>

              {/* Includes — vnútri karty */}
              <View style={styles.includesCard}>
                <Text style={styles.includesTitle}>INCLUDES:</Text>
                <Text style={styles.includesItem}>{'\u2022'} {tour.stops.length} tour stops</Text>
                <Text style={styles.includesItem}>{'\u2022'} {tour.legends.length} legend {tour.legends.length === 1 ? 'story' : 'stories'}</Text>
                <Text style={styles.includesItem}>{'\u2022'} Audio narration in selected language</Text>
                <Text style={styles.includesItem}>{'\u2022'} Full offline access</Text>
              </View>

              <View style={styles.durationRow}>
                <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.6)" />
                <Text style={styles.durationText}>{tour.duration}</Text>
              </View>
            </Pressable>
          );
        })}

        <Pressable
          style={({ pressed }) => [styles.continueButton, pressed && styles.continueButtonPressed]}
          onPress={handleContinue}
        >
          {selected !== 'express' && !isTourUnlocked(selected) ? (
            <>
              <Ionicons name="lock-closed" size={18} color="#1A1A2E" />
              <Text style={styles.continueText}>Unlock & Continue</Text>
            </>
          ) : (
            <>
              <Text style={styles.continueText}>Continue</Text>
              <Ionicons name="arrow-forward" size={22} color="#1A1A2E" />
            </>
          )}
        </Pressable>
      </ScrollView>

      <Modal visible={showRedeemModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#1A1A2E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>Unlock Complete Tour</Text>
              <Pressable onPress={() => setShowRedeemModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 22, marginBottom: 16 }}>
              Family & Complete tours are premium features. Purchase an access code at the castle ticket booth or enter your code below.
            </Text>
            <TextInput
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 16, fontSize: 18, fontWeight: '700', textAlign: 'center', letterSpacing: 2, color: '#fff', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' }}
              value={redeemCode}
              onChangeText={setRedeemCode}
              placeholder="SPIS-XXXX-XXXX"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D4A017', borderRadius: 14, paddingVertical: 16, marginTop: 16 }}
              onPress={handleRedeemCode}
              disabled={redeemLoading}
            >
              {redeemLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Redeem Code</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  bgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20, 20, 40, 0.75)' },
  scrollView: { flex: 1, zIndex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', marginBottom: 12 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  mapIconContainer: { alignSelf: 'center', marginBottom: 8 },
  title: { fontSize: 30, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 24 },
  tourCard: { backgroundColor: 'rgba(30, 30, 55, 0.88)', borderRadius: 20, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', position: 'relative' },
  checkBadge: { position: 'absolute', top: 14, right: 14, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  tourIconCircle: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  tourName: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  tourDesc: { fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 20, marginBottom: 12 },
  includesCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  includesTitle: { fontSize: 11, fontWeight: '800', color: '#D4A017', marginBottom: 6, letterSpacing: 1 },
  includesItem: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 3, paddingLeft: 2 },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  durationText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  continueButton: { backgroundColor: '#D4A017', borderRadius: 28, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  continueButtonPressed: { backgroundColor: '#B8860B', transform: [{ scale: 0.97 }] },
  continueText: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
});
