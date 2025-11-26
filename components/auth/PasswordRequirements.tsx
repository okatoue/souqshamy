// components/auth/PasswordRequirements.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AUTH_COLORS, isSmallScreen } from './constants';
import { authStyles } from './styles';

interface Requirement {
  label: string;
  met: boolean;
}

interface PasswordRequirementsProps {
  password: string;
  confirmPassword?: string;
  showMatch?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PasswordRequirements({
  password,
  confirmPassword = '',
  showMatch = true,
  style,
}: PasswordRequirementsProps) {
  const requirements: Requirement[] = [
    {
      label: 'Be at least 6 characters',
      met: password.length >= 6,
    },
  ];

  if (showMatch) {
    requirements.push({
      label: 'Passwords match',
      met: password === confirmPassword && password.length > 0,
    });
  }

  return (
    <View style={[authStyles.card, styles.container, style]}>
      <Text style={styles.title}>Password must:</Text>
      {requirements.map((req, index) => (
        <View key={index} style={styles.item}>
          <Ionicons
            name={req.met ? 'checkmark-circle' : 'ellipse-outline'}
            size={16}
            color={req.met ? AUTH_COLORS.success : AUTH_COLORS.textMuted}
          />
          <Text style={[styles.text, req.met && styles.textMet]}>{req.label}</Text>
        </View>
      ))}
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
    color: AUTH_COLORS.textSecondary,
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
    color: AUTH_COLORS.textMuted,
  },
  textMet: {
    color: AUTH_COLORS.success,
  },
});
