// components/auth/NoticeBox.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BRAND_COLOR, isSmallScreen } from './constants';

interface NoticeBoxProps {
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

export function NoticeBox({
  message,
  icon = 'information-circle-outline',
  style,
}: NoticeBoxProps) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name={icon} size={20} color={BRAND_COLOR} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${BRAND_COLOR}10`,
    borderRadius: 12,
    padding: 14,
    marginBottom: isSmallScreen ? 16 : 20,
    gap: 10,
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
});
