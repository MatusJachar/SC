import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Dimensions, ActivityIndicator, Modal, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, getFullUrl } from '../../constants/api';

const CASTLE_IMAGE = `${API_BASE_URL}/uploads/images/spis_castle_hero.jpg`;

// Key highlights pre každú zastávku (SK + EN)
const HIGHLIGHTS: Record<number, { sk: string[]; en: string[] }> = {
  1:  { sk: ['634 m nad morom', 'Plocha 4 hektáre', 'UNESCO od roku 1993', '9 storočí histórie'],
        en: ['634 m above sea level', 'Area of 4 hectares', 'UNESCO since 1993', '9 centuries of history'] },
  2:  { sk: ['Osídlený od neolitu', 'Keltské osídlenie', 'Prvá písomná zmienka 1249', 'Dynastia Árpádovcov'],
        en: ['Inhabited since Neolithic', 'Celtic settlement', 'First written record 1249', 'Árpád dynasty'] },
  3:  { sk: ['Model má 132 izieb', 'Autor: Adolph Stephanie', 'Požiar roku 1870', 'Národná pamiatka od 1961'],
        en: ['Model has 132 rooms', 'Author: Adolph Stephanie', 'Fire in 1870', 'National monument since 1961'] },
  4:  { sk: ['Hydina, hovädzie, zverina', 'Údenie, solenie, sušenie', 'Recept z 16. storočia', 'Počas pandémií: víno a pivo'],
        en: ['Poultry, beef, game', 'Smoking, salting, drying', 'Recipe from 16th century', 'During pandemics: wine & beer'] },
  5:  { sk: ['UNESCO od roku 1993', 'Kostolík sv. Ducha v Žehre', 'Levoča pridaná roku 2009', 'Oltár Majstra Pavla v Levoči'],
        en: ['UNESCO since 1993', 'Church of Holy Spirit in Žehra', 'Levoča added in 2009', 'Altar of Master Pavol'] },
  6:  { sk: ['Tatársky vpád roku 1241', 'Hrad dobytý nebol', 'Románska brána – najstaršia', 'Zápoľský rod – neskorá gotika'],
        en: ['Tatar invasion 1241', 'Castle was never conquered', 'Romanesque gate – oldest', 'Zápoľský family – late Gothic'] },
  7:  { sk: ['Výška 634 m n.m.', 'Vidieť Vysoké aj Nízke Tatry', 'Dve stredoveké obchodné cesty', 'Spišská Kapitula v dohľade'],
        en: ['Altitude 634 m', 'View of High & Low Tatras', 'Two medieval trade routes', 'Spišská Kapitula visible'] },
  8:  { sk: ['Postavené v 15. storočí', 'Ján Jiskra z Brandýsa', 'Múry 7-9 m vysoké', 'Keltská svätyňa v rohu'],
        en: ['Built in 15th century', 'Jan Jiskra of Brandys', 'Walls 7-9 m high', 'Celtic sanctuary in corner'] },
  9:  { sk: ['Legálna súdna metóda', 'Väzeň priznal z pohľadu na nástroje', 'Tmavá studená pivnica', '10 druhov mučiacich nástrojov'],
        en: ['Legal judicial method', 'Prisoner confessed from sight of tools', 'Dark cold dungeon', '10 types of torture instruments'] },
  10: { sk: ['Druhá románska brána', 'Zápoľský palác – renesancia', 'Prvá veža: Ø 4 m, výška 23 m', 'Padla pre tektonické posuny'],
        en: ['Second Romanesque gate', 'Zápoľský palace – Renaissance', 'First tower: Ø 4 m, height 23 m', 'Fell due to tectonic shifts'] },
  11: { sk: ['Výška veže 19 metrov', 'Postavil vojvoda Koloman', '5 poschodí + suterén', 'Jediný zdroj vody: cisterna'],
        en: ['Tower height 19 meters', 'Built by Duke Koloman', '5 floors + basement', 'Only water source: cistern'] },
  12: { sk: ['1 zo 4 románskych palácov na svete', 'Ďalší je v Merane (Taliansko)', 'Kaplnka sv. Alžbety Uhorskej', '7 románskych okien'],
        en: ['1 of 4 Romanesque palaces in world', 'Another one in Merano (Italy)', 'Chapel of St. Elizabeth', '7 Romanesque windows'] },
  13: { sk: ['Najvyšší bod hradu', 'Výhľad na celé Slovensko', 'Tu sa začal príbeh hradu', '850+ rokov existencie'],
        en: ['Highest point of castle', 'View across all of Slovakia', 'Where the castle story began', '850+ years of existence'] },
  // Legendy
  101:{ sk: ['Odvážny mních', 'Zakázaná láska', 'Hradné múry ako svedkovia', 'Legenda žije dodnes'],
        en: ['Brave monk', 'Forbidden love', 'Castle walls as witnesses', 'Legend lives on today'] },
  102:{ sk: ['Mních Roland', 'Záchrana hradu', 'Statočnosť a viera', 'Historická legenda'],
        en: ['Monk Roland', 'Saving the castle', 'Courage and faith', 'Historical legend'] },
  103:{ sk: ['Duch Spišského hradu', 'Skryté poklady Zápoľskovcov', 'Záhadné zjavenia', 'Tajomstvo hradných pivníc'],
        en: ['Ghost of Spis Castle', 'Hidden Zápoľský treasures', 'Mysterious apparitions', 'Secret of castle cellars'] },
  104:{ sk: ['Cigánska princezná', 'Putovanie a osud', 'Romantická legenda', 'Mágia a predsudky'],
        en: ['Gypsy princess', 'Wandering and fate', 'Romantic legend', 'Magic and prejudice'] },
};

