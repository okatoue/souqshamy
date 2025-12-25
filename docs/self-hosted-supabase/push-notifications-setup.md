# Push Notifications Setup

Complete guide for implementing push notifications in SouqShamy with self-hosted Supabase.

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Phase 1-2: Database Schema](#phase-1-2-database-schema)
4. [Phase 3: Notification Triggers](#phase-3-notification-triggers)
5. [Phase 4: Edge Function & Delivery](#phase-4-edge-function--delivery)
6. [Phase 5: In-App Notification Center](#phase-5-in-app-notification-center)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The push notification system consists of:
- **Database tables**: `push_tokens`, `notifications`
- **Database triggers**: Auto-create notifications on events (messages, favorites, etc.)
- **Edge Function**: Sends notifications via Expo Push API
- **Cron job**: Processes pending notifications every minute
- **Client-side**: Token registration, notification center UI

---

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   Mobile App        │     │   Database          │
│   (Expo)            │     │   (PostgreSQL)      │
│                     │     │                     │
│  ┌───────────────┐  │     │  ┌───────────────┐  │
│  │ Push Token    │──┼─────┼─►│ push_tokens   │  │
│  │ Registration  │  │     │  └───────────────┘  │
│  └───────────────┘  │     │                     │
│                     │     │  ┌───────────────┐  │
│  ┌───────────────┐  │     │  │ notifications │◄─┤── Triggers
│  │ Notification  │◄─┼─────┼──│ (queue)       │  │
│  │ Center UI     │  │     │  └───────┬───────┘  │
│  └───────────────┘  │     │          │          │
└─────────────────────┘     └──────────┼──────────┘
                                       │
                            ┌──────────▼──────────┐
                            │  Edge Function      │
                            │  (send-push-notif)  │
                            │                     │
                            │  ┌───────────────┐  │
                            │  │ Expo Push API │──┼──► Device
                            │  └───────────────┘  │
                            └─────────────────────┘
                                       ▲
                                       │
                            ┌──────────┴──────────┐
                            │  Cron Job (1 min)   │
                            │  + Instant trigger  │
                            └─────────────────────┘
```

---

## Phase 1-2: Database Schema

### Migration File: `009_add_push_notifications.sql`

Run on **database server**:

```bash
ssh souqjari-db
sudo -u postgres psql -d supabase
```

```sql
-- =============================================================================
-- Push Tokens Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expo_push_token TEXT NOT NULL,
    device_type TEXT CHECK (device_type IN ('ios', 'android', 'web')),
    device_name TEXT,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT unique_token UNIQUE (expo_push_token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON public.push_tokens(user_id, is_active) WHERE is_active = TRUE;

-- =============================================================================
-- Notifications Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'new_message', 'listing_favorited', 'price_drop',
        'new_inquiry', 'promotion', 'listing_sold', 'system'
    )),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    image_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    is_pushed BOOLEAN DEFAULT FALSE,
    push_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_pending_push ON public.notifications(is_pushed) WHERE is_pushed = FALSE;

-- =============================================================================
-- Notification Preferences (add to profiles table)
-- =============================================================================

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS message_notifs BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS listing_notifs BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS price_drop_notifs BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS promo_notifs BOOLEAN DEFAULT TRUE;

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Push tokens policies
CREATE POLICY "push_tokens_select_own" ON public.push_tokens
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "push_tokens_insert_own" ON public.push_tokens
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_tokens_update_own" ON public.push_tokens
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "push_tokens_delete_own" ON public.push_tokens
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "notifications_select_own" ON public.notifications
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_delete_own" ON public.notifications
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Service role access (for Edge Functions)
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.push_tokens TO service_role;

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Check if user wants notifications
CREATE OR REPLACE FUNCTION public.user_wants_notification(
    target_user_id UUID,
    notification_type TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    user_prefs RECORD;
BEGIN
    SELECT push_enabled, message_notifs, listing_notifs, price_drop_notifs, promo_notifs
    INTO user_prefs FROM public.profiles WHERE id = target_user_id;

    IF NOT FOUND OR NOT user_prefs.push_enabled THEN RETURN FALSE; END IF;

    CASE notification_type
        WHEN 'new_message', 'new_inquiry' THEN RETURN user_prefs.message_notifs;
        WHEN 'listing_favorited', 'listing_sold' THEN RETURN user_prefs.listing_notifs;
        WHEN 'price_drop' THEN RETURN user_prefs.price_drop_notifs;
        WHEN 'promotion' THEN RETURN user_prefs.promo_notifs;
        ELSE RETURN TRUE;
    END CASE;
END; $$;

-- Upsert push token (handles ownership transfer)
CREATE OR REPLACE FUNCTION public.upsert_push_token(
    p_user_id UUID,
    p_expo_push_token TEXT,
    p_device_type TEXT,
    p_device_name TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_token_id UUID;
BEGIN
    INSERT INTO public.push_tokens (user_id, expo_push_token, device_type, device_name, is_active, last_used_at)
    VALUES (p_user_id, p_expo_push_token, p_device_type, p_device_name, TRUE, NOW())
    ON CONFLICT (expo_push_token) DO UPDATE SET
        user_id = p_user_id,
        device_type = p_device_type,
        device_name = COALESCE(p_device_name, push_tokens.device_name),
        is_active = TRUE,
        last_used_at = NOW()
    RETURNING id INTO v_token_id;

    RETURN v_token_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.upsert_push_token TO authenticated;
```

---

## Phase 3: Notification Triggers

### Migration File: `011_add_notification_triggers.sql`

These triggers auto-create notifications when events occur:

```sql
-- =============================================================================
-- New Message Trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    conv_record RECORD;
    recipient_id UUID;
    sender_profile RECORD;
BEGIN
    -- Get conversation details
    SELECT c.*, l.title as listing_title, l.images as listing_images
    INTO conv_record
    FROM public.conversations c
    JOIN public.listings l ON l.id = c.listing_id
    WHERE c.id = NEW.conversation_id;

    -- Determine recipient
    IF NEW.sender_id = conv_record.buyer_id THEN
        recipient_id := conv_record.seller_id;
    ELSE
        recipient_id := conv_record.buyer_id;
    END IF;

    -- Get sender info
    SELECT display_name, avatar_url INTO sender_profile
    FROM public.profiles WHERE id = NEW.sender_id;

    -- Create notification if user wants it
    IF public.user_wants_notification(recipient_id, 'new_message') THEN
        INSERT INTO public.notifications (user_id, type, title, body, data, image_url)
        VALUES (
            recipient_id,
            'new_message',
            COALESCE(sender_profile.display_name, 'Someone'),
            CASE WHEN NEW.message_type = 'voice' THEN 'Sent a voice message'
                 ELSE LEFT(NEW.content, 100) END,
            jsonb_build_object(
                'conversation_id', NEW.conversation_id,
                'message_id', NEW.id,
                'sender_id', NEW.sender_id,
                'listing_id', conv_record.listing_id
            ),
            CASE WHEN conv_record.listing_images IS NOT NULL
                AND array_length(conv_record.listing_images, 1) > 0
            THEN conv_record.listing_images[1] ELSE NULL END
        );
    END IF;

    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.messages;
CREATE TRIGGER trigger_notify_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- =============================================================================
-- Listing Favorited Trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_listing_favorited()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    listing_record RECORD;
    favoriter_profile RECORD;
BEGIN
    SELECT * INTO listing_record FROM public.listings WHERE id = NEW.listing_id;
    SELECT display_name INTO favoriter_profile FROM public.profiles WHERE id = NEW.user_id;

    IF listing_record.user_id != NEW.user_id
       AND public.user_wants_notification(listing_record.user_id, 'listing_favorited') THEN
        INSERT INTO public.notifications (user_id, type, title, body, data, image_url)
        VALUES (
            listing_record.user_id,
            'listing_favorited',
            COALESCE(favoriter_profile.display_name, 'Someone') || ' favorited your listing',
            listing_record.title,
            jsonb_build_object('listing_id', NEW.listing_id, 'favoriter_id', NEW.user_id),
            CASE WHEN listing_record.images IS NOT NULL
                AND array_length(listing_record.images, 1) > 0
            THEN listing_record.images[1] ELSE NULL END
        );
    END IF;
    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_notify_listing_favorited ON public.favorites;
CREATE TRIGGER trigger_notify_listing_favorited
    AFTER INSERT ON public.favorites
    FOR EACH ROW EXECUTE FUNCTION public.notify_listing_favorited();
```

---

## Phase 4: Edge Function & Delivery

### Deploy Edge Function

On **app server**:

```bash
ssh souqjari-app
cd /opt/supabase/supabase/docker

# Create function directory
mkdir -p volumes/functions/send-push-notification
```

Create the function file:

```bash
cat > volumes/functions/send-push-notification/index.ts << 'EOF'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type, Authorization" }});
    }
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" }});
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { notification_id, batch_mode = false, limit = 100 } = body;

    let notifications: any[] = [];

    if (notification_id) {
      const { data } = await supabase.from("notifications").select("*").eq("id", notification_id).eq("is_pushed", false).single();
      if (data) notifications = [data];
    } else if (batch_mode) {
      const { data } = await supabase.from("notifications").select("*").eq("is_pushed", false).order("created_at", { ascending: true }).limit(limit);
      notifications = data || [];
    }

    if (notifications.length === 0) {
      return new Response(JSON.stringify({ message: "No pending notifications", sent: 0 }), { status: 200, headers: { "Content-Type": "application/json" }});
    }

    const results = { sent: 0, failed: 0, skipped: 0, errors: [] as string[] };
    const channels: Record<string, string> = { new_message: "messages", new_inquiry: "messages", listing_favorited: "listing-activity", price_drop: "listing-activity", listing_sold: "listing-activity", promotion: "promotions", system: "default" };
    const priorities: Record<string, string> = { new_message: "high", new_inquiry: "high", listing_favorited: "normal", price_drop: "normal", listing_sold: "normal", promotion: "default", system: "high" };

    for (const notif of notifications) {
      try {
        const { data: tokens } = await supabase.from("push_tokens").select("expo_push_token, device_type").eq("user_id", notif.user_id).eq("is_active", true);

        if (!tokens || tokens.length === 0) {
          await supabase.from("notifications").update({ is_pushed: true, push_sent_at: new Date().toISOString() }).eq("id", notif.id);
          results.skipped++;
          continue;
        }

        const messages = tokens.map((t: any) => ({
          to: t.expo_push_token,
          title: notif.title,
          body: notif.body,
          data: { ...notif.data, type: notif.type, notification_id: notif.id },
          sound: "default",
          channelId: channels[notif.type] || "default",
          priority: priorities[notif.type] || "default",
          ttl: 86400
        }));

        const res = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: { "Accept": "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(messages)
        });

        const result = await res.json();
        const tickets = result.data || [];

        for (let i = 0; i < tickets.length; i++) {
          if (tickets[i].status === "error" && tickets[i].details?.error === "DeviceNotRegistered") {
            await supabase.from("push_tokens").update({ is_active: false }).eq("expo_push_token", tokens[i].expo_push_token);
          }
        }

        await supabase.from("notifications").update({ is_pushed: true, push_sent_at: new Date().toISOString() }).eq("id", notif.id);
        results.sent++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(notif.id + ": " + e.message);
      }
    }

    return new Response(JSON.stringify(results), { status: 200, headers: { "Content-Type": "application/json" }});
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
}
EOF
```

Update main router:

```bash
cat > volumes/functions/main/index.ts << 'EOF'
import sendPushNotification from "../send-push-notification/index.ts";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path.includes("send-push-notification")) {
    return await sendPushNotification(req);
  }

  return new Response(JSON.stringify({ status: "ok", available: ["/send-push-notification"] }), {
    headers: { "Content-Type": "application/json" },
  });
});
EOF

