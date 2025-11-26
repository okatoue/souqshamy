// components/auth/AuthLayout.tsx
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authStyles } from './styles';

interface AuthLayoutProps extends Omit<ScrollViewProps, 'style'> {
  children: React.ReactNode;
  scrollEnabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function AuthLayout({
  children,
  scrollEnabled = true,
  containerStyle,
  contentStyle,
  ...scrollProps
}: AuthLayoutProps) {
  return (
    <SafeAreaView style={[authStyles.container, containerStyle]}>
      <KeyboardAvoidingView
        style={authStyles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[authStyles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          scrollEnabled={scrollEnabled}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
