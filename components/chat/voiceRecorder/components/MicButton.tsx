import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

interface MicButtonProps {
    onPress: () => void;
    accentColor: string;
    isPreparing?: boolean;
}

export function MicButton({ onPress, accentColor, isPreparing = false }: MicButtonProps) {
    return (
        <Pressable
            style={[styles.button, { backgroundColor: accentColor }]}
            onPress={onPress}
            disabled={isPreparing}
            accessibilityRole="button"
            accessibilityLabel={isPreparing ? 'Preparing to record' : 'Start recording'}
        >
            {isPreparing ? (
                <ActivityIndicator size="small" color="white" />
            ) : (
                <Ionicons name="mic" size={22} color="white" />
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
});
