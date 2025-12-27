import { useRTL } from '@/lib/rtl_context';
import { useTranslation } from '@/localization';
import i18n from '@/localization';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { currentLanguage } = useRTL();
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  const handleLanguageChange = async (lang: 'ar' | 'en') => {
    if (lang !== currentLanguage) {
      await i18n.changeLanguage(lang);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.option,
          { borderColor },
          currentLanguage === 'ar' && styles.optionActive,
        ]}
        onPress={() => handleLanguageChange('ar')}
      >
        <Text style={[
          styles.optionText,
          { color: currentLanguage === 'ar' ? '#fff' : textColor }
        ]}>
          العربية
        </Text>
      </Pressable>
      <Pressable
        style={[
          styles.option,
          { borderColor },
          currentLanguage === 'en' && styles.optionActive,
        ]}
        onPress={() => handleLanguageChange('en')}
      >
        <Text style={[
          styles.optionText,
          { color: currentLanguage === 'en' ? '#fff' : textColor }
        ]}>
          English
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionActive: {
    backgroundColor: '#18AEF2',
    borderColor: '#18AEF2',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
