import { SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CategoryInfoProps {
  category: string;
  subcategory: string;
  categoryIcon?: string;
  onChangePress: () => void;
}

export default function CategoryInfo({
  category,
  subcategory,
  categoryIcon,
  onChangePress
}: CategoryInfoProps) {
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'textMuted');

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.categoryText, { color: textColor }]}>
          {categoryIcon} {category} › {subcategory}
        </Text>
        <TouchableOpacity onPress={onChangePress}>
          <Text style={[styles.changeText, { color: mutedColor }]}>
            Change
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
