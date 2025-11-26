// components/auth/SocialAuthButtons.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AUTH_COLORS, isSmallScreen } from './constants';
import { authStyles } from './styles';

type SocialProvider = 'google' | 'facebook' | 'telegram';

interface SocialAuthButtonsProps {
  onPress: (provider: string) => void;
  providers?: SocialProvider[];
  style?: StyleProp<ViewStyle>;
}

const GoogleIcon = () => (
  <View style={styles.iconContainer}>
    <View style={styles.googleIcon}>
      <Text style={styles.googleText}>G</Text>
    </View>
  </View>
);

const FacebookIcon = () => (
  <View style={[styles.iconContainer, styles.facebookIcon]}>
    <Text style={styles.facebookText}>f</Text>
  </View>
);

const TelegramIcon = () => (
  <View style={[styles.iconContainer, styles.telegramIcon]}>
    <Ionicons name="paper-plane" size={12} color="white" />
  </View>
);

const SOCIAL_CONFIG: Record<SocialProvider, { icon: React.ReactNode; label: string }> = {
  google: {
    icon: <GoogleIcon />,
    label: 'Continue with Google',
  },
  facebook: {
    icon: <FacebookIcon />,
    label: 'Continue with Facebook',
  },
  telegram: {
    icon: <TelegramIcon />,
    label: 'Log in with Telegram',
  },
};

export function SocialAuthButtons({
  onPress,
  providers = ['google', 'facebook', 'telegram'],
  style,
}: SocialAuthButtonsProps) {
  return (
    <View style={[styles.container, style]}>
      {providers.map((provider) => {
        const config = SOCIAL_CONFIG[provider];
        return (
          <Pressable
            key={provider}
            style={({ pressed }) => [
              authStyles.socialButton,
              pressed && authStyles.socialButtonPressed,
            ]}
            onPress={() => onPress(provider.charAt(0).toUpperCase() + provider.slice(1))}
          >
            {config.icon}
            <Text style={authStyles.socialButtonText}>{config.label}</Text>
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
    borderColor: AUTH_COLORS.border,
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
  telegramIcon: {
    backgroundColor: AUTH_COLORS.telegram,
    borderRadius: 10,
  },
});
