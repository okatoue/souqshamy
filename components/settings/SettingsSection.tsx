import { BORDER_RADIUS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRTL } from '@/lib/rtl_context';
import { rtlMarginStart, rtlTextAlign } from '@/lib/rtlStyles';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SettingsSectionProps {
    /** Section title (uppercase label above the card) */
    title?: string;
    /** Section content (typically SettingsMenuItem components) */
    children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
    const { isRTL } = useRTL();
    const sectionBg = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');
    const titleColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');

    return (
        <View style={styles.section}>
            {title && (
                <Text style={[styles.sectionTitle, { color: titleColor }, rtlMarginStart(isRTL, SPACING.xl), rtlTextAlign(isRTL)]}>{title}</Text>
            )}
            <View style={[styles.sectionContent, { backgroundColor: sectionBg }]}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: SPACING.xl + SPACING.xs,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: SPACING.sm,
        letterSpacing: 0.5,
    },
    sectionContent: {
        marginHorizontal: SPACING.lg - 1,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
    },
});
