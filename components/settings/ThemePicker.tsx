import { BottomSheet, BottomSheetRefProps } from '@/components/ui/bottomSheet';
import { BORDER_RADIUS, BRAND_COLOR, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemePreference, useThemeContext } from '@/lib/theme_context';
import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ThemeOption {
    value: ThemePreference;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    description: string;
}

const THEME_OPTIONS: ThemeOption[] = [
    {
        value: 'light',
        label: 'Light',
        icon: 'sunny-outline',
        description: 'Always use light theme',
    },
    {
        value: 'dark',
        label: 'Dark',
        icon: 'moon-outline',
        description: 'Always use dark theme',
    },
    {
        value: 'system',
        label: 'System',
        icon: 'phone-portrait-outline',
        description: 'Match device settings',
    },
];

export interface ThemePickerRefProps {
    open: () => void;
    close: () => void;
}

interface ThemePickerProps {
    /** Called when the picker is closed */
    onClose?: () => void;
}

export const ThemePicker = forwardRef<ThemePickerRefProps, ThemePickerProps>(
    ({ onClose }, ref) => {
        const bottomSheetRef = useRef<BottomSheetRefProps>(null);
        const { themePreference, setThemePreference } = useThemeContext();

        const textColor = useThemeColor({}, 'text');
        const subtitleColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');
        const iconColor = useThemeColor({}, 'icon');
        const itemBackground = useThemeColor({}, 'sheetItemBackground');

        useImperativeHandle(ref, () => ({
            open: () => {
                bottomSheetRef.current?.open();
            },
            close: () => {
                bottomSheetRef.current?.close();
            },
        }));

        const handleSelect = useCallback((value: ThemePreference) => {
            setThemePreference(value);
            // Auto-close after selection with slight delay for visual feedback
            setTimeout(() => {
                bottomSheetRef.current?.close();
                onClose?.();
            }, 150);
        }, [setThemePreference, onClose]);

        return (
            <BottomSheet
                ref={bottomSheetRef}
                title="App Theme"
                snapPoints={['40%']}
                onDismiss={onClose}
            >
                <View style={styles.container}>
                    {THEME_OPTIONS.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={[styles.themeOption, { backgroundColor: itemBackground }]}
                            onPress={() => handleSelect(option.value)}
                            activeOpacity={0.7}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: themePreference === option.value }}
                            accessibilityLabel={`${option.label} theme. ${option.description}`}
                        >
                            <View style={styles.themeOptionLeft}>
                                <View style={[styles.iconContainer, { backgroundColor: `${BRAND_COLOR}15` }]}>
                                    <Ionicons
                                        name={option.icon}
                                        size={20}
                                        color={BRAND_COLOR}
                                    />
                                </View>
                                <View style={styles.textContainer}>
                                    <Text style={[styles.themeOptionText, { color: textColor }]}>
                                        {option.label}
                                    </Text>
                                    <Text style={[styles.themeOptionDescription, { color: subtitleColor }]}>
                                        {option.description}
                                    </Text>
                                </View>
                            </View>
                            {themePreference === option.value && (
                                <View style={styles.checkmarkContainer}>
                                    <Ionicons name="checkmark-circle" size={24} color={BRAND_COLOR} />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </BottomSheet>
        );
    }
);

ThemePicker.displayName = 'ThemePicker';

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: SPACING.xs,
    },
    themeOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        marginVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.lg,
    },
    themeOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: BORDER_RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    textContainer: {
        flex: 1,
    },
    themeOptionText: {
        fontSize: 16,
        fontWeight: '500',
    },
    themeOptionDescription: {
        fontSize: 13,
        marginTop: 2,
    },
    checkmarkContainer: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
