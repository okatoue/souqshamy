import { useThemeColor } from '@/hooks/use-theme-color';
import { getCategoryInfo } from '@/lib/formatters';
import { getCategoryTranslation, getSubcategoryTranslation } from '@/lib/categoryTranslations';
import { SPACING } from '@/constants/theme';
import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const textColor = useThemeColor({}, 'text');

  // Get icon from the original formatter
  const { categoryIcon } = getCategoryInfo(categoryId, subcategoryId);

  // Get translated category and subcategory names
  const categoryName = getCategoryTranslation(categoryId, t);
  const subcategoryName = subcategoryId ? getSubcategoryTranslation(subcategoryId, t) : '';

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
