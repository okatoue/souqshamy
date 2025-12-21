import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/ui/BackButton';
import { SPACING } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface ProductHeaderProps {
  onBack: () => void;
  title?: string;
}

export default function ProductHeader({ onBack, title = 'Product Details' }: ProductHeaderProps) {
  return (
    <View style={styles.header}>
      <BackButton variant="arrow" size={24} onPress={onBack} style={styles.backButton} />
      <ThemedText type="title" style={styles.headerTitle}>
        {title}
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
});
