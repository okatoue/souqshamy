# Cloudflare DNS & Security Setup Guide

## Overview

This guide configures Cloudflare as your DNS provider and security layer for SouqShamy's self-hosted Supabase instance.

**Benefits of Cloudflare:**
- Free DDoS protection
- SSL/TLS termination
- CDN for static assets
- Analytics and monitoring
- Hide your server's real IP address

---

## Step 1: Add Your Domain to Cloudflare

### 1.1 Create Cloudflare Account (if needed)
1. Go to https://dash.cloudflare.com/sign-up
2. Create account with email/password
3. Verify email

### 1.2 Add Site
1. Click "Add a Site" in dashboard
2. Enter domain: `souqshamy.com` (your actual domain)
3. Select **Free** plan
4. Click "Continue"

### 1.3 Update Nameservers
Cloudflare will provide two nameservers like:
```
xxx.ns.cloudflare.com
yyy.ns.cloudflare.com
```

Update these at your domain registrar:

**For Namecheap:**
1. Log in to Namecheap
2. Domain List → Manage
3. Nameservers → Custom DNS
4. Add both Cloudflare nameservers
5. Save

**For GoDaddy:**
1. Log in to GoDaddy
2. My Products → DNS → Manage
3. Nameservers → Change
4. Enter custom nameservers
5. Save

**DNS propagation takes 1-24 hours** (usually 1-2 hours)

---

## Step 2: Configure DNS Records

### 2.1 Required DNS Records

Go to **DNS** → **Records** in Cloudflare dashboard and add:

| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| A | `@` | `YOUR_SERVER_IP` | Proxied | Auto |
| A | `api` | `YOUR_SERVER_IP` | Proxied | Auto |
| A | `studio` | `YOUR_SERVER_IP` | Proxied | Auto |
| A | `storage` | `YOUR_SERVER_IP` | Proxied | Auto |
| A | `realtime` | `YOUR_SERVER_IP` | **DNS Only** | Auto |
| CNAME | `www` | `souqshamy.com` | Proxied | Auto |

### 2.2 Important Notes

**Realtime Subdomain:**
- Must be **DNS Only** (gray cloud)
- WebSocket connections work better without proxy
- Alternative: Keep proxied if you configure WebSocket in Cloudflare

**Proxy Status:**
- **Proxied (orange):** Traffic goes through Cloudflare (DDoS protection, CDN)
- **DNS Only (gray):** Direct connection to your server

### 2.3 Example Record Creation

Click "Add Record" and fill in:

```
Type: A
Name: api
IPv4 address: 116.203.xxx.xxx (your server IP)
Proxy status: Proxied (orange cloud)
TTL: Auto
→ Click Save
```

---

## Step 3: Configure SSL/TLS

### 3.1 SSL/TLS Mode

Go to **SSL/TLS** → **Overview**:

1. Set encryption mode to: **Full (strict)**

