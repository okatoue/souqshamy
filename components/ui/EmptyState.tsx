import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR, BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type IconFamily = 'MaterialCommunityIcons' | 'MaterialIcons';

interface EmptyStateAction {
  label: string;
  onPress: () => void;
  icon?: string;
}

interface EmptyStateProps {
  icon: string;
  iconFamily?: IconFamily;
  title: string;
  subtitle: string;
  action?: EmptyStateAction;
}

/**
 * Reusable empty state component for displaying when lists are empty
 * or when user authentication is required.
 */
export function EmptyState({
  icon,
  iconFamily = 'MaterialCommunityIcons',
  title,
  subtitle,
  action,
}: EmptyStateProps) {
  const IconComponent = iconFamily === 'MaterialIcons' ? MaterialIcons : MaterialCommunityIcons;

  return (
    <View style={styles.container}>
      <IconComponent name={icon as never} size={80} color={COLORS.mutedLight} />
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
      {action && (
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={action.onPress}
        >
          {action.icon && (
            <MaterialIcons name={action.icon as never} size={20} color="white" />
          )}
          <Text style={styles.actionButtonText}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    opacity: 0.7,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLOR,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: BORDER_RADIUS.md,
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
});
