-- =============================================================================
-- Migration: Add email_verified column to profiles table
-- Description: Adds email_verified column to track email verification status,
--              updates the handle_new_user trigger, and creates a sync trigger
--              to keep email_verified in sync with auth.users.email_confirmed_at
-- =============================================================================

-- Step 1: Add email_verified column to profiles table
-- =============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON public.profiles(email, email_verified);

-- Add comment
COMMENT ON COLUMN public.profiles.email_verified IS 'Tracks whether user has verified their email address';


-- =============================================================================
-- Step 2: Update handle_new_user trigger to set email_verified = false on signup
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, phone_number, display_name, email_verified)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'phone_number',
        NEW.raw_user_meta_data->>'display_name',
        -- Check if email is already confirmed (e.g., OAuth users)
        CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN TRUE ELSE FALSE END
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = COALESCE(EXCLUDED.email, profiles.email),
        phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
        display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
        -- Update email_verified if the auth user's email is now confirmed
        email_verified = CASE
            WHEN NEW.email_confirmed_at IS NOT NULL THEN TRUE
            ELSE profiles.email_verified
        END,
        updated_at = NOW();

    RETURN NEW;
END;
$$;


-- =============================================================================
-- Step 3: Create trigger to sync email_verified when auth.users is updated
-- This catches when email verification completes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_email_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- When email_confirmed_at changes from NULL to a value, update profiles
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        UPDATE public.profiles
        SET email_verified = TRUE, updated_at = NOW()
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_sync_email_verified ON auth.users;

CREATE TRIGGER trigger_sync_email_verified
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_email_verified();


-- =============================================================================
-- Step 4: Backfill existing users - set email_verified based on auth.users
-- =============================================================================

UPDATE public.profiles p
SET email_verified = TRUE
FROM auth.users u
WHERE p.id = u.id
AND u.email_confirmed_at IS NOT NULL
AND p.email_verified = FALSE;

-- Verify the changes
SELECT 'Profiles table updated' as status;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'email_verified';
