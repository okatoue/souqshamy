import { BORDER_RADIUS, BRAND_COLOR, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

interface SubmitButtonProps {
  onPress: () => void;
  disabled: boolean;
  loading?: boolean;
}

export default function SubmitButton({ onPress, disabled, loading }: SubmitButtonProps) {
  const disabledBg = useThemeColor({}, 'border');

  return (
    <TouchableOpacity
      style={[
        styles.submitButton,
        { backgroundColor: BRAND_COLOR },
        disabled && [styles.submitButtonDisabled, { backgroundColor: disabledBg }]
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {loading ? (
        <ActivityIndicator color="white" size="small" />
      ) : (
        <Text style={styles.submitButtonText}>Post Listing</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  submitButton: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
});
