import { ThemedText } from '@/components/themed-text';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BORDER_RADIUS, BRAND_COLOR, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAppData } from '@/lib/app_data_context';
import { useAuth } from '@/lib/auth_context';
import { getThumbnailUrl } from '@/lib/imageUtils';
import { ConversationWithDetails } from '@/types/chat';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { memo, useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// =============================================================================
// Memoized Conversation Item Component
// =============================================================================

interface ConversationItemProps {
    item: ConversationWithDetails;
    isEditMode: boolean;
    isSelected: boolean;
    onPress: (conversation: ConversationWithDetails) => void;
    onToggleSelection: (id: string) => void;
    cardBg: string;
    borderColor: string;
    textColor: string;
    secondaryTextColor: string;
}

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

const ConversationItem = memo(function ConversationItem({
    item,
    isEditMode,
    isSelected,
    onPress,
    onToggleSelection,
    cardBg,
    borderColor,
    textColor,
    secondaryTextColor,
}: ConversationItemProps) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.conversationItem,
                { backgroundColor: cardBg, borderBottomColor: borderColor },
                pressed && styles.conversationItemPressed,
                isEditMode && isSelected && styles.selectedItem
            ]}
            onPress={() => isEditMode ? onToggleSelection(item.id) : onPress(item)}
            accessibilityRole="button"
            accessibilityLabel={`Conversation with ${item.other_user.display_name || 'User'} about ${item.listing?.title || 'listing'}${item.unread_count > 0 ? `. ${item.unread_count} unread message${item.unread_count > 1 ? 's' : ''}` : ''}`}
            accessibilityHint={isEditMode ? 'Double tap to select' : 'Double tap to open conversation'}
        >
            {/* Selection checkbox in edit mode */}
            {isEditMode && (
                <View style={styles.checkboxContainer}>
                    <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={24}
                        color={isSelected ? COLORS.error : secondaryTextColor}
                    />
                </View>
            )}

            {/* Listing Image */}
            <View style={styles.imageContainer}>
                {item.listing?.images && item.listing.images.length > 0 ? (
                    <Image
                        source={{ uri: getThumbnailUrl(item.listing.images[0], 150, 150, 75) }}
                        style={styles.listingImage}
                    />
                ) : (
                    <View style={[styles.imagePlaceholder, { backgroundColor: borderColor }]}>
                        <Ionicons name="image-outline" size={24} color={secondaryTextColor} />
                    </View>
                )}
                {/* Unread badge */}
                {item.unread_count > 0 && (
                    <View style={[styles.unreadBadge, { backgroundColor: COLORS.favorite }]}>
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
                            { color: secondaryTextColor },
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
                    style={[
                        styles.listingTitle,
                        { color: textColor },
                        item.unread_count > 0 && styles.unreadListingTitle
                    ]}
                    numberOfLines={1}
                >
                    {item.listing?.title || 'Listing'}
                </Text>

                <Text
                    style={[
                        styles.lastMessage,
                        { color: secondaryTextColor },
                        item.unread_count > 0 && [styles.unreadMessage, { color: textColor }]
                    ]}
                    numberOfLines={1}
                >
                    {item.last_message || 'Start a conversation...'}
                </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
        </Pressable>
    );
});

