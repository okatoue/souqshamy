// app/search.tsx
import { ListingCard } from '@/components/listings/listingCard';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSearchListings } from '@/hooks/useSearchListings';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

    const handleBack = () => {
        router.back();
    };

    const handleItemPress = (item: Listing) => {
        router.push(`/listing/${item.id}`);
    };

    const renderItem = ({ item }: { item: Listing }) => (
        <ListingCard item={item} onPress={handleItemPress} />
    );

    const renderEmptyList = () => {
        if (isLoading) return null;

        if (!searchQuery.trim()) {
            return (
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="search" size={64} color="#666" />
                    <Text style={[styles.emptyText, { color: textColor }]}>
                        Search for listings
                    </Text>
                    <Text style={styles.emptySubtext}>
                        Enter a keyword to find items by title or description
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <MaterialIcons name="search-off" size={64} color="#666" />
                <Text style={[styles.emptyText, { color: textColor }]}>
                    No results found
                </Text>
                <Text style={styles.emptySubtext}>
                    Try different keywords or check your spelling
                </Text>
            </View>
        );
    };

    const renderError = () => (
        <View style={styles.emptyContainer}>
            <MaterialIcons name="error-outline" size={64} color="#F44336" />
            <Text style={[styles.emptyText, { color: textColor }]}>
                Search failed
            </Text>
            <Text style={styles.emptySubtext}>{error?.message}</Text>
            <Pressable style={styles.retryButton} onPress={handleSearch}>
                <MaterialIcons name="refresh" size={20} color="white" />
                <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* Header with Search Bar */}
            <View style={styles.header}>
                <Pressable onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </Pressable>

                <View style={[styles.searchInputContainer, { backgroundColor: inputBg }]}>
                    <Ionicons name="search" size={20} color="#888" />
                    <TextInput
                        ref={searchInputRef}
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder="Search listings..."
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
                        {listings.length} {listings.length === 1 ? 'result' : 'results'} for "{searchQuery}"
                    </Text>
                </View>
            )}

            {/* Content */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={[styles.loadingText, { color: textColor }]}>Searching...</Text>
                </View>
            ) : error ? (
                renderError()
            ) : (
                <FlatList
                    data={listings}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmptyList}
                    showsVerticalScrollIndicator={false}
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
    backButton: {
        padding: 8,
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
        marginLeft: 8,
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
        marginLeft: 8,
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