// components/auth/AuthButton.tsx
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { BRAND_COLOR } from './constants';
import { useAuthTheme } from './useAuthStyles';

interface AuthButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'link';
  style?: StyleProp<ViewStyle>;
}

export function AuthButton({
  title,
  loading = false,
  disabled,
  variant = 'primary',
  style,
  ...props
}: AuthButtonProps) {
  const { styles: authStyles, colors } = useAuthTheme();
  const isDisabled = disabled || loading;

  if (variant === 'link') {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.linkButton,
          pressed && styles.linkButtonPressed,
          style,
        ]}
        disabled={isDisabled}
        {...props}
      >
        <Text style={styles.linkButtonText}>{title}</Text>
      </Pressable>
    );
  }

  if (variant === 'secondary') {
    return (
      <Pressable
        style={({ pressed }) => [
          authStyles.socialButton,
          pressed && authStyles.socialButtonPressed,
          isDisabled && authStyles.primaryButtonDisabled,
          style,
        ]}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <ActivityIndicator color={colors.textLabel} />
        ) : (
          <Text style={authStyles.socialButtonText}>{title}</Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        authStyles.primaryButton,
        pressed && authStyles.primaryButtonPressed,
        isDisabled && authStyles.primaryButtonDisabled,
        style,
      ]}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={authStyles.primaryButtonText}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linkButton: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  linkButtonPressed: {
    opacity: 0.7,
  },
  linkButtonText: {
    fontSize: 14,
    color: BRAND_COLOR,
    fontWeight: '500',
  },
});
