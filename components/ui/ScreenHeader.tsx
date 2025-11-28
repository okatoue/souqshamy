import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface ScreenHeaderProps {
  /** Optional string title for screens like Favorites/Chats */
  title?: string;
  /** Optional custom title component (e.g., Location component for Home screen) */
  customTitle?: ReactNode;
  /** Optional left action component (e.g., UserIcon) */
  leftAction?: ReactNode;
  /** Optional right action component (e.g., UserIcon or Add button) */
  rightAction?: ReactNode;
  /** Optional subtitle for item counts like "3 items" */
  subtitle?: string;
  /** Whether to show the bottom border (default: true) */
  showBorder?: boolean;
}

export function ScreenHeader({
  title,
  customTitle,
  leftAction,
  rightAction,
  subtitle,
  showBorder = true,

}: ScreenHeaderProps) {

  const borderColor = useThemeColor({}, 'border');

  const textColor = useThemeColor({}, 'text');



  return (

    <View style={[styles.container, showBorder && { borderBottomWidth: 1, borderBottomColor: borderColor }]}>
      <View style={styles.row}>
        {/* Left side: leftAction or title section */}
        {leftAction ? (
          <View style={styles.leftAction}>{leftAction}</View>
        ) : null}

        {/* Title section */}
        <View style={styles.titleContainer}>
          {customTitle ? (
            customTitle
          ) : title ? (
            <View style={styles.titleWrapper}>
              <ThemedText type="title" style={styles.title}>
                {title}
              </ThemedText>
              {subtitle ? (
                <Text style={[styles.subtitle, { color: textColor }]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Right side: rightAction */}
        {rightAction ? (
          <View style={styles.rightAction}>{rightAction}</View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftAction: {
    marginRight: SPACING.md,
  },
  titleContainer: {
    flex: 1,
  },
  titleWrapper: {
    flexDirection: 'column',
  },
  title: {
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  rightAction: {
    marginLeft: SPACING.md,
  },
});