This requires a valid certificate on your origin server (we'll use Cloudflare Origin Certificate).

### 3.2 Edge Certificates

Go to **SSL/TLS** → **Edge Certificates**:

| Setting | Value |
|---------|-------|
| Always Use HTTPS | **ON** |
| HTTP Strict Transport Security (HSTS) | Enable after testing |
| Minimum TLS Version | **TLS 1.2** |
| Opportunistic Encryption | ON |
| TLS 1.3 | ON |
| Automatic HTTPS Rewrites | **ON** |

### 3.3 Create Origin Certificate

Go to **SSL/TLS** → **Origin Server** → **Create Certificate**:

1. **Generate private key and CSR:** Let Cloudflare generate
2. **Private key type:** RSA (2048)
3. **Hostnames:**
   ```
   *.souqshamy.com
   souqshamy.com
   ```
4. **Certificate Validity:** 15 years
5. Click **Create**

**Save these files securely:**

**Origin Certificate (copy to server):**
```
-----BEGIN CERTIFICATE-----
MIIEpDCCAowCCQC...
...
-----END CERTIFICATE-----
```

**Private Key (copy to server - KEEP SECRET):**
```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBg...
...
-----END PRIVATE KEY-----
```

### 3.4 Install Origin Certificate on Server

SSH into your server:

```bash
# Create SSL directory
sudo mkdir -p /etc/ssl/cloudflare

# Create certificate file
sudo nano /etc/ssl/cloudflare/origin.pem
# Paste the Origin Certificate content, save (Ctrl+X, Y, Enter)

# Create private key file
sudo nano /etc/ssl/cloudflare/origin.key
# Paste the Private Key content, save

# Set secure permissions
sudo chmod 600 /etc/ssl/cloudflare/origin.key
sudo chmod 644 /etc/ssl/cloudflare/origin.pem
sudo chown root:root /etc/ssl/cloudflare/*
```

---

## Step 4: Security Settings

### 4.1 Security Level

Go to **Security** → **Settings**:

| Setting | Value |
|---------|-------|
| Security Level | **Medium** |
| Challenge Passage | 30 minutes |
| Browser Integrity Check | **ON** |

### 4.2 WAF (Web Application Firewall)

Go to **Security** → **WAF**:

1. Enable **Managed Rules** (Free plan has basic rules)
2. Create custom rule if needed

### 4.3 Bot Fight Mode

Go to **Security** → **Bots**:

1. **Bot Fight Mode:** ON
2. **Note:** May affect API calls - monitor and adjust if needed

### 4.4 Firewall Rules (If Needed)

To allow Syrian IPs explicitly (if blocked):

1. Go to **Security** → **WAF** → **Custom Rules**
2. Create rule:
   - **Name:** Allow Syrian Users
   - **Expression:** `(ip.geoip.country eq "SY")`
   - **Action:** Skip (select all)

---

## Step 5: Performance Settings

### 5.1 Speed Optimizations

Go to **Speed** → **Optimization**:

| Setting | Value |
|---------|-------|
| Auto Minify | CSS, JavaScript, HTML - **ON** |
| Brotli | **ON** |
| Early Hints | **ON** |
| Rocket Loader | **OFF** (can break SPA apps) |

### 5.2 Caching

Go to **Caching** → **Configuration**:

| Setting | Value |
|---------|-------|
| Caching Level | Standard |
| Browser Cache TTL | Respect Existing Headers |
| Always Online | **ON** |

### 5.3 Cache Rules for API

Create a Cache Rule to bypass cache for API:

1. Go to **Caching** → **Cache Rules**
2. Create rule:
   - **Name:** Bypass API Cache
   - **Expression:** `(http.host eq "api.souqshamy.com")`
   - **Cache eligibility:** Bypass cache

---

## Step 6: WebSocket Support

For Supabase Realtime to work through Cloudflare proxy:

### 6.1 Enable WebSockets

Go to **Network**:

| Setting | Value |
|---------|-------|
| WebSockets | **ON** |

### 6.2 Alternative: Use DNS Only for Realtime

If WebSockets have issues:
1. Go to **DNS** → **Records**
2. Find `realtime` record
3. Click the orange cloud to make it gray (DNS Only)

---

## Step 7: Create API Token for Automation

For automated certificate renewal and other integrations:

### 7.1 Create Token

1. Click profile icon → **My Profile**
2. Go to **API Tokens**
3. Click **Create Token**
4. Use template: **Edit zone DNS**

### 7.2 Token Permissions

```
Permissions:
  - Zone - DNS - Edit
  - Zone - Zone - Read

Zone Resources:
  - Include - Specific zone - souqshamy.com
```

### 7.3 Save Token

Copy and save the token securely:
```
CF_API_TOKEN=your_token_here
CF_ZONE_ID=your_zone_id (found in Overview page)
```

---

## Step 8: Verification

### 8.1 Check DNS Propagation

```bash
# From any machine
dig api.souqshamy.com +short
dig studio.souqshamy.com +short
dig realtime.souqshamy.com +short

# Should return Cloudflare IPs (for proxied) or your server IP (for DNS only)
```

### 8.2 Check SSL

```bash
# Check certificate
curl -vI https://api.souqshamy.com 2>&1 | grep -E "(SSL|issuer|subject)"

# Should show Cloudflare certificate
```

### 8.3 Check from Syria (or via VPN)

Test that Syrian users can access:
```bash
curl -I https://api.souqshamy.com
# Should return 200 OK (after Supabase deployment)
```

---

## Cloudflare Configuration Checklist

- [ ] Domain added to Cloudflare
- [ ] Nameservers updated at registrar
- [ ] DNS records created (api, studio, storage, realtime)
- [ ] SSL/TLS set to Full (strict)
- [ ] Origin certificate created and installed
- [ ] Always Use HTTPS enabled
- [ ] WebSockets enabled
- [ ] API Token created (optional, for automation)
- [ ] DNS propagation verified

---

## Quick Reference

### Cloudflare Dashboard URLs

| Page | URL |
|------|-----|
| DNS Records | https://dash.cloudflare.com/?to=/:account/:zone/dns |
| SSL/TLS | https://dash.cloudflare.com/?to=/:account/:zone/ssl-tls |
| Security | https://dash.cloudflare.com/?to=/:account/:zone/security |
| Speed | https://dash.cloudflare.com/?to=/:account/:zone/speed |

### Useful Commands

```bash
# Check if Cloudflare is proxying
curl -sI https://api.yourdomain.com | grep -i "cf-ray"

# Check SSL certificate
echo | openssl s_client -connect api.yourdomain.com:443 2>/dev/null | openssl x509 -noout -issuer

# Test WebSocket
wscat -c wss://realtime.yourdomain.com/socket
```

---

## Troubleshooting

### DNS Not Propagating

- Wait up to 24 hours
- Verify nameservers changed at registrar
- Use: https://www.whatsmydns.net/

### SSL Errors

- Ensure SSL mode is "Full (strict)"
- Verify origin certificate is installed correctly
- Check certificate file permissions

### WebSocket Connection Fails

1. Try DNS Only for realtime subdomain
2. Check WebSockets are enabled in Network settings
3. Verify Supabase Realtime is running

### API Returns 522 Error

- Origin server is not responding
- Check if Supabase is running
- Verify firewall allows port 80/443

### Syrian Users Still Blocked

- Check Security settings
- Disable Bot Fight Mode temporarily
- Create allow rule for Syrian IPs
