# Phase 6: Quick Commands Reference

## Get ANON_KEY from Server

```bash
# SSH and get the key
ssh souqjari-app
cat /root/supabase-secrets/secrets.env | grep ANON_KEY
```

## Update Local .env

```bash
# Edit .env in project root
# Set these values:
EXPO_PUBLIC_SUPABASE_URL=https://api.souqjari.com
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<paste_anon_key_here>
```

## Clear Expo Cache & Restart

```bash
# Standard clear
npx expo start --clear

# Full clear
rm -rf node_modules/.cache
npx expo start --clear
```

## Verify API Connectivity

```bash
# Test from terminal
curl -s https://api.souqjari.com/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Check Storage Buckets

```bash
ssh souqjari-app
source /root/supabase-secrets/secrets.env

# List buckets
curl -s https://api.souqjari.com/storage/v1/bucket \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq .
```

## Create Storage Buckets (If Missing)

```bash
ssh souqjari-app
source /root/supabase-secrets/secrets.env

# listing-images
curl -X POST https://api.souqjari.com/storage/v1/bucket \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":"listing-images","name":"listing-images","public":true}'

# avatars
curl -X POST https://api.souqjari.com/storage/v1/bucket \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":"avatars","name":"avatars","public":true}'
```

## Check GOTRUE Config

```bash
ssh souqjari-app
grep -E "GOTRUE_URI_ALLOW_LIST|ADDITIONAL_REDIRECT" /root/supabase-docker/.env
```

## Restart Supabase Services

```bash
ssh souqjari-app
cd /root/supabase-docker
docker compose restart auth
```

## Monitor Logs

```bash
ssh souqjari-app
cd /root/supabase-docker
docker compose logs -f --tail=100
```

## Debug: Check Environment Variables in App

```typescript
// Add to your app temporarily
console.log('Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('Key prefix:', process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.substring(0, 20) + '...');
```

## Rollback to Supabase Cloud

```bash
# Create .env with cloud values
cat > .env << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<cloud-anon-key>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id
EXPO_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id
EOF

# Clear cache
npx expo start --clear
```

## OAuth Provider URLs

### Google Cloud Console
https://console.cloud.google.com/apis/credentials

Add redirect URIs:
- `https://api.souqjari.com/auth/v1/callback`
- `souqjari://auth/callback`

### Facebook Developer Console
https://developers.facebook.com/apps

Add redirect URIs:
- `https://api.souqjari.com/auth/v1/callback`
- `souqjari://auth/callback`
