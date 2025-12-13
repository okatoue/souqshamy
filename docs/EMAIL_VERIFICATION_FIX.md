# Email Verification Fix - Server Configuration

This document describes the server-side changes needed to fix email verification issues:
1. Email links using HTTP instead of HTTPS
2. Redirect after verification going to wrong URL (Kong error)

## Problem Summary

- **Issue 1**: Email verification links use `http://` instead of `https://`
- **Issue 2**: After verification, users are redirected to `api.souqjari.com/#access_token=...` which shows Kong error `{"message":"no Route matched with those values"}` instead of redirecting to the mobile app

## Solution Overview

1. Host a callback HTML page on Cloudflare that redirects to the mobile app
2. Update GoTrue environment variables to redirect to the callback page

---

## Part 1: Callback Page (Already Deployed)

The callback page is hosted on **Cloudflare Workers**:

- **URL**: `https://souqjari.com/auth/callback`
- **Worker name**: `auth`
- **File**: `index.html` (from `public/auth-callback.html` in this repo)

### Cloudflare Setup

1. Created a Cloudflare Worker named `auth`
2. Uploaded `index.html` with folder structure: `/auth/callback/index.html`
3. Added route: `souqjari.com/auth/callback*` → `auth` worker

---

## Part 2: GoTrue Configuration

SSH to the app server and update the GoTrue configuration:

```bash
ssh souqjari-app
cd /opt/supabase/supabase/docker
nano .env
```

### Add these settings to `.env`:

```env
############
# GoTrue / Auth Settings
############

# Site URL - where GoTrue redirects after email verification
SITE_URL=https://souqjari.com/auth/callback
GOTRUE_SITE_URL=https://souqjari.com/auth/callback

# External URL for GoTrue (tells it it's behind HTTPS proxy)
API_EXTERNAL_URL=https://api.souqjari.com
GOTRUE_API_EXTERNAL_URL=https://api.souqjari.com

# Allowed redirect URLs (includes mobile app deep link)
GOTRUE_URI_ALLOW_LIST=https://souqjari.com,https://api.souqjari.com,exp://*,stickersmash://*

# Mailer URL paths
GOTRUE_MAILER_URLPATHS_CONFIRMATION=/auth/v1/verify
GOTRUE_MAILER_URLPATHS_RECOVERY=/auth/v1/verify
GOTRUE_MAILER_URLPATHS_INVITE=/auth/v1/verify
GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE=/auth/v1/verify
```

---

## Part 3: Apply Changes

```bash
cd /opt/supabase/supabase/docker

# Restart auth service to pick up new env vars
docker compose restart auth

# Check logs for errors
docker compose logs auth --tail=50
```

---

## Part 4: Test the Fix

1. **Sign up** with a new test email address
2. **Check the verification email** - the link should now use `https://`
3. **Click the verification link**
4. **Verify redirect** - should go to `souqjari.com/auth/callback`, then redirect to the app
5. **Confirm in app** - user should be signed in with verified email

---

## How It Works

1. User clicks email verification link
2. GoTrue verifies the email and redirects to `GOTRUE_SITE_URL` with tokens in URL fragment
3. User lands on `https://souqjari.com/auth/callback#access_token=...`
4. The callback page JavaScript extracts tokens and redirects to `stickersmash://auth/callback#access_token=...`
5. Mobile app receives the deep link and completes sign-in

---

## Troubleshooting

### Links still use HTTP

- Check that `GOTRUE_SITE_URL` and `API_EXTERNAL_URL` both use `https://`
- Verify GoTrue was restarted after changing env vars
- Check if Cloudflare is configured for "Flexible SSL" (should be "Full" or "Full Strict")

### App doesn't receive tokens

- Check browser console for JavaScript errors on the callback page
- Verify the app scheme is correct (`stickersmash://`)
- Test the deep link manually: `stickersmash://auth/callback#access_token=test`

### Redirect goes to wrong URL

- Verify `GOTRUE_SITE_URL` is set to `https://souqjari.com/auth/callback`
- Check that the callback page is accessible at `https://souqjari.com/auth/callback`

---

## Configuration Summary

| Setting | Value |
|---------|-------|
| App Deep Link Scheme | `stickersmash` |
| App Callback Path | `stickersmash://auth/callback` |
| GoTrue Site URL | `https://souqjari.com/auth/callback` |
| Callback Page URL | `https://souqjari.com/auth/callback` |
| Cloudflare Worker | `auth` |

---

## Files

- `public/auth-callback.html` - Source HTML for the callback page (deployed to Cloudflare as `index.html`)
- `docs/EMAIL_VERIFICATION_FIX.md` - This documentation file
