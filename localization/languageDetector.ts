// Language detector using expo-localization
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_STORAGE_KEY = '@souqjari/language';

// Supported languages
export const SUPPORTED_LANGUAGES = ['ar', 'en'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Default language
export const DEFAULT_LANGUAGE: SupportedLanguage = 'ar';
export const FALLBACK_LANGUAGE: SupportedLanguage = 'en';

/**
 * Get the device's preferred language that matches our supported languages
 */
export function getDeviceLanguage(): SupportedLanguage {
  // Get device locales
  const locales = Localization.getLocales();

  if (locales && locales.length > 0) {
    // Check if any device locale matches our supported languages
    for (const locale of locales) {
      const languageCode = locale.languageCode?.toLowerCase();
      if (languageCode && SUPPORTED_LANGUAGES.includes(languageCode as SupportedLanguage)) {
        return languageCode as SupportedLanguage;
      }
    }
  }

  // Default to Arabic for Syrian market
  return DEFAULT_LANGUAGE;
}

/**
 * Check if the device prefers RTL layout
 */
export function isDeviceRTL(): boolean {
  return Localization.isRTL;
}

/**
 * Custom language detector for i18next
 */
export const languageDetector = {
  type: 'languageDetector' as const,
  async: true,

  detect: async (callback: (lng: string) => void) => {
    try {
      // First, check for saved language preference
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

      if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage as SupportedLanguage)) {
        callback(savedLanguage);
        return;
      }

      // Fall back to device language detection
      const deviceLanguage = getDeviceLanguage();
      callback(deviceLanguage);
    } catch (error) {
      console.warn('Error detecting language:', error);
      callback(DEFAULT_LANGUAGE);
    }
  },

  init: () => {},

  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      console.warn('Error caching language:', error);
    }
  },
};

/**
 * Get the currently saved language or detect from device
 */
export async function getCurrentLanguage(): Promise<SupportedLanguage> {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage as SupportedLanguage)) {
      return savedLanguage as SupportedLanguage;
    }

    return getDeviceLanguage();
  } catch (error) {
    console.warn('Error getting current language:', error);
    return DEFAULT_LANGUAGE;
  }
}

/**
 * Save language preference
 */
export async function setLanguage(language: SupportedLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn('Error saving language:', error);
  }
}

/**
 * Check if a language requires RTL layout
 */
export function isRTLLanguage(language: string): boolean {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  return rtlLanguages.includes(language.toLowerCase());
}
