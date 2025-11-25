import { useFavorites } from '@/hooks/useFavorites';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';

interface FavoriteButtonProps {
    listingId: string;
    size?: number;
    style?: ViewStyle;
}

export function FavoriteButton({ listingId, size = 24, style }: FavoriteButtonProps) {
    const { isFavorite, toggleFavorite } = useFavorites();
    const [isToggling, setIsToggling] = useState(false);
    const [localIsFavorite, setLocalIsFavorite] = useState(false);

    // Sync with the hook's state
    useEffect(() => {
        setLocalIsFavorite(isFavorite(listingId));
    }, [isFavorite, listingId]);

    const handlePress = async () => {
        if (isToggling) return;

        setIsToggling(true);
        // Optimistic update
        setLocalIsFavorite(!localIsFavorite);

        const success = await toggleFavorite(listingId);

        if (!success) {
            // Revert on failure
            setLocalIsFavorite(localIsFavorite);
        }

        setIsToggling(false);
    };

    return (
        <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
                styles.button,
                pressed && styles.pressed,
                style
            ]}
            disabled={isToggling}
        >
            {isToggling ? (
                <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
                <Ionicons
                    name={localIsFavorite ? 'heart' : 'heart-outline'}
                    size={size}
                    color={localIsFavorite ? '#FF3B30' : '#888'}
                />
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    pressed: {
        opacity: 0.7,
        transform: [{ scale: 0.95 }],
    },
});