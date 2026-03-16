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

  const activeStops = tourStops
    .filter(s => s.is_active && s.stop_type === 'tour')
    .sort((a, b) => a.stop_number - b.stop_number);

  const renderStop = ({ item }: { item: TourStop }) => {
    const translation = getTranslation(item);
    const isCurrentlyPlaying = currentStopId === item.id && isPlaying;
    const hasAudio = !!translation?.audio_url;

    return (
      <TouchableOpacity
        style={styles.stopCard}
        onPress={() => router.push(`/tour/${item.id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=400' }}
            style={styles.stopImage}
            contentFit="cover"
          />
          <View style={styles.stopNumberBadge}>
            <Text style={styles.stopNumberText}>{item.stop_number}</Text>
          </View>
          {isCurrentlyPlaying && (
            <View style={styles.playingIndicator}>
              <Ionicons name="musical-notes" size={14} color={Colors.white} />
            </View>
          )}
        </View>
        <View style={styles.stopInfo}>
          <Text style={styles.stopTitle} numberOfLines={2}>
            {translation?.title || 'Untitled'}
          </Text>
          {translation?.short_description && (
            <Text style={styles.stopShortDesc} numberOfLines={1}>
              {translation.short_description}
            </Text>
          )}
          <View style={styles.stopMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={Colors.text.light} />
              <Text style={styles.metaText}>{formatDuration(item.duration_seconds)}</Text>
            </View>
            {hasAudio && (
              <View style={styles.metaItem}>
                <Ionicons name="headset-outline" size={14} color={Colors.accent} />
                <Text style={[styles.metaText, { color: Colors.accent }]}>Audio</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={22} color={Colors.stone[400]} />
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={{ marginTop: 16, color: Colors.text.secondary, fontFamily: 'Lato_400Regular' }}>
          Loading tour stops...
        </Text>
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
        <View style={styles.headerCenter}>
          <Ionicons name="headset" size={20} color={Colors.accent} />
          <Text style={styles.headerTitle}>Tour Stops</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{activeStops.length}</Text>
        </View>
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
          <View style={styles.emptyContainer}>
            <Ionicons name="map-outline" size={48} color={Colors.stone[400]} />
            <Text style={styles.emptyText}>No tour stops available yet</Text>
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.stone[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Cinzel_700Bold',
    color: Colors.text.primary,
  },
  countBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 13,
    fontFamily: 'Lato_700Bold',
    color: Colors.white,
  },
  listContent: {
    padding: 16,
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.stone[200],
  },
  imageContainer: {
    position: 'relative',
  },
  stopImage: {
    width: 75,
    height: 75,
    borderRadius: 10,
  },
  stopNumberBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  stopNumberText: {
    fontSize: 11,
    fontFamily: 'Lato_700Bold',
    color: Colors.white,
  },
  playingIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopInfo: {
    flex: 1,
    marginLeft: 12,
  },
  stopTitle: {
    fontSize: 15,
    fontFamily: 'Lato_700Bold',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  stopShortDesc: {
    fontSize: 12,
    fontFamily: 'Lato_400Regular',
    color: Colors.text.light,
    marginBottom: 6,
  },
  stopMeta: {
    flexDirection: 'row',
    gap: 14,
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
    height: 10,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    color: Colors.text.light,
    textAlign: 'center',
    fontFamily: 'Lato_400Regular',
  },
});
