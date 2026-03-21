import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '../../constants/colors';
import { API_BASE_URL } from '../../constants/api';
import { Ionicons } from '@expo/vector-icons';

export default function AdminLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [adminCode, setAdminCode] = useState('');

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/admin/login`, { username, password });
      await AsyncStorage.setItem('adminToken', res.data.access_token);
      router.replace('/admin/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username || !password || !adminCode) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/admin/register`, { username, password, admin_code: adminCode });
      await AsyncStorage.setItem('adminToken', res.data.access_token);
      router.replace('/admin/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>

        <View style={styles.header}>
          <Ionicons name="settings" size={48} color={Colors.accent} />
          <Text style={styles.title}>Admin Panel</Text>
          <Text style={styles.subtitle}>{isRegister ? 'Create admin account' : 'Sign in to manage content'}</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor={Colors.text.light}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor={Colors.text.light}
            secureTextEntry
          />

          {isRegister && (
            <>
              <Text style={styles.label}>Admin Code</Text>
              <TextInput
                style={styles.input}
                value={adminCode}
                onChangeText={setAdminCode}
                placeholder="Enter admin registration code"
                placeholderTextColor={Colors.text.light}
                secureTextEntry
              />
            </>
          )}

          <Pressable
            style={({ pressed }) => [styles.loginButton, pressed && styles.loginButtonPressed, loading && styles.loginButtonDisabled]}
            onPress={isRegister ? handleRegister : handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.black} />
            ) : (
              <Text style={styles.loginButtonText}>{isRegister ? 'Register' : 'Sign In'}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => { setIsRegister(!isRegister); setError(''); }}>
            <Text style={styles.switchText}>
              {isRegister ? 'Already have an account? Sign in' : 'Need an account? Register'}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, paddingHorizontal: 24 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', paddingVertical: 24 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.accent, marginTop: 12 },
  subtitle: { fontSize: 14, color: Colors.text.secondary, marginTop: 4 },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,82,82,0.1)', borderRadius: 12, padding: 12, marginBottom: 16, gap: 8 },
  errorText: { color: Colors.error, fontSize: 14 },
  form: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text.secondary, marginTop: 8 },
  input: { backgroundColor: Colors.backgroundLight, borderRadius: 12, padding: 16, fontSize: 16, color: Colors.text.primary, borderWidth: 1, borderColor: Colors.borderLight },
  loginButton: { backgroundColor: Colors.accent, borderRadius: 28, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  loginButtonPressed: { backgroundColor: Colors.accentDark },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: { fontSize: 18, fontWeight: '800', color: Colors.black },
  switchText: { color: Colors.accent, textAlign: 'center', marginTop: 16, fontSize: 14 },
});
