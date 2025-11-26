import { useThemeColor } from '@/hooks/use-theme-color';
import Slider from '@react-native-community/slider';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RADIUS_MAX, RADIUS_MIN } from '../constants';

interface RadiusSliderProps {
    value: number;
    onSlidingStart: () => void;
    onValueChange: (value: number) => void;
    onSlidingComplete: (value: number) => void;
}

export function RadiusSlider({
    value,
    onSlidingStart,
    onValueChange,
    onSlidingComplete,
}: RadiusSliderProps) {
    const tintColor = useThemeColor({}, 'tint');
    const iconColor = useThemeColor({}, 'icon');
    const cardBg = useThemeColor({ light: 'rgba(255, 255, 255, 0.95)', dark: 'rgba(28, 28, 30, 0.95)' }, 'background');
    const textColor = useThemeColor({}, 'text');

    return (
        <View style={[styles.container, { backgroundColor: cardBg }]}>
            <View style={styles.header}>
                <Text style={[styles.label, { color: textColor }]}>نطاق البحث</Text>
                <View style={[styles.badge, { backgroundColor: `${tintColor}20` }]}>
                    <Text style={[styles.value, { color: tintColor }]}>
                        {Math.round(value)} كم
                    </Text>
                </View>
            </View>

            <Slider
                style={styles.slider}
                minimumValue={RADIUS_MIN}
                maximumValue={RADIUS_MAX}
                value={value}
                onSlidingStart={onSlidingStart}
                onValueChange={onValueChange}
                onSlidingComplete={onSlidingComplete}
                minimumTrackTintColor={tintColor}
                maximumTrackTintColor={`${iconColor}40`}
                thumbTintColor={tintColor}
                accessibilityLabel="Search radius"
                accessibilityValue={{ min: RADIUS_MIN, max: RADIUS_MAX, now: Math.round(value) }}
            />

            <View style={styles.markers}>
                <Text style={[styles.markerText, { color: iconColor }]}>{RADIUS_MIN} كم</Text>
                <Text style={[styles.markerText, { color: iconColor }]}>{RADIUS_MAX} كم</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    value: {
        fontSize: 14,
        fontWeight: '700',
    },
    slider: {
        width: '100%',
        height: 40,
    },
    markers: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -4,
    },
    markerText: {
        fontSize: 12,
    },
});
