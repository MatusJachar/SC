import Constants from 'expo-constants';

// Get the backend URL from environment or use a fallback
const getApiBaseUrl = () => {
  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
    || process.env.EXPO_PUBLIC_BACKEND_URL;
  if (backendUrl) return `${backendUrl}/api`;
  // Fallback: use window origin in web, localhost in dev
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:8001/api';
};

export const API_BASE_URL = 'http://nrjrc2wkj5nf2s5rmgxngesn.178.104.72.151.sslip.io/api';
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
