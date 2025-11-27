// components/auth/AuthTitle.tsx
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useAuthTheme } from './useAuthStyles';

interface AuthTitleProps {
  title: string;
  subtitle?: string;
  highlightedText?: string;
  style?: StyleProp<ViewStyle>;
}

export function AuthTitle({ title, subtitle, highlightedText, style }: AuthTitleProps) {
  const { styles: authStyles, colors } = useAuthTheme();

  return (
    <View style={[authStyles.titleContainer, style]}>
      <Text style={authStyles.title}>{title}</Text>
      {subtitle && (
        <Text style={authStyles.subtitle}>
          {subtitle}
          {highlightedText && (
            <>
              {'\n'}
              <Text style={[styles.highlight, { color: colors.textLabel }]}>
                {highlightedText}
              </Text>
            </>
          )}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  highlight: {
    fontWeight: '600',
  },
});
