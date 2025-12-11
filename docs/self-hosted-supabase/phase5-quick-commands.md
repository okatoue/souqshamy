# Phase 5: Quick Commands - Schema Deployment

Copy-paste ready commands for deploying SouqShamy application schema.

---

## Prerequisites

```bash
# SSH to database server
ssh souqjari-db

# Connect to PostgreSQL
sudo -u postgres psql -d supabase
```

---

## Complete Schema Deployment Script

Run this entire script in PostgreSQL to deploy the application schema:

```sql
-- =============================================================================
-- SouqShamy Application Schema Deployment
-- Run this script on the database server: sudo -u postgres psql -d supabase
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. CREATE TABLES
-- -----------------------------------------------------------------------------

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    phone_number TEXT,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone_number);

-- Listings table
CREATE TABLE IF NOT EXISTS public.listings (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    subcategory_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    currency TEXT NOT NULL DEFAULT 'SYP',
    phone_number TEXT,
    images TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'inactive')),
    location TEXT NOT NULL,
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_subcategory ON public.listings(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_location ON public.listings USING GIST (
    point(location_lon, location_lat)
) WHERE location_lat IS NOT NULL AND location_lon IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_search ON public.listings USING GIN (
    to_tsvector('english', title || ' ' || description || ' ' || location)
);

-- Favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id INTEGER NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_listing UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON public.favorites(listing_id);

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    buyer_unread_count INTEGER DEFAULT 0,
    seller_unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_conversation UNIQUE (listing_id, buyer_id, seller_id),
    CONSTRAINT different_participants CHECK (buyer_id != seller_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON public.conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON public.conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON public.conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'voice')),
    audio_url TEXT,
    audio_duration INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(conversation_id, is_read) WHERE NOT is_read;

-- -----------------------------------------------------------------------------
-- 2. CREATE FUNCTIONS
-- -----------------------------------------------------------------------------

-- mark_messages_as_read function
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_buyer_id UUID;
    v_seller_id UUID;
BEGIN
    SELECT buyer_id, seller_id
    INTO v_buyer_id, v_seller_id
    FROM public.conversations
    WHERE id = p_conversation_id;

    IF p_user_id NOT IN (v_buyer_id, v_seller_id) THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;

    UPDATE public.messages
    SET is_read = TRUE
    WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND is_read = FALSE;

    IF p_user_id = v_buyer_id THEN
        UPDATE public.conversations
        SET buyer_unread_count = 0, updated_at = NOW()
        WHERE id = p_conversation_id;
    ELSE
        UPDATE public.conversations
        SET seller_unread_count = 0, updated_at = NOW()
        WHERE id = p_conversation_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_messages_as_read TO authenticated;

-- update_conversation_on_message function
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_buyer_id UUID;
    v_seller_id UUID;
BEGIN
    SELECT buyer_id, seller_id
    INTO v_buyer_id, v_seller_id
    FROM public.conversations
    WHERE id = NEW.conversation_id;

    UPDATE public.conversations
    SET
        last_message = CASE
            WHEN NEW.message_type = 'voice' THEN '🎤 Voice message'
            ELSE LEFT(NEW.content, 100)
        END,
        last_message_at = NEW.created_at,
        updated_at = NOW(),
        buyer_unread_count = CASE
            WHEN NEW.sender_id = v_seller_id THEN buyer_unread_count + 1
            ELSE buyer_unread_count
        END,
        seller_unread_count = CASE
            WHEN NEW.sender_id = v_buyer_id THEN seller_unread_count + 1
            ELSE seller_unread_count
        END
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$;

-- handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, phone_number, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'phone_number',
        NEW.raw_user_meta_data->>'display_name'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = COALESCE(EXCLUDED.email, profiles.email),
        phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
        display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. ENABLE ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 4. CREATE RLS POLICIES
-- -----------------------------------------------------------------------------

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- Listings policies
DROP POLICY IF EXISTS "listings_select_active" ON public.listings;
CREATE POLICY "listings_select_active" ON public.listings FOR SELECT TO authenticated, anon USING (status = 'active' OR user_id = auth.uid());

DROP POLICY IF EXISTS "listings_insert_own" ON public.listings;
CREATE POLICY "listings_insert_own" ON public.listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "listings_update_own" ON public.listings;
CREATE POLICY "listings_update_own" ON public.listings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "listings_delete_own" ON public.listings;
CREATE POLICY "listings_delete_own" ON public.listings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Favorites policies
DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
CREATE POLICY "favorites_select_own" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
CREATE POLICY "favorites_insert_own" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
CREATE POLICY "favorites_delete_own" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Conversations policies
DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;
CREATE POLICY "conversations_select_participant" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "conversations_insert_buyer" ON public.conversations;
CREATE POLICY "conversations_insert_buyer" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "conversations_update_participant" ON public.conversations;
CREATE POLICY "conversations_update_participant" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Messages policies
DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;
CREATE POLICY "messages_select_participant" ON public.messages FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid()))
);

DROP POLICY IF EXISTS "messages_insert_participant" ON public.messages;
CREATE POLICY "messages_insert_participant" ON public.messages FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid()))
);

DROP POLICY IF EXISTS "messages_update_participant" ON public.messages;
CREATE POLICY "messages_update_participant" ON public.messages FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid()))
);

-- -----------------------------------------------------------------------------
-- 5. CREATE TRIGGERS
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON public.messages;
CREATE TRIGGER trigger_update_conversation_on_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_conversation_on_message();

DROP TRIGGER IF EXISTS trigger_handle_new_user ON auth.users;
CREATE TRIGGER trigger_handle_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_listings_updated_at ON public.listings;
CREATE TRIGGER trigger_listings_updated_at
    BEFORE UPDATE ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_conversations_updated_at ON public.conversations;
CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- 6. STORAGE BUCKETS
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('listing-images', 'listing-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('voice-messages', 'voice-messages', false, 10485760, ARRAY['audio/mp4', 'audio/mpeg', 'audio/m4a', 'audio/x-m4a'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- 7. STORAGE POLICIES
-- -----------------------------------------------------------------------------

-- listing-images policies
DROP POLICY IF EXISTS "listing_images_select_public" ON storage.objects;
CREATE POLICY "listing_images_select_public" ON storage.objects FOR SELECT TO public USING (bucket_id = 'listing-images');

DROP POLICY IF EXISTS "listing_images_insert_auth" ON storage.objects;
CREATE POLICY "listing_images_insert_auth" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'listing-images');

DROP POLICY IF EXISTS "listing_images_update_own" ON storage.objects;
CREATE POLICY "listing_images_update_own" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "listing_images_delete_own" ON storage.objects;
CREATE POLICY "listing_images_delete_own" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- avatars policies
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_auth" ON storage.objects;
CREATE POLICY "avatars_insert_auth" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- voice-messages policies
DROP POLICY IF EXISTS "voice_messages_select_participant" ON storage.objects;
CREATE POLICY "voice_messages_select_participant" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'voice-messages' AND EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    ));

DROP POLICY IF EXISTS "voice_messages_insert_participant" ON storage.objects;
CREATE POLICY "voice_messages_insert_participant" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'voice-messages' AND EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    ));

-- -----------------------------------------------------------------------------
-- 8. ADD TABLES TO REALTIME
-- -----------------------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.favorites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- -----------------------------------------------------------------------------
-- 9. GRANT PERMISSIONS
-- -----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

COMMIT;

-- Verify deployment
SELECT 'Tables:' as check;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;

SELECT 'Functions:' as check;
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION' ORDER BY routine_name;

SELECT 'Storage Buckets:' as check;
SELECT id, name, public FROM storage.buckets ORDER BY name;

SELECT 'RLS Enabled:' as check;
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

SELECT '✅ Schema deployment complete!' as status;
```

