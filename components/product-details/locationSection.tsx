import { BORDER_RADIUS, BRAND_COLOR, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
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
    // Theme colors
    const textColor = useThemeColor({}, 'text');
    const inputBg = useThemeColor({}, 'inputBackground');
    const borderColor = useThemeColor({}, 'border');
    const mutedColor = useThemeColor({}, 'textMuted');

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: textColor }]}>Location</Text>

            <TouchableOpacity
                style={[styles.locationBox, { backgroundColor: inputBg, borderColor }]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <View style={styles.locationContent}>
                    <Ionicons name="location" size={20} color={BRAND_COLOR} />
                    <Text style={[styles.locationText, { color: textColor }]}>
                        {location || 'Select location'}
                    </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
            </TouchableOpacity>

            <Text style={[styles.helperText, { color: mutedColor }]}>
                Tap to select your location on the map
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: SPACING.xl,
        marginBottom: SPACING.xxl,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: SPACING.sm,
    },
    locationBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        paddingHorizontal: SPACING.lg,
        paddingVertical: 14,
    },
    locationContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    locationText: {
        fontSize: 16,
        marginLeft: SPACING.md,
        flex: 1,
    },
    helperText: {
        fontSize: 12,
        marginTop: 6,
    },
});
