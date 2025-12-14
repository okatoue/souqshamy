# Phase 6: Expo App Migration to Self-Hosted Supabase

## Overview

This guide documents the migration of the SouqJari Expo application from Supabase Cloud to the self-hosted Supabase instance.

### Infrastructure Reference

| Component | Location |
|-----------|----------|
| App Server (Supabase) | Hetzner CPX41, 10.0.0.3 |
| Database Server | Hetzner CCX33, 10.0.0.2 |
| Storage | Cloudflare R2 (`souqjari-storage`) |
| API Endpoint | https://api.souqjari.com |
| Studio | https://studio.souqjari.com |
| Domain | souqjari.com (Cloudflare DNS/SSL) |

---

## Configuration Files Summary

### Files Changed

| File | Change Required |
|------|-----------------|
| `.env` | **Updated** - New Supabase URL and ANON_KEY |
| `.env.example` | **Updated** - Documentation for self-hosted setup |
| `lib/supabase.ts` | No changes - already uses environment variables |
| `lib/auth_context.tsx` | No changes - verify redirect URIs in server config |
| `lib/imageUpload.ts` | No changes - uses supabase client from lib/supabase.ts |

### Environment Variables

The `.env` file has been updated with the self-hosted configuration:

```env
# Self-Hosted Supabase Configuration (SouqJari Production)
EXPO_PUBLIC_SUPABASE_URL=https://api.souqjari.com
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY>

# OAuth Configuration
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id
EXPO_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id
```

---

## Step 1: Retrieve ANON_KEY from Server

SSH into the app server and retrieve the ANON_KEY:

```bash
# Connect to app server
ssh souqjari-app

# Retrieve the ANON_KEY
cat /root/supabase-secrets/secrets.env | grep ANON_KEY
```

Copy the value and update the `.env` file:

```bash
# In your local Expo project
# Edit .env and replace YOUR_ANON_KEY_HERE with the actual key
```

---

## Step 2: Clear Expo Cache

Environment variables in Expo are cached. Clear the cache and restart:

```bash
# Clear Metro bundler cache
npx expo start --clear

# Or more aggressively if needed
rm -rf node_modules/.cache
npx expo start --clear
```

---

## Step 3: Verify Server Configuration

### 3.1 Check GOTRUE_URI_ALLOW_LIST

On the app server, verify the redirect URIs are configured:

```bash
ssh souqjari-app
grep -E "GOTRUE_URI_ALLOW_LIST|ADDITIONAL_REDIRECT" /root/supabase-docker/.env
```

Expected configuration:
```env
GOTRUE_URI_ALLOW_LIST=https://souqjari.com,exp://*,souqjari://auth/callback
ADDITIONAL_REDIRECT_URLS=https://souqjari.com,exp://,souqjari://
```

### 3.2 Check Storage Buckets Exist

Verify the required storage buckets exist:

```bash
ssh souqjari-app
source /root/supabase-secrets/secrets.env

# List buckets
curl -s https://api.souqjari.com/storage/v1/bucket \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq .
```

If buckets don't exist, create them:

```bash
# Create listing-images bucket
curl -X POST https://api.souqjari.com/storage/v1/bucket \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":"listing-images","name":"listing-images","public":true}'

# Create avatars bucket
curl -X POST https://api.souqjari.com/storage/v1/bucket \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":"avatars","name":"avatars","public":true}'
```

---

## Step 4: Configure OAuth Providers (If Using OAuth)

### 4.1 Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client ID
3. Add authorized redirect URIs:
   - `https://api.souqjari.com/auth/v1/callback`
   - `souqjari://auth/callback`

### 4.2 Facebook OAuth

