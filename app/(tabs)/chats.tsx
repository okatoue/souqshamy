import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/lib/auth_context';
import { ConversationWithDetails } from '@/types/chat';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatsScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const {
        conversations,
        isLoading,
        isRefreshing,
        fetchConversations
    } = useConversations();

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const secondaryTextColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'text');
    const cardBg = useThemeColor({ light: '#fff', dark: '#1a1a1a' }, 'background');

    // Refresh when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (user) {
                fetchConversations(false);
            }
        }, [user, fetchConversations])
    );

    const onRefresh = () => {
        fetchConversations(true);
    };

    const handleConversationPress = (conversation: ConversationWithDetails) => {
        router.push({
            pathname: '/chat/[id]',
            params: { id: conversation.id }
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInMinutes < 1) return 'Now';
        if (diffInMinutes < 60) return `${diffInMinutes}m`;
        if (diffInHours < 24) return `${diffInHours}h`;
        if (diffInDays < 7) return `${diffInDays}d`;
        return date.toLocaleDateString();
    };

    const renderConversationItem = ({ item }: { item: ConversationWithDetails }) => (
        <Pressable
            style={({ pressed }) => [
                styles.conversationItem,
                { backgroundColor: cardBg, borderBottomColor: borderColor },
                pressed && styles.conversationItemPressed
            ]}
            onPress={() => handleConversationPress(item)}
        >
            {/* Listing Image */}
            <View style={styles.imageContainer}>
                {item.listing?.images && item.listing.images.length > 0 ? (
                    <Image
                        source={{ uri: item.listing.images[0] }}
                        style={styles.listingImage}
                    />
                ) : (
                    <View style={[styles.imagePlaceholder, { backgroundColor: borderColor }]}>
                        <Ionicons name="image-outline" size={24} color={secondaryTextColor} />
                    </View>
                )}
                {/* Unread badge */}
                {item.unread_count > 0 && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>
                            {item.unread_count > 9 ? '9+' : item.unread_count}
                        </Text>
                    </View>
                )}
            </View>

            {/* Conversation Details */}
            <View style={styles.conversationDetails}>
                <View style={styles.topRow}>
                    <Text
                        style={[
                            styles.userName,
                            { color: textColor },
                            item.unread_count > 0 && styles.unreadUserName
                        ]}
                        numberOfLines={1}
                    >
                        {item.other_user.display_name || 'User'}
                    </Text>
                    <Text style={[styles.time, { color: secondaryTextColor }]}>
                        {formatTime(item.last_message_at)}
                    </Text>
                </View>

                <Text
                    style={[styles.listingTitle, { color: secondaryTextColor }]}
                    numberOfLines={1}
                >
                    {item.listing?.title || 'Listing'}
                </Text>

                <Text
                    style={[
                        styles.lastMessage,
                        { color: secondaryTextColor },
                        item.unread_count > 0 && styles.unreadMessage
                    ]}
                    numberOfLines={1}
                >
                    {item.last_message || 'Start a conversation...'}
                </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
        </Pressable>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="chat-outline" size={80} color="#666" />
            <ThemedText style={styles.emptyTitle}>No Conversations Yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>
                Start chatting with sellers by visiting a listing and tapping "Chat"
            </ThemedText>
            <Pressable
                style={styles.browseButton}
                onPress={() => router.push('/(tabs)')}
            >
                <Ionicons name="search" size={20} color="white" />
                <Text style={styles.browseButtonText}>Browse Listings</Text>
            </Pressable>
        </View>
    );

    // Loading state
    if (isLoading && !isRefreshing) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <View style={styles.header}>
                    <ThemedText style={styles.headerTitle}>Messages</ThemedText>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <ThemedText style={styles.loadingText}>Loading conversations...</ThemedText>
                </View>
            </SafeAreaView>
        );
    }

    // Not authenticated
    if (!user) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <View style={styles.header}>
                    <ThemedText style={styles.headerTitle}>Messages</ThemedText>
                </View>
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="account-lock" size={80} color="#666" />
                    <ThemedText style={styles.emptyTitle}>Sign In Required</ThemedText>
                    <ThemedText style={styles.emptySubtext}>
                        Please sign in to view your messages
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
            <View style={styles.header}>
                <ThemedText style={styles.headerTitle}>Messages</ThemedText>
            </View>

            <FlatList
                data={conversations}
                renderItem={renderConversationItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={conversations.length === 0 ? styles.emptyList : undefined}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        tintColor="#007AFF"
                    />
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    emptyList: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
    },
    browseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
        marginTop: 24,
        gap: 8,
    },
    browseButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    conversationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    conversationItemPressed: {
        opacity: 0.7,
    },
    imageContainer: {
        position: 'relative',
    },
    listingImage: {
        width: 56,
        height: 56,
        borderRadius: 8,
    },
    imagePlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unreadBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '700',
    },
    conversationDetails: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    userName: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
        marginRight: 8,
    },
    unreadUserName: {
        fontWeight: '700',
    },
    time: {
        fontSize: 13,
    },
    listingTitle: {
        fontSize: 13,
        marginBottom: 2,
    },
    lastMessage: {
        fontSize: 14,
    },
    unreadMessage: {
        fontWeight: '600',
        color: '#000',
    },
});