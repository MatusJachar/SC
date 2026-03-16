import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { useApp } from '../context/AppContext';

export default function QRScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getStopByQRCode } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || isProcessing) return;
    
    setIsProcessing(true);
    setScanned(true);
    
    try {
      // Extract QR code ID from URL or use directly
      let qrCodeId = data;
      
      // If it's a URL, extract the code from the path
      if (data.includes('/tour/')) {
        qrCodeId = data.split('/tour/').pop() || data;
      }
      
      const stop = await getStopByQRCode(qrCodeId);
      
      if (stop) {
        router.replace(`/tour/${stop.id}`);
      } else {
        Alert.alert(
          'Unknown QR Code',
          'This QR code is not recognized as a tour stop.',
          [
            { text: 'Try Again', onPress: () => {
              setScanned(false);
              setIsProcessing(false);
            }}
          ]
        );
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert(
        'Error',
        'Failed to process QR code. Please try again.',
        [
          { text: 'OK', onPress: () => {
            setScanned(false);
            setIsProcessing(false);
          }}
        ]
      );
    }
  };

  if (!permission) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <View style={styles.permissionCard}>
          <Ionicons name="camera" size={48} color={Colors.accent} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionDesc}>
            To scan QR codes at tour stops, we need access to your camera.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        {/* Overlay */}
        <View style={[styles.overlay, { paddingTop: insets.top }]}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <Ionicons name="close" size={28} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>Scan QR Code</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Scanner frame */}
          <View style={styles.scannerContainer}>
            <View style={styles.scannerFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <View style={styles.instructionCard}>
              <Ionicons name="qr-code" size={24} color={Colors.accent} />
              <Text style={styles.instructionText}>
                Point your camera at a QR code placed at any tour stop
              </Text>
            </View>
            
            {scanned && (
              <TouchableOpacity
                style={styles.scanAgainButton}
                onPress={() => {
                  setScanned(false);
                  setIsProcessing(false);
                }}
              >
                <Ionicons name="refresh" size={20} color={Colors.white} />
                <Text style={styles.scanAgainText}>Tap to Scan Again</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontFamily: 'Lato_700Bold',
    color: Colors.white,
  },
  placeholder: {
    width: 44,
  },
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.accent,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructionsContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  instructionCard: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: Colors.white,
    lineHeight: 20,
  },
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 8,
  },
  scanAgainText: {
    fontSize: 14,
    fontFamily: 'Lato_700Bold',
    color: Colors.white,
  },
  permissionCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 32,
    margin: 24,
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 20,
    fontFamily: 'Cinzel_700Bold',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  permissionDesc: {
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 14,
    fontFamily: 'Lato_700Bold',
    color: Colors.white,
  },
  backLink: {
    marginTop: 16,
  },
  backLinkText: {
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: Colors.accent,
  },
  permissionText: {
    fontSize: 16,
    fontFamily: 'Lato_400Regular',
    color: Colors.white,
  },
});
