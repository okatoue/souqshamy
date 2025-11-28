import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

interface ConfirmButtonProps {
    onPress: () => void;
    loading?: boolean;
}

export function ConfirmButton({ onPress, loading = false }: ConfirmButtonProps) {
    const tintColor = useThemeColor({}, 'tint');

    return (
        <TouchableOpacity
            style={[styles.button, { backgroundColor: tintColor }]}
            onPress={onPress}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Confirm location"
        >
            {loading ? (
                <ActivityIndicator size="small" color="white" />
            ) : (
                <>
                    <Ionicons name="checkmark" size={22} color="white" style={styles.icon} />
                    <Text style={styles.text}>تطبيق الموقع</Text>
                </>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        height: 54,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    icon: {
        marginRight: 8,
    },
    text: {
        color: 'white',
        fontSize: 17,
        fontWeight: '600',
    },
});
