import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Modal, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../constants/api';

const HIGHLIGHTS: Record<number, { sk: string[]; en: string[] }> = {
  1:  { sk: ['634 m nad morom', 'Plocha 4 hektare', 'UNESCO od roku 1993', '9 storoci historie'],
        en: ['634 m above sea level', 'Area of 4 hectares', 'UNESCO since 1993', '9 centuries of history'] },
  2:  { sk: ['Osidleny od neolitu', 'Keltske osidlenie', 'Prva pisomna zmienka 1249', 'Dynastia Arpadovcov'],
        en: ['Inhabited since Neolithic', 'Celtic settlement', 'First written record 1249', 'Arpad dynasty'] },
  3:  { sk: ['Model ma 132 izieb', 'Autor: Adolph Stephanie', 'Poziar roku 1870', 'Narodna pamiatka od 1961'],
        en: ['Model has 132 rooms', 'Author: Adolph Stephanie', 'Fire in 1870', 'National monument since 1961'] },
  4:  { sk: ['Hydina, hovadzie, zverina', 'Udenie, solenie, susenie', 'Recept z 16. storoci', 'Pocas pandemii: vino a pivo'],
        en: ['Poultry, beef, game', 'Smoking, salting, drying', 'Recipe from 16th century', 'During pandemics: wine & beer'] },
  5:  { sk: ['UNESCO od roku 1993', 'Kostolk sv. Ducha v Zehre', 'Levoca pridana roku 2009', 'Oltar Majstra Pavla v Levoci'],
        en: ['UNESCO since 1993', 'Church of Holy Spirit in Zehra', 'Levoca added in 2009', 'Altar of Master Pavol'] },
  6:  { sk: ['Tatarsky vpad roku 1241', 'Hrad dobity nebol', 'Romanska brana - najstarsie', 'Zapolsky rod - nesroka gotika'],
        en: ['Tatar invasion 1241', 'Castle was never conquered', 'Romanesque gate - oldest', 'Zapolsky family - late Gothic'] },
  7:  { sk: ['Vyska 634 m n.m.', 'Vidies Vysoke aj Nizke Tatry', 'Dve stredoveke obchodne cesty', 'Spisska Kapitula v dohliade'],
        en: ['Altitude 634 m', 'View of High & Low Tatras', 'Two medieval trade routes', 'Spisska Kapitula visible'] },
  8:  { sk: ['Postavene v 15. storoci', 'Jan Jiskra z Brandysa', 'Mury 7-9 m vysoke', 'Keltska sviatynia v rohu'],
        en: ['Built in 15th century', 'Jan Jiskra of Brandys', 'Walls 7-9 m high', 'Celtic sanctuary in corner'] },
  9:  { sk: ['Legalna sudna metoda', 'Vazen priznal z pohladu na nastroje', 'Tmava studena pivnica', '10 druhov muciacich nastrojov'],
        en: ['Legal judicial method', 'Prisoner confessed from sight of tools', 'Dark cold dungeon', '10 types of torture instruments'] },
  10: { sk: ['Druha romanska brana', 'Zapolsky palac - renesancia', 'Prva veza: 4 m, vyska 23 m', 'Padla pre tektonicke posuny'],
        en: ['Second Romanesque gate', 'Zapolsky palace - Renaissance', 'First tower: 4 m, height 23 m', 'Fell due to tectonic shifts'] },
  11: { sk: ['Vyska veze 19 metrov', 'Postavil vojvoda Koloman', '5 poschodov + sutren', 'Jediny zdroj vody: cisterna'],
        en: ['Tower height 19 meters', 'Built by Duke Koloman', '5 floors + basement', 'Only water source: cistern'] },
  12: { sk: ['1 zo 4 romanskych palacov na svete', 'Dalsi je v Merane (Taliansko)', 'Kaplnka sv. Alzbety Uhorskej', '7 romanskych okien'],
        en: ['1 of 4 Romanesque palaces in world', 'Another one in Merano (Italy)', 'Chapel of St. Elizabeth', '7 Romanesque windows'] },
  13: { sk: ['Najvyssi bod hradu', 'Vyhlad na cele Slovensko', 'Tu sa zacal pribeh hradu', '850+ rokov existencie'],
        en: ['Highest point of castle', 'View across all of Slovakia', 'Where the castle story began', '850+ years of existence'] },
  101:{ sk: ['Odvazny mnich', 'Zakazana laska', 'Hradne mury ako svedkovia', 'Legenda zije dodnes'],
        en: ['Brave monk', 'Forbidden love', 'Castle walls as witnesses', 'Legend lives on today'] },
  102:{ sk: ['Mnich Roland', 'Zachrana hradu', 'Statocnost a viera', 'Historicka legenda'],
        en: ['Monk Roland', 'Saving the castle', 'Courage and faith', 'Historical legend'] },
  103:{ sk: ['Duch Spiskeho hradu', 'Skryte poklady Zapolskovcov', 'Zahadne zjavenia', 'Tajomstvo hradnych pivnic'],
        en: ['Ghost of Spis Castle', 'Hidden Zapolsky treasures', 'Mysterious apparitions', 'Secret of castle cellars'] },
  104:{ sk: ['Ciganska princezna', 'Putovanie a osud', 'Romanticka legenda', 'Magia a predsudky'],
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
    const t = stop.translations?.find((x: any) => x.language_code === lang)
           || stop.translations?.find((x: any) => x.language_code === fallback)
           || stop.translations?.[0]
           || {};
    return {
      title: t.title || '',
      description: t.description || '',
      audio_url: t.audio_url || null,
    };
  }, [stop, selectedLanguage]);

  const nextTranslation = useMemo(() => {
    if (!nextStop) return null;
    const lang = selectedLanguage;
    const fallback = 'en';
    const t = nextStop.translations?.find((x: any) => x.language_code === lang)
           || nextStop.translations?.find((x: any) => x.language_code === fallback)
           || nextStop.translations?.[0]
           || {};
    return { title: t.title || '' };
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
      const fullAudioUrl = `${API_BASE_URL.replace('/api', '')}${translation.audio_url}`;
      await playAudio(id || '', fullAudioUrl);
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
        <Text style={styles.stopCounter}>{currentIndex + 1}/{orderedStops.length}</Text>
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.titleText} numberOfLines={2}>{translation?.title || 'Tour Stop'}</Text>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={[styles.scrollContentInner, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.description}>{translation?.description || ''}</Text>

        {highlightList.length > 0 && (
          <View style={styles.highlightsContainer}>
            <Text style={styles.highlightsTitle}>Highlights</Text>
            {highlightList.map((item, i) => (
              <View key={i} style={styles.highlightRow}>
                <View style={styles.highlightDot} />
                <Text style={styles.highlightText}>{item}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {hasAudio && (
        <View style={[styles.audioPlayer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{isCurrentStop ? formatTime(playbackPosition) : '0:00'}</Text>
            <Text style={styles.timeText}>{isCurrentStop ? formatTime(playbackDuration) : '--:--'}</Text>
          </View>
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
          {!isLastStop && (
            <Pressable
              style={({ pressed }) => [styles.nextStopButton, pressed && styles.nextStopButtonPressed]}
              onPress={handleNextStop}
            >
              <View style={styles.nextStopContent}>
                <View style={styles.nextStopTextContainer}>
                  <Text style={styles.nextStopLabel}>Next Stop</Text>
                  <Text style={styles.nextStopTitle} numberOfLines={1}>{nextTranslation?.title || ''}</Text>
                </View>
                <Ionicons name="arrow-forward-circle" size={28} color={Colors.accent} />
              </View>
            </Pressable>
          )}
          {isLastStop && (
            <Pressable
              style={({ pressed }) => [styles.nextStopButton, { backgroundColor: '#F0F8F0' }, pressed && { opacity: 0.8 }]}
              onPress={handleTourComplete}
            >
              <View style={styles.nextStopContent}>
                <View style={styles.nextStopTextContainer}>
                  <Text style={[styles.nextStopLabel, { color: '#4CAF50' }]}>Tour Complete!</Text>
                  <Text style={[styles.nextStopTitle, { color: '#4CAF50' }]}>Rate your experience</Text>
                </View>
                <Ionicons name="star" size={28} color="#4CAF50" />
              </View>
            </Pressable>
          )}
        </View>
      )}

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
                  <Text style={styles.nextStopTitle} numberOfLines={1}>{nextTranslation?.title || ''}</Text>
                </View>
                <Ionicons name="arrow-forward-circle" size={28} color={Colors.accent} />
              </View>
            </Pressable>
          )}
        </View>
      )}

      <Modal visible={showReview} transparent animationType="fade">
        <View style={styles.reviewOverlay}>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewTitle}>Ako sa vam pacil sprievod?</Text>
            <Text style={styles.reviewSubtitle}>How was your experience?</Text>
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
                {rating === 5 ? 'Skvelé!' : rating === 4 ? 'Velmi dobre!' : rating === 3 ? 'Dobre' : rating === 2 ? 'Uz lepsie' : 'Ospravedlnujeme sa'}
              </Text>
            )}
            <View style={styles.reviewActions}>
              {rating >= 4 && (
                <Pressable
                  style={styles.reviewBtnPrimary}
                  onPress={() => {
                    Linking.openURL('https://play.google.com/store/apps/details?id=com.castleaudioguide.spisskyhrad');
                    setShowReview(false);
                    router.replace('/');
                  }}
                >
                  <Ionicons name="star" size={18} color="#fff" />
                  <Text style={styles.reviewBtnPrimaryText}>Ohodnodte nas na Google Play</Text>
                </Pressable>
              )}
              <Pressable
                style={styles.reviewBtnSecondary}
                onPress={() => { setShowReview(false); router.replace('/'); }}
              >
                <Text style={styles.reviewBtnSecondaryText}>{rating > 0 ? 'Pokracovat' : 'Preskocit'}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 6, backgroundColor: Colors.background },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF3CD', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  headerBadgeText: { fontSize: 13, fontWeight: '800', color: Colors.accent },
  stopCounter: { width: 44, textAlign: 'center', fontSize: 12, color: Colors.text.light, fontWeight: '600' },
  titleContainer: { marginHorizontal: 16, marginBottom: 4, backgroundColor: Colors.accent, borderRadius: 16, padding: 18, justifyContent: 'center' },
  titleText: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', lineHeight: 28 },
  scrollContent: { flex: 1 },
  scrollContentInner: { paddingHorizontal: 20, paddingTop: 16 },
  description: { fontSize: 15, color: Colors.text.primary, lineHeight: 24, fontWeight: '400', letterSpacing: 0.2 },
  highlightsContainer: { marginTop: 20, backgroundColor: '#FFF8E7', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F0E0B0' },
  highlightsTitle: { fontSize: 13, fontWeight: '800', color: Colors.accent, marginBottom: 10, letterSpacing: 0.5 },
  highlightRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  highlightDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent, marginRight: 10 },
  highlightText: { fontSize: 14, color: Colors.text.primary, fontWeight: '500', flex: 1 },
  audioPlayer: { backgroundColor: Colors.white, paddingTop: 8, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  progressContainer: { height: 3, backgroundColor: '#E8E8E8', borderRadius: 2, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: Colors.accent, borderRadius: 2 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  timeText: { fontSize: 11, color: Colors.text.light },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, paddingVertical: 6 },
  controlButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  playButton: { width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },
  nextStopButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 6, marginBottom: 2, borderWidth: 1, borderColor: '#F0E0B0' },
  nextStopButtonPressed: { backgroundColor: '#FFF0CC', opacity: 0.9 },
  nextStopContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextStopTextContainer: { flex: 1, marginRight: 8 },
  nextStopLabel: { fontSize: 10, fontWeight: '700', color: Colors.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  nextStopTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.primary, marginTop: 1 },
  noAudioRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  noAudioText: { fontSize: 13, color: Colors.text.light },
  reviewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  reviewCard: { backgroundColor: '#fff', borderRadius: 24, padding: 28, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
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
});
