-- Migration: Add push notifications infrastructure
-- Description: Creates tables and functions for push notifications support

-- =============================================================================
-- Push Tokens Table
-- Stores Expo push tokens for each user's devices
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expo_push_token TEXT NOT NULL,
    device_type TEXT CHECK (device_type IN ('ios', 'android', 'web')),
    device_name TEXT,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,

    CONSTRAINT unique_token UNIQUE (expo_push_token)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON public.push_tokens(user_id, is_active) WHERE is_active = TRUE;

-- RLS Policies
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'push_tokens_select_own' AND tablename = 'push_tokens'
    ) THEN
        CREATE POLICY "push_tokens_select_own" ON public.push_tokens
            FOR SELECT TO authenticated
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'push_tokens_insert_own' AND tablename = 'push_tokens'
    ) THEN
        CREATE POLICY "push_tokens_insert_own" ON public.push_tokens
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'push_tokens_update_own' AND tablename = 'push_tokens'
    ) THEN
        CREATE POLICY "push_tokens_update_own" ON public.push_tokens
            FOR UPDATE TO authenticated
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'push_tokens_delete_own' AND tablename = 'push_tokens'
    ) THEN
        CREATE POLICY "push_tokens_delete_own" ON public.push_tokens
            FOR DELETE TO authenticated
            USING (auth.uid() = user_id);
    END IF;
END $$;

COMMENT ON TABLE public.push_tokens IS 'Expo push notification tokens for user devices';

-- =============================================================================
-- Notifications Table
-- In-app notification center / history
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'new_message',
        'listing_favorited',
        'price_drop',
        'new_inquiry',
        'promotion',
        'listing_sold',
        'system'
    )),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    image_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    is_pushed BOOLEAN DEFAULT FALSE,
    push_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_pending_push ON public.notifications(is_pushed) WHERE is_pushed = FALSE;

-- RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'notifications_select_own' AND tablename = 'notifications'
    ) THEN
        CREATE POLICY "notifications_select_own" ON public.notifications
            FOR SELECT TO authenticated
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'notifications_update_own' AND tablename = 'notifications'
    ) THEN
        CREATE POLICY "notifications_update_own" ON public.notifications
            FOR UPDATE TO authenticated
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'notifications_insert_service' AND tablename = 'notifications'
    ) THEN
        -- Service role can insert (from edge functions/triggers)
        CREATE POLICY "notifications_insert_service" ON public.notifications
            FOR INSERT TO service_role
            WITH CHECK (TRUE);
    END IF;
END $$;

COMMENT ON TABLE public.notifications IS 'In-app notification center and push notification queue';

-- =============================================================================
-- Add Notification Preferences to Profiles
-- =============================================================================

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS message_notifs BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS listing_notifs BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS price_drop_notifs BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS promo_notifs BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.profiles.push_enabled IS 'Master toggle for push notifications';
COMMENT ON COLUMN public.profiles.message_notifs IS 'Notify when receiving new messages';
COMMENT ON COLUMN public.profiles.listing_notifs IS 'Notify when listings get activity';
COMMENT ON COLUMN public.profiles.price_drop_notifs IS 'Notify when favorited items drop in price';
COMMENT ON COLUMN public.profiles.promo_notifs IS 'Notify for promotions and updates';

-- =============================================================================
-- Function: Get user's active push tokens
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_push_tokens(target_user_id UUID)
RETURNS TABLE (expo_push_token TEXT, device_type TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT pt.expo_push_token, pt.device_type
    FROM public.push_tokens pt
    WHERE pt.user_id = target_user_id
    AND pt.is_active = TRUE;
END;
$$;

-- =============================================================================
-- Function: Check if user wants this notification type
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_wants_notification(
    target_user_id UUID,
    notification_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_prefs RECORD;
BEGIN
    SELECT push_enabled, message_notifs, listing_notifs, price_drop_notifs, promo_notifs
    INTO user_prefs
    FROM public.profiles
    WHERE id = target_user_id;

    -- If no profile or push disabled, return false
    IF NOT FOUND OR NOT user_prefs.push_enabled THEN
        RETURN FALSE;
    END IF;

    -- Check specific notification type
    CASE notification_type
        WHEN 'new_message', 'new_inquiry' THEN
            RETURN user_prefs.message_notifs;
        WHEN 'listing_favorited', 'listing_sold' THEN
            RETURN user_prefs.listing_notifs;
        WHEN 'price_drop' THEN
            RETURN user_prefs.price_drop_notifs;
        WHEN 'promotion' THEN
            RETURN user_prefs.promo_notifs;
        WHEN 'system' THEN
            RETURN TRUE; -- System notifications always sent
        ELSE
            RETURN TRUE;
    END CASE;
END;
$$;

-- =============================================================================
-- Function: Create notification and return ID
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_notification(
    target_user_id UUID,
    notification_type TEXT,
    notification_title TEXT,
    notification_body TEXT,
    notification_data JSONB DEFAULT '{}',
    notification_image TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_id UUID;
BEGIN
    -- Check if user wants this type of notification
    IF NOT public.user_wants_notification(target_user_id, notification_type) THEN
        RETURN NULL;
    END IF;

    INSERT INTO public.notifications (
        user_id, type, title, body, data, image_url
    ) VALUES (
        target_user_id, notification_type, notification_title,
        notification_body, notification_data, notification_image
    )
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$$;
