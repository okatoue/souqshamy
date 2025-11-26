import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React, { RefObject } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface SearchBarProps {
    searchQuery: string;
    onChangeText: (text: string) => void;
    onSubmit: () => void;
    onFocus: () => void;
    onBlur: () => void;
    onClear: () => void;
    isSearchFocused: boolean;
    selectedLocationName: string;
    inputRef: RefObject<TextInput>;
}

export function SearchBar({
    searchQuery,
    onChangeText,
    onSubmit,
    onFocus,
    onBlur,
    onClear,
    isSearchFocused,
    selectedLocationName,
    inputRef,
}: SearchBarProps) {
    const iconColor = useThemeColor({}, 'icon');
    const cardBg = useThemeColor({ light: 'rgba(255, 255, 255, 0.95)', dark: 'rgba(28, 28, 30, 0.95)' }, 'background');
    const textColor = useThemeColor({}, 'text');
    const subtleTextColor = useThemeColor({ light: '#666666', dark: '#999999' }, 'text');

    const showingSearch = isSearchFocused || searchQuery.length > 0;

    return (
        <View style={[styles.searchBar, { backgroundColor: cardBg }]}>
            <Ionicons name="search" size={20} color={iconColor} />

            {showingSearch ? (
                <TextInput
                    ref={inputRef}
                    style={[styles.searchInput, { color: textColor, textAlign: 'right' }]}
                    placeholder="ابحث عن مدينة أو منطقة..."
                    placeholderTextColor={iconColor}
                    value={searchQuery}
                    onChangeText={onChangeText}
                    onSubmitEditing={onSubmit}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    returnKeyType="search"
                    autoFocus={isSearchFocused && !searchQuery}
                />
            ) : (
                <TouchableOpacity
                    style={styles.locationDisplay}
                    onPress={onFocus}
                    accessibilityRole="button"
                    accessibilityLabel="Search for location"
                >
                    <Text style={[styles.locationText, { color: subtleTextColor }]} numberOfLines={1}>
                        {selectedLocationName}
                    </Text>
                </TouchableOpacity>
            )}

            {showingSearch && searchQuery.length > 0 && (
                <TouchableOpacity
                    onPress={onClear}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                >
                    <Ionicons name="close-circle" size={20} color={iconColor} />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 52,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        height: '100%',
    },
    locationDisplay: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    locationText: {
        fontSize: 16,
        fontWeight: '500',
    },
});
