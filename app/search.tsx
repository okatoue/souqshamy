// app/search.tsx
import categoriesData from '@/assets/categories.json';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSearchListings } from '@/hooks/useSearchListings';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
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
    const cardBg = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'text');
    const placeholderBg = useThemeColor({ light: '#f0f0f0', dark: '#2a2a2a' }, 'background');
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

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
        return date.toLocaleDateString();
    };

    const formatPrice = (price: number, currency: string) => {
        if (currency === 'SYP') {
            return `SYP ${price.toLocaleString()}`;
        }
        return `$${price.toLocaleString()}`;
    };

    const getCategoryInfo = (categoryId: number, subcategoryId: number) => {
        const category = categoriesData.categories.find(c => c.id === categoryId);
        const subcategory = category?.subcategories.find(s => s.id === subcategoryId);
        return {
            categoryName: category?.name || 'Unknown',
            categoryIcon: category?.icon || '📦',
            subcategoryName: subcategory?.name || ''
        };
    };

    const renderItem = ({ item }: { item: Listing }) => {
        const { categoryIcon, categoryName, subcategoryName } = getCategoryInfo(
            item.category_id,
            item.subcategory_id
        );

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.itemCard,
                    { backgroundColor: cardBg, borderColor },
                    pressed && styles.itemCardPressed,
                ]}
                onPress={() => handleItemPress(item)}
            >
                {/* Listing Image */}
                {item.images && item.images.length > 0 ? (
                    <Image
                        source={{ uri: item.images[0] }}
                        style={styles.itemImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.itemImagePlaceholder, { backgroundColor: placeholderBg }]}>
                        <MaterialIcons name="image" size={40} color="#666" />
                    </View>
                )}

                {/* Listing Details */}
                <View style={styles.itemDetails}>
                    <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={2}>
                        {item.title}
                    </Text>
                    <Text style={styles.itemPrice}>
                        {formatPrice(item.price, item.currency)}
                    </Text>

                    {/* Category Badge */}
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryIcon}>{categoryIcon}</Text>
                        <Text style={styles.categoryText} numberOfLines={1}>
                            {categoryName}
                            {subcategoryName ? ` › ${subcategoryName}` : ''}
                        </Text>
                    </View>

                    <View style={styles.itemMeta}>
                        <Ionicons name="location-outline" size={14} color="#888" />
                        <Text style={styles.itemLocation} numberOfLines={1}>
                            {item.location}
                        </Text>
                        <Text style={styles.itemDate}> • {formatDate(item.created_at)}</Text>
                    </View>
                </View>

                {/* Arrow indicator */}
                <View style={styles.itemArrow}>
                    <Ionicons name="chevron-forward" size={20} color="#888" />
                </View>
            </Pressable>
        );
    };

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

            {/* Results Count */}
            {listings.length > 0 && !isLoading && (
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
                    keyExtractor={(item) => item.id.toString()}
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
    itemCard: {
        flexDirection: 'row',
        borderRadius: 12,
        marginBottom: 12,
        padding: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    itemCardPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.98 }],
    },
    itemImage: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    itemImagePlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemDetails: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'space-between',
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    itemPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#007AFF',
        marginBottom: 4,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    categoryIcon: {
        fontSize: 12,
        marginRight: 4,
    },
    categoryText: {
        fontSize: 12,
        color: '#888',
        flex: 1,
    },
    itemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemLocation: {
        fontSize: 13,
        color: '#888',
        marginLeft: 4,
        flex: 1,
    },
    itemDate: {
        fontSize: 12,
        color: '#888',
    },
    itemArrow: {
        justifyContent: 'center',
        paddingLeft: 8,
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