// components/auth/SocialAuthButtons.tsx
import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AUTH_COLORS, isSmallScreen } from './constants';
import { useAuthTheme } from './useAuthStyles';

type SocialProvider = 'google' | 'facebook';

interface SocialAuthButtonsProps {
  onPress: (provider: string) => void;
  providers?: SocialProvider[];
  /** Which provider is currently loading (shows spinner on that button) */
  loadingProvider?: 'Google' | 'Facebook' | null;
  /** Disable all buttons (e.g., when email auth is in progress) */
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

function GoogleIcon({ borderColor }: { borderColor: string }) {
  return (
    <View style={styles.iconContainer}>
      <View style={[styles.googleIcon, { borderColor }]}>
        <Text style={styles.googleText}>G</Text>
      </View>
    </View>
  );
}

function FacebookIcon() {
  return (
    <View style={[styles.iconContainer, styles.facebookIcon]}>
      <Text style={styles.facebookText}>f</Text>
    </View>
  );
}

export function SocialAuthButtons({
  onPress,
  providers = ['google', 'facebook'],
  loadingProvider = null,
  disabled = false,
  style,
}: SocialAuthButtonsProps) {
  const { styles: authStyles, colors } = useAuthTheme();

  const getSocialConfig = (provider: SocialProvider) => {
    switch (provider) {
      case 'google':
        return { icon: <GoogleIcon borderColor={colors.border} />, label: 'Continue with Google', displayName: 'Google' as const };
      case 'facebook':
        return { icon: <FacebookIcon />, label: 'Continue with Facebook', displayName: 'Facebook' as const };
    }
  };

  // Any button is loading means all buttons should be disabled
  const isAnyLoading = loadingProvider !== null;

  return (
    <View style={[styles.container, style]}>
      {providers.map((provider) => {
        const config = getSocialConfig(provider);
        const isThisButtonLoading = loadingProvider === config.displayName;
        const isButtonDisabled = disabled || isAnyLoading;

        return (
          <Pressable
            key={provider}
            style={({ pressed }) => [
              authStyles.socialButton,
              pressed && !isButtonDisabled && authStyles.socialButtonPressed,
              isButtonDisabled && styles.disabledButton,
            ]}
            onPress={() => onPress(config.displayName)}
            disabled={isButtonDisabled}
          >
            {isThisButtonLoading ? (
              <ActivityIndicator size="small" color={colors.textSecondary} style={styles.iconContainer} />
            ) : (
              config.icon
            )}
            <Text style={[
              authStyles.socialButtonText,
              isButtonDisabled && styles.disabledText,
            ]}>
              {config.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: isSmallScreen ? 8 : 10,
  },
  iconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  facebookIcon: {
    backgroundColor: AUTH_COLORS.facebook,
    borderRadius: 4,
  },
  facebookText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledText: {
    opacity: 0.7,
  },
});
