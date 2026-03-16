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
  
  // Loading states
  isLoading: boolean;
  loadData: () => Promise<void>;
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
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null);
  
  // Audio state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStopId, setCurrentStopId] = useState<string | null>(null);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);

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
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

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
      const [languagesRes, stopsRes, settingsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}${API_ENDPOINTS.languages}`),
        axios.get(`${API_BASE_URL}${API_ENDPOINTS.tourStops}`),
        axios.get(`${API_BASE_URL}${API_ENDPOINTS.siteSettings}`),
      ]);
      
      console.log('Languages:', languagesRes.data);
      console.log('Tour stops:', stopsRes.data);
      console.log('Site settings:', settingsRes.data);
      
      setLanguages(languagesRes.data);
      setTourStops(stopsRes.data);
      setSiteSettings(settingsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      // Stop existing audio if any
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
    if (sound) {
      await sound.pauseAsync();
    }
  };

  const resumeAudio = async () => {
    if (sound) {
      await sound.playAsync();
    }
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
    if (sound) {
      await sound.setPositionAsync(position);
    }
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

  return (
    <AppContext.Provider
      value={{
        selectedLanguage,
        setSelectedLanguage,
        languages,
        tourStops,
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
        isLoading,
        loadData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
