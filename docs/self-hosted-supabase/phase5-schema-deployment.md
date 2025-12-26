# Phase 5: Schema Deployment

Complete step-by-step guide for deploying the SouqShamy application schema to your self-hosted Supabase instance.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Schema Overview](#schema-overview)
3. [Step 1: Connect to Database Server](#step-1-connect-to-database-server)
4. [Step 2: Deploy Application Tables](#step-2-deploy-application-tables)
5. [Step 3: Deploy Database Functions](#step-3-deploy-database-functions)
6. [Step 4: Deploy Row Level Security Policies](#step-4-deploy-row-level-security-policies)
7. [Step 5: Deploy Database Triggers](#step-5-deploy-database-triggers)
8. [Step 6: Create Storage Buckets](#step-6-create-storage-buckets)
9. [Step 7: Verification](#step-7-verification)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting Phase 5, ensure Phase 3 is complete:
- [ ] Supabase services running on app server
- [ ] Database accessible from app server (10.0.0.2:5432)
- [ ] Auth and Storage schemas already initialized (from Phase 2)
- [ ] API responding at https://api.souqjari.com

---

## Schema Overview

### Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles linked to auth.users |
| `listings` | Marketplace listings with location data |
| `favorites` | User favorites (many-to-many) |
| `conversations` | Chat conversations between buyers/sellers |
| `messages` | Individual chat messages |
| `push_tokens` | Expo push notification tokens (see [Push Notifications Setup](./push-notifications-setup.md)) |
| `notifications` | In-app notification queue (see [Push Notifications Setup](./push-notifications-setup.md)) |
| `schema_migrations` | Tracks applied database migrations |

### Database Functions

| Function | Description |
|----------|-------------|
| `mark_messages_as_read` | Marks messages as read and updates unread counts |
| `update_conversation_on_message` | Trigger function to update conversation metadata |
| `handle_new_user` | Trigger function to create profile on user signup |
| `update_updated_at` | Generic trigger function for updated_at columns |
| `user_wants_notification` | Checks if user wants a specific notification type |
| `upsert_push_token` | Upserts push token with ownership transfer |
| `trigger_notify_new_message` | Creates notification on new message |
| `trigger_notify_listing_favorited` | Creates notification when listing is favorited |
| `trigger_notify_new_inquiry` | Creates notification for new inquiries |
| `trigger_send_push_notification` | Trigger to send push via Edge Function |
| `create_notification` | Helper to create notifications |
| `get_pending_push_notifications` | Gets notifications pending push delivery |
| `get_user_push_tokens` | Gets active push tokens for a user |
| `mark_notification_sent` | Marks notification as sent |
| `handle_user_restored` | Handles user account restoration |
| `delete_expired_accounts` | Cleans up soft-deleted expired accounts |
| `sync_email_verified` | Syncs email verification status |
| `get_user_auth_providers` | RPC to get user's linked auth providers |

### Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `listing-images` | Yes | Product photos for listings |
| `avatars` | Yes | User profile pictures |
| `voice-messages` | No | Voice messages in chat |

---

## Step 1: Connect to Database Server

### 1.1 SSH into Database Server

```bash
ssh souqjari-db
```

### 1.2 Connect to PostgreSQL as Superuser

```bash
sudo -u postgres psql -d supabase
```

You should see the `supabase=#` prompt.

---

## Step 2: Deploy Application Tables

### 2.1 Create Profiles Table

```sql
-- =============================================================================
-- Profiles Table
-- Stores additional user information beyond auth.users
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    phone_number TEXT,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Email verification (added by migration 001)
    email_verified BOOLEAN DEFAULT FALSE,
    -- Soft delete support (added by migration 004)
    deleted_at TIMESTAMPTZ,
    -- Push notification preferences (added by push notifications setup)
    push_enabled BOOLEAN DEFAULT TRUE,
    message_notifs BOOLEAN DEFAULT TRUE,
    listing_notifs BOOLEAN DEFAULT TRUE,
    price_drop_notifs BOOLEAN DEFAULT TRUE,
    promo_notifs BOOLEAN DEFAULT TRUE
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON public.profiles(email, email_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at);

-- Add comment
COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users with additional fields';
```

### 2.2 Create Listings Table

```sql
-- =============================================================================
-- Listings Table
-- Marketplace product listings with location support
-- =============================================================================

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

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_subcategory ON public.listings(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_location ON public.listings USING GIST (
    point(location_lon, location_lat)
) WHERE location_lat IS NOT NULL AND location_lon IS NOT NULL;

-- Full text search index for title, description, location
CREATE INDEX IF NOT EXISTS idx_listings_search ON public.listings USING GIN (
    to_tsvector('english', title || ' ' || description || ' ' || location)
);

-- Add comment
COMMENT ON TABLE public.listings IS 'Marketplace product listings';
```

### 2.3 Create Favorites Table

```sql
-- =============================================================================
-- Favorites Table
-- User favorites (many-to-many relationship)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id INTEGER NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique user-listing combination
    CONSTRAINT unique_user_listing UNIQUE (user_id, listing_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON public.favorites(listing_id);

-- Add comment
COMMENT ON TABLE public.favorites IS 'User favorite listings';
```

### 2.4 Create Conversations Table

```sql
-- =============================================================================
-- Conversations Table
-- Chat conversations between buyers and sellers
-- =============================================================================

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

    -- Ensure unique conversation per listing/buyer/seller
    CONSTRAINT unique_conversation UNIQUE (listing_id, buyer_id, seller_id),
    -- Ensure buyer and seller are different
    CONSTRAINT different_participants CHECK (buyer_id != seller_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON public.conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON public.conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON public.conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

-- Add comment
COMMENT ON TABLE public.conversations IS 'Chat conversations between buyers and sellers';
```

### 2.5 Create Messages Table

```sql
-- =============================================================================
-- Messages Table
-- Individual messages within conversations
-- =============================================================================

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(conversation_id, is_read) WHERE NOT is_read;

-- Add comment
COMMENT ON TABLE public.messages IS 'Chat messages within conversations';
```

### 2.6 Verify Tables Created

```sql
-- Verify all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

Expected output (includes push notification tables if set up):
```
    table_name
-------------------
 conversations
 favorites
 listings
 messages
 notifications
 profiles
 push_tokens
 schema_migrations
```

---

## Step 3: Deploy Database Functions

### 3.1 Create Mark Messages As Read Function

```sql
-- =============================================================================
-- mark_messages_as_read Function
-- Marks all unread messages in a conversation as read for a specific user
-- and updates the appropriate unread count
-- =============================================================================

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
    -- Get conversation participants
    SELECT buyer_id, seller_id
    INTO v_buyer_id, v_seller_id
    FROM public.conversations
    WHERE id = p_conversation_id;

    -- Check if user is a participant
    IF p_user_id NOT IN (v_buyer_id, v_seller_id) THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;

    -- Mark messages as read (messages not sent by this user)
    UPDATE public.messages
    SET is_read = TRUE
    WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND is_read = FALSE;

    -- Update unread count in conversation
    IF p_user_id = v_buyer_id THEN
        UPDATE public.conversations
        SET buyer_unread_count = 0,
            updated_at = NOW()
        WHERE id = p_conversation_id;
    ELSE
        UPDATE public.conversations
        SET seller_unread_count = 0,
            updated_at = NOW()
        WHERE id = p_conversation_id;
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.mark_messages_as_read IS
    'Marks messages as read for a user and resets their unread count';
```

### 3.2 Create Update Conversation Trigger Function

```sql
-- =============================================================================
-- update_conversation_on_message Function
-- Trigger function to update conversation when a new message is sent
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_buyer_id UUID;
    v_seller_id UUID;
BEGIN
    -- Get conversation participants
    SELECT buyer_id, seller_id
    INTO v_buyer_id, v_seller_id
    FROM public.conversations
    WHERE id = NEW.conversation_id;

    -- Update conversation with last message info and increment unread count
    UPDATE public.conversations
    SET
        last_message = CASE
            WHEN NEW.message_type = 'voice' THEN '🎤 Voice message'
            ELSE LEFT(NEW.content, 100)
        END,
        last_message_at = NEW.created_at,
        updated_at = NOW(),
        -- Increment unread count for the OTHER user (not the sender)
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

-- Add comment
COMMENT ON FUNCTION public.update_conversation_on_message IS
    'Trigger function to update conversation metadata when a message is sent';
```

### 3.3 Create Handle New User Trigger Function

```sql
-- =============================================================================
-- handle_new_user Function
-- Trigger function to create a profile when a new user signs up
-- =============================================================================

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

-- Add comment
COMMENT ON FUNCTION public.handle_new_user IS
    'Trigger function to create/update profile on user creation';
```

### 3.4 Create Updated At Trigger Function

```sql
-- =============================================================================
-- update_updated_at Function
-- Generic trigger function to update the updated_at column
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.update_updated_at IS
    'Generic trigger function to auto-update updated_at column';
```

### 3.5 Verify Functions Created

```sql
-- Verify all functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

---

## Step 4: Deploy Row Level Security Policies

### 4.1 Enable RLS on All Tables

```sql
-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
```

### 4.2 Profiles Policies

```sql
-- =============================================================================
-- Profiles RLS Policies
-- =============================================================================

-- Users can view any profile (for displaying seller info)
CREATE POLICY "profiles_select_all"
    ON public.profiles
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Users can insert their own profile
CREATE POLICY "profiles_insert_own"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Users can update only their own profile
CREATE POLICY "profiles_update_own"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can delete only their own profile
CREATE POLICY "profiles_delete_own"
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (auth.uid() = id);
```

### 4.3 Listings Policies

```sql
-- =============================================================================
-- Listings RLS Policies
-- =============================================================================

-- Anyone can view active listings
CREATE POLICY "listings_select_active"
    ON public.listings
    FOR SELECT
    TO authenticated, anon
    USING (status = 'active' OR user_id = auth.uid());

-- Authenticated users can create listings
CREATE POLICY "listings_insert_own"
    ON public.listings
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own listings
CREATE POLICY "listings_update_own"
    ON public.listings
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own listings
CREATE POLICY "listings_delete_own"
    ON public.listings
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
```

### 4.4 Favorites Policies

```sql
-- =============================================================================
-- Favorites RLS Policies
-- =============================================================================

-- Users can view their own favorites
CREATE POLICY "favorites_select_own"
    ON public.favorites
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can add to their own favorites
CREATE POLICY "favorites_insert_own"
    ON public.favorites
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can remove from their own favorites
CREATE POLICY "favorites_delete_own"
    ON public.favorites
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
```

### 4.5 Conversations Policies

```sql
-- =============================================================================
-- Conversations RLS Policies
-- =============================================================================

-- Users can view conversations they're part of
CREATE POLICY "conversations_select_participant"
    ON public.conversations
    FOR SELECT
    TO authenticated
    USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Authenticated users can create conversations (as buyer)
CREATE POLICY "conversations_insert_buyer"
    ON public.conversations
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = buyer_id);

-- Participants can update conversation (for read counts, etc.)
CREATE POLICY "conversations_update_participant"
    ON public.conversations
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
```

### 4.6 Messages Policies

```sql
-- =============================================================================
-- Messages RLS Policies
-- =============================================================================

-- Users can view messages in their conversations
CREATE POLICY "messages_select_participant"
    ON public.messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        )
    );

-- Users can send messages in their conversations
CREATE POLICY "messages_insert_participant"
    ON public.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        )
    );

-- Users can update messages they sent (or mark as read in their conversations)
CREATE POLICY "messages_update_participant"
    ON public.messages
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        )
    );
```

### 4.7 Verify RLS Enabled

```sql
-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'listings', 'favorites', 'conversations', 'messages')
ORDER BY tablename;
```

Expected output:
```
  tablename   | rowsecurity
--------------+-------------
 conversations| t
 favorites    | t
 listings     | t
 messages     | t
 profiles     | t
```

---

## Step 5: Deploy Database Triggers

### 5.1 Create Message Insert Trigger

```sql
-- =============================================================================
-- Messages Insert Trigger
-- Updates conversation when a new message is sent
-- =============================================================================

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON public.messages;

CREATE TRIGGER trigger_update_conversation_on_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_conversation_on_message();
```

### 5.2 Create New User Trigger

```sql
-- =============================================================================
-- Auth Users Insert Trigger
-- Creates profile when a new user signs up
-- =============================================================================

DROP TRIGGER IF EXISTS trigger_handle_new_user ON auth.users;

CREATE TRIGGER trigger_handle_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

### 5.3 Create Updated At Triggers

```sql
-- =============================================================================
-- Updated At Triggers
-- Auto-update updated_at column on row modifications
-- =============================================================================

-- Profiles
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Listings
DROP TRIGGER IF EXISTS trigger_listings_updated_at ON public.listings;
CREATE TRIGGER trigger_listings_updated_at
    BEFORE UPDATE ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Conversations
DROP TRIGGER IF EXISTS trigger_conversations_updated_at ON public.conversations;
CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
```

### 5.4 Verify Triggers Created

```sql
-- Verify all triggers exist
SELECT
    trigger_name,
    event_object_table AS table_name,
    action_timing,
    event_manipulation AS event
FROM information_schema.triggers
WHERE trigger_schema = 'public'
   OR (trigger_schema = 'auth' AND trigger_name LIKE '%new_user%')
ORDER BY event_object_table, trigger_name;
```

---

## Step 6: Create Storage Buckets

### 6.1 Exit PostgreSQL and SSH to App Server

```sql
-- Exit PostgreSQL
\q
```

```bash
# Exit database server
exit

# SSH to app server
ssh souqjari-app
```

### 6.2 Create Storage Buckets via API

```bash
# Load secrets
source /root/supabase-secrets/secrets.env

# Create listing-images bucket (public)
curl -X POST http://localhost:8000/storage/v1/bucket \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "listing-images",
    "name": "listing-images",
    "public": true,
    "file_size_limit": 10485760,
    "allowed_mime_types": ["image/jpeg", "image/png", "image/webp", "image/gif"]
  }'

echo ""

# Create avatars bucket (public)
curl -X POST http://localhost:8000/storage/v1/bucket \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "avatars",
    "name": "avatars",
    "public": true,
    "file_size_limit": 5242880,
    "allowed_mime_types": ["image/jpeg", "image/png", "image/webp"]
  }'

echo ""

# Create voice-messages bucket (private - authenticated access only)
curl -X POST http://localhost:8000/storage/v1/bucket \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "voice-messages",
    "name": "voice-messages",
    "public": false,
    "file_size_limit": 10485760,
    "allowed_mime_types": ["audio/mp4", "audio/mpeg", "audio/m4a", "audio/x-m4a"]
  }'
```

### 6.3 Create Storage RLS Policies via SQL

SSH back to database server and connect to PostgreSQL:

```bash
# Exit app server
exit

# SSH to database server
ssh souqjari-db

# Connect to database
sudo -u postgres psql -d supabase
```

```sql
-- =============================================================================
-- Storage Bucket Policies
-- =============================================================================

-- listing-images bucket policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'listing-images',
    'listing-images',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- voice-messages bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'voice-messages',
    'voice-messages',
    false,
    10485760,
    ARRAY['audio/mp4', 'audio/mpeg', 'audio/m4a', 'audio/x-m4a']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
```

### 6.4 Create Storage Object Policies

```sql
-- =============================================================================
-- listing-images Storage Policies
-- =============================================================================

-- Anyone can view listing images (public bucket)
CREATE POLICY "listing_images_select_public"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'listing-images');

-- Authenticated users can upload listing images
CREATE POLICY "listing_images_insert_auth"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'listing-images');

-- Users can update their own listing images
CREATE POLICY "listing_images_update_own"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own listing images
CREATE POLICY "listing_images_delete_own"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================================================
-- avatars Storage Policies
-- =============================================================================

-- Anyone can view avatars (public bucket)
CREATE POLICY "avatars_select_public"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'avatars');

-- Authenticated users can upload avatars
CREATE POLICY "avatars_insert_auth"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own avatars
CREATE POLICY "avatars_update_own"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own avatars
CREATE POLICY "avatars_delete_own"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================================================
-- voice-messages Storage Policies
-- =============================================================================

-- Conversation participants can view voice messages
CREATE POLICY "voice_messages_select_participant"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'voice-messages'
        AND EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id::text = (storage.foldername(name))[1]
            AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        )
    );

