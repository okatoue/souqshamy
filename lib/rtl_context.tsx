// RTL Context Provider for managing right-to-left layout
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { I18nManager, Alert } from 'react-native';
import * as Updates from 'expo-updates';

import {
  getCurrentLanguage,
  changeLanguage as i18nChangeLanguage,
  isCurrentLanguageRTL,
  needsRestartForRTL,
} from '@/localization';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  setLanguage as saveLanguage,
} from '@/localization/languageDetector';

interface RTLContextType {
  isRTL: boolean;
  language: SupportedLanguage;
  changeLanguage: (language: SupportedLanguage) => Promise<void>;
  supportedLanguages: readonly SupportedLanguage[];
}

const RTLContext = createContext<RTLContextType | undefined>(undefined);

interface RTLProviderProps {
  children: ReactNode;
}

export function RTLProvider({ children }: RTLProviderProps) {
  const [isRTL, setIsRTL] = useState<boolean>(I18nManager.isRTL);
  const [language, setLanguage] = useState<SupportedLanguage>(
    getCurrentLanguage() as SupportedLanguage
  );

  // Initialize RTL state on mount
  useEffect(() => {
    setIsRTL(I18nManager.isRTL);
    setLanguage(getCurrentLanguage() as SupportedLanguage);
  }, []);

  // Handle language change
  const changeLanguage = useCallback(async (newLanguage: SupportedLanguage) => {
    if (!SUPPORTED_LANGUAGES.includes(newLanguage)) {
      console.warn(`Unsupported language: ${newLanguage}`);
      return;
    }

    // Check if restart is needed before changing
    const needsRestart = needsRestartForRTL(newLanguage);

    // Save language preference
    await saveLanguage(newLanguage);

    // Change i18n language (this also configures RTL)
    const requiresRestart = await i18nChangeLanguage(newLanguage);

    // Update local state
    setLanguage(newLanguage);

    // If RTL state changed, notify user about restart requirement
    if (needsRestart || requiresRestart) {
      Alert.alert(
        language === 'ar' ? 'إعادة تشغيل مطلوبة' : 'Restart Required',
        language === 'ar'
          ? 'يجب إعادة تشغيل التطبيق لتطبيق تغييرات اللغة.'
          : 'The app needs to restart to apply language changes.',
        [
          {
            text: language === 'ar' ? 'لاحقاً' : 'Later',
            style: 'cancel',
          },
          {
            text: language === 'ar' ? 'إعادة التشغيل' : 'Restart Now',
            onPress: async () => {
              try {
                // Try to reload the app
                await Updates.reloadAsync();
              } catch (error) {
                // In development, Updates.reloadAsync might not work
                Alert.alert(
                  language === 'ar' ? 'إعادة التشغيل اليدوي' : 'Manual Restart',
                  language === 'ar'
                    ? 'يرجى إغلاق التطبيق وفتحه مرة أخرى لتطبيق التغييرات.'
                    : 'Please close and reopen the app to apply changes.'
                );
              }
            },
          },
        ]
      );
    } else {
      // Update RTL state immediately if no restart needed
      setIsRTL(isCurrentLanguageRTL());
    }
  }, [language]);

  const value: RTLContextType = {
    isRTL,
    language,
    changeLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };

  return <RTLContext.Provider value={value}>{children}</RTLContext.Provider>;
}

/**
 * Hook to access RTL context
 */
export function useRTL(): RTLContextType {
  const context = useContext(RTLContext);

  if (context === undefined) {
    throw new Error('useRTL must be used within an RTLProvider');
  }

  return context;
}

/**
 * Hook to get just the isRTL boolean
 * Use this for simple RTL checks in styles
 */
export function useIsRTL(): boolean {
  const { isRTL } = useRTL();
  return isRTL;
}

/**
 * Hook to get just the current language
 */
export function useLanguage(): SupportedLanguage {
  const { language } = useRTL();
  return language;
}
