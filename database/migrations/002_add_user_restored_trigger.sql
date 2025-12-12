-- =============================================================================
-- Migration: Add trigger to handle user restoration (re-signup after soft delete)
-- Description: When a user is deleted via Supabase Studio, it performs a soft delete
--              (sets deleted_at timestamp). When the user re-signs up, GoTrue does an
--              UPDATE (clears deleted_at) instead of INSERT. This trigger ensures a
--              profile is created in that scenario.
-- =============================================================================

-- =============================================================================
-- Step 1: Create function to handle user restoration
-- This fires when deleted_at changes from NOT NULL to NULL (user restored)
-- or when a user is updated and might need a profile
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_user_restored()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only fire when a user is being "restored" (deleted_at going from NOT NULL to NULL)
    -- OR when a user is being updated and might need a profile
    IF (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL)
       OR (OLD.deleted_at IS NULL AND NEW.deleted_at IS NULL) THEN

        -- Check if profile exists
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
            -- Create profile for restored/updated user
            INSERT INTO public.profiles (id, email, phone_number, display_name, email_verified)
            VALUES (
                NEW.id,
                NEW.email,
                NEW.raw_user_meta_data->>'phone_number',
                NEW.raw_user_meta_data->>'display_name',
                CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN TRUE ELSE FALSE END
            )
            ON CONFLICT (id) DO UPDATE
            SET
                email = COALESCE(EXCLUDED.email, profiles.email),
                phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
                display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
                email_verified = CASE
                    WHEN NEW.email_confirmed_at IS NOT NULL THEN TRUE
                    ELSE profiles.email_verified
                END,
                updated_at = NOW();
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_user_restored IS
    'Creates profile when a soft-deleted user re-signs up (GoTrue does UPDATE instead of INSERT)';

-- =============================================================================
-- Step 2: Create the trigger for user restoration
-- =============================================================================

DROP TRIGGER IF EXISTS trigger_handle_user_restored ON auth.users;

CREATE TRIGGER trigger_handle_user_restored
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_restored();

-- =============================================================================
-- Step 3: Verify triggers now exist for both INSERT and UPDATE
-- =============================================================================

SELECT
    t.tgname,
    t.tgenabled,
    CASE
        WHEN t.tgtype & 4 = 4 THEN 'INSERT'
        WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
    END as event,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users'
AND NOT t.tgisinternal
ORDER BY t.tgname;
