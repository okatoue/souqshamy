# Email Verification Fix - Server Configuration

This document describes the server-side changes needed to fix email verification issues:
1. Email links using HTTP instead of HTTPS
2. Redirect after verification going to wrong URL (Kong error)

## Problem Summary

- **Issue 1**: Email verification links use `http://` instead of `https://`
- **Issue 2**: After verification, users are redirected to `api.souqjari.com/#access_token=...` which shows Kong error `{"message":"no Route matched with those values"}` instead of redirecting to the mobile app

## Solution Overview

1. Update GoTrue environment variables to use HTTPS and proper redirect URLs
2. Host a callback HTML page that redirects to the mobile app
3. Configure Kong routes to serve the callback page

---

## Part 1: GoTrue Configuration

SSH to the app server and update the GoTrue configuration:

```bash
ssh souqjari-app
cd /opt/supabase/supabase/docker
nano .env
```

### Update these settings in `.env`:

```env
# Ensure all URLs use HTTPS
SITE_URL=https://api.souqjari.com
API_EXTERNAL_URL=https://api.souqjari.com

# IMPORTANT: Change GOTRUE_SITE_URL to point to the callback page
# Option A: If hosting callback on souqjari.com (recommended)
GOTRUE_SITE_URL=https://souqjari.com/auth/callback

# Option B: If hosting callback on api.souqjari.com
# GOTRUE_SITE_URL=https://api.souqjari.com/auth/callback

# Tell GoTrue it's behind a proxy/load balancer using HTTPS
GOTRUE_API_EXTERNAL_URL=https://api.souqjari.com

# Add the mobile app deep link to allowed redirects
GOTRUE_URI_ALLOW_LIST=https://souqjari.com,https://api.souqjari.com,exp://*,stickersmash://*

# Mailer settings - ensure HTTPS in generated links
GOTRUE_MAILER_URLPATHS_CONFIRMATION=/auth/v1/verify
GOTRUE_MAILER_URLPATHS_RECOVERY=/auth/v1/verify
GOTRUE_MAILER_URLPATHS_INVITE=/auth/v1/verify
GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE=/auth/v1/verify
```

---

## Part 2: Host the Callback Page

The callback page (`public/auth-callback.html` in this repo) needs to be hosted somewhere accessible. Choose one of these options:

### Option A: Host on Cloudflare Pages (Recommended)

1. Create a new Cloudflare Pages site
2. Upload the `public/auth-callback.html` file
3. Configure custom domain: `souqjari.com/auth/callback`

### Option B: Host on the API Server

Copy the callback page to the Supabase static files directory:

```bash
ssh souqjari-app

# Create static files directory
mkdir -p /opt/supabase/static

# Copy the callback page (copy content from public/auth-callback.html in this repo)
cat > /opt/supabase/static/auth-callback.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirecting to SouqJari...</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex; justify-content: center; align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; text-align: center; padding: 20px;
        }
        .container {
            max-width: 400px; padding: 40px 30px;
            background: rgba(255,255,255,0.1);
            border-radius: 20px; backdrop-filter: blur(10px);
        }
        .icon { font-size: 64px; margin-bottom: 20px; }
        h1 { font-size: 24px; font-weight: 600; margin-bottom: 10px; }
        .message { font-size: 16px; opacity: 0.9; margin-bottom: 20px; }
        .spinner {
            width: 40px; height: 40px;
            border: 3px solid rgba(255,255,255,0.3);
            border-radius: 50%; border-top-color: white;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .manual-link {
            display: inline-block; margin-top: 20px;
            padding: 12px 24px;
            background: rgba(255,255,255,0.2);
            border-radius: 8px; color: white;
            text-decoration: none; font-weight: 500;
        }
        .manual-link:hover { background: rgba(255,255,255,0.3); }
        .error-container { display: none; }
        .error-container.show { display: block; }
        .error-message {
            background: rgba(255,100,100,0.2);
            padding: 15px; border-radius: 8px;
            margin-top: 20px; font-size: 14px;
        }
        .fallback-message {
            margin-top: 30px; padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.2);
            font-size: 14px; opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div id="success-view">
            <div class="icon">✅</div>
            <h1>Email Verified!</h1>
            <div class="spinner"></div>
            <p class="message" id="status-message">Redirecting to SouqJari app...</p>
            <a href="#" id="manual-link" class="manual-link">Open SouqJari App</a>
            <div class="fallback-message">
                <p>If the app doesn't open automatically, tap the button above.</p>
            </div>
        </div>
        <div id="error-view" class="error-container">
            <div class="icon">⚠️</div>
            <h1>Verification Issue</h1>
            <div class="error-message" id="error-message"></div>
            <a href="stickersmash://auth/signin" class="manual-link">Go to Sign In</a>
        </div>
    </div>
    <script>
        (function() {
            var APP_SCHEME = 'stickersmash';
            var CALLBACK_PATH = 'auth/callback';
            var hash = window.location.hash;
            var searchParams = new URLSearchParams(window.location.search);
            var successView = document.getElementById('success-view');
            var errorView = document.getElementById('error-view');
            var statusMessage = document.getElementById('status-message');
            var manualLink = document.getElementById('manual-link');
            var errorMessage = document.getElementById('error-message');
            var error = searchParams.get('error');
            var errorDescription = searchParams.get('error_description');
            if (error) {
                successView.style.display = 'none';
                errorView.classList.add('show');
                errorMessage.textContent = errorDescription || error || 'An error occurred.';
                return;
            }
            var deepLink = APP_SCHEME + '://' + CALLBACK_PATH;
            if (hash) deepLink += hash;
            var type = searchParams.get('type');
            if (type) deepLink += (hash ? '&' : '#') + 'type=' + type;
            manualLink.href = deepLink;
            setTimeout(function() { window.location.href = deepLink; }, 500);
            setTimeout(function() {
                statusMessage.textContent = 'Tap the button below to open the app';
                var spinner = document.querySelector('.spinner');
                if (spinner) spinner.style.display = 'none';
            }, 3000);
        })();
    </script>
</body>
</html>
HTMLEOF
```

