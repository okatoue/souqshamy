import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../supabase';

// Lazy-loaded notifications module to avoid crashes in Expo Go
let Notifications: typeof import('expo-notifications') | null = null;
let isNotificationsAvailable = false;

// Initialize notifications module safely
async function initializeNotifications(): Promise<boolean> {
    if (Notifications !== null) {
        return isNotificationsAvailable;
    }

    try {
        Notifications = await import('expo-notifications');
        isNotificationsAvailable = true;

        // Configure how notifications appear when app is in foreground
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });

        return true;
    } catch (error) {
        isNotificationsAvailable = false;
        return false;
    }
}

class NotificationService {
    private static instance: NotificationService;
    private expoPushToken: string | null = null;
    private initialized = false;

    private constructor() {}

    static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    /**
     * Check if notifications are available
     */
    isAvailable(): boolean {
        return isNotificationsAvailable;
    }

    /**
     * Request notification permissions and get push token
     */
    async registerForPushNotifications(): Promise<string | null> {
        // Initialize notifications module if not already done
        if (!this.initialized) {
            await initializeNotifications();
            this.initialized = true;
        }

        if (!isNotificationsAvailable || !Notifications) {
            return null;
        }

        // Must be a physical device
        if (!Device.isDevice) {
            return null;
        }

        try {
            // Check existing permissions
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            // Request permission if not granted
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                return null;
            }

            // Get Expo push token
            const projectId = Constants.expoConfig?.extra?.eas?.projectId
                ?? Constants.easConfig?.projectId;

            if (!projectId) {
                return null;
            }

            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId,
            });

            this.expoPushToken = tokenData.data;

            // Configure Android channel
            if (Platform.OS === 'android') {
                await this.setupAndroidChannels();
            }

            return this.expoPushToken;
        } catch (error) {
            return null;
        }
    }

    /**
     * Setup Android notification channels
     */
    private async setupAndroidChannels(): Promise<void> {
        if (!Notifications) return;

        // Messages channel (high priority)
        await Notifications.setNotificationChannelAsync('messages', {
            name: 'Messages',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#18AEF2',
            sound: 'default',
        });

        // Listing activity channel
        await Notifications.setNotificationChannelAsync('listing-activity', {
            name: 'Listing Activity',
            importance: Notifications.AndroidImportance.DEFAULT,
            sound: 'default',
        });

        // Promotions channel (lower priority)
        await Notifications.setNotificationChannelAsync('promotions', {
            name: 'Promotions & Updates',
            importance: Notifications.AndroidImportance.LOW,
        });
    }

    /**
     * Save push token to database
     */
    async savePushToken(userId: string): Promise<boolean> {
        if (!this.expoPushToken) {
            return false;
        }

        try {
            const deviceType = Platform.OS as 'ios' | 'android';
            const deviceName = Device.deviceName || `${Device.brand} ${Device.modelName}`;

            const { error: rpcError } = await supabase.rpc('upsert_push_token', {
                p_user_id: userId,
                p_expo_push_token: this.expoPushToken,
                p_device_type: deviceType,
                p_device_name: deviceName,
            });

            if (rpcError) {
                return false;
            }

            return true;
        } catch (error: any) {
            return false;
        }
    }

    /**
     * Deactivate push token (on logout)
     */
    async deactivatePushToken(): Promise<void> {
        if (!this.expoPushToken) return;

        try {
            await supabase
                .from('push_tokens')
                .update({ is_active: false })
                .eq('expo_push_token', this.expoPushToken);
        } catch (error) {
            // Silently fail
        }
    }

    /**
     * Get current push token
     */
    getToken(): string | null {
        return this.expoPushToken;
    }

    /**
     * Get badge count
     */
    async getBadgeCount(): Promise<number> {
        if (!isNotificationsAvailable || !Notifications) return 0;
        return await Notifications.getBadgeCountAsync();
    }

    /**
     * Set badge count
     */
    async setBadgeCount(count: number): Promise<void> {
        if (!isNotificationsAvailable || !Notifications) return;
        await Notifications.setBadgeCountAsync(count);
    }

    /**
     * Clear all notifications
     */
    async clearAllNotifications(): Promise<void> {
        if (!isNotificationsAvailable || !Notifications) return;
        await Notifications.dismissAllNotificationsAsync();
        await this.setBadgeCount(0);
    }

    /**
     * Get notifications module (for use in hooks)
     */
    getNotificationsModule(): typeof import('expo-notifications') | null {
        return Notifications;
    }

    /**
     * Initialize the service (call early in app lifecycle)
     */
    async initialize(): Promise<void> {
        if (!this.initialized) {
            await initializeNotifications();
            this.initialized = true;
        }
    }

    /**
     * Manually trigger sending a specific notification (for testing)
     * In production, this is handled by database triggers or cron
     */
    async sendPushNotification(notificationId: string): Promise<boolean> {
        try {
            const { data, error } = await supabase.functions.invoke('send-push-notification', {
                body: { notification_id: notificationId },
            });

            if (error) {
                return false;
            }

            return data?.sent > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Process all pending notifications (admin/debug use)
     * Returns count of sent and failed notifications
     */
    async processPendingNotifications(limit = 100): Promise<{ sent: number; failed: number; skipped: number }> {
        try {
            const { data, error } = await supabase.functions.invoke('send-push-notification', {
                body: { batch_mode: true, limit },
            });

            if (error) {
                return { sent: 0, failed: 0, skipped: 0 };
            }

            return {
                sent: data?.sent || 0,
                failed: data?.failed || 0,
                skipped: data?.skipped || 0,
            };
        } catch (error) {
            return { sent: 0, failed: 0, skipped: 0 };
        }
    }

    /**
     * Get unread notification count for current user
     */
    async getUnreadCount(userId: string): Promise<number> {
        try {
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false);

            if (error) {
                return 0;
            }

            return count || 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Mark notifications as read
     */
    async markAsRead(notificationIds: string[]): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .in('id', notificationIds);

            if (error) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false);

            if (error) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }
}

export default NotificationService.getInstance();
