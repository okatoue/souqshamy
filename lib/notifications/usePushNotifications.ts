import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../auth_context';
import NotificationService from './NotificationService';
import { AppNotification } from '../../types/notifications';

// Type for expo-notifications module
type NotificationsModule = typeof import('expo-notifications');

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

    const notificationListener = useRef<any>();
    const responseListener = useRef<any>();

    const router = useRouter();
    const { user } = useAuth();

    // Handle notification tap - navigate to appropriate screen
    const handleNotificationResponse = useCallback((response: any) => {
        const data = response.notification.request.content.data as AppNotification['data'] & { type?: string };

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

            // Listener for notifications received while app is foregrounded
            notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
                console.log('[Notifications] Received in foreground:', notification);
                if (mounted) {
                    setNotification(notification);
                }
            });

            // Listener for when user taps notification
            responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
        };

        setup();

        // Cleanup
        return () => {
            mounted = false;
            const Notifications = NotificationService.getNotificationsModule();
            if (Notifications) {
                if (notificationListener.current) {
                    Notifications.removeNotificationSubscription(notificationListener.current);
                }
                if (responseListener.current) {
                    Notifications.removeNotificationSubscription(responseListener.current);
                }
            }
        };
    }, [user, registerAndSaveToken, handleNotificationResponse]);

    // Handle app opened from killed state via notification
    useEffect(() => {
        const checkLastNotification = async () => {
            const Notifications = NotificationService.getNotificationsModule();
            if (!Notifications) return;

            const response = await Notifications.getLastNotificationResponseAsync();
            if (response) {
                console.log('[Notifications] App opened from notification');
                handleNotificationResponse(response);
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