export default function TourDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    tourStops, legends, selectedLanguage, selectedTourType,
    isPlaying, currentStopId, playbackPosition, playbackDuration,
    playAudio, pauseAudio, resumeAudio, skipForward, skipBackward, stopAudio,
  } = useApp();

  // Build ordered list of stops for this tour type
  const TOUR_DEFS: Record<string, { stops: number[]; legends: number[] }> = {
    express:  { stops: [1, 2, 3, 7, 8, 11, 12],              legends: [103] },
    family:   { stops: [1, 2, 4, 8, 9, 11, 12],              legends: [101, 104] },
    complete: { stops: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], legends: [101, 102, 103, 104] },
  };

  const tourDef = TOUR_DEFS[selectedTourType] || TOUR_DEFS.complete;

  const orderedStops = useMemo(() => {
    const tourItems = tourStops
      .filter(s => tourDef.stops.includes(s.stop_number))
      .sort((a, b) => tourDef.stops.indexOf(a.stop_number) - tourDef.stops.indexOf(b.stop_number));
    const legendItems = legends
      .filter(l => tourDef.legends.includes(l.stop_number))
      .sort((a, b) => tourDef.legends.indexOf(a.stop_number) - tourDef.legends.indexOf(b.stop_number));
    return [...tourItems, ...legendItems];
  }, [tourStops, legends, tourDef]);

  const currentIndex = useMemo(() => orderedStops.findIndex(s => s.id === id), [orderedStops, id]);
  const stop = orderedStops[currentIndex];
  const nextStop = currentIndex < orderedStops.length - 1 ? orderedStops[currentIndex + 1] : null;

  const translation = useMemo(() => {
    if (!stop) return null;
    const lang = selectedLanguage;
    const fallback = 'en';
    const content = stop.content?.[lang] || stop.content?.[fallback] || Object.values(stop.content || {})[0] || {};
    const audioUrl = stop.audio?.[lang] || stop.audio?.[fallback] || Object.values(stop.audio || {})[0] || null;
    return {
      title: content?.title || '',
      description: content?.description || '',
      audio_url: audioUrl,
    };
  }, [stop, selectedLanguage]);

  const nextTranslation = useMemo(() => {
    if (!nextStop) return null;
    const lang = selectedLanguage;
    const fallback = 'en';
    const content = nextStop.content?.[lang] || nextStop.content?.[fallback] || Object.values(nextStop.content || {})[0] || {};
    return { title: content?.title || '' };
  }, [nextStop, selectedLanguage]);

  const isCurrentStop = currentStopId === id;
  const hasAudio = !!translation?.audio_url;
  const highlights = HIGHLIGHTS[stop?.stop_number || 0];
  const highlightList = highlights ? (selectedLanguage === 'sk' ? highlights.sk : highlights.en) : [];
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = playbackDuration > 0 ? (playbackPosition / playbackDuration) : 0;

  const handlePlayPause = async () => {
    if (!hasAudio || !translation?.audio_url) return;
    if (isCurrentStop && isPlaying) {
      await pauseAudio();
    } else if (isCurrentStop) {
      await resumeAudio();
    } else {
      await playAudio(id || '', translation.audio_url);
    }
  };

  const handleNextStop = async () => {
    if (!nextStop) return;
    await stopAudio();
    router.replace(`/tour/${nextStop.id}`);
  };

  const handleTourComplete = async () => {
    await stopAudio();
    setShowReview(true);
  };

  if (!stop) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const isLegend = stop.stop_type === 'legend';
  const isLastStop = !nextStop;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerBadge}>
            {isLegend
              ? <><Ionicons name="book" size={12} color={Colors.accent} /><Text style={styles.headerBadgeText}>Legend</Text></>
              : <Text style={styles.headerBadgeText}>Stop {stop.stop_number}</Text>
            }
          </View>
        </View>
        {/* Stop counter */}
        <Text style={styles.stopCounter}>{currentIndex + 1}/{orderedStops.length}</Text>
      </View>

      {/* Hero image */}
      <View style={styles.heroContainer}>
        <Image
          source={{ uri: stop.image_url ? getFullUrl(stop.image_url) : CASTLE_IMAGE }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay} />
        <View style={styles.heroTitleContainer}>
          <Text style={styles.heroTitle} numberOfLines={2}>{translation?.title || 'Tour Stop'}</Text>
        </View>
      </View>

      {/* Description */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={[styles.scrollContentInner, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.description}>{translation?.description || ''}</Text>

        {highlightList.length > 0 && (
          <View style={styles.highlightsContainer}>
            <Text style={styles.highlightsTitle}>🏰 Highlights</Text>
            {highlightList.map((item, i) => (
              <View key={i} style={styles.highlightRow}>
                <View style={styles.highlightDot} />
                <Text style={styles.highlightText}>{item}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Audio Player */}
      {hasAudio && (
        <View style={[styles.audioPlayer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}>
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{isCurrentStop ? formatTime(playbackPosition) : '0:00'}</Text>
            <Text style={styles.timeText}>{isCurrentStop ? formatTime(playbackDuration) : '--:--'}</Text>
          </View>

          {/* Controls row */}
          <View style={styles.controls}>
            <Pressable onPress={skipBackward} style={styles.controlButton}>
              <Ionicons name="play-back" size={24} color={Colors.text.primary} />
            </Pressable>
            <Pressable onPress={handlePlayPause} style={styles.playButton}>
              <Ionicons
                name={isCurrentStop && isPlaying ? 'pause' : 'play'}
                size={28}
                color={Colors.white}
              />
            </Pressable>
            <Pressable onPress={skipForward} style={styles.controlButton}>
              <Ionicons name="play-forward" size={24} color={Colors.text.primary} />
            </Pressable>
          </View>

          {/* Next Stop button */}
          {!isLastStop && (
            <Pressable
              style={({ pressed }) => [styles.nextStopButton, pressed && styles.nextStopButtonPressed]}
              onPress={handleNextStop}
            >
              <View style={styles.nextStopContent}>
                <View style={styles.nextStopTextContainer}>
                  <Text style={styles.nextStopLabel}>Next Stop</Text>
                  <Text style={styles.nextStopTitle} numberOfLines={1}>
                    {nextTranslation?.title || ''}
                  </Text>
                </View>
                <Ionicons name="arrow-forward-circle" size={28} color={Colors.accent} />
              </View>
            </Pressable>
          )}

          {/* Last stop message */}
          {isLastStop && (
            <Pressable
              style={({ pressed }) => [styles.nextStopButton, { backgroundColor: '#F0F8F0' }, pressed && { opacity: 0.8 }]}
              onPress={handleTourComplete}
            >
              <View style={styles.nextStopContent}>
                <View style={styles.nextStopTextContainer}>
                  <Text style={[styles.nextStopLabel, { color: '#4CAF50' }]}>Tour Complete! 🎉</Text>
                  <Text style={[styles.nextStopTitle, { color: '#4CAF50' }]}>Rate your experience</Text>
                </View>
                <Ionicons name="star" size={28} color="#4CAF50" />
              </View>
            </Pressable>
          )}
        </View>
      )}

      {/* No audio */}
      {!hasAudio && (
        <View style={[styles.audioPlayer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}>
          <View style={styles.noAudioRow}>
            <Ionicons name="volume-mute" size={20} color={Colors.text.light} />
            <Text style={styles.noAudioText}>Audio not available for this stop</Text>
          </View>
          {!isLastStop && (
            <Pressable
              style={({ pressed }) => [styles.nextStopButton, pressed && styles.nextStopButtonPressed]}
              onPress={handleNextStop}
            >
              <View style={styles.nextStopContent}>
                <View style={styles.nextStopTextContainer}>
                  <Text style={styles.nextStopLabel}>Next Stop</Text>
                  <Text style={styles.nextStopTitle} numberOfLines={1}>
                    {nextTranslation?.title || ''}
                  </Text>
                </View>
                <Ionicons name="arrow-forward-circle" size={28} color={Colors.accent} />
              </View>
            </Pressable>
          )}
        </View>
      )}

      {/* ===== REVIEW MODAL ===== */}
      <Modal visible={showReview} transparent animationType="fade">
        <View style={styles.reviewOverlay}>
          <View style={styles.reviewCard}>
            {/* Castle icon */}
            <Text style={styles.reviewEmoji}>🏰</Text>
            <Text style={styles.reviewTitle}>Ako sa vám páčil sprievod?</Text>
            <Text style={styles.reviewSubtitle}>How was your experience?</Text>

            {/* Stars */}
            <View style={styles.starsRow}>
              {[1,2,3,4,5].map(star => (
                <Pressable key={star} onPress={() => setRating(star)} style={styles.starBtn}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= rating ? '#FFD700' : '#CCC'}
                  />
                </Pressable>
              ))}
            </View>

            {rating > 0 && (
              <Text style={styles.ratingText}>
                {rating === 5 ? '🎉 Skúsiné!' : rating === 4 ? '😊 Veľmi dobre!' : rating === 3 ? '🙂 Dobre' : rating === 2 ? '😐 Už lepšie' : '🙁 Ospravedlňujeme sa'}
              </Text>
            )}

            {/* Action buttons */}
            <View style={styles.reviewActions}>
              {rating >= 4 && (
                <Pressable
                  style={styles.reviewBtnPrimary}
                  onPress={() => {
                    Linking.openURL('https://play.google.com/store/apps/details?id=com.spiscastle.audioguide');
                    setShowReview(false);
                    router.replace('/');
                  }}
                >
                  <Ionicons name="star" size={18} color="#fff" />
                  <Text style={styles.reviewBtnPrimaryText}>Ohodnōte nás na Google Play</Text>
                </Pressable>
              )}
              <Pressable
                style={styles.reviewBtnSecondary}
                onPress={() => {
                  setShowReview(false);
                  router.replace('/');
                }}
              >
                <Text style={styles.reviewBtnSecondaryText}>
                  {rating > 0 ? 'Pokračovat' : 'Preskočiť'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 6, backgroundColor: Colors.background },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF3CD', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  headerBadgeText: { fontSize: 13, fontWeight: '800', color: Colors.accent },
  stopCounter: { width: 44, textAlign: 'center', fontSize: 12, color: Colors.text.light, fontWeight: '600' },

  // Hero
  heroContainer: { height: 160, position: 'relative', marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  heroTitleContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', lineHeight: 28, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },

  // Content
  scrollContent: { flex: 1 },
  scrollContentInner: { paddingHorizontal: 20, paddingTop: 16 },
  description: { fontSize: 15, color: Colors.text.primary, lineHeight: 24, fontWeight: '400', letterSpacing: 0.2 },

  // Audio player
  audioPlayer: { backgroundColor: Colors.white, paddingTop: 8, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  progressContainer: { height: 3, backgroundColor: '#E8E8E8', borderRadius: 2, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: Colors.accent, borderRadius: 2 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  timeText: { fontSize: 11, color: Colors.text.light },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, paddingVertical: 6 },
  controlButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  playButton: { width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },

  // Next Stop button
  nextStopButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF8E7',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    marginTop: 6, marginBottom: 2,
    borderWidth: 1, borderColor: '#F0E0B0',
  },
  nextStopButtonPressed: { backgroundColor: '#FFF0CC', opacity: 0.9 },
  nextStopContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextStopTextContainer: { flex: 1, marginRight: 8 },
  nextStopLabel: { fontSize: 10, fontWeight: '700', color: Colors.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  nextStopTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.primary, marginTop: 1 },

  // No audio
  noAudioRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  noAudioText: { fontSize: 13, color: Colors.text.light },

  // Review Modal
  reviewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  reviewCard: { backgroundColor: '#fff', borderRadius: 24, padding: 28, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  reviewEmoji: { fontSize: 52, marginBottom: 12 },
  reviewTitle: { fontSize: 20, fontWeight: '800', color: Colors.text.primary, textAlign: 'center', marginBottom: 4 },
  reviewSubtitle: { fontSize: 14, color: Colors.text.light, textAlign: 'center', marginBottom: 20 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  starBtn: { padding: 4 },
  ratingText: { fontSize: 16, fontWeight: '700', color: Colors.accent, marginBottom: 20 },
  reviewActions: { width: '100%', gap: 10, marginTop: 8 },
  reviewBtnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20 },
  reviewBtnPrimaryText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  reviewBtnSecondary: { alignItems: 'center', paddingVertical: 12 },
  reviewBtnSecondaryText: { fontSize: 14, color: Colors.text.light, fontWeight: '600' },

  // Highlights
  highlightsContainer: { marginTop: 20, backgroundColor: '#FFF8E7', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F0E0B0' },
  highlightsTitle: { fontSize: 13, fontWeight: '800', color: Colors.accent, marginBottom: 10, letterSpacing: 0.5 },
  highlightRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  highlightDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent, marginRight: 10 },
  highlightText: { fontSize: 14, color: Colors.text.primary, fontWeight: '500', flex: 1 },
});
