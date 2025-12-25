# Push Notifications Quick Commands

Quick reference for managing push notifications on self-hosted Supabase.

---

## Database Server Commands

```bash
# Connect to database
ssh souqjari-db
sudo -u postgres psql -d supabase
```

### Check Tables

```sql
-- View push tokens
SELECT user_id, expo_push_token, device_type, is_active, last_used_at
FROM public.push_tokens ORDER BY last_used_at DESC LIMIT 10;

-- View pending notifications
SELECT id, type, title, is_pushed, created_at
FROM public.notifications WHERE is_pushed = false ORDER BY created_at DESC LIMIT 10;

-- View sent notifications
SELECT id, type, title, push_sent_at
FROM public.notifications WHERE is_pushed = true ORDER BY push_sent_at DESC LIMIT 10;

-- Check notification preferences
SELECT id, push_enabled, message_notifs, listing_notifs, price_drop_notifs, promo_notifs
FROM public.profiles LIMIT 10;
```

### Manage Data

```sql
-- Reset all notifications to pending (for testing)
UPDATE public.notifications SET is_pushed = false, push_sent_at = NULL;

-- Deactivate all push tokens (for testing)
UPDATE public.push_tokens SET is_active = false;

-- Delete old notifications (older than 30 days)
DELETE FROM public.notifications WHERE created_at < NOW() - INTERVAL '30 days';

-- Count notifications by type
SELECT type, COUNT(*) FROM public.notifications GROUP BY type ORDER BY COUNT(*) DESC;
```

### Fix Permissions

```sql
-- Grant service role access
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;
GRANT ALL ON public.push_tokens TO authenticated;
```

---

## App Server Commands

```bash
# SSH to app server
ssh souqjari-app
cd /opt/supabase/supabase/docker

# Load environment
source .env
```

### Edge Function Management

```bash
# Check functions container status
docker compose ps functions

# Restart functions container
docker compose restart functions

# View function logs
docker compose logs functions --tail=50

# List deployed functions
ls -la volumes/functions/
```

### Test Edge Function

```bash
# Test batch mode (process all pending)
source .env && curl -X POST http://localhost:8000/functions/v1/send-push-notification \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -d '{"batch_mode": true}'

# Test single notification
source .env && curl -X POST http://localhost:8000/functions/v1/send-push-notification \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -d '{"notification_id": "UUID_HERE"}'
```

### Check Data via REST API

```bash
# List active push tokens
source .env && curl -s "http://localhost:8000/rest/v1/push_tokens?is_active=eq.true&select=user_id,device_type,created_at" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"

# List pending notifications
source .env && curl -s "http://localhost:8000/rest/v1/notifications?is_pushed=eq.false&select=id,title,type&limit=10" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"

# Count unread for a user
source .env && curl -s "http://localhost:8000/rest/v1/notifications?user_id=eq.USER_UUID&is_read=eq.false&select=id" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact"
```

### Cron Job Management

```bash
# View crontab
crontab -l

# Manually trigger cron job
/opt/supabase/supabase/process-notifications.sh

# View push notification log
tail -f /var/log/push-notifications.log

# View last 20 entries
tail -20 /var/log/push-notifications.log

# Clear log
> /var/log/push-notifications.log
```

---

## Client (Expo App) Commands

```bash
# Clear cache and restart
npx expo start --clear

# Run on specific platform
npx expo start --ios
npx expo start --android

# Build Android debug
cd android && ./gradlew assembleDebug

# Check for push notification related errors
npx expo start 2>&1 | grep -i notif
```

---

## Common Issues & Fixes

### Notifications Not Sending

```bash
# 1. Check Edge Function is running
docker compose ps functions

# 2. Check for errors in function logs
docker compose logs functions | grep -i error

# 3. Test function directly
source .env && curl -X POST http://localhost:8000/functions/v1/send-push-notification \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_mode": true}'

# 4. Check cron is running
crontab -l | grep notifications
```

### Push Tokens Not Registering

```sql
-- Check if RPC function exists
SELECT proname FROM pg_proc WHERE proname = 'upsert_push_token';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.upsert_push_token TO authenticated;
```

### Notifications Created But Not Pushed

```sql
-- Check is_pushed status
SELECT id, is_pushed, push_sent_at FROM public.notifications ORDER BY created_at DESC LIMIT 5;

-- Verify user has active tokens
SELECT pt.*, p.push_enabled
FROM public.push_tokens pt
JOIN public.profiles p ON p.id = pt.user_id
WHERE pt.is_active = true;
```

---

## Monitoring Queries

```sql
-- Notification stats (last 24 hours)
SELECT
    type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_pushed) as pushed,
    COUNT(*) FILTER (WHERE is_read) as read
FROM public.notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY type;

-- Active users with push tokens
SELECT COUNT(DISTINCT user_id) FROM public.push_tokens WHERE is_active = true;

-- Notifications per hour (last 24h)
SELECT
    date_trunc('hour', created_at) as hour,
    COUNT(*) as notifications
FROM public.notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour ORDER BY hour;
```

---

*Last Updated: December 2024*
