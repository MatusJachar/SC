import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Linking } from 'react-native';
import { AppProvider, useApp } from '../context/AppContext';
import { Colors } from '../constants/colors';

function DeepLinkHandler() {
  const router = useRouter();
  const { tourStops, legends, isLoading } = useApp();

  const handleUrl = async (url: string) => {
    if (!url) return;
    const match = url.match(/spis-castle-audio-guide:\/\/tour\/([A-Z0-9]+)/i);
    if (!match) return;
    const qrCode = match[1];
    if (isLoading) return;
    const allStops = [...tourStops, ...legends];
    const stop = allStops.find(s => s.qr_code_id === qrCode);
    if (stop) {
      router.replace(`/tour/${stop.id}`);
    }
  };

  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (url) handleUrl(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [isLoading, tourStops, legends]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" />
        <DeepLinkHandler />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            animation: 'slide_from_right',
          }}
        />
      </AppProvider>
    </SafeAreaProvider>
  );
}