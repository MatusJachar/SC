import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image, Modal, TextInput, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, getFullUrl } from '../../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEVICE_KEY = '@spis_device_id';
const UNLOCKS_KEY = '@spis_unlocks';

interface VRItem {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string | null;
  is_premium: boolean;
  price: number;
  currency: string;
  order: number;
}

interface PremiumPrices {
  complete_tour_price: number;
  vr_experience_price: number;
  bundle_price: number;
  currency: string;
}

export default function VRScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [vrItems, setVrItems] = useState<VRItem[]>([]);
  const [prices, setPrices] = useState<PremiumPrices | null>(null);
  const [unlockedProducts, setUnlockedProducts] = useState<string[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [selectedVR, setSelectedVR] = useState<VRItem | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);

  useEffect(() => {
    initDevice();
  }, []);

  const initDevice = async () => {
    try {
      let id = await AsyncStorage.getItem(DEVICE_KEY);
      if (!id) {
        id = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(DEVICE_KEY, id);
      }
      setDeviceId(id);

      // Load cached unlocks
      const cached = await AsyncStorage.getItem(UNLOCKS_KEY);
      if (cached) setUnlockedProducts(JSON.parse(cached));

      // Load data
      const [vrRes, pricesRes, statusRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/vr-content`),
        axios.get(`${API_BASE_URL}/premium/settings`),
        axios.get(`${API_BASE_URL}/premium/status/${id}`),
      ]);

      setVrItems(vrRes.data);
      setPrices(pricesRes.data);
      
      const unlocked = statusRes.data?.unlocked || [];
      setUnlockedProducts(unlocked);
      await AsyncStorage.setItem(UNLOCKS_KEY, JSON.stringify(unlocked));
    } catch (err) {
      console.log('Error loading VR data:', err);
    } finally {
      setLoading(false);
    }
  };

  const isVRUnlocked = unlockedProducts.includes('vr_experience') || unlockedProducts.includes('bundle');

  const handleRedeemCode = async () => {
    if (!redeemCode.trim()) return;
    setRedeemLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/premium/redeem`, {
        code: redeemCode.trim(),
        product_type: 'vr_experience',
        device_id: deviceId,
      });
      
      const newUnlocks = [...unlockedProducts, 'vr_experience'];
      setUnlockedProducts(newUnlocks);
      await AsyncStorage.setItem(UNLOCKS_KEY, JSON.stringify(newUnlocks));
      
      setShowRedeemModal(false);
      setRedeemCode('');
      Alert.alert('Success!', 'VR Experience unlocked! Enjoy the virtual tours.');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid or expired code';
      Alert.alert('Error', msg);
    } finally {
      setRedeemLoading(false);
    }
  };

  const openVR = (item: VRItem) => {
    if (item.is_premium && !isVRUnlocked) {
      setShowRedeemModal(true);
      return;
    }
    setSelectedVR(item);
    setShowPlayerModal(true);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>VR Experience</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroIconContainer}>
            <Ionicons name="glasses" size={44} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Virtual Reality Tours</Text>
          <Text style={styles.heroSubtitle}>Step back in time and explore Spi{'\u0161'} Castle like never before</Text>
          {!isVRUnlocked && prices && (
            <View style={styles.priceTag}>
              <Ionicons name="lock-closed" size={14} color="#fff" />
              <Text style={styles.priceText}>Premium — {prices.vr_experience_price.toFixed(2)} {prices.currency}</Text>
            </View>
          )}
          {isVRUnlocked && (
            <View style={[styles.priceTag, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="checkmark-circle" size={14} color="#fff" />
              <Text style={styles.priceText}>Unlocked</Text>
            </View>
          )}
        </View>

        {/* VR Items */}
        {vrItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="videocam-off" size={36} color={Colors.text.light} />
            <Text style={styles.emptyText}>VR content coming soon</Text>
            <Text style={styles.emptySubtext}>Upload via Admin panel</Text>
          </View>
        ) : (
          vrItems.map((item) => (
            <Pressable key={item.id} style={styles.vrCard} onPress={() => openVR(item)}>
              <View style={styles.vrThumb}>
                {item.thumbnail_url ? (
                  <Image source={{ uri: getFullUrl(item.thumbnail_url) }} style={styles.vrThumbImage} resizeMode="cover" />
                ) : (
                  <View style={styles.vrThumbPlaceholder}>
                    <Ionicons name="cube" size={30} color="#D4A017" />
                  </View>
                )}
                {item.is_premium && !isVRUnlocked && (
                  <View style={styles.lockOverlay}>
                    <Ionicons name="lock-closed" size={24} color="#fff" />
                  </View>
                )}
                <View style={styles.playOverlay}>
                  <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
                </View>
              </View>
              <View style={styles.vrInfo}>
                <Text style={styles.vrTitle}>{item.title}</Text>
                <Text style={styles.vrDesc} numberOfLines={2}>{item.description}</Text>
                {item.is_premium && !isVRUnlocked ? (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="diamond" size={12} color="#D4A017" />
                    <Text style={styles.premiumText}>Premium</Text>
                  </View>
                ) : (
                  <View style={[styles.premiumBadge, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                    <Text style={[styles.premiumText, { color: '#4CAF50' }]}>
                      {item.is_premium ? 'Unlocked' : 'Free'}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))
        )}

        {/* Unlock Section */}
        {!isVRUnlocked && (
          <View style={styles.unlockSection}>
            <Text style={styles.unlockTitle}>Unlock VR Experience</Text>
            <Text style={styles.unlockDesc}>
              Purchase an access code at the castle ticket booth or use an existing code to unlock all VR content.
            </Text>
            <Pressable style={styles.unlockButton} onPress={() => setShowRedeemModal(true)}>
              <Ionicons name="key" size={20} color="#fff" />
              <Text style={styles.unlockButtonText}>Enter Access Code</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Redeem Code Modal */}
      <Modal visible={showRedeemModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter Access Code</Text>
              <Pressable onPress={() => setShowRedeemModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </Pressable>
            </View>
            <Text style={styles.modalDesc}>
              Enter your VR Experience access code purchased at the castle ticket booth.
            </Text>
            <TextInput
              style={styles.codeInput}
              value={redeemCode}
              onChangeText={setRedeemCode}
              placeholder="SPIS-XXXX-XXXX"
              placeholderTextColor={Colors.text.light}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Pressable
              style={[styles.redeemButton, redeemLoading && { opacity: 0.6 }]}
              onPress={handleRedeemCode}
              disabled={redeemLoading}
            >
              {redeemLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.redeemButtonText}>Redeem Code</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* VR Player Modal */}
      <Modal visible={showPlayerModal} transparent animationType="fade">
        <View style={styles.playerOverlay}>
          <Pressable style={[styles.playerClose, { top: insets.top + 12 }]} onPress={() => setShowPlayerModal(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          {selectedVR && (
            <View style={styles.playerContent}>
              <Ionicons name="glasses" size={60} color="#D4A017" />
              <Text style={styles.playerTitle}>{selectedVR.title}</Text>
              <Text style={styles.playerDesc}>{selectedVR.description}</Text>
              {selectedVR.video_url ? (
                <Text style={styles.playerHint}>
                  Open in VR headset or use your phone as a viewer
                </Text>
              ) : (
                <View style={styles.playerPlaceholder}>
                  <Ionicons name="cloud-upload" size={36} color={Colors.text.light} />
                  <Text style={styles.playerPlaceholderText}>VR video not yet uploaded</Text>
                  <Text style={styles.playerPlaceholderSub}>Upload via Admin {'\u2192'} VR Content</Text>
                </View>
              )}
            </View>
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

  // Hero
  heroBanner: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 16 },
  heroIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(212,160,23,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  priceTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D4A017', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 14 },
  priceText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Empty state
  emptyCard: { alignItems: 'center', padding: 40, backgroundColor: Colors.white, borderRadius: 16, borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed' },
  emptyText: { fontSize: 16, color: Colors.text.light, marginTop: 10 },
  emptySubtext: { fontSize: 13, color: Colors.text.light, marginTop: 4 },

  // VR Card
  vrCard: { backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden', marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  vrThumb: { width: '100%', height: 160, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  vrThumbImage: { width: '100%', height: '100%' },
  vrThumbPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(212,160,23,0.15)', justifyContent: 'center', alignItems: 'center' },
  lockOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  playOverlay: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  vrInfo: { padding: 16 },
  vrTitle: { fontSize: 17, fontWeight: '700', color: Colors.text.primary },
  vrDesc: { fontSize: 13, color: Colors.text.secondary, marginTop: 4, lineHeight: 20 },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF8E1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 10, alignSelf: 'flex-start' },
  premiumText: { fontSize: 12, fontWeight: '700', color: '#D4A017' },

  // Unlock Section
  unlockSection: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 24, alignItems: 'center', marginTop: 8 },
  unlockTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  unlockDesc: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  unlockButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D4A017', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginTop: 16 },
  unlockButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Redeem Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text.primary },
  modalDesc: { fontSize: 14, color: Colors.text.secondary, lineHeight: 22, marginBottom: 16 },
  codeInput: { backgroundColor: '#F5F5F5', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 16, fontSize: 18, fontWeight: '700', textAlign: 'center', letterSpacing: 2, color: Colors.text.primary, borderWidth: 2, borderColor: Colors.borderLight },
  redeemButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D4A017', borderRadius: 14, paddingVertical: 16, marginTop: 16 },
  redeemButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Player Modal
  playerOverlay: { flex: 1, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  playerClose: { position: 'absolute', right: 16, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  playerContent: { alignItems: 'center', paddingHorizontal: 32 },
  playerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 16, textAlign: 'center' },
  playerDesc: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 10, lineHeight: 22 },
  playerHint: { fontSize: 13, color: '#D4A017', marginTop: 20, textAlign: 'center' },
  playerPlaceholder: { alignItems: 'center', marginTop: 30, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed' },
  playerPlaceholderText: { fontSize: 15, color: 'rgba(255,255,255,0.5)', marginTop: 8 },
  playerPlaceholderSub: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
});