-- Conversation participants can upload voice messages
CREATE POLICY "voice_messages_insert_participant"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'voice-messages'
        AND EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id::text = (storage.foldername(name))[1]
            AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        )
    );
```

### 6.5 Verify Storage Buckets

```sql
-- Verify buckets exist
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
ORDER BY name;
```

---

## Step 7: Verification

### 7.1 Verify Schema Structure

```sql
-- Full schema verification
SELECT
    t.table_name,
    COUNT(c.column_name) as columns,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = t.table_name) as indexes,
    (SELECT COUNT(*) FROM information_schema.triggers
     WHERE event_object_table = t.table_name
     AND event_object_schema = 'public') as triggers,
    CASE WHEN rowsecurity THEN 'YES' ELSE 'NO' END as rls
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
JOIN pg_tables pt ON pt.tablename = t.table_name AND pt.schemaname = 'public'
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name, rowsecurity
ORDER BY t.table_name;
```

Expected output:
```
  table_name   | columns | indexes | triggers | rls
---------------+---------+---------+----------+-----
 conversations |      10 |       4 |        1 | YES
 favorites     |       4 |       3 |        0 | YES
 listings      |      15 |       7 |        1 | YES
 messages      |       8 |       4 |        1 | YES
 profiles      |       6 |       3 |        1 | YES
