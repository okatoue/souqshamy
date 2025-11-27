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
import { useAuthStyles } from './useAuthStyles';

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
  const styles = useAuthStyles();

  return (
    <SafeAreaView style={[styles.container, containerStyle]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentStyle]}
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
