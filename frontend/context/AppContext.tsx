import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS, getFullUrl } from '../constants/api';
import { Language, TourStop, SiteSettings, SiteInfo } from '../types';

interface AppContextType {
  // Language
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  languages: Language[];
  
  // Tour data
  tourStops: TourStop[];
  legends: TourStop[];
  siteSettings: SiteSettings | null;
  siteInfo: SiteInfo | null;
  
  // Audio
  isPlaying: boolean;
  currentStopId: string | null;
  playbackPosition: number;
  playbackDuration: number;
  playAudio: (stopId: string, audioUrl: string) => Promise<void>;
  pauseAudio: () => Promise<void>;
  resumeAudio: () => Promise<void>;
  stopAudio: () => Promise<void>;
  seekAudio: (position: number) => Promise<void>;
  skipForward: () => Promise<void>;
  skipBackward: () => Promise<void>;
  
  // Ambient sound
  isAmbientPlaying: boolean;
  playAmbientSound: (url: string) => Promise<void>;
  stopAmbientSound: () => Promise<void>;
  toggleAmbientSound: () => Promise<void>;
  
  // Loading states
  isLoading: boolean;
  loadData: () => Promise<void>;
  
  // Offline
  isOfflineMode: boolean;
  setOfflineMode: (offline: boolean) => void;
  
  // Tour type
  selectedTourType: string;
  setSelectedTourType: (type: string) => void;
  
  // QR Code
  getStopByQRCode: (qrCode: string) => Promise<TourStop | null>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Language state
  const [selectedLanguage, setSelectedLanguageState] = useState<string>('sk');
  const [languages, setLanguages] = useState<Language[]>([]);
  
  // Tour data
  const [tourStops, setTourStops] = useState<TourStop[]>([]);
  const [legends, setLegends] = useState<TourStop[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null);
  
  // Tour type
  const [selectedTourType, setSelectedTourType] = useState<string>('complete');
  
  // Main audio state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStopId, setCurrentStopId] = useState<string | null>(null);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  
  // Ambient sound state
  const [ambientSound, setAmbientSound] = useState<Audio.Sound | null>(null);
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Offline mode
  const [isOfflineMode, setOfflineMode] = useState(false);