```

### 7.2 Test mark_messages_as_read Function

First, create some test data, then test the function:

```sql
-- Test that the function exists and has correct signature
SELECT
    proname as function_name,
    proargnames as argument_names,
    prokind as kind
FROM pg_proc
WHERE proname = 'mark_messages_as_read';
```

### 7.3 Verify Realtime Publication

```sql
-- Check that tables are included in realtime publication
SELECT pubname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public'
ORDER BY tablename;
```

**Current Production State:** Only `conversations` and `messages` are in the realtime publication (sufficient for chat functionality).

If you need realtime updates for other tables, add them:

```sql
-- Add tables to realtime publication (only add what you need)
-- Currently in production: conversations, messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Optional - add if you need realtime updates for these:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.favorites;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

### 7.4 Test API Access from App Server

Exit PostgreSQL and test from app server:

```bash
# Exit PostgreSQL
\q

# Exit database server
exit

# SSH to app server
ssh souqjari-app

# Load secrets
source /root/supabase-secrets/secrets.env

# Test listing endpoint
curl -s "http://localhost:8000/rest/v1/listings?select=*&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq .

# Test profiles endpoint (should return empty array initially)
curl -s "http://localhost:8000/rest/v1/profiles?select=*&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq .

# Test storage buckets
curl -s "http://localhost:8000/storage/v1/bucket" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" | jq .
```