---

## Verification Commands

### Check Tables

```sql
\dt public.*
```

### Check Functions

```sql
\df public.*
```

### Check RLS Status

```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

### Check Storage Buckets

```sql
SELECT id, name, public FROM storage.buckets ORDER BY name;
```

### Check Realtime Publication

```sql
SELECT pubname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public';
```

---

## Test API Endpoints (from App Server)

```bash
# SSH to app server
ssh souqjari-app

# Load secrets
source /root/supabase-secrets/secrets.env

# Test listings
curl -s "http://localhost:8000/rest/v1/listings?select=*&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq .

# Test profiles
curl -s "http://localhost:8000/rest/v1/profiles?select=*&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq .

# Test storage buckets
curl -s "http://localhost:8000/storage/v1/bucket" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" | jq .

# Test RPC function exists
curl -s -X POST "http://localhost:8000/rest/v1/rpc/mark_messages_as_read" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_conversation_id": "00000000-0000-0000-0000-000000000000", "p_user_id": "00000000-0000-0000-0000-000000000000"}' 2>&1
# Expected: Error about user not being participant (function exists and works)
```

---

## Rollback Script (Emergency Use)

```sql
-- ⚠️ WARNING: This will delete all application data!
BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON public.messages;
DROP TRIGGER IF EXISTS trigger_handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS trigger_listings_updated_at ON public.listings;
DROP TRIGGER IF EXISTS trigger_conversations_updated_at ON public.conversations;

-- Drop functions
DROP FUNCTION IF EXISTS public.mark_messages_as_read;
DROP FUNCTION IF EXISTS public.update_conversation_on_message;
DROP FUNCTION IF EXISTS public.handle_new_user;
DROP FUNCTION IF EXISTS public.update_updated_at;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.conversations;
DROP TABLE IF EXISTS public.favorites;
DROP TABLE IF EXISTS public.listings;
DROP TABLE IF EXISTS public.profiles;

-- Remove from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.profiles;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.listings;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.favorites;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.conversations;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.messages;

-- Remove storage buckets
DELETE FROM storage.objects WHERE bucket_id IN ('listing-images', 'avatars', 'voice-messages');
DELETE FROM storage.buckets WHERE id IN ('listing-images', 'avatars', 'voice-messages');

COMMIT;

SELECT '⚠️ Rollback complete - all application data removed' as status;
```

---

*Document Version: 1.0*
*Last Updated: December 2024*
