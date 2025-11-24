import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface LocationSectionProps {
    location: string;
    onPress: () => void;
}

export default function LocationSection({ location, onPress }: LocationSectionProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>Location</Text>

            <TouchableOpacity
                style={styles.locationBox}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <View style={styles.locationContent}>
                    <Ionicons name="location" size={20} color="#007AFF" />
                    <Text style={styles.locationText}>
                        {location || 'Select location'}
                    </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#888" />
            </TouchableOpacity>

            <Text style={styles.helperText}>
                Tap to select your location on the map
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
        marginBottom: 8,
    },
    locationBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    locationContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    locationText: {
        fontSize: 16,
        color: 'white',
        marginLeft: 10,
        flex: 1,
    },
    helperText: {
        fontSize: 12,
        color: '#888',
        marginTop: 6,
    },
});