# Restart functions container
docker compose restart functions
```

### Set Up Cron Job

```bash
# Create cron script
cat > /opt/supabase/supabase/process-notifications.sh << 'EOF'
#!/bin/bash
cd /opt/supabase/supabase/docker
source .env
curl -s -X POST http://localhost:8000/functions/v1/send-push-notification \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -d '{"batch_mode": true, "limit": 100}' \
  >> /var/log/push-notifications.log 2>&1
echo "" >> /var/log/push-notifications.log
EOF

chmod +x /opt/supabase/supabase/process-notifications.sh

# Add to crontab (runs every minute)
(crontab -l 2>/dev/null | grep -v process-notifications; echo "* * * * * /opt/supabase/supabase/process-notifications.sh") | crontab -
```

### Test Edge Function

```bash
source .env && curl -X POST http://localhost:8000/functions/v1/send-push-notification \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -d '{"batch_mode": true}'
```

Expected response:
```json
{"sent":0,"failed":0,"skipped":0,"errors":[]}
```

---

## Phase 5: In-App Notification Center

### Client-Side Files

The following files implement the notification system in the app:

| File | Description |
|------|-------------|
| `lib/notifications/NotificationService.ts` | Core service for push token management |
| `lib/notifications/usePushNotifications.ts` | Hook for push notification setup |
| `lib/notifications/useNotifications.ts` | Hook for in-app notifications |
| `app/notifications.tsx` | Notification center screen |
| `app/notification-settings.tsx` | Settings screen (persists to DB) |

### Key Features

1. **Token Registration**: Auto-registers Expo push tokens on login
2. **Real-time Updates**: New notifications appear instantly via Supabase realtime
3. **Instant Delivery**: After sending a message, triggers immediate push processing
4. **Badge Count**: Updates app badge with unread count
5. **Notification Center**: View, mark read, delete notifications
6. **User Preferences**: Toggle notification types in settings

### Instant Push Delivery

In `hooks/useMessages.ts`, after sending a message:

```typescript
// Trigger instant push notification delivery (fire-and-forget)
NotificationService.processPendingNotifications(10).catch(() => {});
```

---

## Testing

### 1. Check Push Tokens Registered

```bash
source .env && curl -s "http://localhost:8000/rest/v1/push_tokens?is_active=eq.true&select=expo_push_token,device_type" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"
```

### 2. Check Pending Notifications

```bash
source .env && curl -s "http://localhost:8000/rest/v1/notifications?is_pushed=eq.false&limit=5&select=id,title,type" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"
```

### 3. Manually Trigger Push Processing

```bash
/opt/supabase/supabase/process-notifications.sh && tail -5 /var/log/push-notifications.log
```

### 4. Check Push Notification Log

```bash
tail -f /var/log/push-notifications.log
```

---

## Troubleshooting

### "No API key found in request"

Include both `apikey` header and `Authorization` header:
```bash
-H "apikey: $SERVICE_ROLE_KEY" \
-H "Authorization: Bearer $SERVICE_ROLE_KEY"
```

### "permission denied for table notifications"

Grant service role access:
```sql
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.push_tokens TO service_role;
```

### Function Not Found / Returns `{"status":"ok"}`

The Edge Function wasn't loaded. Check:
1. File exists: `ls volumes/functions/send-push-notification/`
2. Main router updated: `cat volumes/functions/main/index.ts`
3. Restart container: `docker compose restart functions`

### Notifications Not Received on Device

1. **Check token registered**: Query `push_tokens` table
2. **Check notification created**: Query `notifications` table
3. **App in foreground**: Notifications may not show as banners
4. **Android requires FCM**: Add `google-services.json` for production

### Expo Go Limitations

Push notifications in Expo Go have limitations:
- Android SDK 53+: Not supported in Expo Go, use development build
- iOS: Works in Expo Go

---

## Verification Checklist

- [ ] Database tables created (`push_tokens`, `notifications`)
- [ ] Preference columns added to `profiles`
- [ ] Notification triggers installed
- [ ] Edge Function deployed and responding
- [ ] Cron job running every minute
- [ ] Push tokens registering from app
- [ ] Notifications created on message send
- [ ] Push notifications received on device
- [ ] Notification center showing notifications
- [ ] Settings persisting to database

---

*Document Version: 1.0*
*Last Updated: December 2024*
*Author: SouqShamy DevOps*
