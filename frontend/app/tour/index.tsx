import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Colors } from '../../constants/colors';
import { useApp } from '../../context/AppContext';
import { TourStop } from '../../types';

const { width } = Dimensions.get('window');

export default function TourStopListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tourStops, selectedLanguage, currentStopId, isPlaying, loadData, isLoading } = useApp();

  // Load data if not already loaded
  React.useEffect(() => {
    if (tourStops.length === 0) {
      loadData();
    }
  }, []);

  const getTranslation = (stop: TourStop) => {
    return stop.translations.find(t => t.language_code === selectedLanguage) || stop.translations[0];
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  const renderStop = ({ item }: { item: TourStop }) => {
    const translation = getTranslation(item);
    const isCurrentlyPlaying = currentStopId === item.id && isPlaying;

    return (
      <TouchableOpacity
        style={styles.stopCard}
        onPress={() => router.push(`/tour/${item.id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.image_url }}
            style={styles.stopImage}
            contentFit="cover"
          />
          <View style={styles.stopNumberBadge}>
            <Text style={styles.stopNumberText}>{item.stop_number}</Text>
          </View>
          {isCurrentlyPlaying && (
            <View style={styles.playingIndicator}>
              <Ionicons name="musical-notes" size={16} color={Colors.white} />
            </View>
          )}
        </View>
        <View style={styles.stopInfo}>
          <Text style={styles.stopTitle} numberOfLines={2}>
            {translation?.title || 'Untitled'}
          </Text>
          <View style={styles.stopMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={Colors.text.light} />
              <Text style={styles.metaText}>{formatDuration(item.duration_seconds)}</Text>
            </View>
            {translation?.audio_url && (
              <View style={styles.metaItem}>
                <Ionicons name="headset-outline" size={14} color={Colors.accent} />
                <Text style={[styles.metaText, { color: Colors.accent }]}>Audio</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color={Colors.stone[400]} />
      </TouchableOpacity>
    );
  };

  const activeStops = tourStops.filter(s => s.is_active).sort((a, b) => a.stop_number - b.stop_number);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={{ marginTop: 16, color: Colors.text.secondary }}>Loading tour stops...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tour Stops</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tour stops list */}
      <FlatList
        data={activeStops}
        renderItem={renderStop}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={() => (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="map-outline" size={48} color={Colors.stone[400]} />
            <Text style={{ marginTop: 16, color: Colors.text.light, textAlign: 'center' }}>
              No tour stops available yet
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.stone[200],
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.stone[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Cinzel_700Bold',
    color: Colors.text.primary,
  },
  placeholder: {
    width: 44,
  },
  listContent: {
    padding: 16,
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.stone[200],
  },
  imageContainer: {
    position: 'relative',
  },
  stopImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  stopNumberBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  stopNumberText: {
    fontSize: 12,
    fontFamily: 'Lato_700Bold',
    color: Colors.white,
  },
  playingIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopInfo: {
    flex: 1,
    marginLeft: 12,
  },
  stopTitle: {
    fontSize: 16,
    fontFamily: 'Lato_700Bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  stopMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Lato_400Regular',
    color: Colors.text.light,
  },
  separator: {
    height: 12,
  },
});