  // Load saved language on mount
  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem('selectedLanguage');
        if (saved) {
          setSelectedLanguageState(saved);
        }
      } catch (error) {
        console.error('Error loading saved language:', error);
      }
    };
    loadSavedLanguage();
  }, []);

  // Set up audio mode
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.error('Error setting up audio:', error);
      }
    };
    setupAudio();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
      if (ambientSound) ambientSound.unloadAsync();
    };
  }, [sound, ambientSound]);
    // Load data on mount 
  useEffect(() => {
    loadData();
  }, []);

  const setSelectedLanguage = async (lang: string) => {
    setSelectedLanguageState(lang);
    try {
      await AsyncStorage.setItem('selectedLanguage', lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('Loading data from:', API_BASE_URL);
      
      // Always clear old cache to ensure fresh data
      await AsyncStorage.removeItem('offlineData');
      
      // Try to load from offline cache first if in offline mode
      if (isOfflineMode) {
        const cached = await AsyncStorage.getItem('offlineData');
        if (cached) {
          const data = JSON.parse(cached);
          setLanguages(data.languages || []);
          const allStops = data.tour_stops || [];
          setTourStops(allStops.filter((s: TourStop) => s.stop_type === 'tour'));
          setLegends(allStops.filter((s: TourStop) => s.stop_type === 'legend'));
          setSiteSettings(data.settings);
          setIsLoading(false);
          return;
        }
      }
      
      const [stopsRes, settingsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}${API_ENDPOINTS.tourStops}`),
        axios.get(`${API_BASE_URL}${API_ENDPOINTS.siteSettings}`),
      ]);

      // TRANSFORMÁCIA: translations[] → content{} + audio{}
      const rawStops = stopsRes.data || [];
      const transformedStops = rawStops.map((stop: any) => {
        const content: Record<string, any> = {};
        const audio: Record<string, string> = {};
        (stop.translations || []).forEach((t: any) => {
          content[t.language_code] = {
            title: t.title,
            description: t.description,
            short_description: t.short_description || t.description,
          };
          if (t.audio_url) {
            const rawUrl = t.audio_url;
            let fullAudioUrl: string;
            if (rawUrl.startsWith('http')) {
              fullAudioUrl = rawUrl;
            } else if (rawUrl.startsWith('/api/')) {
              // Remove /api prefix since API_BASE_URL already includes /api
              const baseUrl = API_BASE_URL.replace('/api', '');
              fullAudioUrl = `${baseUrl}${rawUrl}`;
            } else {
              fullAudioUrl = `${API_BASE_URL}${rawUrl}`;
            }
            audio[t.language_code] = fullAudioUrl;
          }
        });
        return { ...stop, content, audio };
      });

      // Uložiť do state
      setTourStops(transformedStops.filter((s: any) => s.stop_type === 'tour'));
      setLegends(transformedStops.filter((s: any) => s.stop_type === 'legend'));
      setSiteSettings(settingsRes.data);

      // Extract languages from first stop's content
      const firstStop = transformedStops[0];
      console.log('First stop content:', firstStop?.content);
      const languageCodes = firstStop?.content ? Object.keys(firstStop.content) : [];
      console.log('Language codes:', languageCodes);
      const langs = languageCodes.map(code => ({
        code,
        name: code === 'sk' ? 'Slovak' : code === 'en' ? 'English' : code === 'de' ? 'German' : code === 'pl' ? 'Polish' : code === 'hu' ? 'Hungarian' : code === 'ru' ? 'Russian' : code === 'es' ? 'Spanish' : code === 'zh' ? 'Chinese' : code === 'fr' ? 'French' : code,
        native_name: code === 'sk' ? 'Slovensky' : code === 'en' ? 'English' : code === 'de' ? 'Deutsch' : code === 'pl' ? 'Polski' : code === 'hu' ? 'Magyar' : code === 'ru' ? 'Русский' : code === 'es' ? 'Español' : code === 'zh' ? '中文' : code === 'fr' ? 'Français' : code,
        flag_emoji: code === 'sk' ? '🇸🇰' : code === 'en' ? '🇬🇧' : code === 'de' ? '🇩🇪' : code === 'pl' ? '🇵🇱' : code === 'hu' ? '🇭🇺' : code === 'ru' ? '🇷🇺' : code === 'es' ? '🇪🇸' : code === 'zh' ? '🇨🇳' : code === 'fr' ? '🇫🇷' : '🏳️',
        is_active: true,
        order: 1
      }));
      console.log('Generated languages:', langs);
      setLanguages(langs);
      
      // Cache for offline use
      try {
        const offlinePackage = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.offlinePackage}`);
        await AsyncStorage.setItem('offlineData', JSON.stringify(offlinePackage.data));
      } catch (e) {
        console.log('Could not cache offline data:', e);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      // Try offline cache on error
      try {
        const cached = await AsyncStorage.getItem('offlineData');
        if (cached) {
          const data = JSON.parse(cached);
          setLanguages(data.languages || []);
          const allStops = data.tour_stops || [];
          setTourStops(allStops.filter((s: TourStop) => s.stop_type === 'tour'));
          setLegends(allStops.filter((s: TourStop) => s.stop_type === 'legend'));
          setSiteSettings(data.settings);
        }
      } catch (e) {
        console.error('Could not load offline data:', e);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isOfflineMode]);

  // Load site info when language changes
  useEffect(() => {
    const loadSiteInfo = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.siteInfo(selectedLanguage)}`);
        setSiteInfo(res.data);
      } catch (error) {
        console.error('Error loading site info:', error);
      }
    };
    if (selectedLanguage) {
      loadSiteInfo();
    }
  }, [selectedLanguage]);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis);
      setPlaybackDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setCurrentStopId(null);
      }
    }
  };

  const playAudio = async (stopId: string, audioUrl: string) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }
      
      const fullUrl = getFullUrl(audioUrl);
      console.log('Playing audio from:', fullUrl);
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: fullUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      
      setSound(newSound);
      setCurrentStopId(stopId);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const pauseAudio = async () => {
    if (sound) await sound.pauseAsync();
  };

  const resumeAudio = async () => {
    if (sound) await sound.playAsync();
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setCurrentStopId(null);
      setIsPlaying(false);
      setPlaybackPosition(0);
      setPlaybackDuration(0);
    }
  };

  const seekAudio = async (position: number) => {
    if (sound) await sound.setPositionAsync(position);
  };

  const skipForward = async () => {
    if (sound) {
      const newPosition = Math.min(playbackPosition + 15000, playbackDuration);
      await sound.setPositionAsync(newPosition);
    }
  };

  const skipBackward = async () => {
    if (sound) {
      const newPosition = Math.max(playbackPosition - 15000, 0);
      await sound.setPositionAsync(newPosition);
    }
  };

  // Ambient sound controls
  const playAmbientSound = async (url: string) => {
    try {
      if (ambientSound) {
        await ambientSound.unloadAsync();
      }
      
      const fullUrl = getFullUrl(url);
      const { sound: newAmbient } = await Audio.Sound.createAsync(
        { uri: fullUrl },
        { shouldPlay: true, isLooping: true, volume: 0.3 }
      );
      
      setAmbientSound(newAmbient);
      setIsAmbientPlaying(true);
    } catch (error) {
      console.error('Error playing ambient sound:', error);
    }
  };

  const stopAmbientSound = async () => {
    if (ambientSound) {
      await ambientSound.stopAsync();
      await ambientSound.unloadAsync();
      setAmbientSound(null);
      setIsAmbientPlaying(false);
    }
  };

  const toggleAmbientSound = async () => {
    if (isAmbientPlaying && ambientSound) {
      await ambientSound.pauseAsync();
      setIsAmbientPlaying(false);
    } else if (ambientSound) {
      await ambientSound.playAsync();
      setIsAmbientPlaying(true);
    }
  };

  // QR Code lookup
  const getStopByQRCode = async (qrCode: string): Promise<TourStop | null> => {
    try {
      const res = await axios.get(`${API_BASE_URL}/tour-stops/qr/${qrCode}`);
      return res.data;
    } catch (error) {
      console.error('Error getting stop by QR:', error);
      return null;
    }
  };

  return (
    <AppContext.Provider
      value={{
        selectedLanguage,
        setSelectedLanguage,
        languages,
        tourStops,
        legends,
        siteSettings,
        siteInfo,
        isPlaying,
        currentStopId,
        playbackPosition,
        playbackDuration,
        playAudio,
        pauseAudio,
        resumeAudio,
        stopAudio,
        seekAudio,
        skipForward,
        skipBackward,
        isAmbientPlaying,
        playAmbientSound,
        stopAmbientSound,
        toggleAmbientSound,
        isLoading,
        loadData,
        isOfflineMode,
        setOfflineMode,
        selectedTourType,
        setSelectedTourType,
        getStopByQRCode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
