-- =============================================================================
-- Migration: Add deleted_at column to profiles table
-- Purpose: Support soft-delete for user account deletion
-- =============================================================================

-- Add deleted_at column for soft delete functionality
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create index for filtering out deleted profiles
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at);

-- Add comment
COMMENT ON COLUMN public.profiles.deleted_at IS 'Timestamp when the user deleted their account (soft delete)';
