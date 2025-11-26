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
        {/* Green stripe - top */}
        <View style={[styles.stripe, { backgroundColor: '#007A3D' }]} />
        {/* White stripe - middle with 3 red stars */}
        <View style={[styles.stripe, styles.whiteStripe]}>
          <View style={styles.starsContainer}>
            <Star />
            <Star />
            <Star />
          </View>
        </View>
        {/* Black stripe - bottom */}
        <View style={[styles.stripe, { backgroundColor: '#000000' }]} />
      </View>
      {showText && <Text style={styles.text}>Syria (+963)</Text>}
    </View>
  );
}

// Simple 5-pointed star component
function Star() {
  return (
    <View style={styles.star}>
      <Text style={styles.starText}>★</Text>
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
  whiteStripe: {
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 1,
  },
  star: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  starText: {
    color: '#CE1126',
    fontSize: 3,
    lineHeight: 4,
  },
  text: {
    fontSize: 11,
    color: AUTH_COLORS.textSecondary,
  },
});