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

  useEffect(() => { loadShopData(); }, []);

  const loadShopData = async () => {
    try {
      const [productsRes, settingsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/shop/products`),
        axios.get(`${API_BASE_URL}/shop/settings`),
      ]);
      setProducts(productsRes.data);
      setSettings(settingsRes.data);
    } catch (err) {
      console.error('Error loading shop:', err);
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
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Souvenir Shop</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <Ionicons name="bag-handle" size={36} color={Colors.accent} />
          <Text style={styles.bannerTitle}>{settings?.shop_name || 'Castle Gift Shop'}</Text>
          <Text style={styles.bannerText}>{settings?.shop_description || ''}</Text>
        </View>

        <View style={styles.productsGrid}>
          {products.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productIcon}>
                <Ionicons name={iconMap[product.icon] || 'gift'} size={26} color={Colors.accent} />
              </View>
              <Text style={styles.productName}>{product.name}</Text>
              {product.description ? <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text> : null}
              <Text style={styles.productPrice}>{'\u20AC'}{product.price.toFixed(2)}</Text>
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
  banner: { alignItems: 'center', padding: 24, backgroundColor: Colors.white, borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  bannerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text.primary, marginTop: 10 },
  bannerText: { fontSize: 13, color: Colors.text.secondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  productCard: { width: '47%', backgroundColor: Colors.white, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  productIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF3CD', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  productName: { fontSize: 13, fontWeight: '600', color: Colors.text.primary, textAlign: 'center' },
  productDesc: { fontSize: 11, color: Colors.text.light, textAlign: 'center', marginTop: 3 },
  productPrice: { fontSize: 16, fontWeight: '800', color: Colors.accent, marginTop: 6 },
  infoBox: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  infoContent: { marginLeft: 12, flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: '600', color: Colors.text.primary },
  infoText: { fontSize: 13, color: Colors.text.secondary, marginTop: 3 },
});
