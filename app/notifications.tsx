import React, { useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useNotifications } from '@/lib/notifications/useNotifications';
import { AppNotification } from '@/types/notifications';
import { BackButton } from '@/components/ui/BackButton';
import { BRAND_COLOR, SPACING } from '@/constants/theme';

// Simple time formatting function
function formatTimeAgo(date: Date): string {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

// Notification type icons
const NOTIFICATION_ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
    new_message: { name: 'chatbubble', color: '#007AFF' },
    new_inquiry: { name: 'chatbubbles', color: '#007AFF' },
    listing_favorited: { name: 'heart', color: '#FF3B30' },
    price_drop: { name: 'pricetag', color: '#4CD964' },
    listing_sold: { name: 'checkmark-circle', color: '#FF9500' },
    promotion: { name: 'megaphone', color: '#5856D6' },
    system: { name: 'information-circle', color: '#8E8E93' },
};

export default function NotificationsScreen() {
    const router = useRouter();
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'border');
    const mutedColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');
    const cardBackground = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');

    const {
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
    } = useNotifications();

    const handleNotificationPress = useCallback(async (notification: AppNotification) => {
        // Mark as read
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }

        // Navigate based on type
        const { type, data } = notification;

        switch (type) {
            case 'new_message':
            case 'new_inquiry':
                if (data?.conversation_id) {
                    router.push(`/chat/${data.conversation_id}`);
                }
                break;
            case 'listing_favorited':
            case 'price_drop':
            case 'listing_sold':
                if (data?.listing_id) {
                    router.push(`/listing/${data.listing_id}`);
                }
                break;
            default:
                break;
        }
    }, [markAsRead, router]);

    const handleDelete = useCallback((notification: AppNotification) => {
        Alert.alert(
            'Delete Notification',
            'Are you sure you want to delete this notification?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteNotification(notification.id),
                },
            ]
        );
    }, [deleteNotification]);

    const handleClearAll = useCallback(() => {
        Alert.alert(
            'Clear All Notifications',
            'Are you sure you want to delete all notifications?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: clearAllNotifications,
                },
            ]
        );
    }, [clearAllNotifications]);

    const renderNotification = ({ item }: { item: AppNotification }) => {
        const iconConfig = NOTIFICATION_ICONS[item.type] || NOTIFICATION_ICONS.system;

        return (
            <TouchableOpacity
                style={[
                    styles.notificationItem,
                    { backgroundColor: item.is_read ? cardBackground : `${BRAND_COLOR}10` },
                    { borderBottomColor: borderColor },
                ]}
                onPress={() => handleNotificationPress(item)}
                onLongPress={() => handleDelete(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: `${iconConfig.color}20` }]}>
                    <Ionicons name={iconConfig.name} size={24} color={iconConfig.color} />
                </View>

                <View style={styles.contentContainer}>
                    <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text style={[styles.body, { color: mutedColor }]} numberOfLines={2}>
                        {item.body}
                    </Text>
                    <Text style={[styles.time, { color: mutedColor }]}>
                        {formatTimeAgo(new Date(item.created_at))}
                    </Text>
                </View>

                {!item.is_read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={mutedColor} />
            <Text style={[styles.emptyText, { color: textColor }]}>
                No notifications yet
            </Text>
            <Text style={[styles.emptySubtext, { color: mutedColor }]}>
                You'll see updates about your messages, listings, and favorites here
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: textColor }]}>Notifications</Text>
                {notifications.length > 0 ? (
                    <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
                        <Ionicons name="trash-outline" size={22} color={mutedColor} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.headerSpacer} />
                )}
            </View>

            {/* Mark all as read button */}
            {unreadCount > 0 && (
                <TouchableOpacity
                    style={[styles.markAllButton, { borderBottomColor: borderColor }]}
                    onPress={markAllAsRead}
                >
                    <Ionicons name="checkmark-done" size={18} color={BRAND_COLOR} />
                    <Text style={[styles.markAllText, { color: BRAND_COLOR }]}>
                        Mark all as read ({unreadCount})
                    </Text>
                </TouchableOpacity>
            )}

            {/* Notifications List */}
            <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={(item) => item.id}
                contentContainerStyle={notifications.length === 0 ? styles.emptyList : undefined}
                ListEmptyComponent={renderEmpty}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoading}
                        onRefresh={fetchNotifications}
                        tintColor={BRAND_COLOR}
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    headerSpacer: {
        width: 40,
    },
    clearButton: {
        padding: 8,
    },
    markAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 6,
    },
    markAllText: {
        fontSize: 14,
        fontWeight: '500',
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    contentContainer: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    body: {
        fontSize: 14,
        marginBottom: 4,
    },
    time: {
        fontSize: 12,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: BRAND_COLOR,
        marginLeft: 8,
    },
    emptyList: {
        flexGrow: 1,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        textAlign: 'center',
    },
});
