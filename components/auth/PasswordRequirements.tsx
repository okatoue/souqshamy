// components/auth/PasswordRequirements.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { isSmallScreen } from './constants';
import { useAuthStyles, useAuthColors } from './useAuthStyles';

interface PasswordRequirementsProps {
  password: string;
  style?: StyleProp<ViewStyle>;
}

export function PasswordRequirements({
  password,
  style,
}: PasswordRequirementsProps) {
  const authStyles = useAuthStyles();
  const colors = useAuthColors();

  const meetsLengthRequirement = password.length >= 6;

  return (
    <View style={[authStyles.card, styles.container, style]}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>Password must:</Text>
      <View style={styles.item}>
        <Ionicons
          name={meetsLengthRequirement ? 'checkmark-circle' : 'ellipse-outline'}
          size={16}
          color={meetsLengthRequirement ? colors.success : colors.textMuted}
        />
        <Text style={[styles.text, { color: meetsLengthRequirement ? colors.success : colors.textMuted }]}>
          Be at least 6 characters
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: isSmallScreen ? 16 : 20,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  text: {
    fontSize: 12,
  },
});
