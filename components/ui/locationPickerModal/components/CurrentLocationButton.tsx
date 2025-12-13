import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';

interface CurrentLocationButtonProps {
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
}

export function CurrentLocationButton({ onPress, loading = false, disabled = false }: CurrentLocationButtonProps) {
    const cardBg = useThemeColor({ light: 'rgba(255, 255, 255, 0.95)', dark: 'rgba(28, 28, 30, 0.95)' }, 'background');
    const tintColor = useThemeColor({}, 'tint');
    const iconColor = useThemeColor({}, 'icon');

    const isDisabled = loading || disabled;

    return (
        <TouchableOpacity
            style={[styles.button, { backgroundColor: cardBg }]}
            onPress={onPress}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityLabel="استخدم موقعي الحالي"
            accessibilityState={{ disabled: isDisabled }}
        >
            {loading ? (
                <ActivityIndicator size="small" color={tintColor} />
            ) : (
                <Ionicons
                    name="navigate"
                    size={22}
                    color={isDisabled ? iconColor : tintColor}
                />
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
});
