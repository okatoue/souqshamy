import { SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getCategoryTranslation, getSubcategoryTranslation } from '@/lib/categoryTranslations';
import { useRTL } from '@/lib/rtl_context';
import { rtlRow, rtlTextAlign } from '@/lib/rtlStyles';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CategoryInfoProps {
  categoryId: number;
  subcategoryId: number;
  categoryIcon?: string;
  onChangePress: () => void;
}

export default function CategoryInfo({
  categoryId,
  subcategoryId,
  categoryIcon,
  onChangePress
}: CategoryInfoProps) {
  const { t } = useTranslation();
  const { isRTL } = useRTL();
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'textMuted');

  // Get translated category and subcategory names
  const categoryName = getCategoryTranslation(categoryId, t);
  const subcategoryName = getSubcategoryTranslation(subcategoryId, t);

  return (
    <View style={styles.container}>
      <View style={[styles.row, rtlRow(isRTL)]}>
        <Text style={[styles.categoryText, rtlTextAlign(isRTL), { color: textColor }]}>
          {isRTL
            ? `${categoryIcon} ${subcategoryName} ‹ ${categoryName}`
            : `${categoryIcon} ${categoryName} › ${subcategoryName}`
          }
        </Text>
        <TouchableOpacity onPress={onChangePress}>
          <Text style={[styles.changeText, { color: mutedColor }]}>
            {t('productDetails.change')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  changeText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
