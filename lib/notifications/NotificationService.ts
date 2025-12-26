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

        console.log('[Notifications] Module initialized successfully');
        return true;
    } catch (error) {
        console.log('[Notifications] Native module not available (running in Expo Go or simulator)');
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
            console.log('[Notifications] Push notifications not available in this environment');
            return null;
        }

        // Must be a physical device
        if (!Device.isDevice) {
            console.log('[Notifications] Push notifications require a physical device');
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
                console.log('[Notifications] Permission not granted');
                return null;
            }

            // Get Expo push token
            const projectId = Constants.expoConfig?.extra?.eas?.projectId
                ?? Constants.easConfig?.projectId;

            if (!projectId) {
                console.error('[Notifications] No project ID found');
                return null;
            }

            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId,
            });

            this.expoPushToken = tokenData.data;
            console.log('[Notifications] Push token:', this.expoPushToken);

            // Configure Android channel
            if (Platform.OS === 'android') {
                await this.setupAndroidChannels();
            }

            return this.expoPushToken;
        } catch (error) {
            console.error('[Notifications] Error registering:', error);
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
            console.log('[Notifications] No token to save');
            return false;
        }

        try {
            const deviceType = Platform.OS as 'ios' | 'android';
            const deviceName = Device.deviceName || `${Device.brand} ${Device.modelName}`;

            console.log('[Notifications] Saving token for user:', userId);
            console.log('[Notifications] Token:', this.expoPushToken);
            console.log('[Notifications] Device:', deviceType, deviceName);

            // Check auth state
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            console.log('[Notifications] Auth session check - user:', session?.user?.id);
            console.log('[Notifications] Auth session check - matches userId:', session?.user?.id === userId);
            if (authError) {
                console.error('[Notifications] Auth error:', authError);
            }

            // Use the database function to handle upsert with ownership transfer
            // This bypasses RLS issues when a token needs to be transferred between users
            console.log('[Notifications] Calling upsert_push_token RPC function');

            const { data: tokenId, error: rpcError } = await supabase.rpc('upsert_push_token', {
                p_user_id: userId,
                p_expo_push_token: this.expoPushToken,
                p_device_type: deviceType,
                p_device_name: deviceName,
            });

            if (rpcError) {
                console.error('[Notifications] RPC error:', JSON.stringify(rpcError));
                console.error('[Notifications] RPC error message:', rpcError?.message);
                console.error('[Notifications] RPC error code:', rpcError?.code);
                console.error('[Notifications] RPC error details:', rpcError?.details);
                console.error('[Notifications] RPC error hint:', rpcError?.hint);
                return false;
            }

            console.log('[Notifications] Token saved with id:', tokenId);

            console.log('[Notifications] Token saved successfully');
            return true;
        } catch (error: any) {
            console.error('[Notifications] Exception saving token:', JSON.stringify(error, null, 2));
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

            console.log('[Notifications] Token deactivated');
        } catch (error) {
            console.error('[Notifications] Error deactivating token:', error);
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
                console.error('[Notifications] Error sending push:', error);
                return false;
            }

            console.log('[Notifications] Push send result:', data);
            return data?.sent > 0;
        } catch (error) {
            console.error('[Notifications] Exception sending push:', error);
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
                console.error('[Notifications] Batch process error:', error);
                return { sent: 0, failed: 0, skipped: 0 };
            }

            console.log('[Notifications] Batch process result:', data);
            // Log debug info if available
            if (data?.debug && data.debug.length > 0) {
                console.log('[Notifications] Debug info:');
                data.debug.forEach((msg: string) => console.log('  ', msg));
            }
            return {
                sent: data?.sent || 0,
                failed: data?.failed || 0,
                skipped: data?.skipped || 0,
            };
        } catch (error) {
            console.error('[Notifications] Exception in batch process:', error);
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
                console.error('[Notifications] Error getting unread count:', error);
                return 0;
            }

            return count || 0;
        } catch (error) {
            console.error('[Notifications] Exception getting unread count:', error);
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
                console.error('[Notifications] Error marking as read:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('[Notifications] Exception marking as read:', error);
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
                console.error('[Notifications] Error marking all as read:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('[Notifications] Exception marking all as read:', error);
            return false;
        }
    }
}

export default NotificationService.getInstance();
