import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SearchResult } from '../types';

interface SearchResultsProps {
    results: SearchResult[];
    isSearching: boolean;
    onSelectResult: (result: SearchResult) => void;
    onClose: () => void;
}

export function SearchResults({
    results,
    isSearching,
    onSelectResult,
    onClose,
}: SearchResultsProps) {
    const tintColor = useThemeColor({}, 'tint');
    const iconColor = useThemeColor({}, 'icon');
    const cardBg = useThemeColor({ light: 'rgba(255, 255, 255, 0.95)', dark: 'rgba(28, 28, 30, 0.95)' }, 'background');
    const textColor = useThemeColor({}, 'text');
    const borderColor = useThemeColor({ light: 'rgba(0,0,0,0.1)', dark: 'rgba(255,255,255,0.1)' }, 'text');

    return (
        <View style={[styles.container, { backgroundColor: cardBg }]}>
            {isSearching ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={tintColor} />
                    <Text style={[styles.loadingText, { color: textColor }]}>
                        جاري البحث...
                    </Text>
                </View>
            ) : results.length > 0 ? (
                <FlatList
                    data={results}
                    keyExtractor={(item) => item.place_id}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item, index }) => (
                        <TouchableOpacity
                            style={[
                                styles.resultItem,
                                index < results.length - 1 && { borderBottomColor: borderColor, borderBottomWidth: 1 }
                            ]}
                            onPress={() => onSelectResult(item)}
                            accessibilityRole="button"
                            accessibilityLabel={item.display_name}
                        >
                            <Ionicons name="location" size={18} color={tintColor} />
                            <Text style={[styles.resultText, { color: textColor }]} numberOfLines={2}>
                                {item.display_name}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            ) : (
                <View style={styles.noResultsContainer}>
                    <Text style={[styles.noResultsText, { color: iconColor }]}>
                        لا توجد نتائج
                    </Text>
                </View>
            )}

            <TouchableOpacity
                style={[styles.closeButton, { borderTopColor: borderColor }]}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close search results"
            >
                <Text style={[styles.closeButtonText, { color: tintColor }]}>
                    إغلاق
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 12,
        borderRadius: 16,
        maxHeight: 250,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    loadingText: {
        marginLeft: 10,
        fontSize: 14,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },
    resultText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 14,
        textAlign: 'right',
    },
    noResultsContainer: {
        padding: 20,
        alignItems: 'center',
    },
    noResultsText: {
        fontSize: 14,
    },
    closeButton: {
        padding: 14,
        alignItems: 'center',
        borderTopWidth: 1,
    },
    closeButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
});
