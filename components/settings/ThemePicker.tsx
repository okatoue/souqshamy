import { BottomSheet, BottomSheetRefProps } from '@/components/ui/bottomSheet';
import { BORDER_RADIUS, BRAND_COLOR, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRTL } from '@/lib/rtl_context';
import { rtlMarginEnd, rtlRow } from '@/lib/rtlStyles';
import { ThemePreference, useThemeContext } from '@/lib/theme_context';
import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ThemeOption {
    value: ThemePreference;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    description: string;
}

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
        const { t } = useTranslation();
        const { isRTL } = useRTL();
        const bottomSheetRef = useRef<BottomSheetRefProps>(null);
        const { themePreference, setThemePreference } = useThemeContext();

        const textColor = useThemeColor({}, 'text');
        const subtitleColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');
        const iconColor = useThemeColor({}, 'icon');
        const itemBackground = useThemeColor({}, 'sheetItemBackground');

        // Create theme options with translated labels
        const themeOptions = useMemo<ThemeOption[]>(() => [
            {
                value: 'light',
                label: t('settings.themeLight'),
                icon: 'sunny-outline',
                description: t('settings.themeLightSubtitle'),
            },
            {
                value: 'dark',
                label: t('settings.themeDark'),
                icon: 'moon-outline',
                description: t('settings.themeDarkSubtitle'),
            },
            {
                value: 'system',
                label: t('settings.themeSystem'),
                icon: 'phone-portrait-outline',
                description: t('settings.themeSystemSubtitle'),
            },
        ], [t]);

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
                title={t('settings.appTheme')}
                snapPoints={['40%']}
                onDismiss={onClose}
            >
                <View style={styles.container}>
                    {themeOptions.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={[styles.themeOption, rtlRow(isRTL), { backgroundColor: itemBackground }]}
                            onPress={() => handleSelect(option.value)}
                            activeOpacity={0.7}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: themePreference === option.value }}
                            accessibilityLabel={`${option.label} theme. ${option.description}`}
                        >
                            <View style={[styles.themeOptionLeft, rtlRow(isRTL)]}>
                                <View style={[styles.iconContainer, rtlMarginEnd(isRTL, SPACING.md), { backgroundColor: `${BRAND_COLOR}15` }]}>
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
