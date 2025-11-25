import { useThemeColor } from '@/hooks/use-theme-color';
import { useLocationFilter } from '@/hooks/useLocationFilter';
import Entypo from '@expo/vector-icons/Entypo';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '../themed-text';
import LocationPickerModal from './locationPickerModal';

export function Location() {
    const textColor = useThemeColor({}, 'text');
    const tintColor = useThemeColor({}, 'tint');

    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const { locationFilter, updateLocationFilter } = useLocationFilter();

    const handleLocationConfirm = (
        name: string,
        coordinates: { latitude: number; longitude: number },
        radius: number
    ) => {
        updateLocationFilter(name, coordinates, radius);
    };

    const getDisplayText = () => {
        if (locationFilter.radius >= 100) {
            return `${locationFilter.name}`;
        }
        return `${locationFilter.name} · ${locationFilter.radius}km`;
    };

    return (
        <>
            <View style={styles.locationBar}>
                <Pressable
                    onPress={() => setShowLocationPicker(true)}
                    style={styles.locationButton}
                >
                    <ThemedText style={[styles.locationText, { color: textColor }]}>
                        {getDisplayText()}
                    </ThemedText>
                    <View style={[styles.iconContainer, { backgroundColor: `${tintColor}15` }]}>
                        <Entypo name="location-pin" size={22} color={tintColor} />
                    </View>
                </Pressable>
            </View>

            <LocationPickerModal
                visible={showLocationPicker}
                currentLocation={locationFilter.name}
                currentRadius={locationFilter.radius}
                currentCoordinates={locationFilter.coordinates}
                onConfirm={handleLocationConfirm}
                onClose={() => setShowLocationPicker(false)}
            />
        </>
    );
}

const styles = StyleSheet.create({
    locationBar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    locationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    locationText: {
        fontSize: 16,
        fontWeight: '500',
        marginRight: 8,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
});