import { useEffect, useRef, useCallback, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuth } from '../auth_context';
import NotificationService from './NotificationService';
import { AppNotification } from '../../types/notifications';

interface UsePushNotificationsReturn {
    expoPushToken: string | null;
    notification: Notifications.Notification | null;
    isRegistering: boolean;
    permissionStatus: Notifications.PermissionStatus | null;
    requestPermission: () => Promise<boolean>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [notification, setNotification] = useState<Notifications.Notification | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | null>(null);

    const notificationListener = useRef<Notifications.Subscription>();
    const responseListener = useRef<Notifications.Subscription>();

    const router = useRouter();
    const { user } = useAuth();

    // Handle notification tap - navigate to appropriate screen
    const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
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
            const { status } = await Notifications.getPermissionsAsync();
            setPermissionStatus(status);
        } finally {
            setIsRegistering(false);
        }
    }, [user]);

    // Manual permission request
    const requestPermission = useCallback(async (): Promise<boolean> => {
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
        // Register for notifications if user is logged in
        if (user) {
            registerAndSaveToken();
        }

        // Listener for notifications received while app is foregrounded
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('[Notifications] Received in foreground:', notification);
            setNotification(notification);
        });

        // Listener for when user taps notification
        responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

        // Cleanup
        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, [user, registerAndSaveToken, handleNotificationResponse]);

    // Handle app opened from killed state via notification
    useEffect(() => {
        Notifications.getLastNotificationResponseAsync().then(response => {
            if (response) {
                console.log('[Notifications] App opened from notification');
                handleNotificationResponse(response);
            }
        });
    }, [handleNotificationResponse]);

    return {
        expoPushToken,
        notification,
        isRegistering,
        permissionStatus,
        requestPermission,
    };
}
