export interface Language {
  id: string;
  code: string;
  name: string;
  native_name: string;
  flag_emoji: string;
  flag_image_url?: string;
  is_active: boolean;
  order: number;
}

export interface Translation {
  language_code: string;
  title: string;
  short_description?: string;
  description: string;
  audio_url: string | null;
  video_url?: string | null;
  vr_url?: string | null;
}

export interface TourStop {
  id: string;
  stop_number: number;
  stop_type: 'tour' | 'legend';
  image_url: string | null;
  gallery_images?: string[];
  translations: Translation[];
  content: Record<string, { title: string; description: string }>;
  audio: Record<string, string>;
  duration_seconds: number;
  ambient_sound_url?: string | null;
  qr_code_id: string;
  gps_latitude?: number | null;
  gps_longitude?: number | null;
  is_active: boolean;
}

export interface SiteSettings {
  id: string;
  site_name: string;
  site_subtitle: string;
  welcome_description: string;
  logo_url: string | null;
  default_hero_image: string;
  primary_color: string;
  secondary_color: string;
  background_ambient_url?: string | null;
  enable_offline_mode: boolean;
  enable_sound_therapy: boolean;
  enable_vr_mode: boolean;
}

export interface SiteInfo {
  id: string;
  language_code: string;
  title: string;
  subtitle?: string;
  description: string;
  short_description?: string;
  hero_image_url?: string | null;
}
