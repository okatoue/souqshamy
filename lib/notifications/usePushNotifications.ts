import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../auth_context';
import NotificationService from './NotificationService';
import { AppNotification } from '../../types/notifications';

interface UsePushNotificationsReturn {
    expoPushToken: string | null;
    notification: any | null;
    isRegistering: boolean;
    permissionStatus: string | null;
    requestPermission: () => Promise<boolean>;
    isAvailable: boolean;
}

export function usePushNotifications(): UsePushNotificationsReturn {
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [notification, setNotification] = useState<any | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
    const [isAvailable, setIsAvailable] = useState(false);

    // Store subscriptions and module reference for cleanup
    const notificationListener = useRef<any>(null);
    const responseListener = useRef<any>(null);
    const notificationsModuleRef = useRef<typeof import('expo-notifications') | null>(null);

    const router = useRouter();
    const { user } = useAuth();

    // Handle notification tap - navigate to appropriate screen
    const handleNotificationResponse = useCallback((response: any) => {
        const data = response?.notification?.request?.content?.data as (AppNotification['data'] & { type?: string }) | undefined;

        if (!data) {
            console.log('[Notifications] No data in notification response');
            return;
        }

        console.log('[Notifications] User tapped notification:', data);

        // Navigate based on notification type
        switch (data.type) {
            case 'new_message':
            case 'new_inquiry':
                if (data.conversation_id) {
                    router.push(`/chat/${data.conversation_id}`);
                }
                break;

            case 'listing_favorited':
            case 'price_drop':
            case 'listing_sold':
                if (data.listing_id) {
                    router.push(`/listing/${data.listing_id}`);
                }
                break;

            case 'promotion':
                if (data.action_url) {
                    router.push(data.action_url);
                }
                break;

            default:
                // Default: go to notifications center
                router.push('/notifications');
        }
    }, [router]);

    // Register and save token when user is authenticated
    const registerAndSaveToken = useCallback(async () => {
        if (!user) return;

        setIsRegistering(true);
        try {
            const token = await NotificationService.registerForPushNotifications();

            if (token) {
                setExpoPushToken(token);
                await NotificationService.savePushToken(user.id);
            }

            // Get current permission status
            const Notifications = NotificationService.getNotificationsModule();
            if (Notifications) {
                const { status } = await Notifications.getPermissionsAsync();
                setPermissionStatus(status);
            }

            setIsAvailable(NotificationService.isAvailable());
        } finally {
            setIsRegistering(false);
        }
    }, [user]);

    // Manual permission request
    const requestPermission = useCallback(async (): Promise<boolean> => {
        const Notifications = NotificationService.getNotificationsModule();
        if (!Notifications) {
            console.log('[Notifications] Module not available');
            return false;
        }

        const { status } = await Notifications.requestPermissionsAsync();
        setPermissionStatus(status);

        if (status === 'granted') {
            await registerAndSaveToken();
            return true;
        }
        return false;
    }, [registerAndSaveToken]);

    // Setup on mount
    useEffect(() => {
        let mounted = true;

        const setup = async () => {
            // Initialize the notification service first
            await NotificationService.initialize();

            if (!mounted) return;

            setIsAvailable(NotificationService.isAvailable());

            // Register for notifications if user is logged in
            if (user) {
                await registerAndSaveToken();
            }

            const Notifications = NotificationService.getNotificationsModule();
            if (!Notifications) return;

            // Store module reference for cleanup
            notificationsModuleRef.current = Notifications;

            // Listener for notifications received while app is foregrounded
            notificationListener.current = Notifications.addNotificationReceivedListener(notif => {
                console.log('[Notifications] Received in foreground:', notif);
                if (mounted) {
                    setNotification(notif);
                }
            });

            // Listener for when user taps notification
            responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
        };

        setup();

        // Cleanup
        return () => {
            mounted = false;

            // Use the stored module reference for cleanup
            const Notifications = notificationsModuleRef.current;

            try {
                if (notificationListener.current) {
                    if (Notifications?.removeNotificationSubscription) {
                        Notifications.removeNotificationSubscription(notificationListener.current);
                    } else if (notificationListener.current?.remove) {
                        // Fallback: some versions use .remove() on the subscription itself
                        notificationListener.current.remove();
                    }
                    notificationListener.current = null;
                }

                if (responseListener.current) {
                    if (Notifications?.removeNotificationSubscription) {
                        Notifications.removeNotificationSubscription(responseListener.current);
                    } else if (responseListener.current?.remove) {
                        responseListener.current.remove();
                    }
                    responseListener.current = null;
                }
            } catch (error) {
                console.log('[Notifications] Cleanup error (non-critical):', error);
            }
        };
    }, [user, registerAndSaveToken, handleNotificationResponse]);

    // Handle app opened from killed state via notification
    useEffect(() => {
        const checkLastNotification = async () => {
            await NotificationService.initialize();

            const Notifications = NotificationService.getNotificationsModule();
            if (!Notifications) return;

            try {
                const response = await Notifications.getLastNotificationResponseAsync();
                if (response) {
                    console.log('[Notifications] App opened from notification');
                    handleNotificationResponse(response);
                }
            } catch (error) {
                console.log('[Notifications] Error checking last notification:', error);
            }
        };

        checkLastNotification();
    }, [handleNotificationResponse]);

    return {
        expoPushToken,
        notification,
        isRegistering,
        permissionStatus,
        requestPermission,
        isAvailable,
    };
}
