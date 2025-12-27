import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/ui/BackButton';
import { SPACING } from '@/constants/theme';
import { useRTL } from '@/lib/rtl_context';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

interface ProductHeaderProps {
  onBack: () => void;
  title?: string;
}

export default function ProductHeader({ onBack, title }: ProductHeaderProps) {
  const { t } = useTranslation();
  const { isRTL } = useRTL();
  const displayTitle = title || t('productDetails.listingDetails');

  return (
    <View style={styles.header}>
      <BackButton variant="arrow" size={24} onPress={onBack} style={styles.backButton} />
      <ThemedText type="title" style={[styles.headerTitle, isRTL && styles.headerTitleRTL]}>
        {displayTitle}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  headerTitleRTL: {
    marginLeft: 0,
    marginRight: SPACING.md,
    textAlign: 'right',
  },
});
