import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { Colors } from '../../constants/colors';
import { API_BASE_URL } from '../../constants/api';
import { Ionicons } from '@expo/vector-icons';

interface ShopProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  icon: string;
  is_active: boolean;
}

interface ShopSettingsType {
  shop_name: string;
  shop_description: string;
  opening_hours: string;
  location: string;
}

export default function ShopScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [settings, setSettings] = useState<ShopSettingsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShopData();
  }, []);

  const loadShopData = async () => {
    try {
      const [productsRes, settingsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/shop/products`),
        axios.get(`${API_BASE_URL}/shop/settings`),
      ]);
      setProducts(productsRes.data);
      setSettings(settingsRes.data);
    } catch (err) {
      console.error('Error loading shop data:', err);
    } finally {
      setLoading(false);
    }
  };

  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    home: 'home', shield: 'shield', book: 'book', images: 'images',
    magnet: 'magnet', flash: 'flash', gift: 'gift', cart: 'cart',
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Souvenir Shop</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <Ionicons name="bag-handle" size={40} color={Colors.accent} />
          <Text style={styles.bannerTitle}>{settings?.shop_name || 'Castle Gift Shop'}</Text>
          <Text style={styles.bannerText}>{settings?.shop_description || ''}</Text>
        </View>

        <View style={styles.productsGrid}>
          {products.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productIcon}>
                <Ionicons name={iconMap[product.icon] || 'gift'} size={28} color={Colors.accent} />
              </View>
              <Text style={styles.productName}>{product.name}</Text>
              {product.description ? (
                <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text>
              ) : null}
              <Text style={styles.productPrice}>
                {product.currency === 'EUR' ? '\u20AC' : product.currency}{product.price.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {settings?.opening_hours ? (
          <View style={styles.infoBox}>
            <Ionicons name="time" size={20} color={Colors.accent} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Opening Hours</Text>
              {settings.opening_hours.split('\n').map((line, idx) => (
                <Text key={idx} style={styles.infoText}>{line}</Text>
              ))}
            </View>
          </View>
        ) : null}

        {settings?.location ? (
          <View style={[styles.infoBox, { marginTop: 12 }]}>
            <Ionicons name="location" size={20} color={Colors.accent} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Location</Text>
              <Text style={styles.infoText}>{settings.location}</Text>
            </View>
          </View>
        ) : null}
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
  banner: { alignItems: 'center', padding: 24, backgroundColor: Colors.backgroundLight, borderRadius: 20, marginBottom: 20 },
  bannerTitle: { fontSize: 22, fontWeight: '800', color: Colors.white, marginTop: 12 },
  bannerText: { fontSize: 14, color: Colors.text.secondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  productCard: { width: '47%', backgroundColor: Colors.backgroundLight, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.borderLight, alignItems: 'center' },
  productIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,215,0,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  productName: { fontSize: 14, fontWeight: '700', color: Colors.white, textAlign: 'center' },
  productDesc: { fontSize: 11, color: Colors.text.light, textAlign: 'center', marginTop: 4 },
  productPrice: { fontSize: 16, fontWeight: '800', color: Colors.accent, marginTop: 6 },
  infoBox: { flexDirection: 'row', backgroundColor: Colors.backgroundLight, borderRadius: 14, padding: 16, marginTop: 20, borderWidth: 1, borderColor: Colors.borderLight },
  infoContent: { marginLeft: 12, flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: Colors.white },
  infoText: { fontSize: 13, color: Colors.text.light, marginTop: 4 },
});
