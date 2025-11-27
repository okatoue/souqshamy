import { useThemeColor } from '@/hooks/use-theme-color';
import { getCategoryInfo } from '@/lib/formatters';
import { SPACING } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CategoryBadgeProps {
  categoryId: number;
  subcategoryId?: number;
  showSubcategory?: boolean;
}

/**
 * Reusable component for displaying category information with icon.
 */
export function CategoryBadge({
  categoryId,
  subcategoryId,
  showSubcategory = true,
}: CategoryBadgeProps) {
  const textColor = useThemeColor({}, 'text');

  const { categoryIcon, categoryName, subcategoryName } = getCategoryInfo(
    categoryId,
    subcategoryId
  );

  const displayText = showSubcategory && subcategoryName
    ? `${categoryName} › ${subcategoryName}`
    : categoryName;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{categoryIcon}</Text>
      <Text
        style={[styles.text, { color: textColor }]}
        numberOfLines={1}
      >
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  icon: {
    fontSize: 12,
    marginRight: SPACING.xs,
  },
  text: {
    fontSize: 12,
    opacity: 0.7,
    flex: 1,
  },
});
