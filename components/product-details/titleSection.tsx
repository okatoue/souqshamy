import { ThemedView } from '@/components/themed-view';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRTL } from '@/lib/rtl_context';
import { rtlTextAlign } from '@/lib/rtlStyles';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, StyleSheet, Text, TextInput } from 'react-native';

interface TitleSectionProps {
  title: string;
  setTitle: (title: string) => void;
}

export default function TitleSection({
  title,
  setTitle
}: TitleSectionProps) {
  const { t } = useTranslation();
  const { isRTL } = useRTL();
  // Theme colors
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const inputBg = useThemeColor({}, 'inputBackground');

  return (
    <ThemedView variant="card" style={[styles.section, { borderColor }]}>
      <Text style={[styles.sectionTitle, rtlTextAlign(isRTL), { color: textColor }]}>
        {t('productDetails.title')}
      </Text>
      <TextInput
        style={[styles.titleInput, rtlTextAlign(isRTL), { backgroundColor: inputBg, borderColor, color: textColor }]}
        placeholder={t('productDetails.titlePlaceholder')}
        placeholderTextColor={COLORS.placeholder}
        value={title}
        onChangeText={setTitle}
        returnKeyType="done"
        blurOnSubmit={true}
        onSubmitEditing={Keyboard.dismiss}
        maxLength={100}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.lg,
  },
  titleInput: {
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    fontSize: 16,
    borderWidth: 1,
  },
});
