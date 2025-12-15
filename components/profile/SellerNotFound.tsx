/**
 * SellerNotFound component displays an error/not found state
 * when the seller profile cannot be found.
 */

import { BORDER_RADIUS, BRAND_COLOR, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function SellerNotFound() {
    const textColor = useThemeColor({}, 'text');
    const mutedColor = useThemeColor({}, 'textMuted');

    return (
        <View style={styles.container}>
            <MaterialCommunityIcons name="account-question-outline" size={80} color={mutedColor} />
            <Text style={[styles.title, { color: textColor }]}>User not found</Text>
            <Text style={[styles.subtitle, { color: mutedColor }]}>
                This profile may have been removed or doesn't exist
            </Text>
            <Pressable
                style={[styles.button, { backgroundColor: BRAND_COLOR }]}
                onPress={() => router.back()}
            >
                <Text style={styles.buttonText}>Go Back</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    button: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xxl,
        borderRadius: BORDER_RADIUS.sm,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
