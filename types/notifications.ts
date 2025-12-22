export type NotificationType =
    | 'new_message'
    | 'listing_favorited'
    | 'price_drop'
    | 'new_inquiry'
    | 'promotion'
    | 'listing_sold'
    | 'system';

export interface PushToken {
    id: string;
    user_id: string;
    expo_push_token: string;
    device_type: 'ios' | 'android' | 'web';
    device_name?: string;
    last_used_at: string;
    created_at: string;
    is_active: boolean;
}

export interface AppNotification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    body: string;
    data: Record<string, any>;
    image_url?: string;
    is_read: boolean;
    is_pushed: boolean;
    push_sent_at?: string;
    created_at: string;
}

export interface NotificationPreferences {
    push_enabled: boolean;
    message_notifs: boolean;
    listing_notifs: boolean;
    price_drop_notifs: boolean;
    promo_notifs: boolean;
}

export interface NotificationPayload {
    to: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    sound?: 'default' | null;
    badge?: number;
    channelId?: string;
    priority?: 'default' | 'normal' | 'high';
    ttl?: number;
}
