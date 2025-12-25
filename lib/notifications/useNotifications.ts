import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../auth_context';
import { AppNotification, NotificationPreferences } from '../../types/notifications';
import NotificationService from './NotificationService';

interface UseNotificationsReturn {
    notifications: AppNotification[];
    unreadCount: number;
    isLoading: boolean;
    preferences: NotificationPreferences | null;
    preferencesLoading: boolean;
    fetchNotifications: () => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (notificationId: string) => Promise<void>;
    clearAllNotifications: () => Promise<void>;
    updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<boolean>;
}

export function useNotifications(): UseNotificationsReturn {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
    const [preferencesLoading, setPreferencesLoading] = useState(true);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            setNotifications(data || []);

            // Update unread count
            const unread = (data || []).filter(n => !n.is_read).length;
            setUnreadCount(unread);

            // Update badge
            await NotificationService.setBadgeCount(unread);
        } catch (error) {
            console.error('[useNotifications] Fetch error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // Fetch preferences
    const fetchPreferences = useCallback(async () => {
        if (!user) return;

        try {
            setPreferencesLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('push_enabled, message_notifs, listing_notifs, price_drop_notifs, promo_notifs')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            setPreferences(data as NotificationPreferences);
        } catch (error) {
            console.error('[useNotifications] Preferences fetch error:', error);
            // Set defaults if fetch fails
            setPreferences({
                push_enabled: true,
                message_notifs: true,
                listing_notifs: true,
                price_drop_notifs: true,
                promo_notifs: false,
            });
        } finally {
            setPreferencesLoading(false);
        }
    }, [user]);

    // Mark single notification as read
    const markAsRead = useCallback(async (notificationId: string) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId)
                .eq('user_id', user.id);

            if (error) throw error;

            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );

            setUnreadCount(prev => {
                const newCount = Math.max(0, prev - 1);
                NotificationService.setBadgeCount(newCount);
                return newCount;
            });
        } catch (error) {
            console.error('[useNotifications] Mark read error:', error);
        }
    }, [user]);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (error) throw error;

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
            await NotificationService.setBadgeCount(0);
        } catch (error) {
            console.error('[useNotifications] Mark all read error:', error);
        }
    }, [user]);

    // Delete notification
    const deleteNotification = useCallback(async (notificationId: string) => {
        if (!user) return;

        try {
            const notification = notifications.find(n => n.id === notificationId);

            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId)
                .eq('user_id', user.id);

            if (error) throw error;

            setNotifications(prev => prev.filter(n => n.id !== notificationId));

            if (notification && !notification.is_read) {
                setUnreadCount(prev => {
                    const newCount = Math.max(0, prev - 1);
                    NotificationService.setBadgeCount(newCount);
                    return newCount;
                });
            }
        } catch (error) {
            console.error('[useNotifications] Delete error:', error);
        }
    }, [user, notifications]);

    // Clear all notifications
    const clearAllNotifications = useCallback(async () => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('user_id', user.id);

            if (error) throw error;

            setNotifications([]);
            setUnreadCount(0);
            await NotificationService.setBadgeCount(0);
        } catch (error) {
            console.error('[useNotifications] Clear all error:', error);
        }
    }, [user]);

    // Update preferences
    const updatePreferences = useCallback(async (prefs: Partial<NotificationPreferences>): Promise<boolean> => {
        if (!user) return false;

        try {
            const { error } = await supabase
                .from('profiles')
                .update(prefs)
                .eq('id', user.id);

            if (error) throw error;

            setPreferences(prev => prev ? { ...prev, ...prefs } : null);
            return true;
        } catch (error) {
            console.error('[useNotifications] Update preferences error:', error);
            return false;
        }
    }, [user]);

    // Initial fetch
    useEffect(() => {
        if (user) {
            fetchNotifications();
            fetchPreferences();
        } else {
            setNotifications([]);
            setUnreadCount(0);
            setPreferences(null);
        }
    }, [user, fetchNotifications, fetchPreferences]);

    // Real-time subscription for new notifications
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`notifications-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('[useNotifications] New notification:', payload);
                    const newNotification = payload.new as AppNotification;
                    setNotifications(prev => [newNotification, ...prev]);
                    setUnreadCount(prev => {
                        const newCount = prev + 1;
                        NotificationService.setBadgeCount(newCount);
                        return newCount;
                    });
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [user]);

    return {
        notifications,
        unreadCount,
        isLoading,
        preferences,
        preferencesLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
        updatePreferences,
    };
}
