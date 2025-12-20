// components/auth/EmailPhoneDisplay.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BRAND_COLOR, isSmallScreen } from './constants';
import { useAuthColors } from './useAuthStyles';

interface EmailPhoneDisplayProps {
  value: string;
  onChangePress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmailPhoneDisplay({
  value,
  onChangePress,
  style,
}: EmailPhoneDisplayProps) {
  const colors = useAuthColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }, style]}>
      <Ionicons
        name="mail-outline"
        size={18}
        color={colors.textSecondary}
      />
      <Text style={[styles.text, { color: colors.textLabel }]}>{value}</Text>
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
  },
  changeText: {
    fontSize: 14,
    color: BRAND_COLOR,
    fontWeight: '500',
  },
});
