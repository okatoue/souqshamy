import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

interface CloseButtonProps {
    onPress: () => void;
}

export function CloseButton({ onPress }: CloseButtonProps) {
    const cardBg = useThemeColor({ light: 'rgba(255, 255, 255, 0.95)', dark: 'rgba(28, 28, 30, 0.95)' }, 'background');
    const textColor = useThemeColor({}, 'text');

    return (
        <TouchableOpacity
            style={[styles.button, { backgroundColor: cardBg }]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel="Close"
        >
            <Ionicons name="close" size={24} color={textColor} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
});