1. Go to [Facebook Developer Console](https://developers.facebook.com/apps)
2. Navigate to Settings > Basic
3. Add valid OAuth redirect URIs:
   - `https://api.souqjari.com/auth/v1/callback`
   - `souqjari://auth/callback`

---

## Step 5: Testing

### 5.1 Basic Connectivity Test

From terminal, verify API is accessible:

```bash
curl -s https://api.souqjari.com/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 5.2 In-App Testing Checklist

| Feature | Test Action | Expected Result |
|---------|-------------|-----------------|
| Auth: Sign Up | Create new account with email/password | User created, redirected to app |
| Auth: Sign In | Log in with existing credentials | Session established, user data loaded |
| Auth: Sign Out | Log out | Session cleared |
| Database: Read | Browse listings | Listings display from self-hosted DB |
| Database: Write | Create a new listing | Listing saved successfully |
| Storage: Upload | Add images to a listing | Images upload to R2, URLs work |
| Storage: View | View listing with images | Images load correctly |
| Realtime: Messages | Send a message in conversation | Message appears in real-time |
| Realtime: Typing | Typing indicator (if implemented) | Updates in real-time |
| Location Queries | Filter by location | Results filtered correctly |
| RPC Functions | Mark messages as read | `mark_messages_as_read` executes |

### 5.3 Syrian IP Test (Critical)

Test the app from a Syrian IP address (or simulate with contacts in Syria):

- [ ] Without VPN: App should connect and function normally
- [ ] API calls: Should not be blocked
- [ ] Image loading: R2 images should load (Cloudflare accessible from Syria)
- [ ] Realtime: WebSocket should connect and maintain connection

---

## Troubleshooting

### Issue: "Invalid API key" or 401 Unauthorized

**Cause:** Wrong ANON_KEY or environment variable not loaded

**Fix:**
1. Verify ANON_KEY matches self-hosted instance
2. Clear Expo cache: `npx expo start --clear`
3. Check the key is actually being used:
   ```typescript
   console.log('Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
   ```

### Issue: Images Not Loading

**Cause:** Storage bucket doesn't exist or wrong URL format

**Fix:**
1. Create buckets if missing (see Step 3.2 above)
2. Check public URL format in your code
3. Verify R2 CORS allows your domain

### Issue: Realtime Not Connecting

**Cause:** WebSocket connection failing through Nginx

**Fix:** Verify Nginx config has WebSocket upgrade headers:
```nginx
location /realtime/ {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    # ... rest of config
}
```

### Issue: OAuth Redirect Fails

**Cause:** Redirect URI not in allowed list

**Fix:**
1. Add URI to `GOTRUE_URI_ALLOW_LIST` in self-hosted `.env`
2. Add URI to OAuth provider console (Google/Facebook)
3. Restart Supabase services: `docker compose restart auth`

### Issue: "Network request failed" on Android/iOS

**Cause:** SSL certificate issues or domain not resolving

**Fix:**
1. Verify Cloudflare SSL mode is "Full (strict)"
2. Test domain resolution: `nslookup api.souqjari.com`
3. Check Cloudflare isn't blocking the request (check firewall rules)

---

## Rollback Plan

If issues arise and you need to switch back to Supabase Cloud:

```bash
# The original .env.example contains the template
# Create a new .env with Supabase Cloud values:

# Supabase Cloud Configuration
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-cloud-anon-key>

# Clear cache and restart
npx expo start --clear
```

---

## Post-Migration Checklist

After successfully connecting to self-hosted Supabase:

- [ ] Delete test data from Supabase Cloud if no longer needed
- [ ] Update CI/CD environment variables if using automated deployments
- [ ] Document the new setup for team members
- [ ] Monitor the self-hosted instance for the first few days:

```bash
# On app server
docker compose logs -f --tail=100
```

---

## Architecture Notes

### API Paths

The self-hosted Supabase uses Kong as API gateway, which expects requests at the same paths as Supabase Cloud:

| Service | Path |
|---------|------|
| Auth | `/auth/v1/...` |
| REST | `/rest/v1/...` |
| Realtime | `/realtime/v1/...` |
| Storage | `/storage/v1/...` |

### Public URL Format

Images and files are served at:
- **Via Kong:** `https://api.souqjari.com/storage/v1/object/public/{bucket}/{path}`
- **Direct R2 (if configured):** `https://images.souqjari.com/{bucket}/{path}`

### App Scheme

The current app scheme is `souqjari` (defined in `app.json`). For production, consider changing to `souqjari`:

1. Update `app.json`:
   ```json
   "scheme": "souqjari"
   ```

2. Update `lib/auth_context.tsx`:
   ```typescript
   const redirectUri = AuthSession.makeRedirectUri({
       scheme: 'souqjari',
       path: 'auth/callback',
       native: 'souqjari://auth/callback',
   });
   ```

3. Update server `GOTRUE_URI_ALLOW_LIST` to include the new scheme

---

## Related Documentation

- [Phase 1: Infrastructure Setup](./phase1-infrastructure-setup.md)
- [Phase 2: Database Setup](./phase2-database-setup.md)
- [Phase 3: App Server Setup](./phase3-app-server-setup.md)
- [Phase 5: Schema Deployment](./phase5-schema-deployment.md)
- [Fix Realtime DateTime Error](./fix-realtime-datetime-error.md)