### Option C: Serve via Docker/Nginx

Add a simple nginx container to serve static files:

```yaml
# Add to docker-compose.yml
services:
  static:
    image: nginx:alpine
    volumes:
      - /opt/supabase/static:/usr/share/nginx/html:ro
    restart: unless-stopped
```

---

## Part 3: Configure Kong Routes (If hosting on API server)

If hosting the callback page on `api.souqjari.com`, add a Kong route to serve it.

Edit Kong configuration:

```bash
cd /opt/supabase/supabase/docker
nano volumes/api/kong.yml
```

Add this service to the `services` section:

```yaml
  # Auth callback page for email verification redirect
  - name: auth-callback-static
    url: http://static:80/auth-callback.html
    routes:
      - name: auth-callback-route
        paths:
          - /auth/callback
        strip_path: true
    plugins:
      - name: cors
```

Or, to handle the root path (prevents Kong "no route" error):

```yaml
  # Root path redirect
  - name: root-redirect
    url: http://static:80/auth-callback.html
    routes:
      - name: root-path
        paths:
          - /
        strip_path: true
        methods:
          - GET
    plugins:
      - name: cors
```

---

## Part 4: Apply Changes

```bash
cd /opt/supabase/supabase/docker

# Restart auth service to pick up new env vars
docker compose restart auth

# If you modified kong.yml, restart Kong
docker compose restart kong

# Check logs for errors
docker compose logs auth --tail=50
docker compose logs kong --tail=50
```

---

## Part 5: Test the Fix

1. **Sign up** with a new test email address
2. **Check the verification email** - the link should now use `https://`
3. **Click the verification link**
4. **Verify redirect** - should go to the callback page, then redirect to the app
5. **Confirm in app** - user should be signed in with verified email

---

## Troubleshooting

### Links still use HTTP

- Check that `GOTRUE_SITE_URL` and `API_EXTERNAL_URL` both use `https://`
- Verify GoTrue was restarted after changing env vars
- Check if Cloudflare is configured for "Flexible SSL" (should be "Full" or "Full Strict")

### Kong "no Route matched" error

- The root path `/` has no route - this is expected if using the callback approach
- Set `GOTRUE_SITE_URL` to point to `/auth/callback` instead of root
- Or add a root path route that redirects to the callback page

### App doesn't receive tokens

- Check browser console for JavaScript errors on the callback page
- Verify the app scheme is correct (`stickersmash://`)
- Test the deep link manually: `stickersmash://auth/callback#access_token=test`

### Redirect goes to wrong URL

- Verify `GOTRUE_SITE_URL` is set correctly
- Check that the callback page is accessible at the configured URL
- Ensure Kong routes are properly configured if hosting on API domain

---

## Configuration Summary

| Setting | Value |
|---------|-------|
| App Deep Link Scheme | `stickersmash` |
| App Callback Path | `stickersmash://auth/callback` |
| GoTrue Site URL | `https://souqjari.com/auth/callback` (recommended) |
| Callback Page Location | `public/auth-callback.html` |

---

## Files in This Repo

- `public/auth-callback.html` - Static HTML page for handling email verification redirects
- `docs/EMAIL_VERIFICATION_FIX.md` - This documentation file
