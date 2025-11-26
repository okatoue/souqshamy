// components/auth/AuthInput.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { AUTH_COLORS, AUTH_SIZING, AUTH_TYPOGRAPHY } from './constants';
import { authStyles } from './styles';

interface AuthInputProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function AuthInput({
  label,
  icon,
  error,
  containerStyle,
  style,
  editable = true,
  ...props
}: AuthInputProps) {
  const hasIcon = !!icon;

  return (
    <View style={[authStyles.inputWrapper, containerStyle]}>
      {label && <Text style={authStyles.inputLabel}>{label}</Text>}
      <View style={[styles.inputContainer, hasIcon && styles.withIcon]}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={AUTH_COLORS.textSecondary}
            style={styles.inputIcon}
          />
        )}
        <TextInput
          style={[
            hasIcon ? styles.inputWithIcon : styles.input,
            !editable && styles.inputDisabled,
            style,
          ]}
          placeholderTextColor={AUTH_COLORS.textMuted}
          editable={editable}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  withIcon: {
    borderWidth: 1,
    borderColor: AUTH_COLORS.border,
    borderRadius: AUTH_SIZING.borderRadius,
    backgroundColor: AUTH_COLORS.cardBackground,
  },
  inputIcon: {
    paddingLeft: 14,
  },
  // Input field without icon - has its own border and takes full width
  input: {
    flex: 1,
    height: AUTH_SIZING.inputHeight,
    borderWidth: 1,
    borderColor: AUTH_COLORS.border,
    borderRadius: AUTH_SIZING.borderRadius,
    paddingHorizontal: 14,
    fontSize: AUTH_TYPOGRAPHY.body.fontSize,
    color: AUTH_COLORS.textPrimary,
    backgroundColor: AUTH_COLORS.cardBackground,
  },
  // Input field with icon - no border (container has it), takes remaining space
  inputWithIcon: {
    flex: 1,
    height: AUTH_SIZING.inputHeight,
    paddingHorizontal: 10,
    fontSize: AUTH_TYPOGRAPHY.body.fontSize,
    color: AUTH_COLORS.textPrimary,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  errorText: {
    fontSize: 12,
    color: AUTH_COLORS.error,
    marginTop: 4,
  },
});