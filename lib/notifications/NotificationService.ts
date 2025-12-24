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
                shouldShowAlert: true,
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

            // Upsert token (update if exists, insert if not)
            const { data, error } = await supabase
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
                )
                .select();

            if (error) {
                console.error('[Notifications] Error saving token - raw error:', JSON.stringify(error));
                console.error('[Notifications] Error saving token - error type:', typeof error);
                console.error('[Notifications] Error saving token - error keys:', Object.keys(error));
                console.error('[Notifications] Error saving token - message:', error.message);
                console.error('[Notifications] Error saving token - code:', error.code);
                console.error('[Notifications] Error saving token - details:', error.details);
                console.error('[Notifications] Error saving token - hint:', error.hint);
                return false;
            }

            console.log('[Notifications] Token saved successfully:', data);
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
}

export default NotificationService.getInstance();
