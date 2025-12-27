// app/search.tsx
import { ListingCard } from '@/components/listings/listingCard';
import { BackButton } from '@/components/ui/BackButton';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSearchListings } from '@/hooks/useSearchListings';
import { navigateToListing } from '@/app/listing/[id]';
import { useRTL } from '@/lib/rtl_context';
import { rtlMarginStart, rtlRow, rtlTextAlign } from '@/lib/rtlStyles';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SearchScreen() {
    const { t } = useTranslation();
    const { isRTL } = useRTL();
    const params = useLocalSearchParams<{ q?: string }>();
    const [searchQuery, setSearchQuery] = useState(params.q || '');
    const searchInputRef = useRef<TextInput>(null);

    const { listings, isLoading, error, searchListings, clearSearch } = useSearchListings();

    // Theme colors
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'text');
    const inputBg = useThemeColor({ light: '#f5f5f5', dark: '#2a2a2a' }, 'background');

    // Run initial search if query param is provided
    useEffect(() => {
        if (params.q) {
            setSearchQuery(params.q);
            searchListings(params.q);
        }
    }, [params.q]);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            searchListings(searchQuery.trim());
        }
    };

    const handleClear = () => {
        setSearchQuery('');
        clearSearch();
        searchInputRef.current?.focus();
    };

    const handleItemPress = (item: Listing) => {
        navigateToListing(item);
    };

    // Memoized renderItem for FlatList performance
    const renderItem = useCallback(
        ({ item }: { item: Listing }) => (
            <ListingCard item={item} onPress={handleItemPress} />
        ),
        [handleItemPress]
    );

    // Memoized keyExtractor
    const keyExtractor = useCallback((item: Listing) => item.id, []);

    const renderEmptyList = () => {
        if (isLoading) return null;

        if (!searchQuery.trim()) {
            return (
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="search" size={64} color="#666" />
                    <Text style={[styles.emptyText, { color: textColor }]}>
                        {t('search.searchForListings')}
                    </Text>
                    <Text style={styles.emptySubtext}>
                        {t('search.enterKeyword')}
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <MaterialIcons name="search-off" size={64} color="#666" />
                <Text style={[styles.emptyText, { color: textColor }]}>
                    {t('search.noResults')}
                </Text>
                <Text style={styles.emptySubtext}>
                    {t('search.tryDifferentKeywords')}
                </Text>
            </View>
        );
    };

    const renderError = () => (
        <View style={styles.emptyContainer}>
            <MaterialIcons name="error-outline" size={64} color="#F44336" />
            <Text style={[styles.emptyText, { color: textColor }]}>
                {t('search.searchFailed')}
            </Text>
            <Text style={styles.emptySubtext}>{error?.message}</Text>
            <Pressable style={[styles.retryButton, rtlRow(isRTL)]} onPress={handleSearch}>
                <MaterialIcons name="refresh" size={20} color="white" />
                <Text style={[styles.retryButtonText, rtlMarginStart(isRTL, 8)]}>{t('common.tryAgain')}</Text>
            </Pressable>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* Header with Search Bar */}
            <View style={[styles.header, rtlRow(isRTL)]}>
                <BackButton variant="arrow" size={24} light />

                <View style={[styles.searchInputContainer, rtlRow(isRTL), { backgroundColor: inputBg }]}>
                    <Ionicons name="search" size={20} color="#888" />
                    <TextInput
                        ref={searchInputRef}
                        style={[styles.searchInput, rtlTextAlign(isRTL), rtlMarginStart(isRTL, 8), { color: textColor }]}
                        placeholder={t('search.searchPlaceholder')}
                        placeholderTextColor="#888"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                        autoFocus={!params.q}
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={handleClear} style={styles.clearButton}>
                            <Ionicons name="close-circle" size={20} color="#888" />
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Result Count */}
            {listings.length > 0 && (
                <View style={[styles.resultBar, { borderColor }]}>
                    <Text style={[styles.resultCount, { color: textColor }]}>
                        {t('search.resultsCount', { count: listings.length, query: searchQuery })}
                    </Text>
                </View>
            )}

            {/* Content */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={[styles.loadingText, { color: textColor }]}>{t('search.searching')}</Text>
                </View>
            ) : error ? (
                renderError()
            ) : (
                <FlatList
                    data={listings}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmptyList}
                    showsVerticalScrollIndicator={false}
                    // Performance optimizations
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={8}
                    windowSize={10}
                    initialNumToRender={6}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#007AFF',
        gap: 12,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 40,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        // RTL margin applied dynamically
    },
    clearButton: {
        padding: 4,
    },
    resultBar: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    resultCount: {
        fontSize: 14,
        fontWeight: '500',
    },
    listContent: {
        padding: 16,
        paddingTop: 8,
        flexGrow: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 64,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#888',
        marginTop: 8,
        textAlign: 'center',
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        marginTop: 24,
    },
    retryButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
        // RTL margin applied dynamically
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
});