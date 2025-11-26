// components/auth/EmailPhoneDisplay.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AUTH_COLORS, isSmallScreen, BRAND_COLOR } from './constants';
import { authStyles } from './styles';

interface EmailPhoneDisplayProps {
  value: string;
  isPhone?: boolean;
  onChangePress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmailPhoneDisplay({
  value,
  isPhone = false,
  onChangePress,
  style,
}: EmailPhoneDisplayProps) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons
        name={isPhone ? 'call-outline' : 'mail-outline'}
        size={18}
        color={AUTH_COLORS.textSecondary}
      />
      <Text style={styles.text}>{value}</Text>
      {onChangePress && (
        <Pressable onPress={onChangePress} hitSlop={8}>
          <Text style={styles.changeText}>Change</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AUTH_COLORS.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: isSmallScreen ? 16 : 20,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: AUTH_COLORS.textLabel,
  },
  changeText: {
    fontSize: 14,
    color: BRAND_COLOR,
    fontWeight: '500',
  },
});
