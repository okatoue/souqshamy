import { BORDER_RADIUS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface SettingsMenuItemProps {
    /** Ionicons icon name */
    icon: keyof typeof Ionicons.glyphMap;
    /** Optional custom icon color */
    iconColor?: string;
    /** Menu item title */
    title: string;
    /** Optional subtitle/description */
    subtitle?: string;
    /** Press handler */
    onPress: () => void;
    /** Whether to show arrow chevron (default: true) */
    showArrow?: boolean;
    /** Optional right-side element (replaces arrow if provided) */
    rightElement?: React.ReactNode;
    /** Whether this is a destructive action (shows red) */
    destructive?: boolean;
    /** Whether this item is disabled */
    disabled?: boolean;
}

export function SettingsMenuItem({
    icon,
    iconColor,
    title,
    subtitle,
    onPress,
    showArrow = true,
    rightElement,
    destructive = false,
    disabled = false,
}: SettingsMenuItemProps) {
    const textColor = useThemeColor({}, 'text');
    const subtitleColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'icon');
    const pressedBg = useThemeColor({ light: '#f0f0f0', dark: '#1a1a1a' }, 'background');
    const chevronColor = useThemeColor({ light: '#999', dark: '#666' }, 'icon');
    const primaryColor = useThemeColor({}, 'primary');
    const dangerColor = '#FF3B30';

    const color = destructive ? dangerColor : iconColor || primaryColor;
    const titleColor = destructive ? dangerColor : textColor;

    return (
        <Pressable
            style={({ pressed }) => [
                styles.menuItem,
                { borderBottomColor: borderColor },
                pressed && !disabled && { backgroundColor: pressedBg },
                disabled && styles.menuItemDisabled,
            ]}
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityHint={subtitle}
            accessibilityState={{ disabled }}
        >
            <View style={styles.menuItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                    <Ionicons name={icon} size={20} color={color} />
                </View>
                <View style={styles.menuItemText}>
                    <Text style={[styles.menuItemTitle, { color: titleColor }]}>
                        {title}
                    </Text>
                    {subtitle && (
                        <Text style={[styles.menuItemSubtitle, { color: subtitleColor }]}>
                            {subtitle}
                        </Text>
                    )}
                </View>
            </View>

            {rightElement}

            {showArrow && !rightElement && (
                <Ionicons name="chevron-forward" size={20} color={chevronColor} />
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    menuItemDisabled: {
        opacity: 0.5,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: BORDER_RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    menuItemText: {
        flex: 1,
    },
    menuItemTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    menuItemSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
});
