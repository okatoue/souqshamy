-- Migration: Add push token upsert function
-- Description: Creates a SECURITY DEFINER function to handle push token upsert/transfer
-- This is needed because RLS blocks updating tokens that belong to other users,
-- but we need to transfer ownership when a device changes hands.

-- =============================================================================
-- Function: Upsert push token (with ownership transfer)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.upsert_push_token(
    p_user_id UUID,
    p_expo_push_token TEXT,
    p_device_type TEXT,
    p_device_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token_id UUID;
BEGIN
    -- Try to update existing token (transfer ownership if needed)
    UPDATE public.push_tokens
    SET
        user_id = p_user_id,
        device_type = p_device_type,
        device_name = p_device_name,
        last_used_at = NOW(),
        is_active = TRUE
    WHERE expo_push_token = p_expo_push_token
    RETURNING id INTO v_token_id;

    -- If no row was updated, insert a new one
    IF v_token_id IS NULL THEN
        INSERT INTO public.push_tokens (
            user_id,
            expo_push_token,
            device_type,
            device_name,
            last_used_at,
            is_active
        ) VALUES (
            p_user_id,
            p_expo_push_token,
            p_device_type,
            p_device_name,
            NOW(),
            TRUE
        )
        RETURNING id INTO v_token_id;
    END IF;

    RETURN v_token_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.upsert_push_token(UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.upsert_push_token IS 'Upserts a push token, transferring ownership if the token already exists for another user';
