-- =============================================================================
-- Migration: Add function to get user authentication providers
-- Description: Creates an RPC function to safely query auth.identities table
--              to determine what authentication providers a user has registered.
--              This enables detecting OAuth-only users who don't have passwords.
-- =============================================================================

-- =============================================================================
-- Step 1: Create the function to get user auth providers
-- =============================================================================

-- Function to get authentication providers for a user by email
-- Returns list of providers (e.g., 'email', 'google', 'facebook')
CREATE OR REPLACE FUNCTION public.get_user_auth_providers(user_email TEXT)
RETURNS TABLE(provider TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT i.provider::TEXT
    FROM auth.identities i
    JOIN auth.users u ON u.id = i.user_id
    WHERE lower(u.email) = lower(user_email)
    AND u.deleted_at IS NULL;
END;
$$;

COMMENT ON FUNCTION public.get_user_auth_providers IS
    'Returns list of authentication providers for a user by email. Used to detect OAuth-only users.';

-- =============================================================================
-- Step 2: Grant execute permissions
-- =============================================================================

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_user_auth_providers(TEXT) TO anon, authenticated;

-- =============================================================================
-- Step 3: Verify the function
-- =============================================================================

SELECT 'Migration 007 completed: get_user_auth_providers function created' as status;
