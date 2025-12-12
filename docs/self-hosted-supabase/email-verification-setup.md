# Email Verification Setup Guide

This guide covers configuring email verification for the self-hosted Supabase instance, including SMTP setup and alternative approaches.

## Table of Contents
1. [Current State](#current-state)
2. [Option 1: SMTP Configuration (Recommended)](#option-1-smtp-configuration-recommended)
3. [Option 2: Auto-Confirm Emails (Temporary)](#option-2-auto-confirm-emails-temporary)
4. [Testing Email Delivery](#testing-email-delivery)
5. [Troubleshooting](#troubleshooting)

---

## Current State

The self-hosted Supabase instance has:
- `GOTRUE_MAILER_AUTOCONFIRM=false` (email verification required)
- Empty SMTP configuration (emails cannot be sent)

This means signups require email verification, but no verification emails are actually sent.

---

## Option 1: SMTP Configuration (Recommended)

### Recommended SMTP Providers for Germany-Hosted Servers

Given the server is in Germany (Hetzner) and serves Syrian market users, these providers work well:

#### A. Resend (Recommended)
- **Why**: Developer-friendly, generous free tier (100 emails/day), excellent deliverability
- **Pricing**: Free tier available, then $20/month for 50k emails
- **Setup**: https://resend.com

```bash
# SSH into app server
ssh souqjari-app

# Edit the Supabase .env file
nano /opt/supabase/supabase/docker/.env
```

Update SMTP settings:
```env
# Resend SMTP Configuration
GOTRUE_SMTP_HOST=smtp.resend.com
GOTRUE_SMTP_PORT=465
GOTRUE_SMTP_USER=resend
GOTRUE_SMTP_PASS=re_YOUR_API_KEY_HERE
GOTRUE_SMTP_ADMIN_EMAIL=noreply@souqjari.com
GOTRUE_SMTP_SENDER_NAME=SouqJari
GOTRUE_MAILER_AUTOCONFIRM=false
```

#### B. Brevo (formerly Sendinblue)
- **Why**: EU-based, GDPR compliant, free tier (300 emails/day)
- **Pricing**: Free tier available
- **Setup**: https://brevo.com

```env
# Brevo SMTP Configuration
GOTRUE_SMTP_HOST=smtp-relay.brevo.com
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=your_brevo_login_email
GOTRUE_SMTP_PASS=your_smtp_key
GOTRUE_SMTP_ADMIN_EMAIL=noreply@souqjari.com
GOTRUE_SMTP_SENDER_NAME=SouqJari
GOTRUE_MAILER_AUTOCONFIRM=false
```

#### C. Mailgun
- **Why**: Reliable, good EU region support
- **Pricing**: Pay-as-you-go, $0.80 per 1000 emails
- **Setup**: https://mailgun.com

```env
# Mailgun SMTP Configuration
GOTRUE_SMTP_HOST=smtp.eu.mailgun.org
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=postmaster@mg.souqjari.com
GOTRUE_SMTP_PASS=your_mailgun_smtp_password
GOTRUE_SMTP_ADMIN_EMAIL=noreply@souqjari.com
GOTRUE_SMTP_SENDER_NAME=SouqJari
GOTRUE_MAILER_AUTOCONFIRM=false
```

#### D. Amazon SES (EU Frankfurt)
- **Why**: Very cheap at scale, EU region available
- **Pricing**: $0.10 per 1000 emails
- **Setup**: https://aws.amazon.com/ses/

```env
# Amazon SES SMTP Configuration (EU Frankfurt)
GOTRUE_SMTP_HOST=email-smtp.eu-central-1.amazonaws.com
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=your_ses_smtp_username
GOTRUE_SMTP_PASS=your_ses_smtp_password
GOTRUE_SMTP_ADMIN_EMAIL=noreply@souqjari.com
GOTRUE_SMTP_SENDER_NAME=SouqJari
GOTRUE_MAILER_AUTOCONFIRM=false
```

### Apply Configuration Changes

After updating the .env file:

```bash
cd /opt/supabase/supabase/docker

# Restart the auth service to apply changes
docker compose restart auth

# Verify the service is healthy
docker compose ps auth

# Check logs for any SMTP errors
docker compose logs auth --tail=50
```

### Domain Verification (Required)

Most SMTP providers require domain verification:

1. **Add DNS records** as instructed by your SMTP provider
2. **Typical records needed**:
   - SPF record: `v=spf1 include:_spf.provider.com ~all`
   - DKIM record: Provider-specific
   - Optional DMARC: `v=DMARC1; p=quarantine; rua=mailto:dmarc@souqjari.com`

Example for souqjari.com in Cloudflare:
```
Type: TXT
Name: @
Content: v=spf1 include:_spf.resend.com ~all
```

---

## Option 2: Auto-Confirm Emails (Temporary)

If SMTP setup is not immediately feasible (e.g., Syrian users may have issues receiving emails), you can temporarily skip email verification.

### Enable Auto-Confirm

```bash
ssh souqjari-app
nano /opt/supabase/supabase/docker/.env
```

Change this line:
```env
# FROM:
GOTRUE_MAILER_AUTOCONFIRM=false

# TO:
GOTRUE_MAILER_AUTOCONFIRM=true
```

Apply the change:
```bash
cd /opt/supabase/supabase/docker
docker compose restart auth
```

### Security Trade-offs

**Risks of disabling email verification:**
- Anyone can sign up with any email address (including fake ones)
- Users might use typo'd email addresses and lose account access
- No proof the user owns the email address
- Cannot send password reset emails to unverified addresses

**Mitigations:**
- Plan to enable SMS OTP verification via Syriatel (Phase 4)
- Add rate limiting on signup endpoint
- Consider requiring phone number verification instead

### App Changes for Auto-Confirm

When auto-confirm is enabled, the verify-email screen won't be triggered. The signUp flow in `password.tsx` will need to handle this:

```typescript
// In app/(auth)/password.tsx, the current code will work
// but the verify-email redirect won't happen because
// the user will be automatically confirmed and signed in.
// The auth state listener in _layout.tsx will redirect them.
```

If auto-confirm is enabled, modify password.tsx:

```typescript
if (isNewUser) {
  await signUp(email, password, undefined, displayName.trim());
  // With auto-confirm, user is immediately signed in
  // Auth state listener will handle redirect to (tabs)
}
```

---

## Testing Email Delivery

### Test from Server

```bash
# SSH into app server
ssh souqjari-app

# Test SMTP connection
apt-get install -y swaks

# Send test email
swaks --to test@example.com \
      --from noreply@souqjari.com \
      --server smtp.resend.com \
      --port 465 \
      --tls \
      --auth LOGIN \
      --auth-user resend \
      --auth-password "re_YOUR_API_KEY" \
      --header "Subject: Test Email from SouqJari" \
      --body "This is a test email."
```

### Test via API

```bash
# Test signup which should trigger verification email
curl -X POST 'https://api.souqjari.com/auth/v1/signup' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "data": {
      "display_name": "Test User"
    }
  }'
```

### Check Auth Service Logs

```bash
cd /opt/supabase/supabase/docker
docker compose logs auth --tail=100 | grep -i smtp
docker compose logs auth --tail=100 | grep -i email
docker compose logs auth --tail=100 | grep -i mailer
```

---

## Troubleshooting

### Emails Not Sending

1. **Check SMTP credentials**:
   ```bash
   grep GOTRUE_SMTP /opt/supabase/supabase/docker/.env
   ```

2. **Check auth service logs**:
   ```bash
   docker compose logs auth 2>&1 | grep -i error
   ```

3. **Verify DNS records**:
   ```bash
   dig TXT souqjari.com +short
   dig TXT _dmarc.souqjari.com +short
   ```

4. **Test SMTP port connectivity**:
   ```bash
   nc -zv smtp.resend.com 465
   nc -zv smtp.resend.com 587
   ```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `535 Authentication failed` | Wrong SMTP credentials | Verify username/password |
| `550 Sender not authorized` | Domain not verified | Complete domain verification |
| `Connection timed out` | Port blocked | Try different port (587 vs 465) |
| `TLS handshake failed` | TLS version mismatch | Check SMTP port requirements |

### Email Templates

GoTrue uses default email templates. To customize:

1. Create custom templates in `/opt/supabase/supabase/docker/volumes/auth/templates/`
2. Configure template paths in .env:
   ```env
   GOTRUE_MAILER_TEMPLATES_INVITE=/templates/invite.html
   GOTRUE_MAILER_TEMPLATES_CONFIRMATION=/templates/confirmation.html
   GOTRUE_MAILER_TEMPLATES_RECOVERY=/templates/recovery.html
   ```

---

## Future: SMS OTP (Phase 4)

For the Syrian market, SMS OTP via Syriatel may be more reliable than email:

1. Most Syrian users have Syriatel phone numbers
2. Email delivery to some Syrian email providers may be unreliable
3. Phone verification provides stronger identity confirmation

The `verify-email.tsx` screen's OTP flow can be adapted for SMS verification when Phase 4 is implemented.

---

## Summary Recommendation

For immediate deployment:

1. **If targeting Syrian market primarily**: Enable `GOTRUE_MAILER_AUTOCONFIRM=true` temporarily and prioritize SMS OTP integration (Phase 4)

2. **If targeting broader MENA/international users**: Set up Resend or Brevo SMTP and keep email verification enabled

3. **Long-term**: Implement both email and SMS verification, letting users choose their preferred method

---

*Document Version: 1.0*
*Last Updated: December 2024*
