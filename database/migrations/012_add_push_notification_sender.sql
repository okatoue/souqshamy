-- Migration: Add push notification sender trigger
-- Description: Creates a trigger to call the Edge Function when notifications are created
-- Dependencies: 011_add_notification_triggers.sql, pg_net extension (optional)

-- =============================================================================
-- Option 1: Using pg_net extension (recommended if available)
-- =============================================================================

-- Check if pg_net is available and create trigger
DO $$
BEGIN
    -- Check if pg_net extension exists
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        -- Create the trigger function using pg_net
        CREATE OR REPLACE FUNCTION public.trigger_send_push_notification()
        RETURNS TRIGGER AS $func$
        DECLARE
            edge_function_url TEXT;
        BEGIN
            -- Get the edge function URL - adjust for your setup
            -- For self-hosted: https://your-domain.com/functions/v1/send-push-notification
            edge_function_url := current_setting('app.settings.edge_function_url', true);

            -- If not set, use default (adjust this to your actual URL)
            IF edge_function_url IS NULL OR edge_function_url = '' THEN
                edge_function_url := 'http://supabase-functions:9000/send-push-notification';
            END IF;

            -- Call the edge function asynchronously using pg_net
            PERFORM net.http_post(
                url := edge_function_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
                ),
                body := jsonb_build_object('notification_id', NEW.id)::text
            );

            RETURN NEW;
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the insert
            RAISE WARNING 'Failed to trigger push notification: %', SQLERRM;
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;

        -- Create the trigger
        DROP TRIGGER IF EXISTS on_notification_send_push ON public.notifications;

        CREATE TRIGGER on_notification_send_push
            AFTER INSERT ON public.notifications
            FOR EACH ROW
            EXECUTE FUNCTION public.trigger_send_push_notification();

        RAISE NOTICE 'Created push notification trigger using pg_net';
    ELSE
        RAISE NOTICE 'pg_net extension not available. Use cron job or manual triggering instead.';
    END IF;
END $$;


-- =============================================================================
-- Option 2: Database function for manual/cron calling
-- =============================================================================

-- This function can be called manually or via pg_cron to process pending notifications
CREATE OR REPLACE FUNCTION public.get_pending_push_notifications(batch_limit INTEGER DEFAULT 100)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    type TEXT,
    title TEXT,
    body TEXT,
    data JSONB,
    image_url TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.user_id,
        n.type,
        n.title,
        n.body,
        n.data,
        n.image_url,
        n.created_at
    FROM public.notifications n
    WHERE n.is_pushed = FALSE
    ORDER BY n.created_at ASC
    LIMIT batch_limit;
END;
$$;


-- =============================================================================
-- Option 3: Mark notifications as sent (for external processors)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.mark_notification_sent(
    notification_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.notifications
    SET
        is_pushed = TRUE,
        push_sent_at = NOW()
    WHERE id = ANY(notification_ids)
    AND is_pushed = FALSE;

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    RETURN updated_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_pending_push_notifications(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_notification_sent(UUID[]) TO service_role;


-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON FUNCTION public.get_pending_push_notifications IS
    'Returns pending notifications that have not been pushed yet. Use for batch processing.';

COMMENT ON FUNCTION public.mark_notification_sent IS
    'Marks notifications as sent. Call after successfully sending via Expo.';
