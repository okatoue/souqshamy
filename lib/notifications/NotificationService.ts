import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../supabase';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

class NotificationService {
    private static instance: NotificationService;
    private expoPushToken: string | null = null;

    private constructor() {}

    static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    /**
     * Request notification permissions and get push token
     */
    async registerForPushNotifications(): Promise<string | null> {
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

            // Upsert token (update if exists, insert if not)
            const { error } = await supabase
                .from('push_tokens')
                .upsert(
                    {
                        user_id: userId,
                        expo_push_token: this.expoPushToken,
                        device_type: deviceType,
                        device_name: deviceName,
                        last_used_at: new Date().toISOString(),
                        is_active: true,
                    },
                    {
                        onConflict: 'expo_push_token',
                    }
                );

            if (error) {
                console.error('[Notifications] Error saving token:', error);
                return false;
            }

            console.log('[Notifications] Token saved successfully');
            return true;
        } catch (error) {
            console.error('[Notifications] Error saving token:', error);
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
        return await Notifications.getBadgeCountAsync();
    }

    /**
     * Set badge count
     */
    async setBadgeCount(count: number): Promise<void> {
        await Notifications.setBadgeCountAsync(count);
    }

    /**
     * Clear all notifications
     */
    async clearAllNotifications(): Promise<void> {
        await Notifications.dismissAllNotificationsAsync();
        await this.setBadgeCount(0);
    }
}

export default NotificationService.getInstance();
