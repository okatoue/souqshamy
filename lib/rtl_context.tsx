import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { I18nManager, Alert } from 'react-native';
import i18n from '@/localization';

interface RTLContextType {
  isRTL: boolean;
  currentLanguage: string;
}

const RTLContext = createContext<RTLContextType>({
  isRTL: false,
  currentLanguage: 'ar',
});

interface RTLProviderProps {
  children: ReactNode;
}

export function RTLProvider({ children }: RTLProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'ar');
  const [isRTL, setIsRTL] = useState(i18n.language === 'ar');
  const [initialRTLState] = useState(I18nManager.isRTL);

  // Enable RTL support on mount
  useEffect(() => {
    I18nManager.allowRTL(true);
  }, []);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      const newIsRTL = lng === 'ar';
      setCurrentLanguage(lng);
      setIsRTL(newIsRTL);

      // Force RTL based on language
      I18nManager.forceRTL(newIsRTL);

      // Check if RTL state actually changed (requires app restart)
      if (I18nManager.isRTL !== newIsRTL) {
        Alert.alert(
          'Restart Required',
          'The app needs to restart to apply the language change correctly.',
          [
            {
              text: 'OK',
              style: 'default',
            },
          ]
        );
      }
    };

    // Set initial RTL state
    const initialIsRTL = i18n.language === 'ar';
    if (I18nManager.isRTL !== initialIsRTL) {
      I18nManager.forceRTL(initialIsRTL);
    }

    // Subscribe to language changes
    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [initialRTLState]);

  return (
    <RTLContext.Provider value={{ isRTL, currentLanguage }}>
      {children}
    </RTLContext.Provider>
  );
}

export function useRTL(): RTLContextType {
  const context = useContext(RTLContext);
  if (!context) {
    throw new Error('useRTL must be used within an RTLProvider');
  }
  return context;
}

export default RTLContext;
