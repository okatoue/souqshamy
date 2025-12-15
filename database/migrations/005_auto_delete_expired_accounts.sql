-- =============================================================================
-- Migration: Auto-delete expired soft-deleted accounts after 30 days
-- Purpose: GDPR-compliant data retention - permanently remove user data
-- =============================================================================

-- Enable pg_cron extension (requires superuser, may already be enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- =============================================================================
-- Function: Delete expired soft-deleted accounts
-- Removes profiles (and cascades to related data) after 30 days
-- =============================================================================

CREATE OR REPLACE FUNCTION public.delete_expired_accounts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete from auth.users where profile was soft-deleted > 30 days ago
    -- This will cascade to profiles and other tables with ON DELETE CASCADE
    WITH expired_users AS (
        SELECT p.id
        FROM public.profiles p
        WHERE p.deleted_at IS NOT NULL
          AND p.deleted_at < NOW() - INTERVAL '30 days'
    )
    DELETE FROM auth.users
    WHERE id IN (SELECT id FROM expired_users);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Log the deletion (optional - for auditing)
    IF deleted_count > 0 THEN
        RAISE NOTICE 'Deleted % expired accounts', deleted_count;
    END IF;

    RETURN deleted_count;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.delete_expired_accounts IS
    'Permanently deletes user accounts that were soft-deleted more than 30 days ago';

-- =============================================================================
-- Schedule the job to run daily at 3:00 AM UTC
-- =============================================================================

-- Remove existing job if it exists (for idempotency)
SELECT cron.unschedule('delete-expired-accounts')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'delete-expired-accounts'
);

-- Schedule the cleanup job to run daily at 3:00 AM UTC
SELECT cron.schedule(
    'delete-expired-accounts',           -- job name
    '0 3 * * *',                          -- cron expression: daily at 3:00 AM UTC
    $$SELECT public.delete_expired_accounts()$$
);

-- =============================================================================
-- Manual execution (for testing)
-- Run this to manually trigger the cleanup:
-- SELECT public.delete_expired_accounts();
-- =============================================================================
