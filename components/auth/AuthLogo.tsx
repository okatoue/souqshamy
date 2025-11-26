// components/auth/AuthLogo.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { AUTH_SIZING, BRAND_COLOR, BRAND_COLOR_DARK } from './constants';
import { authStyles } from './styles';

interface AuthLogoProps {
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'small' | 'medium' | 'large';
  gradientColors?: readonly [string, string, ...string[]];
  containerStyle?: StyleProp<ViewStyle>;
}

const SIZE_MAP = {
  small: {
    container: 56,
    radius: 14,
    icon: 28,
  },
  medium: {
    container: AUTH_SIZING.logoSize,
    radius: AUTH_SIZING.logoRadius,
    icon: AUTH_SIZING.iconSize.small,
  },
  large: {
    container: 80,
    radius: 40,
    icon: 40,
  },
};

export function AuthLogo({
  icon = 'cart-outline',
  size = 'medium',
  gradientColors = [BRAND_COLOR, BRAND_COLOR_DARK],
  containerStyle,
}: AuthLogoProps) {
  const sizeConfig = SIZE_MAP[size];

  return (
    <View style={[authStyles.logoContainer, containerStyle]}>
      <LinearGradient
        colors={gradientColors}
        style={[
          authStyles.logoGradient,
          {
            width: sizeConfig.container,
            height: sizeConfig.container,
            borderRadius: sizeConfig.radius,
          },
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={sizeConfig.icon} color="white" />
      </LinearGradient>
    </View>
  );
}
