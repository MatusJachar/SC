import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const TIP_OPTIONS = [
  { amount: 0.99, label: '0.99€', icon: 'cafe', color: '#8D6E63', desc: 'Buy me a coffee' },
  { amount: 2.99, label: '2.99€', icon: 'beer', color: '#FF9800', desc: 'Buy me a beer' },
  { amount: 4.99, label: '4.99€', icon: 'pizza', color: '#E91E63', desc: 'Buy me a pizza' },
  { amount: 9.99, label: '9.99€', icon: 'heart', color: '#F44336', desc: 'Big support' },
];

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedTip, setSelectedTip] = useState(1);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);

  const handleSendTip = async () => {
    const amount = customAmount ? parseFloat(customAmount) : TIP_OPTIONS[selectedTip].amount;
    if (!amount || amount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }
    setSending(true);
    try {
      let deviceId = await AsyncStorage.getItem('@spis_device_id');
      if (!deviceId) deviceId = `device_${Date.now()}`;
      await axios.post(`${API_BASE_URL}/tips?amount=${amount}&device_id=${deviceId}&message=${encodeURIComponent(message)}`);
      setShowThankYou(true);
    } catch {
      Alert.alert('Error', 'Could not send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (showThankYou) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.thankYouContainer}>
          <View style={styles.heartBg}>
            <Ionicons name="heart" size={50} color="#F44336" />
          </View>
          <Text style={styles.thankYouTitle}>Thank You!</Text>
          <Text style={styles.thankYouText}>
            Your support means the world to me. It helps keep this app running and improving for all Spi{'\u0161'} Castle visitors.
          </Text>
          <Pressable style={styles.backHomeBtn} onPress={() => router.back()}>
            <Ionicons name="home" size={20} color="#fff" />
            <Text style={styles.backHomeBtnText}>Back to Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Support Developer</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {/* Story Section */}
        <View style={styles.storyCard}>
          <View style={styles.devAvatar}>
            <Ionicons name="code-slash" size={28} color="#D4A017" />
          </View>
          <Text style={styles.storyTitle}>Hi there! {'\u{1F44B}'}</Text>
          <Text style={styles.storyText}>
            I'm an independent developer who built this audio guide app to help visitors experience the beauty and history of Spi{'\u0161'} Castle.
          </Text>
          <Text style={styles.storyText}>
            This app was created with passion, hundreds of hours of work, and a genuine love for preserving heritage. If you enjoyed the tour, your support helps me maintain and improve the app for future visitors.
          </Text>
        </View>

        {/* Tip Options */}
        <Text style={styles.sectionLabel}>Choose a tip amount</Text>
        <View style={styles.tipGrid}>
          {TIP_OPTIONS.map((tip, index) => (
            <Pressable
              key={index}
              style={[styles.tipCard, selectedTip === index && { borderColor: tip.color, borderWidth: 2 }]}
              onPress={() => { setSelectedTip(index); setCustomAmount(''); }}
            >
              <View style={[styles.tipIconCircle, { backgroundColor: tip.color + '20' }]}>
                <Ionicons name={tip.icon as any} size={22} color={tip.color} />
              </View>
              <Text style={styles.tipAmount}>{tip.label}</Text>
              <Text style={styles.tipDesc}>{tip.desc}</Text>
            </Pressable>
          ))}
        </View>

        {/* Custom Amount */}
        <Text style={styles.sectionLabel}>Or enter custom amount</Text>
        <TextInput
          style={styles.customInput}
          value={customAmount}
          onChangeText={(t) => { setCustomAmount(t); setSelectedTip(-1); }}
          placeholder="Custom amount in EUR"
          placeholderTextColor={Colors.text.light}
          keyboardType="decimal-pad"
        />

        {/* Optional Message */}
        <Text style={styles.sectionLabel}>Leave a message (optional)</Text>
        <TextInput
          style={[styles.customInput, { height: 80, textAlignVertical: 'top' }]}
          value={message}
          onChangeText={setMessage}
          placeholder="Thank you for the great app!"
          placeholderTextColor={Colors.text.light}
          multiline
        />

        {/* Send Button */}
        <Pressable style={[styles.sendButton, sending && { opacity: 0.6 }]} onPress={handleSendTip} disabled={sending}>
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="heart" size={20} color="#fff" />
              <Text style={styles.sendButtonText}>
                Send {customAmount ? `${customAmount}€` : TIP_OPTIONS[selectedTip]?.label || ''} Tip
              </Text>
            </>
          )}
        </Pressable>

        <Text style={styles.disclaimer}>
          Your tip is a voluntary appreciation. This is processed as a donation record.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  content: { paddingHorizontal: 16 },

  storyCard: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20 },
  devAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(212,160,23,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  storyTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  storyText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22, marginTop: 10 },

  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.text.primary, marginBottom: 10, marginTop: 4 },

  tipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  tipCard: { width: '48%', backgroundColor: Colors.white, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  tipIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  tipAmount: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  tipDesc: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },

  customInput: { backgroundColor: Colors.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.text.primary, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 12 },

  sendButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F44336', borderRadius: 16, paddingVertical: 16, marginTop: 8 },
  sendButtonText: { fontSize: 17, fontWeight: '700', color: '#fff' },

  disclaimer: { fontSize: 11, color: Colors.text.light, textAlign: 'center', marginTop: 12, lineHeight: 16 },

  // Thank You
  thankYouContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  heartBg: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  thankYouTitle: { fontSize: 28, fontWeight: '800', color: Colors.text.primary },
  thankYouText: { fontSize: 15, color: Colors.text.secondary, textAlign: 'center', lineHeight: 24, marginTop: 12 },
  backHomeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D4A017', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginTop: 28 },
  backHomeBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
