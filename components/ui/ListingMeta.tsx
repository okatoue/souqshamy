import { formatDate } from '@/lib/formatters';
import { COLORS, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface ListingMetaProps {
  location: string;
  createdAt: string;
  layout?: 'inline' | 'stacked';
  style?: ViewStyle;
}

/**
 * Reusable component for displaying listing location and date metadata.
 */
export function ListingMeta({
  location,
  createdAt,
  layout = 'inline',
  style,
}: ListingMetaProps) {
  if (layout === 'stacked') {
    return (
      <View style={style}>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={14} color={COLORS.muted} />
          <Text style={styles.text} numberOfLines={1}>
            {location}
          </Text>
        </View>
        <Text style={styles.dateText}>{formatDate(createdAt)}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.row, style]}>
      <Ionicons name="location-outline" size={14} color={COLORS.muted} />
      <Text style={styles.text}>{location}</Text>
      <Text style={styles.text}>• {formatDate(createdAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    color: COLORS.muted,
    marginLeft: SPACING.xs,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.muted,
  },
});
