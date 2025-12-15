-- =============================================================================
-- Migration: Fix OAuth profile metadata extraction
-- Description: Updates handle_new_user and handle_user_restored triggers to
--              extract display name and avatar from OAuth-specific metadata
--              fields (full_name, name, picture, avatar_url)
-- =============================================================================

-- =============================================================================
-- Step 1: Update handle_new_user trigger to properly extract OAuth metadata
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_display_name TEXT;
    v_avatar_url TEXT;
BEGIN
    -- Extract display name with fallback chain for OAuth providers
    -- Google/Facebook use 'full_name' or 'name', regular signup uses 'display_name'
    v_display_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'display_name'
    );

    -- Extract avatar URL with fallback for different OAuth providers
    -- Some use 'avatar_url', others use 'picture'
    v_avatar_url := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture'
    );

    INSERT INTO public.profiles (id, email, phone_number, display_name, avatar_url, email_verified)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'phone_number',
        v_display_name,
        v_avatar_url,
        CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN TRUE ELSE FALSE END
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = COALESCE(EXCLUDED.email, profiles.email),
        phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
        -- Only update display_name if not already set
        display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
        -- Only update avatar_url if not already set
        avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
        email_verified = CASE
            WHEN NEW.email_confirmed_at IS NOT NULL THEN TRUE
            ELSE profiles.email_verified
        END,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS
    'Creates/updates profile on user signup with OAuth metadata extraction (full_name, name, avatar_url, picture)';


-- =============================================================================
-- Step 2: Update handle_user_restored trigger for consistency
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_user_restored()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_display_name TEXT;
    v_avatar_url TEXT;
BEGIN
    -- Only fire when a user is being "restored" (deleted_at going from NOT NULL to NULL)
    -- OR when a user is being updated and might need a profile
    IF (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL)
       OR (OLD.deleted_at IS NULL AND NEW.deleted_at IS NULL) THEN

        -- Extract display name with fallback chain for OAuth providers
        v_display_name := COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'display_name'
        );

        -- Extract avatar URL with fallback for different OAuth providers
        v_avatar_url := COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.raw_user_meta_data->>'picture'
        );

        -- Check if profile exists
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
            -- Create profile for restored/updated user
            INSERT INTO public.profiles (id, email, phone_number, display_name, avatar_url, email_verified)
            VALUES (
                NEW.id,
                NEW.email,
                NEW.raw_user_meta_data->>'phone_number',
                v_display_name,
                v_avatar_url,
                CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN TRUE ELSE FALSE END
            )
            ON CONFLICT (id) DO UPDATE
            SET
                email = COALESCE(EXCLUDED.email, profiles.email),
                phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
                display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
                avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
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
    'Creates profile when a soft-deleted user re-signs up with OAuth metadata extraction';


-- =============================================================================
-- Step 3: Backfill existing OAuth users
-- This updates profiles for users who already signed up via OAuth but have
-- null display_name or avatar_url
-- =============================================================================

UPDATE public.profiles p
SET
    display_name = COALESCE(
        p.display_name,
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name'
    ),
    avatar_url = COALESCE(
        p.avatar_url,
        u.raw_user_meta_data->>'avatar_url',
        u.raw_user_meta_data->>'picture'
    ),
    updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id
AND (
    (p.display_name IS NULL AND (u.raw_user_meta_data->>'full_name' IS NOT NULL OR u.raw_user_meta_data->>'name' IS NOT NULL))
    OR
    (p.avatar_url IS NULL AND (u.raw_user_meta_data->>'avatar_url' IS NOT NULL OR u.raw_user_meta_data->>'picture' IS NOT NULL))
);


-- =============================================================================
-- Step 4: Verify the changes
-- =============================================================================

SELECT 'Migration 003 completed: OAuth profile metadata extraction fixed' as status;
