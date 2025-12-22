// i18n configuration and initialization
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import ar from './ar';
import en from './en';
import { languageDetector, isRTLLanguage, DEFAULT_LANGUAGE, FALLBACK_LANGUAGE } from './languageDetector';

// Resources object with all translations
const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

// Initialize i18next
i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: FALLBACK_LANGUAGE,
    defaultNS: 'translation',

    // Language detection options
    detection: {
      order: ['languageDetector'],
    },

    // Interpolation options
    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // React-i18next options
    react: {
      useSuspense: false, // Disable suspense for better compatibility
    },

    // Compatibility options
    compatibilityJSON: 'v4',
  });

/**
 * Configure RTL layout based on current language
 * Note: This requires an app restart to take effect
 */
export function configureRTL(language: string): boolean {
  const shouldBeRTL = isRTLLanguage(language);
  const isCurrentlyRTL = I18nManager.isRTL;

  // Only update if there's a change
  if (shouldBeRTL !== isCurrentlyRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
    return true; // Indicates restart is needed
  }

  return false; // No restart needed
}

/**
 * Check if app restart is required for RTL changes
 */
export function needsRestartForRTL(language: string): boolean {
  const shouldBeRTL = isRTLLanguage(language);
  const isCurrentlyRTL = I18nManager.isRTL;
  return shouldBeRTL !== isCurrentlyRTL;
}

/**
 * Change language and configure RTL
 * Returns true if app restart is needed
 */
export async function changeLanguage(language: string): Promise<boolean> {
  await i18n.changeLanguage(language);
  return configureRTL(language);
}

/**
 * Get the current language
 */
export function getCurrentLanguage(): string {
  return i18n.language || DEFAULT_LANGUAGE;
}

/**
 * Check if current language is RTL
 */
export function isCurrentLanguageRTL(): boolean {
  return isRTLLanguage(getCurrentLanguage());
}

// Export i18n instance and hooks
export { i18n };
export { useTranslation } from 'react-i18next';
export type { TranslationResources } from './types';
export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, FALLBACK_LANGUAGE } from './languageDetector';
