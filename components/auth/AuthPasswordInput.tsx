// components/auth/AuthPasswordInput.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Pressable,
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

interface AuthPasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  initialShowPassword?: boolean;
}

export function AuthPasswordInput({
  label,
  error,
  containerStyle,
  editable = true,
  initialShowPassword = false,
  ...props
}: AuthPasswordInputProps) {
  const [showPassword, setShowPassword] = useState(initialShowPassword);

  return (
    <View style={[authStyles.inputWrapper, containerStyle]}>
      {label && <Text style={authStyles.inputLabel}>{label}</Text>}
      <View style={authStyles.passwordContainer}>
        <TextInput
          style={[authStyles.passwordInput, !editable && styles.inputDisabled]}
          placeholderTextColor={AUTH_COLORS.textMuted}
          secureTextEntry={!showPassword}
          editable={editable}
          {...props}
        />
        <Pressable
          style={authStyles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
          hitSlop={8}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={AUTH_SIZING.iconSize.large}
            color={AUTH_COLORS.textSecondary}
          />
        </Pressable>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  inputDisabled: {
    opacity: 0.6,
  },
  errorText: {
    fontSize: 12,
    color: AUTH_COLORS.error,
    marginTop: 4,
  },
});