---

## Troubleshooting

### Table Creation Fails

```sql
-- Check for missing extensions
SELECT extname FROM pg_extension;

-- Ensure uuid-ossp is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
```

### RLS Policies Conflict

```sql
-- List all policies on a table
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'listings';

-- Drop conflicting policy
DROP POLICY IF EXISTS "policy_name" ON public.listings;
```

### Function Permission Issues

```sql
-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read TO service_role;

-- Grant usage on schemas
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
```

### Realtime Not Working

```sql
-- Check replication role
SELECT rolname, rolreplication FROM pg_roles WHERE rolname = 'supabase_realtime_admin';

-- Verify publication exists
SELECT pubname FROM pg_publication WHERE pubname = 'supabase_realtime';

-- Recreate publication if needed
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
```

### Storage Bucket Not Accessible

```bash
# Check storage service logs
cd /opt/supabase/supabase/docker
docker compose logs storage | tail -50

# Verify R2 connectivity
curl -I $STORAGE_S3_ENDPOINT
```

---

## Phase 5 Completion Checklist

Before proceeding to Phase 6, verify:

- [ ] All tables created in public schema:
  - [ ] profiles
  - [ ] listings
  - [ ] favorites
  - [ ] conversations
  - [ ] messages
- [ ] All indexes created for performance
- [ ] Database functions created:
  - [ ] mark_messages_as_read
  - [ ] update_conversation_on_message
  - [ ] handle_new_user
  - [ ] update_updated_at
