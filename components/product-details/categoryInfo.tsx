import { SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CategoryInfoProps {
  categoryIcon: string;
  category: string;
  subcategory: string;
  title: string;
}

export default function CategoryInfo({
  categoryIcon,
  category,
  subcategory,
  title
}: CategoryInfoProps) {
  // Theme colors
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'textMuted');

  return (
    <View style={styles.categoryInfo}>
      <Text style={[styles.categoryText, { color: mutedColor }]}>
        {categoryIcon} {category} › {subcategory}
      </Text>
      <Text style={[styles.titleText, { color: textColor }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  categoryInfo: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  categoryText: {
    fontSize: 14,
    marginBottom: SPACING.sm,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '600',
  },
});
