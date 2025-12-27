import i18n from 'i18next';
import { initReactI18next, useTranslation as useI18nTranslation } from 'react-i18next';

import en from './en';
import ar from './ar';

// Always default to Arabic for consistent Arabic-first experience
const getDefaultLanguage = (): string => 'ar';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDefaultLanguage(), // Always Arabic
    fallbackLng: 'ar', // Fallback to Arabic
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense to prevent issues with React Native
    },
  })
  .catch((error) => {
    console.error('i18n initialization failed:', error);
  });

// Re-export useTranslation for convenience
export const useTranslation = useI18nTranslation;

export default i18n;
