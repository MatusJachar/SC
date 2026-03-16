export interface Language {
  code: string;
  name: string;
  native_name: string;
  flag_emoji: string;
  is_active: boolean;
  order: number;
}

export interface Translation {
  language_code: string;
  title: string;
  description: string;
  audio_url: string;
}

export interface TourStop {
  id: string;
  stop_number: number;
  image_url: string;
  translations: Translation[];
  duration_seconds: number;
  is_active: boolean;
}

export interface SiteSettings {
  id: string;
  default_hero_image: string;
  logo_url: string;
  site_name: string;
  site_subtitle: string;
  welcome_description: string;
}

export interface SiteInfo {
  id: string;
  language_code: string;
  title: string;
  description: string;
}
