import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, TextInput, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '../../constants/colors';
import { API_BASE_URL } from '../../constants/api';
import { Ionicons } from '@expo/vector-icons';
import { TourStop, Language } from '../../types';

interface SiteSettingsData {
  site_name: string;
  site_subtitle: string;
  welcome_description: string;
  logo_url: string | null;
  default_hero_image: string;
  primary_color: string;
  secondary_color: string;
  admin_password: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tourStops, setTourStops] = useState<TourStop[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [settings, setSettings] = useState<SiteSettingsData | null>(null);
  const [activeTab, setActiveTab] = useState<'stops' | 'settings' | 'languages' | 'shop'>('stops');
  const [editingStop, setEditingStop] = useState<TourStop | null>(null);
  const [editingLang, setEditingLang] = useState<string>('en');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editShortDesc, setEditShortDesc] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Settings editing
  const [editSiteName, setEditSiteName] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editWelcome, setEditWelcome] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Shop management
  const [shopProducts, setShopProducts] = useState<any[]>([]);
  const [shopSettings, setShopSettings] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productIcon, setProductIcon] = useState('gift');
  const [showShopSettingsModal, setShowShopSettingsModal] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopDesc, setShopDesc] = useState('');
  const [shopHours, setShopHours] = useState('');
  const [shopLocation, setShopLocation] = useState('');

  const getAuthHeaders = useCallback(() => {
    return { headers: { Authorization: `Bearer ${token}` } };
  }, [token]);

  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = await AsyncStorage.getItem('adminToken');
      if (!savedToken) {
        router.replace('/admin');
        return;
      }
      setToken(savedToken);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      const auth = { headers: { Authorization: `Bearer ${token}` } };
      const [stopsRes, langsRes, settingsRes, shopProdsRes, shopSettRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/tour-stops`, auth),
        axios.get(`${API_BASE_URL}/admin/languages`, auth),
        axios.get(`${API_BASE_URL}/admin/site-settings`, auth),
        axios.get(`${API_BASE_URL}/admin/shop/products`, auth).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/admin/shop/settings`, auth).catch(() => ({ data: null })),
      ]);
      setTourStops(stopsRes.data);
      setLanguages(langsRes.data);
      setSettings(settingsRes.data);
      setShopProducts(shopProdsRes.data);
      setShopSettings(shopSettRes.data);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openEditStop = (stop: TourStop, langCode: string) => {
    setEditingStop(stop);
    setEditingLang(langCode);
    const trans = stop.translations.find(t => t.language_code === langCode);
    setEditTitle(trans?.title || '');
    setEditDescription(trans?.description || '');
    setEditShortDesc(trans?.short_description || '');
    setShowEditModal(true);
  };

  const saveStopEdit = async () => {
    if (!editingStop || !token) return;
    setSaving(true);
    try {
      const updatedTranslations = editingStop.translations.map(t => {
        if (t.language_code === editingLang) {
          return { ...t, title: editTitle, description: editDescription, short_description: editShortDesc };
        }
        return t;
      });

      // If translation doesn't exist, add it
      if (!updatedTranslations.find(t => t.language_code === editingLang)) {
        updatedTranslations.push({
          language_code: editingLang,
          title: editTitle,
          description: editDescription,
          short_description: editShortDesc,
          audio_url: null,
        });
      }

      await axios.put(
        `${API_BASE_URL}/admin/tour-stops/${editingStop.id}`,
        { translations: updatedTranslations },
        getAuthHeaders()
      );
      setShowEditModal(false);
      loadData();
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  const openSettingsEdit = () => {
    if (settings) {
      setEditSiteName(settings.site_name);
      setEditSubtitle(settings.site_subtitle);
      setEditWelcome(settings.welcome_description);
    }
    setShowSettingsModal(true);
  };

  const saveSettings = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await axios.put(
        `${API_BASE_URL}/admin/site-settings`,
        { site_name: editSiteName, site_subtitle: editSubtitle, welcome_description: editWelcome },
        getAuthHeaders()
      );
      setShowSettingsModal(false);
      loadData();
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const openProductEdit = (product: any) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductDesc(product.description || '');
    setProductPrice(product.price.toString());
    setProductIcon(product.icon || 'gift');
    setShowProductModal(true);
  };

  const openNewProduct = () => {
    setEditingProduct(null);
    setProductName('');
    setProductDesc('');
    setProductPrice('');
    setProductIcon('gift');
    setShowProductModal(true);
  };

  const saveProduct = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const data = { name: productName, description: productDesc, price: parseFloat(productPrice) || 0, icon: productIcon };
      if (editingProduct) {
        await axios.put(`${API_BASE_URL}/admin/shop/products/${editingProduct.id}`, data, getAuthHeaders());
      } else {
        await axios.post(`${API_BASE_URL}/admin/shop/products`, data, getAuthHeaders());
      }
      setShowProductModal(false);
      loadData();
    } catch (err) {
      console.error('Error saving product:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!token) return;
    try {
      await axios.delete(`${API_BASE_URL}/admin/shop/products/${productId}`, getAuthHeaders());
      loadData();
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  const openShopSettings = () => {
    if (shopSettings) {
      setShopName(shopSettings.shop_name || '');
      setShopDesc(shopSettings.shop_description || '');
      setShopHours(shopSettings.opening_hours || '');
      setShopLocation(shopSettings.location || '');
    }
    setShowShopSettingsModal(true);
  };

  const saveShopSettings = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await axios.put(`${API_BASE_URL}/admin/shop/settings`, { shop_name: shopName, shop_description: shopDesc, opening_hours: shopHours, location: shopLocation }, getAuthHeaders());
      setShowShopSettingsModal(false);
      loadData();
    } catch (err) {
      console.error('Error saving shop settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('adminToken');
    router.replace('/admin');
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const tours = tourStops.filter(s => s.stop_type === 'tour');
  const legendsList = tourStops.filter(s => s.stop_type === 'legend');

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out" size={22} color={Colors.error} />
        </Pressable>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
        <View style={styles.tabs}>
          {(['stops', 'settings', 'shop', 'languages'] as const).map(tab => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'stops' ? 'Tour Stops' : tab === 'settings' ? 'Settings' : tab === 'shop' ? 'Shop' : 'Languages'}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentInner} showsVerticalScrollIndicator={false}>
        {/* Tour Stops Tab */}
        {activeTab === 'stops' && (
          <>
            <Text style={styles.sectionTitle}>Tour Stops ({tours.length})</Text>
            {tours.map(stop => {
              const enTrans = stop.translations.find(t => t.language_code === 'en');
              return (
                <View key={stop.id} style={styles.stopCard}>
                  <View style={styles.stopCardHeader}>
                    <View style={styles.stopNum}>
                      <Text style={styles.stopNumText}>{stop.stop_number}</Text>
                    </View>
                    <Text style={styles.stopCardTitle} numberOfLines={1}>{enTrans?.title || 'Stop ' + stop.stop_number}</Text>
                  </View>
                  <Text style={styles.stopCardInfo}>{stop.translations.length} translations | {stop.translations.filter(t => t.audio_url).length} audio</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.langBtns}>
                    {languages.map(lang => (
                      <Pressable
                        key={lang.code}
                        style={[styles.langBtn, stop.translations.find(t => t.language_code === lang.code) ? styles.langBtnActive : {}]}
                        onPress={() => openEditStop(stop, lang.code)}
                      >
                        <Text style={styles.langBtnText}>{lang.flag_emoji} {lang.code.toUpperCase()}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              );
            })}

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Legends ({legendsList.length})</Text>
            {legendsList.map(stop => {
              const enTrans = stop.translations.find(t => t.language_code === 'en');
              return (
                <View key={stop.id} style={styles.stopCard}>
                  <View style={styles.stopCardHeader}>
                    <Ionicons name="book" size={20} color={Colors.accent} />
                    <Text style={styles.stopCardTitle} numberOfLines={1}>{enTrans?.title || 'Legend'}</Text>
                  </View>
                  <Text style={styles.stopCardInfo}>{stop.translations.length} translations</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.langBtns}>
                    {languages.map(lang => (
                      <Pressable
                        key={lang.code}
                        style={[styles.langBtn, stop.translations.find(t => t.language_code === lang.code) ? styles.langBtnActive : {}]}
                        onPress={() => openEditStop(stop, lang.code)}
                      >
                        <Text style={styles.langBtnText}>{lang.flag_emoji} {lang.code.toUpperCase()}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              );
            })}
          </>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && settings && (
          <>
            <View style={styles.settingsCard}>
              <Text style={styles.settingsLabel}>Site Name</Text>
              <Text style={styles.settingsValue}>{settings.site_name}</Text>
              <Text style={styles.settingsLabel}>Subtitle</Text>
              <Text style={styles.settingsValue}>{settings.site_subtitle}</Text>
              <Text style={styles.settingsLabel}>Welcome Description</Text>
              <Text style={styles.settingsValue}>{settings.welcome_description}</Text>
              <Pressable style={styles.editSettingsBtn} onPress={openSettingsEdit}>
                <Ionicons name="create" size={18} color={Colors.black} />
                <Text style={styles.editSettingsBtnText}>Edit Settings</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Languages Tab */}
        {activeTab === 'languages' && (
          <>
            {languages.map(lang => (
              <View key={lang.code} style={styles.langCard}>
                <Text style={styles.langFlag}>{lang.flag_emoji}</Text>
                <View style={styles.langInfo}>
                  <Text style={styles.langName}>{lang.native_name}</Text>
                  <Text style={styles.langCode}>{lang.name} ({lang.code})</Text>
                </View>
                <View style={[styles.statusBadge, lang.is_active ? styles.statusActive : styles.statusInactive]}>
                  <Text style={styles.statusText}>{lang.is_active ? 'Active' : 'Inactive'}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Shop Tab */}
        {activeTab === 'shop' && (
          <>
            <View style={styles.shopHeader}>
              <Text style={styles.sectionTitle}>Shop Settings</Text>
              <Pressable style={styles.editShopBtn} onPress={openShopSettings}>
                <Ionicons name="create" size={16} color={Colors.accent} />
              </Pressable>
            </View>
            {shopSettings && (
              <View style={styles.settingsCard}>
                <Text style={styles.settingsLabel}>Shop Name</Text>
                <Text style={styles.settingsValue}>{shopSettings.shop_name}</Text>
                <Text style={styles.settingsLabel}>Description</Text>
                <Text style={styles.settingsValue}>{shopSettings.shop_description}</Text>
                <Text style={styles.settingsLabel}>Opening Hours</Text>
                <Text style={styles.settingsValue}>{shopSettings.opening_hours}</Text>
              </View>
            )}

            <View style={[styles.shopHeader, { marginTop: 20 }]}>
              <Text style={styles.sectionTitle}>Products ({shopProducts.length})</Text>
              <Pressable style={styles.addProductBtn} onPress={openNewProduct}>
                <Ionicons name="add" size={20} color={Colors.black} />
                <Text style={styles.addProductText}>Add</Text>
              </Pressable>
            </View>
            {shopProducts.map(product => (
              <View key={product.id} style={styles.productAdminCard}>
                <View style={styles.productAdminInfo}>
                  <Text style={styles.productAdminName}>{product.name}</Text>
                  <Text style={styles.productAdminPrice}>{'\u20AC'}{product.price?.toFixed(2)}</Text>
                  {product.description ? <Text style={styles.productAdminDesc} numberOfLines={1}>{product.description}</Text> : null}
                </View>
                <View style={styles.productActions}>
                  <Pressable style={styles.productActionBtn} onPress={() => openProductEdit(product)}>
                    <Ionicons name="create" size={18} color={Colors.accent} />
                  </Pressable>
                  <Pressable style={styles.productActionBtn} onPress={() => deleteProduct(product.id)}>
                    <Ionicons name="trash" size={18} color={Colors.error} />
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Edit Stop Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Translation</Text>
              <Pressable onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={Colors.white} />
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>
              {editingStop?.stop_type === 'legend' ? 'Legend' : `Stop ${editingStop?.stop_number}`} - {editingLang.toUpperCase()}
            </Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.label}>Title</Text>
              <TextInput style={styles.modalInput} value={editTitle} onChangeText={setEditTitle} placeholderTextColor={Colors.text.light} />
              <Text style={styles.label}>Short Description</Text>
              <TextInput style={styles.modalInput} value={editShortDesc} onChangeText={setEditShortDesc} multiline placeholderTextColor={Colors.text.light} />
              <Text style={styles.label}>Full Description</Text>
              <TextInput style={[styles.modalInput, styles.modalTextarea]} value={editDescription} onChangeText={setEditDescription} multiline numberOfLines={8} placeholderTextColor={Colors.text.light} />
            </ScrollView>
            <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={saveStopEdit} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.black} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Settings Edit Modal */}
      <Modal visible={showSettingsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Site Settings</Text>
              <Pressable onPress={() => setShowSettingsModal(false)}>
                <Ionicons name="close" size={24} color={Colors.white} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.label}>Site Name</Text>
              <TextInput style={styles.modalInput} value={editSiteName} onChangeText={setEditSiteName} placeholderTextColor={Colors.text.light} />
              <Text style={styles.label}>Subtitle</Text>
              <TextInput style={styles.modalInput} value={editSubtitle} onChangeText={setEditSubtitle} placeholderTextColor={Colors.text.light} />
              <Text style={styles.label}>Welcome Description</Text>
              <TextInput style={[styles.modalInput, styles.modalTextarea]} value={editWelcome} onChangeText={setEditWelcome} multiline numberOfLines={6} placeholderTextColor={Colors.text.light} />
            </ScrollView>
            <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={saveSettings} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.black} /> : <Text style={styles.saveBtnText}>Save Settings</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Product Edit Modal */}
      <Modal visible={showProductModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProduct ? 'Edit Product' : 'New Product'}</Text>
              <Pressable onPress={() => setShowProductModal(false)}>
                <Ionicons name="close" size={24} color={Colors.white} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.label}>Product Name</Text>
              <TextInput style={styles.modalInput} value={productName} onChangeText={setProductName} placeholderTextColor={Colors.text.light} placeholder="Product name" />
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.modalInput, styles.modalTextarea]} value={productDesc} onChangeText={setProductDesc} multiline placeholderTextColor={Colors.text.light} placeholder="Product description" />
              <Text style={styles.label}>Price (EUR)</Text>
              <TextInput style={styles.modalInput} value={productPrice} onChangeText={setProductPrice} keyboardType="decimal-pad" placeholderTextColor={Colors.text.light} placeholder="0.00" />
              <Text style={styles.label}>Icon (home, shield, book, images, gift, flash, cart)</Text>
              <TextInput style={styles.modalInput} value={productIcon} onChangeText={setProductIcon} placeholderTextColor={Colors.text.light} />
            </ScrollView>
            <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={saveProduct} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.black} /> : <Text style={styles.saveBtnText}>{editingProduct ? 'Update Product' : 'Create Product'}</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Shop Settings Edit Modal */}
      <Modal visible={showShopSettingsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Shop Settings</Text>
              <Pressable onPress={() => setShowShopSettingsModal(false)}>
                <Ionicons name="close" size={24} color={Colors.white} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.label}>Shop Name</Text>
              <TextInput style={styles.modalInput} value={shopName} onChangeText={setShopName} placeholderTextColor={Colors.text.light} />
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.modalInput, styles.modalTextarea]} value={shopDesc} onChangeText={setShopDesc} multiline placeholderTextColor={Colors.text.light} />
              <Text style={styles.label}>Opening Hours</Text>
              <TextInput style={[styles.modalInput, styles.modalTextarea]} value={shopHours} onChangeText={setShopHours} multiline placeholderTextColor={Colors.text.light} />
              <Text style={styles.label}>Location</Text>
              <TextInput style={styles.modalInput} value={shopLocation} onChangeText={setShopLocation} placeholderTextColor={Colors.text.light} />
            </ScrollView>
            <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={saveShopSettings} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.black} /> : <Text style={styles.saveBtnText}>Save Shop Settings</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: Colors.accent },
  logoutBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tabsScroll: { maxHeight: 48, marginBottom: 4 },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.backgroundLight, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.accent },
  tabText: { fontSize: 13, fontWeight: '700', color: Colors.text.secondary },
  tabTextActive: { color: Colors.black },
  scrollContent: { flex: 1 },
  scrollContentInner: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.accent, marginBottom: 12 },
  stopCard: { backgroundColor: Colors.backgroundLight, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  stopCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  stopNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,215,0,0.2)', justifyContent: 'center', alignItems: 'center' },
  stopNumText: { fontSize: 13, fontWeight: '800', color: Colors.accent },
  stopCardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.white },
  stopCardInfo: { fontSize: 12, color: Colors.text.light, marginBottom: 8 },
  langBtns: { flexDirection: 'row' },
  langBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 6, borderWidth: 1, borderColor: Colors.borderLight },
  langBtnActive: { borderColor: Colors.accent, backgroundColor: 'rgba(255,215,0,0.1)' },
  langBtnText: { fontSize: 12, color: Colors.white, fontWeight: '600' },
  settingsCard: { backgroundColor: Colors.backgroundLight, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.borderLight },
  settingsLabel: { fontSize: 12, color: Colors.text.light, marginTop: 12 },
  settingsValue: { fontSize: 15, color: Colors.white, fontWeight: '600', marginTop: 4 },
  editSettingsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 12, marginTop: 20, gap: 8 },
  editSettingsBtnText: { fontSize: 15, fontWeight: '700', color: Colors.black },
  langCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundLight, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.borderLight },
  langFlag: { fontSize: 28, marginRight: 12 },
  langInfo: { flex: 1 },
  langName: { fontSize: 16, fontWeight: '700', color: Colors.white },
  langCode: { fontSize: 12, color: Colors.text.light, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusActive: { backgroundColor: 'rgba(76,175,80,0.2)' },
  statusInactive: { backgroundColor: 'rgba(255,82,82,0.2)' },
  statusText: { fontSize: 12, fontWeight: '700', color: Colors.success },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.accent },
  modalSubtitle: { fontSize: 14, color: Colors.text.secondary, marginBottom: 16 },
  modalScroll: { maxHeight: 400 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary, marginTop: 12, marginBottom: 4 },
  modalInput: { backgroundColor: Colors.backgroundLight, borderRadius: 12, padding: 14, fontSize: 15, color: Colors.white, borderWidth: 1, borderColor: Colors.borderLight },
  modalTextarea: { minHeight: 120, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: Colors.accent, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: Colors.black },
  // Shop admin styles
  shopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  editShopBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,215,0,0.15)', justifyContent: 'center', alignItems: 'center' },
  addProductBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, gap: 4 },
  addProductText: { fontSize: 13, fontWeight: '700', color: Colors.black },
  productAdminCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundLight, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.borderLight },
  productAdminInfo: { flex: 1 },
  productAdminName: { fontSize: 15, fontWeight: '700', color: Colors.white },
  productAdminPrice: { fontSize: 14, fontWeight: '800', color: Colors.accent, marginTop: 2 },
  productAdminDesc: { fontSize: 12, color: Colors.text.light, marginTop: 2 },
  productActions: { flexDirection: 'row', gap: 8 },
  productActionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
});
