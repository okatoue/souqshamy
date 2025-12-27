import { BORDER_RADIUS, BRAND_COLOR, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRTL } from '@/lib/rtl_context';
import { rtlTextAlign } from '@/lib/rtlStyles';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import LocationPreviewCard from './LocationPreviewCard';

interface LocationSectionProps {
    location: string | null;
    coordinates: {
        latitude: number;
        longitude: number;
    } | null;
    radius?: number;
    onPress: () => void;
}

export default function LocationSection({ location, coordinates, radius, onPress }: LocationSectionProps) {
    const { t } = useTranslation();
    const { isRTL } = useRTL();
    // Theme colors
    const textColor = useThemeColor({}, 'text');
    const inputBg = useThemeColor({}, 'inputBackground');
    const borderColor = useThemeColor({}, 'border');
    const mutedColor = useThemeColor({}, 'textMuted');

    // Show empty state if no location selected
    if (!location || !coordinates) {
        return (
            <View style={styles.container}>
                <Text style={[styles.label, rtlTextAlign(isRTL), { color: textColor }]}>
                    {t('productDetails.location')} *
                </Text>
                <TouchableOpacity
                    style={[styles.emptyLocationBox, { backgroundColor: inputBg, borderColor }]}
                    onPress={onPress}
                    activeOpacity={0.7}
                >
                    <Ionicons name="location-outline" size={32} color={mutedColor} />
                    <Text style={[styles.emptyLocationTitle, { color: textColor }]}>
                        {t('productDetails.selectLocation')}
                    </Text>
                    <Text style={[styles.emptyLocationSubtitle, { color: mutedColor }]}>
                        {t('productDetails.tapToSelectLocation')}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    // At this point TypeScript knows location is string and coordinates is non-null
    return (
        <View style={styles.container}>
            <Text style={[styles.label, rtlTextAlign(isRTL), { color: textColor }]}>
                {t('productDetails.location')} *
            </Text>
            <LocationPreviewCard
                location={location}
                coordinates={coordinates}
                radius={radius}
                onPress={onPress}
            />
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
    emptyLocationBox: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderStyle: 'dashed',
        paddingVertical: SPACING.xxl,
        paddingHorizontal: SPACING.lg,
        gap: SPACING.xs,
    },
    emptyLocationTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: SPACING.sm,
    },
    emptyLocationSubtitle: {
        fontSize: 14,
    },
});
