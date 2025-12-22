import i18n from 'i18next';
import { initReactI18next, useTranslation as useI18nTranslation } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './en';
import ar from './ar';

// Get device language, defaulting to Arabic if unavailable
const getDeviceLanguage = (): string => {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const languageCode = locales[0].languageCode;
      // Only return 'en' if it's English, otherwise default to 'ar'
      if (languageCode === 'en') {
        return 'en';
      }
    }
  } catch (error) {
    console.warn('Failed to get device language:', error);
  }
  // Default to Arabic
  return 'ar';
};

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLanguage(), // Detected device language
    fallbackLng: 'en', // Fallback to English
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense to prevent issues with React Native
    },
  })
  .then(() => {
    console.log('i18n initialized with language:', i18n.language);
  })
  .catch((error) => {
    console.error('i18n initialization failed:', error);
  });

// Re-export useTranslation for convenience
export const useTranslation = useI18nTranslation;

export default i18n;
