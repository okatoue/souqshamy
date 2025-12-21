-- Migration: Add bio column to profiles table
-- Description: Allows users to add a bio/description to their profile (max 500 characters)

-- Add bio column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add constraint for max length (500 characters)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_bio_length'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_bio_length CHECK (char_length(bio) <= 500);
    END IF;
END $$;

-- Add column comment for documentation
COMMENT ON COLUMN public.profiles.bio IS 'User bio/description, max 500 characters';
