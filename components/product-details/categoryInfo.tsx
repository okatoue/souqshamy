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
  return (
    <View style={styles.categoryInfo}>
      <Text style={styles.categoryText}>
        {categoryIcon} {category} › {subcategory}
      </Text>
      <Text style={styles.titleText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  categoryInfo: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  categoryText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
});