- [ ] RLS enabled on all tables
- [ ] RLS policies created for all tables
- [ ] Database triggers created:
  - [ ] trigger_update_conversation_on_message
  - [ ] trigger_handle_new_user
  - [ ] trigger_*_updated_at (profiles, listings, conversations)
- [ ] Storage buckets created:
  - [ ] listing-images (public)
  - [ ] avatars (public)
  - [ ] voice-messages (private)
- [ ] Storage policies configured
- [ ] Tables added to realtime publication
- [ ] API endpoints accessible

---

## Quick Commands Reference

### Connect to Database

```bash
# SSH to database server
ssh souqjari-db

# Connect to PostgreSQL
sudo -u postgres psql -d supabase
```

### Useful PostgreSQL Commands

```sql
-- List tables
\dt public.*

-- Describe table
\d public.listings

-- List functions
\df public.*

-- List triggers
SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public';

-- List policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Exit
\q
```

---

## Next Steps

Proceed to **Phase 6: Monitoring & Scaling Preparation**

- Set up Netdata monitoring
- Configure backup scripts
- Create scaling playbook
- Document emergency procedures

---

*Document Version: 1.1*
*Last Updated: December 2024*
*Author: SouqShamy DevOps*

### Changelog
- v1.1: Updated schema overview with push notification tables, added missing profile columns, updated realtime publication docs, fixed domain typo (souqshamy → souqjari)
- v1.0: Initial documentation
