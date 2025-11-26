import { FavoriteListingItem } from '@/components/favorites/favoriteListingItem';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/lib/auth_context';
import { Listing } from '@/types/listing';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FavoritesScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const {
        favorites,
        isLoading,
        isRefreshing,
        fetchFavorites,
        removeFavorite
    } = useFavorites();

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');

    // Refresh favorites when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (user) {
                fetchFavorites(false); // or fetchUserListings(false)
            }
        }, [user, fetchFavorites])
    );

    // Handle refresh
    const onRefresh = () => {
        fetchFavorites(true);
    };

    // Handle navigation to listing detail
    const handleListingPress = (listing: Listing) => {
        router.push(`/listing/${listing.id}`);
    };

    // Handle remove from favorites
    const handleRemoveFavorite = (listingId: number) => {
        removeFavorite(listingId);
    };

    // Render each favorite item
    const renderItem = ({ item }: { item: Listing }) => (
        <FavoriteListingItem
            item={item}
            onPress={handleListingPress}
            onRemoveFavorite={handleRemoveFavorite}
        />
    );

    // Empty state
    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="heart-outline" size={80} color="#666" />
            <ThemedText style={styles.emptyTitle}>No Favorites Yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>
                Listings you save will appear here
            </ThemedText>
            <Pressable
                style={styles.browseButton}
                onPress={() => router.push('/(tabs)')}
            >
                <MaterialIcons name="search" size={20} color="white" />
                <Text style={styles.browseButtonText}>Browse Listings</Text>
            </Pressable>
        </View>
    );

    // Loading state
    if (isLoading && !isRefreshing) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <ThemedText style={styles.loadingText}>Loading favorites...</ThemedText>
                </View>
            </SafeAreaView>
        );
    }

    // Not authenticated state
    if (!user) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="account-heart-outline" size={80} color="#666" />
                    <ThemedText style={styles.emptyTitle}>Sign In Required</ThemedText>
                    <ThemedText style={styles.emptySubtext}>
                        Please sign in to save and view your favorites
                    </ThemedText>
                    <Pressable
                        style={styles.browseButton}
                        onPress={() => router.push('/(auth)/index')}
                    >
                        <Text style={styles.browseButtonText}>Sign In</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            {/* Header */}
            <ThemedView style={styles.header}>
                <ThemedText type="title" style={styles.headerTitle}>Favorites</ThemedText>
                <Text style={[styles.countText, { color: textColor }]}>
                    {favorites.length} {favorites.length === 1 ? 'item' : 'items'}
                </Text>
            </ThemedView>

            {/* Favorites List */}
            <FlatList
                data={favorites}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.listContent,
                    favorites.length === 0 && styles.emptyListContent
                ]}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        tintColor="#007AFF"
                    />
                }
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 15,
    },
    headerTitle: {
        marginBottom: 4,
    },
    countText: {
        fontSize: 14,
        opacity: 0.7,
    },
    listContent: {
        paddingBottom: 20,
    },
    emptyListContent: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        opacity: 0.7,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 30,
        opacity: 0.7,
    },
    browseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 10,
    },
    browseButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});