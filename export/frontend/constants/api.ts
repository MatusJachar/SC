import Constants from 'expo-constants';

// Get the backend URL from environment or use a fallback
const getApiBaseUrl = () => {
  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
    || process.env.EXPO_PUBLIC_BACKEND_URL
    || 'https://heritage-audio-guide.preview.emergentagent.com';
  return `${backendUrl}/api`;
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  health: '/health',
  languages: '/languages',
  tourStops: '/tour-stops',
  tourStop: (id: string) => `/tour-stops/${id}`,
  siteInfo: (language: string) => `/site-info?language=${language}`,
  siteSettings: '/site-settings',
  offlinePackage: '/offline-package',
  audioFile: (filename: string) => `/uploads/audio/${filename}`,
};

export const getFullUrl = (path: string): string => {
  if (path.startsWith('http')) return path;
  if (path.startsWith('/api')) {
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}${path}`;
  }
  return `${API_BASE_URL}${path}`;
};
