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
