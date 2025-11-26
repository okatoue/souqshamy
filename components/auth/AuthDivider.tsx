// components/auth/AuthDivider.tsx
import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { authStyles } from './styles';

interface AuthDividerProps {
  text?: string;
  style?: StyleProp<ViewStyle>;
}

export function AuthDivider({ text = 'or', style }: AuthDividerProps) {
  return (
    <View style={[authStyles.divider, style]}>
      <View style={authStyles.dividerLine} />
      <Text style={authStyles.dividerText}>{text}</Text>
      <View style={authStyles.dividerLine} />
    </View>
  );
}
