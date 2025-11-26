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
import { AUTH_COLORS, AUTH_SIZING } from './constants';
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
            hasIcon ? styles.inputWithIcon : authStyles.input,
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
  inputWithIcon: {
    flex: 1,
    height: AUTH_SIZING.inputHeight,
    paddingHorizontal: 10,
    fontSize: 15,
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
