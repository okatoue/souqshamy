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
import { AUTH_SIZING, AUTH_TYPOGRAPHY, ACCENT_COLOR } from './constants';
import { useAuthTheme } from './useAuthStyles';

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
  const { styles: authStyles, colors } = useAuthTheme();
  const hasIcon = !!icon;

  return (
    <View style={[authStyles.inputWrapper, containerStyle]}>
      {label && <Text style={authStyles.inputLabel}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          hasIcon && {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: AUTH_SIZING.borderRadius,
            backgroundColor: colors.cardBackground,
          },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={colors.textSecondary}
            style={styles.inputIcon}
          />
        )}
        <TextInput
          style={[
            hasIcon
              ? [styles.inputWithIcon, { color: colors.textPrimary }]
              : [
                  styles.input,
                  {
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    backgroundColor: colors.cardBackground,
                  },
                ],
            !editable && styles.inputDisabled,
            style,
          ]}
          placeholderTextColor={colors.textMuted}
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
  inputIcon: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    height: AUTH_SIZING.inputHeight,
    borderWidth: 1,
    borderRadius: AUTH_SIZING.borderRadius,
    paddingHorizontal: 14,
    fontSize: AUTH_TYPOGRAPHY.body.fontSize,
  },
  inputWithIcon: {
    flex: 1,
    height: AUTH_SIZING.inputHeight,
    paddingHorizontal: 10,
    fontSize: AUTH_TYPOGRAPHY.body.fontSize,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  errorText: {
    fontSize: 12,
    color: ACCENT_COLOR,
    marginTop: 4,
  },
});