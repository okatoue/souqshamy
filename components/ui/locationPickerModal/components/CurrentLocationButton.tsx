import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

interface CurrentLocationButtonProps {
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
}

export function CurrentLocationButton({ onPress, loading = false, disabled = false }: CurrentLocationButtonProps) {
    const cardBg = useThemeColor({ light: 'rgba(255, 255, 255, 0.95)', dark: 'rgba(28, 28, 30, 0.95)' }, 'background');
    const tintColor = useThemeColor({}, 'tint');
    const textColor = useThemeColor({}, 'text');

    const isDisabled = loading || disabled;

    return (
        <TouchableOpacity
            style={[styles.button, { backgroundColor: cardBg }]}
            onPress={onPress}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityLabel="Use my current location"
            accessibilityState={{ disabled: isDisabled }}
        >
            {loading ? (
                <ActivityIndicator size="small" color={tintColor} />
            ) : (
                <Ionicons
                    name="navigate"
                    size={18}
                    color={tintColor}
                />
            )}
            <Text style={[styles.buttonText, { color: textColor }]}>
                My Location
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