export default function ChatsScreen() {
    const { user } = useAuth();
    const router = useRouter();

    // Consume pre-fetched data from global context
    const {
        conversations,
        conversationsRefreshing: isRefreshing,
        fetchConversations,
        deleteConversation
    } = useAppData();

    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Theme colors
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const secondaryTextColor = useThemeColor({}, 'textSecondary');
    const borderColor = useThemeColor({}, 'border');
    const cardBg = useThemeColor({}, 'cardBackground');
    const mutedColor = useThemeColor({}, 'textMuted');

    // Refresh when screen comes into focus (background refresh only)
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

    const toggleSelection = (conversationId: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(conversationId)) {
                newSet.delete(conversationId);
            } else {
                newSet.add(conversationId);
            }
            return newSet;
        });
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) {
            // No selections, just exit edit mode
            setIsEditMode(false);
            return;
        }

        const count = selectedIds.size;
        const message = count === 1
            ? 'Are you sure you want to delete this conversation?'
            : `Are you sure you want to delete ${count} conversations?`;

        Alert.alert(
            'Delete Conversations',
            message,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        // Delete all selected conversations
                        for (const id of selectedIds) {
                            await deleteConversation(id);
                        }

                        // Reset state
                        setSelectedIds(new Set());
                        setIsEditMode(false);
                    },
                },
            ]
        );
    };

    const toggleEditMode = () => {
        if (isEditMode) {
            // Exiting edit mode without confirming - clear selections
            setSelectedIds(new Set());
        }
        setIsEditMode(prev => !prev);
    };

    const EditButton = (
        <Pressable
            onPress={isEditMode ? handleDeleteSelected : toggleEditMode}
            style={styles.editButton}
        >
            <Ionicons
                name={isEditMode ? 'checkmark-circle' : 'remove-circle-outline'}
                size={26}
                color={isEditMode ? (selectedIds.size > 0 ? COLORS.error : BRAND_COLOR) : secondaryTextColor}
            />
        </Pressable>
    );

    const handleConversationPress = useCallback((conversation: ConversationWithDetails) => {
        router.push({
            pathname: '/chat/[id]',
            params: { id: conversation.id }
        });
    }, [router]);

    // Memoized renderItem for FlatList performance
    const renderConversationItem = useCallback(({ item }: { item: ConversationWithDetails }) => {
        return (
            <ConversationItem
                item={item}
                isEditMode={isEditMode}
                isSelected={selectedIds.has(item.id)}
                onPress={handleConversationPress}
                onToggleSelection={toggleSelection}
                cardBg={cardBg}
                borderColor={borderColor}
                textColor={textColor}
                secondaryTextColor={secondaryTextColor}
            />
        );
    }, [isEditMode, selectedIds, handleConversationPress, toggleSelection, cardBg, borderColor, textColor, secondaryTextColor]);

    // Memoized keyExtractor
    const keyExtractor = useCallback((item: ConversationWithDetails) => item.id, []);

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="chat-outline" size={80} color={mutedColor} />
            <ThemedText style={styles.emptyTitle}>No Conversations Yet</ThemedText>
            <ThemedText style={[styles.emptySubtext, { color: secondaryTextColor }]}>
                Start chatting with sellers by visiting a listing and tapping "Chat"
            </ThemedText>
            <Pressable
                style={[styles.browseButton, { backgroundColor: BRAND_COLOR }]}
                onPress={() => router.push('/(tabs)')}
            >
                <Ionicons name="search" size={20} color="white" />
                <Text style={styles.browseButtonText}>Browse Listings</Text>
            </Pressable>
        </View>
    );

    // Not authenticated
    if (!user) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
                <ScreenHeader title="Messages" rightAction={EditButton} />
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="account-lock" size={80} color={mutedColor} />
                    <ThemedText style={styles.emptyTitle}>Sign In Required</ThemedText>
                    <ThemedText style={[styles.emptySubtext, { color: secondaryTextColor }]}>
                        Please sign in to view your messages
                    </ThemedText>
                    <Pressable
                        style={[styles.browseButton, { backgroundColor: BRAND_COLOR }]}
                        onPress={() => router.push('/(auth)')}
                    >
                        <Text style={styles.browseButtonText}>Sign In</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
            <ScreenHeader title="Messages" rightAction={EditButton} />

            <FlatList
                data={conversations}
                renderItem={renderConversationItem}
                keyExtractor={keyExtractor}
                extraData={{ isEditMode, selectedIds: Array.from(selectedIds) }}
                contentContainerStyle={conversations.length === 0 ? styles.emptyList : undefined}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        tintColor={BRAND_COLOR}
                    />
                }
                // Performance optimizations
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={10}
                initialNumToRender={8}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    editButton: {
        padding: SPACING.xs,
    },
    checkboxContainer: {
        marginRight: SPACING.sm,
    },
    selectedItem: {
        backgroundColor: 'rgba(255, 59, 48, 0.08)',
    },
    emptyList: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.section,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '600',
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
    },
    emptySubtext: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
    },
    browseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xxl,
        borderRadius: BORDER_RADIUS.pill,
        marginTop: SPACING.xxl,
        gap: SPACING.sm,
    },
    browseButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    conversationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
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
        borderRadius: BORDER_RADIUS.sm,
    },
    imagePlaceholder: {
        width: 56,
        height: 56,
        borderRadius: BORDER_RADIUS.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unreadBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        borderRadius: BORDER_RADIUS.md,
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
        marginLeft: SPACING.md,
        marginRight: SPACING.sm,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    userName: {
        fontSize: 13,
        fontWeight: '400',
        flex: 1,
        marginRight: SPACING.sm,
    },
    unreadUserName: {
        fontWeight: '600',
    },
    time: {
        fontSize: 12,
    },
    listingTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    unreadListingTitle: {
        fontWeight: '700',
    },
    lastMessage: {
        fontSize: 14,
    },
    unreadMessage: {
        fontWeight: '600',
    },
});
