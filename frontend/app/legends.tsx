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
import { Colors } from '../constants/colors';
import { useApp } from '../context/AppContext';
import { TourStop } from '../types';

const { width } = Dimensions.get('window');

export default function LegendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { legends, selectedLanguage, currentStopId, isPlaying, loadData, isLoading } = useApp();

  React.useEffect(() => {
    if (legends.length === 0) {
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

  const activeLegends = legends
    .filter(s => s.is_active && s.stop_type === 'legend')
    .sort((a, b) => a.stop_number - b.stop_number);

  const renderLegend = ({ item }: { item: TourStop }) => {
    const translation = getTranslation(item);
    const isCurrentlyPlaying = currentStopId === item.id && isPlaying;
    const hasAudio = !!translation?.audio_url;

    return (
      <TouchableOpacity
        style={styles.legendCard}
        onPress={() => router.push(`/tour/${item.id}`)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1533679687607-85b38e66c0f3?w=400' }}
          style={styles.legendImage}
          contentFit="cover"
        />
        <View style={styles.legendOverlay}>
          <View style={styles.bookIcon}>
            <Ionicons name="book" size={18} color={Colors.accent} />
          </View>
          {isCurrentlyPlaying && (
            <View style={styles.playingIndicator}>
              <Ionicons name="musical-notes" size={14} color={Colors.white} />
            </View>
          )}
        </View>
        <View style={styles.legendContent}>
          <Text style={styles.legendTitle} numberOfLines={2}>
            {translation?.title || 'Untitled Legend'}
          </Text>
          <Text style={styles.legendDesc} numberOfLines={2}>
            {translation?.short_description || translation?.description?.substring(0, 80) + '...'}
          </Text>
          <View style={styles.legendMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={Colors.gold[500]} />
              <Text style={styles.metaText}>{formatDuration(item.duration_seconds)}</Text>
            </View>
            {hasAudio && (
              <View style={styles.audioBadge}>
                <Ionicons name="headset" size={12} color={Colors.white} />
                <Text style={styles.audioBadgeText}>Audio</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading legends...</Text>
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
          <Ionicons name="book" size={20} color={Colors.accent} />
          <Text style={styles.headerTitle}>Castle Legends</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{activeLegends.length}</Text>
        </View>
      </View>

      {/* Intro text */}
      <View style={styles.introContainer}>
        <Text style={styles.introText}>
          Discover the mysterious legends and stories that have been told about Spišský Hrad for centuries...
        </Text>
      </View>

      {/* Legends list */}
      <FlatList
        data={activeLegends}
        renderItem={renderLegend}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={48} color={Colors.stone[400]} />
            <Text style={styles.emptyText}>No legends available yet</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.stone[900],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.stone[700],
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    color: Colors.white,
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
  introContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  introText: {
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: Colors.stone[400],
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    padding: 16,
  },
  legendCard: {
    backgroundColor: Colors.stone[800],
    borderRadius: 16,
    overflow: 'hidden',
  },
  legendImage: {
    width: '100%',
    height: 160,
  },
  legendOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bookIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendContent: {
    padding: 16,
  },
  legendTitle: {
    fontSize: 18,
    fontFamily: 'Cinzel_700Bold',
    color: Colors.white,
    marginBottom: 8,
  },
  legendDesc: {
    fontSize: 13,
    fontFamily: 'Lato_400Regular',
    color: Colors.stone[400],
    lineHeight: 20,
    marginBottom: 12,
  },
  legendMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Lato_400Regular',
    color: Colors.gold[500],
  },
  audioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  audioBadgeText: {
    fontSize: 11,
    fontFamily: 'Lato_700Bold',
    color: Colors.white,
  },
  separator: {
    height: 16,
  },
  loadingText: {
    marginTop: 16,
    color: Colors.stone[400],
    fontFamily: 'Lato_400Regular',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    color: Colors.stone[500],
    textAlign: 'center',
    fontFamily: 'Lato_400Regular',
  },
});
