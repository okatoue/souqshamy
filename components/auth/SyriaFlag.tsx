// components/auth/SyriaFlag.tsx
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AUTH_COLORS } from './constants';

interface SyriaFlagProps {
  showText?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SyriaFlag({ showText = true, style }: SyriaFlagProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.flag}>
        <View style={[styles.stripe, { backgroundColor: '#CE1126' }]} />
        <View style={[styles.stripe, { backgroundColor: '#FFFFFF' }]} />
        <View style={[styles.stripe, { backgroundColor: '#000000' }]} />
      </View>
      {showText && <Text style={styles.text}>Syria (+963)</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  flag: {
    width: 18,
    height: 12,
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: AUTH_COLORS.border,
  },
  stripe: {
    flex: 1,
  },
  text: {
    fontSize: 11,
    color: AUTH_COLORS.textSecondary,
  },
});
