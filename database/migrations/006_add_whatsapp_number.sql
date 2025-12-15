-- Migration: Add whatsapp_number column to listings table
-- Date: 2025-12-15
-- Description: Adds WhatsApp contact number field for listings

-- Add whatsapp_number column to listings table
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.listings.whatsapp_number IS 'WhatsApp contact number for the listing';
