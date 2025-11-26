// components/auth/AuthTitle.tsx
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { authStyles } from './styles';
import { BRAND_COLOR } from './constants';

interface AuthTitleProps {
  title: string;
  subtitle?: string;
  highlightedText?: string;
  style?: StyleProp<ViewStyle>;
}

export function AuthTitle({ title, subtitle, highlightedText, style }: AuthTitleProps) {
  return (
    <View style={[authStyles.titleContainer, style]}>
      <Text style={authStyles.title}>{title}</Text>
      {subtitle && (
        <Text style={authStyles.subtitle}>
          {subtitle}
          {highlightedText && (
            <>
              {'\n'}
              <Text style={styles.highlight}>{highlightedText}</Text>
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
    color: '#334155',
  },
});
