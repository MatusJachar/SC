import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { useApp } from '../../context/AppContext';
import { ProgressDots } from '../../components/ProgressDots';
import { AudioPlayer } from '../../components/AudioPlayer';

const { height, width } = Dimensions.get('window');

export default function TourStopDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const {
    tourStops,
    selectedLanguage,
    playAudio,
    currentStopId,
    isPlaying,
  } = useApp();

  const sortedStops = useMemo(() => 
    tourStops.filter(s => s.is_active).sort((a, b) => a.stop_number - b.stop_number),
    [tourStops]
  );

  const currentStop = useMemo(() => 
    sortedStops.find(s => s.id === id),
    [sortedStops, id]
  );

  const currentIndex = useMemo(() => 
    sortedStops.findIndex(s => s.id === id),
    [sortedStops, id]
  );

  const translation = useMemo(() => {
    if (!currentStop) return null;
    return currentStop.translations.find(t => t.language_code === selectedLanguage) || currentStop.translations[0];
  }, [currentStop, selectedLanguage]);

  if (!currentStop || !translation) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Stop not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.errorLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handlePlayAudio = () => {
    if (translation.audio_url) {
      playAudio(currentStop.id, translation.audio_url);
    }
  };

  const handleDotPress = (index: number) => {
    const stop = sortedStops[index];
    if (stop) {
      router.replace(`/tour/${stop.id}`);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevStop = sortedStops[currentIndex - 1];
      router.replace(`/tour/${prevStop.id}`);
    }
  };

  const goToNext = () => {
    if (currentIndex < sortedStops.length - 1) {
      const nextStop = sortedStops[currentIndex + 1];
      router.replace(`/tour/${nextStop.id}`);
    }
  };

  const isAudioPlaying = currentStopId === currentStop.id && isPlaying;
  const hasAudio = !!translation.audio_url;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <ImageBackground
          source={{ uri: currentStop.image_url }}
          style={styles.heroImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.7)']}
            style={styles.heroGradient}
          >
            {/* Top controls */}
            <View style={[styles.topControls, { marginTop: insets.top }]}>
              <TouchableOpacity
                style={styles.glassButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color={Colors.white} />
              </TouchableOpacity>
              
              <View style={styles.rightControls}>
                <View style={styles.counterBadge}>
                  <Text style={styles.counterText}>
                    {currentStop.stop_number} / {sortedStops.length}
                  </Text>
                </View>
              </View>
            </View>

            {/* Title on image */}
            <View style={styles.heroTitleContainer}>
              <Text style={styles.heroTitle}>{translation.title}</Text>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Progress dots */}
        <ProgressDots
          total={sortedStops.length}
          current={currentIndex}
          onDotPress={handleDotPress}
        />

        {/* Content */}
        <View style={styles.contentSection}>
          {/* Play Audio button */}
          <TouchableOpacity
            style={[styles.playButton, !hasAudio && styles.playButtonDisabled]}
            onPress={handlePlayAudio}
            activeOpacity={0.9}
            disabled={!hasAudio}
          >
            <Ionicons
              name={isAudioPlaying ? 'pause' : 'play'}
              size={24}
              color={Colors.white}
            />
            <Text style={styles.playButtonText}>
              {!hasAudio ? 'NO AUDIO YET' : isAudioPlaying ? 'PAUSE AUDIO' : 'PLAY AUDIO'}
            </Text>
          </TouchableOpacity>

          {/* About this stop */}
          <View style={styles.aboutSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.goldLine} />
              <Text style={styles.sectionTitle}>ABOUT THIS STOP</Text>
            </View>
            <Text style={styles.description}>{translation.description}</Text>
          </View>

          {/* Navigation buttons */}
          <View style={styles.navButtons}>
            <TouchableOpacity
              style={[
                styles.navButton,
                styles.prevButton,
                currentIndex === 0 && styles.disabledButton,
              ]}
              onPress={goToPrevious}
              disabled={currentIndex === 0}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={currentIndex === 0 ? Colors.stone[400] : Colors.accent}
              />
              <Text style={[
                styles.navButtonText,
                styles.prevButtonText,
                currentIndex === 0 && styles.disabledText,
              ]}>
                Previous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                styles.nextButton,
                currentIndex === sortedStops.length - 1 && styles.disabledNextButton,
              ]}
              onPress={goToNext}
              disabled={currentIndex === sortedStops.length - 1}
            >
              <Text style={[
                styles.navButtonText,
                styles.nextButtonText,
                currentIndex === sortedStops.length - 1 && styles.disabledNextText,
              ]}>
                Next
              </Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={currentIndex === sortedStops.length - 1 ? Colors.stone[400] : Colors.white}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Audio Player */}
      {currentStopId && (
        <AudioPlayer
          stopTitle={translation.title}
          stopNumber={currentStop.stop_number}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 180,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Lato_400Regular',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  errorLink: {
    fontSize: 16,
    fontFamily: 'Lato_700Bold',
    color: Colors.accent,
  },
  heroImage: {
    height: height * 0.45,
    width: '100%',
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  glassButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightControls: {
    flexDirection: 'row',
    gap: 8,
  },
  counterBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  counterText: {
    fontSize: 14,
    fontFamily: 'Lato_700Bold',
    color: Colors.white,
  },
  heroTitleContainer: {
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: 'Cinzel_700Bold',
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  contentSection: {
    padding: 24,
  },
  playButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
  },
  playButtonDisabled: {
    backgroundColor: Colors.stone[400],
  },
  playButtonText: {
    fontSize: 14,
    fontFamily: 'Cinzel_700Bold',
    color: Colors.white,
    letterSpacing: 2,
  },
  aboutSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  goldLine: {
    width: 4,
    height: 24,
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Lato_700Bold',
    color: Colors.accent,
    letterSpacing: 2,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Lato_400Regular',
    color: Colors.text.secondary,
    lineHeight: 26,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  prevButton: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  nextButton: {
    backgroundColor: Colors.accent,
  },
  navButtonText: {
    fontSize: 14,
    fontFamily: 'Lato_700Bold',
  },
  prevButtonText: {
    color: Colors.accent,
  },
  nextButtonText: {
    color: Colors.white,
  },
  disabledButton: {
    borderColor: Colors.stone[300],
    backgroundColor: Colors.stone[100],
  },
  disabledNextButton: {
    backgroundColor: Colors.stone[300],
  },
  disabledText: {
    color: Colors.stone[400],
  },
  disabledNextText: {
    color: Colors.stone[400],
  },
});
