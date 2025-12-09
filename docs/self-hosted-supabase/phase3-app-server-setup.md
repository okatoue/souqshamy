# Phase 3: App Server Setup - Docker & Supabase Services

Complete step-by-step guide for installing Docker, deploying Supabase services, configuring Cloudflare R2 storage, and setting up Nginx reverse proxy on the app server.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Step 1: Install Docker](#step-1-install-docker)
3. [Step 2: Generate Secrets and API Keys](#step-2-generate-secrets-and-api-keys)
4. [Step 3: Set Up Cloudflare R2](#step-3-set-up-cloudflare-r2)
5. [Step 4: Clone and Configure Supabase](#step-4-clone-and-configure-supabase)
6. [Step 5: Configure Environment Variables](#step-5-configure-environment-variables)
7. [Step 6: Modify Docker Compose for External Database](#step-6-modify-docker-compose-for-external-database)
8. [Step 7: Start Supabase Services](#step-7-start-supabase-services)
9. [Step 8: Configure Nginx Reverse Proxy](#step-8-configure-nginx-reverse-proxy)
10. [Step 9: SSL/TLS Configuration](#step-9-ssltls-configuration)
11. [Step 10: Verification and Testing](#step-10-verification-and-testing)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting Phase 3, ensure Phase 2 is complete:
- [ ] PostgreSQL 15 running on database server (`10.0.0.2`)
- [ ] Supabase database created with all roles and schemas
- [ ] Remote connection from app server works
- [ ] All database passwords saved securely
- [ ] Cloudflare account set up with domain configured
- [ ] DNS records pointing to app server

**Required credentials from Phase 2:**
- `POSTGRES_PASSWORD`
- `SUPABASE_ADMIN_PASSWORD`
- `AUTHENTICATOR_PASSWORD`
- `AUTH_ADMIN_PASSWORD`
- `STORAGE_ADMIN_PASSWORD`
- `REALTIME_ADMIN_PASSWORD`
- `FUNCTIONS_ADMIN_PASSWORD`

---

## Step 1: Install Docker

SSH into the app server:

```bash
ssh souqjari-app
```

### 1.1 Remove Old Docker Versions (if any)

```bash
# Remove old versions
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
    apt-get remove -y $pkg 2>/dev/null || true
done
```

### 1.2 Install Docker Using Official Repository

```bash
# Update package index
apt-get update

# Install prerequisites
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update and install Docker
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 1.3 Verify Docker Installation

```bash
# Check Docker version
docker --version
# Expected: Docker version 27.x.x

# Check Docker Compose version
docker compose version
# Expected: Docker Compose version v2.x.x

# Verify Docker is running
systemctl status docker

# Test Docker
docker run hello-world
```

### 1.4 Configure Docker for Production

```bash
# Create Docker daemon configuration
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 65536
    }
  }
}
EOF

# Restart Docker to apply settings
systemctl restart docker

# Enable Docker to start on boot
systemctl enable docker
```

### 1.5 Add Admin User to Docker Group

```bash
# Add souqadmin to docker group (if user exists)
usermod -aG docker souqadmin 2>/dev/null || echo "User souqadmin not found, skipping"
```

---

## Step 2: Generate Secrets and API Keys

Supabase requires several secrets and JWT keys. Generate them securely.

### 2.1 Generate All Required Secrets

```bash
# Create a directory for secrets (temporary - delete after setup)
mkdir -p /root/supabase-secrets
cd /root/supabase-secrets

# Generate JWT secret (must be at least 32 characters)
echo "JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)" >> secrets.env

# Generate ANON key (JWT token for anonymous access)
# This is a pre-signed JWT with role=anon
JWT_SECRET=$(grep JWT_SECRET secrets.env | cut -d'=' -f2)

# Generate a proper anon key using the JWT secret
cat > /tmp/generate_keys.sh << 'GENEOF'
#!/bin/bash

JWT_SECRET="$1"

# Base64url encode function
base64url_encode() {
    openssl base64 -e -A | tr '+/' '-_' | tr -d '='
}

# Create anon JWT
ANON_HEADER='{"alg":"HS256","typ":"JWT"}'
ANON_PAYLOAD='{"role":"anon","iss":"supabase","iat":1700000000,"exp":2000000000}'

ANON_HEADER_B64=$(echo -n "$ANON_HEADER" | base64url_encode)
ANON_PAYLOAD_B64=$(echo -n "$ANON_PAYLOAD" | base64url_encode)
ANON_SIGNATURE=$(echo -n "${ANON_HEADER_B64}.${ANON_PAYLOAD_B64}" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | base64url_encode)

echo "ANON_KEY=${ANON_HEADER_B64}.${ANON_PAYLOAD_B64}.${ANON_SIGNATURE}"

# Create service_role JWT
SERVICE_HEADER='{"alg":"HS256","typ":"JWT"}'
SERVICE_PAYLOAD='{"role":"service_role","iss":"supabase","iat":1700000000,"exp":2000000000}'

SERVICE_HEADER_B64=$(echo -n "$SERVICE_HEADER" | base64url_encode)
SERVICE_PAYLOAD_B64=$(echo -n "$SERVICE_PAYLOAD" | base64url_encode)
SERVICE_SIGNATURE=$(echo -n "${SERVICE_HEADER_B64}.${SERVICE_PAYLOAD_B64}" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | base64url_encode)

echo "SERVICE_ROLE_KEY=${SERVICE_HEADER_B64}.${SERVICE_PAYLOAD_B64}.${SERVICE_SIGNATURE}"
GENEOF

chmod +x /tmp/generate_keys.sh
/tmp/generate_keys.sh "$JWT_SECRET" >> secrets.env

# Generate Dashboard credentials
echo "DASHBOARD_USERNAME=souqjari-admin" >> secrets.env
echo "DASHBOARD_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)" >> secrets.env

# Generate other secrets
echo "LOGFLARE_API_KEY=$(openssl rand -hex 32)" >> secrets.env
echo "POSTGRES_PASSWORD_ENCODED=$(echo -n 'YOUR_AUTHENTICATOR_PASSWORD' | python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.stdin.read(),safe=""))')" >> secrets.env

# Display the secrets (SAVE THESE!)
echo ""
echo "=============================================="
echo "  SAVE THESE SECRETS SECURELY!"
echo "=============================================="
cat secrets.env
echo "=============================================="
echo ""
```

### 2.2 Verify JWT Keys

```bash
# Install jq for JSON parsing
apt-get install -y jq

# Decode and verify the anon key
ANON_KEY=$(grep ANON_KEY /root/supabase-secrets/secrets.env | cut -d'=' -f2)
echo "$ANON_KEY" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
# Should show: {"role":"anon","iss":"supabase",...}

# Decode and verify the service_role key
SERVICE_KEY=$(grep SERVICE_ROLE_KEY /root/supabase-secrets/secrets.env | cut -d'=' -f2)
echo "$SERVICE_KEY" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
# Should show: {"role":"service_role","iss":"supabase",...}
```

---

## Step 3: Set Up Cloudflare R2

### 3.1 Create R2 Bucket in Cloudflare Dashboard

1. Log into Cloudflare Dashboard: https://dash.cloudflare.com
2. Select your account
3. Go to **R2 Object Storage** in the left sidebar
4. Click **Create bucket**
5. Configure:
   - Bucket name: `souqjari-storage`
   - Location: **Automatic** (or select **Europe** for better latency)
6. Click **Create bucket**

### 3.2 Create R2 API Token

1. In R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API token**
3. Configure:
   - Token name: `souqjari-supabase-storage`
   - Permissions: **Object Read & Write**
   - Specify bucket: `souqjari-storage`
   - TTL: **No expiration** (or set appropriate expiration)
4. Click **Create API Token**
5. **IMPORTANT:** Copy and save these immediately:
   - Access Key ID
   - Secret Access Key
   - S3 Client endpoint (format: `https://<account_id>.r2.cloudflarestorage.com`)

### 3.3 Get Your Account ID

1. In Cloudflare Dashboard, go to **Workers & Pages** → **Overview**
2. Find **Account ID** on the right sidebar
3. Or find it in the R2 S3 endpoint URL

### 3.4 Configure CORS for R2 Bucket

1. In R2 dashboard, click on your bucket (`souqjari-storage`)
2. Go to **Settings** tab
3. Scroll to **CORS Policy**
4. Click **Add CORS policy** and add:

```json
[
  {
    "AllowedOrigins": [
      "https://api.souqjari.com",
      "https://studio.souqjari.com",
      "https://souqjari.com",
      "exp://*",
      "http://localhost:*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

5. Click **Save**

### 3.5 (Optional) Set Up Custom Domain for R2

For cleaner URLs (`images.souqjari.com` instead of R2 endpoint):

1. In R2 bucket settings, go to **Public access**
2. Click **Connect Domain**
3. Enter: `images.souqjari.com`
4. Cloudflare will automatically add the DNS record
5. Wait for SSL certificate provisioning

### 3.6 Save R2 Credentials

Add R2 credentials to your secrets file:

```bash
cd /root/supabase-secrets

# Add R2 credentials (replace with your actual values)
cat >> secrets.env << 'EOF'

# Cloudflare R2 Configuration
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
R2_BUCKET=souqjari-storage
R2_PUBLIC_URL=https://images.souqjari.com
EOF

echo "Remember to replace placeholder values with actual R2 credentials!"
```

---

## Step 4: Clone and Configure Supabase

### 4.1 Create Supabase Directory

```bash
# Create directory for Supabase
mkdir -p /opt/supabase
cd /opt/supabase
```

### 4.2 Clone Supabase Docker Repository

```bash
# Clone the official Supabase Docker repository
git clone --depth 1 https://github.com/supabase/supabase.git
cd supabase/docker

# List the directory
ls -la
# You should see: docker-compose.yml, .env.example, volumes/
```

### 4.3 Copy Environment Template

```bash
# Copy the example environment file
cp .env.example .env
```

---

## Step 5: Configure Environment Variables

### 5.1 Create the Complete .env File

Replace the contents of `.env` with your configuration. This is a complete template:

```bash
# Create the .env file with all configurations
cat > /opt/supabase/supabase/docker/.env << 'ENVEOF'
############
# Secrets
# YOU MUST CHANGE THESE BEFORE GOING INTO PRODUCTION
############

# PostgreSQL connection (external database on 10.0.0.2)
POSTGRES_HOST=10.0.0.2
POSTGRES_PORT=5432
POSTGRES_DB=supabase
POSTGRES_USER=supabase_admin
POSTGRES_PASSWORD=YOUR_SUPABASE_ADMIN_PASSWORD

# JWT Configuration
JWT_SECRET=YOUR_JWT_SECRET_HERE
ANON_KEY=YOUR_ANON_KEY_HERE
SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# JWT Expiry (3600 = 1 hour, 604800 = 1 week)
JWT_EXPIRY=3600

# Site URL - your domain
SITE_URL=https://api.souqjari.com
ADDITIONAL_REDIRECT_URLS=https://souqjari.com,exp://

# API Configuration
API_EXTERNAL_URL=https://api.souqjari.com

############
# Database - Connection strings for services
############

# PostgREST
PGRST_DB_URI=postgresql://authenticator:YOUR_AUTHENTICATOR_PASSWORD@10.0.0.2:5432/supabase
PGRST_DB_SCHEMAS=public,storage,graphql_public
PGRST_DB_ANON_ROLE=anon
PGRST_JWT_SECRET=YOUR_JWT_SECRET_HERE

# GoTrue (Auth)
GOTRUE_DB_DATABASE_URL=postgresql://supabase_auth_admin:YOUR_AUTH_ADMIN_PASSWORD@10.0.0.2:5432/supabase
GOTRUE_DB_DRIVER=postgres
GOTRUE_SITE_URL=https://api.souqjari.com
GOTRUE_URI_ALLOW_LIST=https://souqjari.com,exp://*
GOTRUE_DISABLE_SIGNUP=false
GOTRUE_JWT_SECRET=YOUR_JWT_SECRET_HERE
GOTRUE_JWT_EXP=3600
GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated
GOTRUE_EXTERNAL_EMAIL_ENABLED=true
GOTRUE_EXTERNAL_PHONE_ENABLED=true
GOTRUE_MAILER_AUTOCONFIRM=false
GOTRUE_SMS_AUTOCONFIRM=false

# GoTrue SMTP Configuration (optional - for email auth)
GOTRUE_SMTP_HOST=
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=
GOTRUE_SMTP_PASS=
GOTRUE_SMTP_ADMIN_EMAIL=noreply@souqjari.com
GOTRUE_SMTP_SENDER_NAME=SouqJari
GOTRUE_MAILER_URLPATHS_INVITE=/auth/v1/verify
GOTRUE_MAILER_URLPATHS_CONFIRMATION=/auth/v1/verify
GOTRUE_MAILER_URLPATHS_RECOVERY=/auth/v1/verify
GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE=/auth/v1/verify

# GoTrue Phone/SMS Configuration
GOTRUE_SMS_PROVIDER=twilio
GOTRUE_SMS_TWILIO_ACCOUNT_SID=
GOTRUE_SMS_TWILIO_AUTH_TOKEN=
GOTRUE_SMS_TWILIO_MESSAGE_SERVICE_SID=
# Note: We'll configure custom SMS hook for Syriatel in Phase 4

# Realtime
REALTIME_DB_HOST=10.0.0.2
REALTIME_DB_PORT=5432
REALTIME_DB_NAME=supabase
REALTIME_DB_USER=supabase_realtime_admin
REALTIME_DB_PASSWORD=YOUR_REALTIME_ADMIN_PASSWORD
REALTIME_DB_SSL=false
REALTIME_IP_VERSION=4
REALTIME_SECURE_CHANNELS=true
REALTIME_JWT_SECRET=YOUR_JWT_SECRET_HERE

############
# Storage - Cloudflare R2 Configuration
############

STORAGE_BACKEND=s3
STORAGE_S3_BUCKET=souqjari-storage
STORAGE_S3_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
STORAGE_S3_REGION=auto
STORAGE_S3_ACCESS_KEY=YOUR_R2_ACCESS_KEY_ID
STORAGE_S3_SECRET_KEY=YOUR_R2_SECRET_ACCESS_KEY
STORAGE_S3_FORCE_PATH_STYLE=true
STORAGE_FILE_SIZE_LIMIT=52428800
IMGPROXY_ENABLE_WEBP_DETECTION=true

# Storage Database
STORAGE_DB_HOST=10.0.0.2
STORAGE_DB_PORT=5432
STORAGE_DB_NAME=supabase
STORAGE_DB_USER=supabase_storage_admin
STORAGE_DB_PASSWORD=YOUR_STORAGE_ADMIN_PASSWORD

############
# Studio Configuration
############

STUDIO_DEFAULT_ORGANIZATION=SouqJari
STUDIO_DEFAULT_PROJECT=SouqJari Production
STUDIO_PORT=3000
STUDIO_PG_META_URL=http://pg-meta:8080

# Supabase Studio Auth
DASHBOARD_USERNAME=souqjari-admin
DASHBOARD_PASSWORD=YOUR_DASHBOARD_PASSWORD

############
# Kong API Gateway
############

KONG_HTTP_PORT=8000
KONG_HTTPS_PORT=8443

############
# Analytics (Logflare) - Optional
############

LOGFLARE_LOGGER_BACKEND_API_KEY=YOUR_LOGFLARE_API_KEY
LOGFLARE_API_KEY=YOUR_LOGFLARE_API_KEY

# Enable/disable analytics
ENABLE_ANALYTICS=false

############
# Functions (Edge Functions)
############

FUNCTIONS_VERIFY_JWT=true
FUNCTIONS_DB_HOST=10.0.0.2
FUNCTIONS_DB_PORT=5432
FUNCTIONS_DB_NAME=supabase
FUNCTIONS_DB_USER=supabase_functions_admin
FUNCTIONS_DB_PASSWORD=YOUR_FUNCTIONS_ADMIN_PASSWORD

############
# Meta/Pooler
############

META_DB_HOST=10.0.0.2
META_DB_PORT=5432
META_DB_NAME=supabase
META_DB_USER=supabase_admin
META_DB_PASSWORD=YOUR_SUPABASE_ADMIN_PASSWORD

############
# Image Proxy
############

IMGPROXY_BIND=:8080
IMGPROXY_LOCAL_FILESYSTEM_ROOT=/
IMGPROXY_USE_ETAG=true
IMGPROXY_ENABLE_WEBP_DETECTION=true

############
# Other Settings
############

# Public URLs (for client access)
PUBLIC_REST_URL=https://api.souqjari.com/rest/v1
PUBLIC_REALTIME_URL=wss://api.souqjari.com/realtime/v1
PUBLIC_AUTH_URL=https://api.souqjari.com/auth/v1
PUBLIC_STORAGE_URL=https://api.souqjari.com/storage/v1
ENVEOF
```

### 5.2 Update .env with Your Actual Secrets

Now update the `.env` file with your actual secrets from Phase 2 and the secrets you generated:

```bash
cd /opt/supabase/supabase/docker

# Source your secrets
source /root/supabase-secrets/secrets.env

# Create a script to replace placeholders
cat > /tmp/update_env.sh << 'SCRIPTEOF'
#!/bin/bash
ENV_FILE="/opt/supabase/supabase/docker/.env"

# Function to replace a value
replace_value() {
    local key="$1"
    local value="$2"
    sed -i "s|${key}=.*|${key}=${value}|g" "$ENV_FILE"
}

# Replace with actual values (run this interactively)
echo "Enter your database passwords from Phase 2:"
read -p "SUPABASE_ADMIN_PASSWORD: " SUPABASE_ADMIN_PWD
read -p "AUTHENTICATOR_PASSWORD: " AUTH_PWD
read -p "AUTH_ADMIN_PASSWORD: " AUTH_ADMIN_PWD
read -p "STORAGE_ADMIN_PASSWORD: " STORAGE_PWD
read -p "REALTIME_ADMIN_PASSWORD: " REALTIME_PWD
read -p "FUNCTIONS_ADMIN_PASSWORD: " FUNCTIONS_PWD

echo ""
echo "Enter your generated secrets:"
read -p "JWT_SECRET: " JWT_SEC
read -p "ANON_KEY: " ANON
read -p "SERVICE_ROLE_KEY: " SERVICE_ROLE
read -p "DASHBOARD_PASSWORD: " DASH_PWD

echo ""
echo "Enter your Cloudflare R2 credentials:"
read -p "R2_ACCOUNT_ID: " R2_ACCT
read -p "R2_ACCESS_KEY_ID: " R2_KEY
read -p "R2_SECRET_ACCESS_KEY: " R2_SECRET

# Replace database passwords
replace_value "POSTGRES_PASSWORD" "$SUPABASE_ADMIN_PWD"
sed -i "s|authenticator:YOUR_AUTHENTICATOR_PASSWORD|authenticator:${AUTH_PWD}|g" "$ENV_FILE"
sed -i "s|supabase_auth_admin:YOUR_AUTH_ADMIN_PASSWORD|supabase_auth_admin:${AUTH_ADMIN_PWD}|g" "$ENV_FILE"
replace_value "STORAGE_DB_PASSWORD" "$STORAGE_PWD"
replace_value "REALTIME_DB_PASSWORD" "$REALTIME_PWD"
replace_value "FUNCTIONS_DB_PASSWORD" "$FUNCTIONS_PWD"
replace_value "META_DB_PASSWORD" "$SUPABASE_ADMIN_PWD"

# Replace JWT secrets
sed -i "s|YOUR_JWT_SECRET_HERE|${JWT_SEC}|g" "$ENV_FILE"
replace_value "ANON_KEY" "$ANON"
replace_value "SERVICE_ROLE_KEY" "$SERVICE_ROLE"

# Replace dashboard password
replace_value "DASHBOARD_PASSWORD" "$DASH_PWD"

# Replace R2 credentials
sed -i "s|YOUR_ACCOUNT_ID|${R2_ACCT}|g" "$ENV_FILE"
replace_value "STORAGE_S3_ACCESS_KEY" "$R2_KEY"
replace_value "STORAGE_S3_SECRET_KEY" "$R2_SECRET"

echo "Environment file updated!"
SCRIPTEOF

chmod +x /tmp/update_env.sh

echo ""
echo "Run the following command and enter your credentials:"
echo "/tmp/update_env.sh"
```

### 5.3 Verify Environment Configuration

```bash
# Check that no placeholder values remain
cd /opt/supabase/supabase/docker
grep -E "YOUR_|_HERE" .env

# If any lines appear, those still need to be replaced

# Verify critical settings (should show actual values, not placeholders)
grep -E "^JWT_SECRET=|^ANON_KEY=|^SERVICE_ROLE_KEY=|^POSTGRES_PASSWORD=|^STORAGE_S3_ACCESS_KEY=" .env
```

---

## Step 6: Modify Docker Compose for External Database

Since we're using an external PostgreSQL server, we need to modify the docker-compose.yml to:
1. Remove the PostgreSQL container
2. Update service dependencies
3. Configure for R2 storage

### 6.1 Backup Original Docker Compose

```bash
cd /opt/supabase/supabase/docker
cp docker-compose.yml docker-compose.yml.original
```

### 6.2 Create Modified Docker Compose

```bash
cat > /opt/supabase/supabase/docker/docker-compose.yml << 'COMPOSEEOF'
# SouqJari Self-Hosted Supabase
# Modified for external PostgreSQL and Cloudflare R2
# Based on Supabase Docker v1.24.x

version: "3.8"

services:
  # =============================================================================
  # Kong - API Gateway
  # =============================================================================
  kong:
    image: kong:2.8.1
    container_name: supabase-kong
    restart: unless-stopped
    ports:
      - "${KONG_HTTP_PORT:-8000}:8000/tcp"
      - "${KONG_HTTPS_PORT:-8443}:8443/tcp"
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /var/lib/kong/kong.yml
      KONG_DNS_ORDER: LAST,A,CNAME
      KONG_PLUGINS: request-transformer,cors,key-auth,acl,basic-auth
      KONG_NGINX_PROXY_PROXY_BUFFER_SIZE: 160k
      KONG_NGINX_PROXY_PROXY_BUFFERS: 64 160k
      KONG_LOG_LEVEL: warn
    volumes:
      - ./volumes/api/kong.yml:/var/lib/kong/kong.yml:ro
    networks:
      - supabase-network
    healthcheck:
      test: ["CMD", "kong", "health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # =============================================================================
  # GoTrue - Authentication Service
  # =============================================================================
  auth:
    image: supabase/gotrue:v2.158.1
    container_name: supabase-auth
    restart: unless-stopped
    depends_on:
      - kong
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      API_EXTERNAL_URL: ${API_EXTERNAL_URL}
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: ${GOTRUE_DB_DATABASE_URL}
      GOTRUE_SITE_URL: ${SITE_URL}
      GOTRUE_URI_ALLOW_LIST: ${GOTRUE_URI_ALLOW_LIST:-}
      GOTRUE_DISABLE_SIGNUP: ${GOTRUE_DISABLE_SIGNUP:-false}
      GOTRUE_JWT_ADMIN_ROLES: service_role
      GOTRUE_JWT_AUD: authenticated
      GOTRUE_JWT_DEFAULT_GROUP_NAME: authenticated
      GOTRUE_JWT_EXP: ${JWT_EXPIRY:-3600}
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_EXTERNAL_EMAIL_ENABLED: ${GOTRUE_EXTERNAL_EMAIL_ENABLED:-true}
      GOTRUE_EXTERNAL_PHONE_ENABLED: ${GOTRUE_EXTERNAL_PHONE_ENABLED:-true}
      GOTRUE_MAILER_AUTOCONFIRM: ${GOTRUE_MAILER_AUTOCONFIRM:-false}
      GOTRUE_SMS_AUTOCONFIRM: ${GOTRUE_SMS_AUTOCONFIRM:-false}
      GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED: true
      GOTRUE_SMTP_HOST: ${GOTRUE_SMTP_HOST:-}
      GOTRUE_SMTP_PORT: ${GOTRUE_SMTP_PORT:-587}
      GOTRUE_SMTP_USER: ${GOTRUE_SMTP_USER:-}
      GOTRUE_SMTP_PASS: ${GOTRUE_SMTP_PASS:-}
      GOTRUE_SMTP_ADMIN_EMAIL: ${GOTRUE_SMTP_ADMIN_EMAIL:-}
      GOTRUE_SMTP_SENDER_NAME: ${GOTRUE_SMTP_SENDER_NAME:-}
      GOTRUE_MAILER_URLPATHS_INVITE: ${GOTRUE_MAILER_URLPATHS_INVITE:-/auth/v1/verify}
      GOTRUE_MAILER_URLPATHS_CONFIRMATION: ${GOTRUE_MAILER_URLPATHS_CONFIRMATION:-/auth/v1/verify}
      GOTRUE_MAILER_URLPATHS_RECOVERY: ${GOTRUE_MAILER_URLPATHS_RECOVERY:-/auth/v1/verify}
      GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE: ${GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE:-/auth/v1/verify}
      # Phone/SMS will be configured with custom hook in Phase 4
    networks:
      - supabase-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:9999/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  # =============================================================================
  # PostgREST - RESTful API
  # =============================================================================
  rest:
    image: postgrest/postgrest:v12.2.2
    container_name: supabase-rest
    restart: unless-stopped
    depends_on:
      - kong
    environment:
      PGRST_DB_URI: ${PGRST_DB_URI}
      PGRST_DB_SCHEMAS: ${PGRST_DB_SCHEMAS:-public,storage,graphql_public}
      PGRST_DB_ANON_ROLE: ${PGRST_DB_ANON_ROLE:-anon}
      PGRST_JWT_SECRET: ${JWT_SECRET}
      PGRST_DB_USE_LEGACY_GUCS: "false"
      PGRST_APP_SETTINGS_JWT_SECRET: ${JWT_SECRET}
      PGRST_APP_SETTINGS_JWT_EXP: ${JWT_EXPIRY:-3600}
      PGRST_DB_MAX_ROWS: 1000
    networks:
      - supabase-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/ready || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3

  # =============================================================================
  # Realtime - WebSocket subscriptions
  # =============================================================================
  realtime:
    image: supabase/realtime:v2.30.23
    container_name: supabase-realtime
    restart: unless-stopped
    depends_on:
      - kong
    environment:
      PORT: 4000
      DB_HOST: ${REALTIME_DB_HOST}
      DB_PORT: ${REALTIME_DB_PORT:-5432}
      DB_NAME: ${REALTIME_DB_NAME:-supabase}
      DB_USER: ${REALTIME_DB_USER}
      DB_PASSWORD: ${REALTIME_DB_PASSWORD}
      DB_SSL: ${REALTIME_DB_SSL:-false}
      DB_AFTER_CONNECT_QUERY: "SET search_path TO realtime"
      DB_ENC_KEY: supabaserealtime
      API_JWT_SECRET: ${JWT_SECRET}
      SECRET_KEY_BASE: ${JWT_SECRET}
      ERL_AFLAGS: -proto_dist inet_tcp
      ENABLE_TAILSCALE: "false"
      DNS_NODES: "''"
      SECURE_CHANNELS: ${REALTIME_SECURE_CHANNELS:-true}
      SLOT_NAME: supabase_realtime_rls
      TEMPORARY_SLOT: "true"
      MAX_REPLICATION_LAG_MB: 1000
    networks:
      - supabase-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:4000/api/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3

  # =============================================================================
  # Storage - File Storage with R2 Backend
  # =============================================================================
  storage:
    image: supabase/storage-api:v1.0.6
    container_name: supabase-storage
    restart: unless-stopped
    depends_on:
      - kong
      - imgproxy
    environment:
      ANON_KEY: ${ANON_KEY}
      SERVICE_KEY: ${SERVICE_ROLE_KEY}
      POSTGREST_URL: http://rest:3000
      PGRST_JWT_SECRET: ${JWT_SECRET}
      DATABASE_URL: postgresql://${STORAGE_DB_USER}:${STORAGE_DB_PASSWORD}@${STORAGE_DB_HOST:-10.0.0.2}:${STORAGE_DB_PORT:-5432}/${STORAGE_DB_NAME:-supabase}
      PGOPTIONS: -c search_path=storage,public
      FILE_SIZE_LIMIT: ${STORAGE_FILE_SIZE_LIMIT:-52428800}
      STORAGE_BACKEND: ${STORAGE_BACKEND:-s3}
      STORAGE_S3_BUCKET: ${STORAGE_S3_BUCKET}
      STORAGE_S3_ENDPOINT: ${STORAGE_S3_ENDPOINT}
      STORAGE_S3_REGION: ${STORAGE_S3_REGION:-auto}
      STORAGE_S3_ACCESS_KEY: ${STORAGE_S3_ACCESS_KEY}
      STORAGE_S3_SECRET_KEY: ${STORAGE_S3_SECRET_KEY}
      STORAGE_S3_FORCE_PATH_STYLE: ${STORAGE_S3_FORCE_PATH_STYLE:-true}
      GLOBAL_S3_BUCKET: ${STORAGE_S3_BUCKET}
      TENANT_ID: stub
      REGION: stub
      IMGPROXY_URL: http://imgproxy:8080
      ENABLE_IMAGE_TRANSFORMATION: "true"
      IMGPROXY_HTTP_MAX_SRC_RESOLUTION: 104
    networks:
      - supabase-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:5000/status || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3

  # =============================================================================
  # Image Proxy - Image transformations
  # =============================================================================
  imgproxy:
    image: darthsim/imgproxy:v3.21
    container_name: supabase-imgproxy
    restart: unless-stopped
    environment:
      IMGPROXY_BIND: ":8080"
      IMGPROXY_LOCAL_FILESYSTEM_ROOT: /
      IMGPROXY_USE_ETAG: "true"
      IMGPROXY_ENABLE_WEBP_DETECTION: ${IMGPROXY_ENABLE_WEBP_DETECTION:-true}
    volumes:
      - ./volumes/storage:/var/lib/storage:z
    networks:
      - supabase-network
    healthcheck:
      test: ["CMD", "imgproxy", "health"]
      interval: 30s
      timeout: 5s
      retries: 3

  # =============================================================================
  # Meta - Database management API
  # =============================================================================
  meta:
    image: supabase/postgres-meta:v0.83.2
    container_name: supabase-meta
    restart: unless-stopped
    depends_on:
      - kong
    environment:
      PG_META_PORT: 8080
      PG_META_DB_HOST: ${META_DB_HOST:-10.0.0.2}
      PG_META_DB_PORT: ${META_DB_PORT:-5432}
      PG_META_DB_NAME: ${META_DB_NAME:-supabase}
      PG_META_DB_USER: ${META_DB_USER}
      PG_META_DB_PASSWORD: ${META_DB_PASSWORD}
    networks:
      - supabase-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3

  # =============================================================================
  # Studio - Dashboard UI
  # =============================================================================
  studio:
    image: supabase/studio:20241028-3e5bdb8
    container_name: supabase-studio
    restart: unless-stopped
    depends_on:
      - kong
      - meta
    environment:
      STUDIO_PG_META_URL: http://meta:8080
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      DEFAULT_ORGANIZATION_NAME: ${STUDIO_DEFAULT_ORGANIZATION:-SouqJari}
      DEFAULT_PROJECT_NAME: ${STUDIO_DEFAULT_PROJECT:-SouqJari Production}
      SUPABASE_URL: http://kong:8000
      SUPABASE_PUBLIC_URL: ${API_EXTERNAL_URL}
      SUPABASE_ANON_KEY: ${ANON_KEY}
      SUPABASE_SERVICE_KEY: ${SERVICE_ROLE_KEY}
      AUTH_JWT_SECRET: ${JWT_SECRET}
      LOGFLARE_API_KEY: ${LOGFLARE_API_KEY:-}
      LOGFLARE_URL: http://analytics:4000
      NEXT_PUBLIC_ENABLE_LOGS: "false"
      NEXT_ANALYTICS_BACKEND_PROVIDER: ""
    networks:
      - supabase-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/api/profile || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3

  # =============================================================================
  # Edge Functions (Optional - Deno runtime)
  # =============================================================================
  functions:
    image: supabase/edge-runtime:v1.58.3
    container_name: supabase-functions
    restart: unless-stopped
    depends_on:
      - kong
    environment:
      JWT_SECRET: ${JWT_SECRET}
      SUPABASE_URL: http://kong:8000
      SUPABASE_ANON_KEY: ${ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: ${SERVICE_ROLE_KEY}
      SUPABASE_DB_URL: postgresql://postgres:${POSTGRES_PASSWORD}@${POSTGRES_HOST:-10.0.0.2}:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-supabase}
      VERIFY_JWT: ${FUNCTIONS_VERIFY_JWT:-true}
    volumes:
      - ./volumes/functions:/home/deno/functions:Z
    networks:
      - supabase-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9000/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3

# =============================================================================
# Networks
# =============================================================================
networks:
  supabase-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

# =============================================================================
# Volumes (for persistent data)
# =============================================================================
volumes:
  storage-data:
    driver: local
COMPOSEEOF
```

### 6.3 Create Kong Configuration

The Kong API gateway needs its configuration file:

```bash
# Create Kong configuration directory
mkdir -p /opt/supabase/supabase/docker/volumes/api

# Create Kong configuration
cat > /opt/supabase/supabase/docker/volumes/api/kong.yml << 'KONGEOF'
_format_version: "2.1"
_transform: true

###
### Consumers / Users
###
consumers:
  - username: DASHBOARD

###
### Access Control Lists
###
acls:
  - consumer: DASHBOARD
    group: admin

###
### API Keys
###
keyauth_credentials:
  - consumer: DASHBOARD
    key: ${DASHBOARD_PASSWORD:-changeme}

###
### Services
###
services:
  ## Open Auth routes
  - name: auth-v1-open
    url: http://auth:9999/verify
    routes:
      - name: auth-v1-open
        strip_path: true
        paths:
          - /auth/v1/verify
    plugins:
      - name: cors
  - name: auth-v1-open-callback
    url: http://auth:9999/callback
    routes:
      - name: auth-v1-open-callback
        strip_path: true
        paths:
          - /auth/v1/callback
    plugins:
      - name: cors
  - name: auth-v1-open-authorize
    url: http://auth:9999/authorize
    routes:
      - name: auth-v1-open-authorize
        strip_path: true
        paths:
          - /auth/v1/authorize
    plugins:
      - name: cors

  ## Secured Auth routes
  - name: auth-v1
    _comment: "GoTrue: /auth/v1/* -> http://auth:9999/*"
    url: http://auth:9999
    routes:
      - name: auth-v1-all
        strip_path: true
        paths:
          - /auth/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
          key_in_header: true
          key_names:
            - apikey

  ## REST routes
  - name: rest-v1
    _comment: "PostgREST: /rest/v1/* -> http://rest:3000/*"
    url: http://rest:3000/
    routes:
      - name: rest-v1-all
        strip_path: true
        paths:
          - /rest/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
          key_in_header: true
          key_names:
            - apikey

  ## GraphQL route (if using pg_graphql)
  - name: graphql-v1
    _comment: "PostgREST: /graphql/v1/* -> http://rest:3000/rpc/graphql"
    url: http://rest:3000/rpc/graphql
    routes:
      - name: graphql-v1-all
        strip_path: true
        paths:
          - /graphql/v1
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
          key_in_header: true
          key_names:
            - apikey

  ## Realtime routes
  - name: realtime-v1-ws
    _comment: "Realtime: /realtime/v1/* -> ws://realtime:4000/socket/*"
    url: http://realtime:4000/socket
    routes:
      - name: realtime-v1-ws
        strip_path: true
        paths:
          - /realtime/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
          key_in_header: true
          key_names:
            - apikey

  ## Storage routes
  - name: storage-v1
    _comment: "Storage: /storage/v1/* -> http://storage:5000/*"
    url: http://storage:5000
    routes:
      - name: storage-v1-all
        strip_path: true
        paths:
          - /storage/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
          key_in_header: true
          key_names:
            - apikey

  ## Edge Functions routes
  - name: functions-v1
    _comment: "Edge Functions: /functions/v1/* -> http://functions:9000/*"
    url: http://functions:9000
    routes:
      - name: functions-v1-all
        strip_path: true
        paths:
          - /functions/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
          key_in_header: true
          key_names:
            - apikey

  ## Meta (PostgreSQL meta API) - admin only
  - name: meta
    _comment: "pg-meta: /pg/* -> http://meta:8080/*"
    url: http://meta:8080
    routes:
      - name: meta-all
        strip_path: true
        paths:
          - /pg/
    plugins:
      - name: key-auth
        config:
          hide_credentials: false
          key_in_header: true
          key_names:
            - apikey
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
KONGEOF
```

### 6.4 Create Required Directories

```bash
# Create volume directories
mkdir -p /opt/supabase/supabase/docker/volumes/storage
mkdir -p /opt/supabase/supabase/docker/volumes/functions

# Set permissions
chmod -R 755 /opt/supabase/supabase/docker/volumes
```

---

## Step 7: Start Supabase Services

### 7.1 Validate Configuration

```bash
cd /opt/supabase/supabase/docker

# Validate docker-compose file
docker compose config --quiet && echo "Docker Compose configuration is valid!"

# Check environment variables are loaded
docker compose config | grep -E "POSTGRES_HOST|JWT_SECRET|STORAGE_S3"
```

### 7.2 Pull Docker Images

```bash
# Pull all images (this may take several minutes)
docker compose pull

# Verify images are downloaded
docker images | grep supabase
```

### 7.3 Start Supabase Services

```bash
# Start all services in detached mode
docker compose up -d

# Watch the startup logs
docker compose logs -f --tail=100

# Press Ctrl+C to exit logs (services continue running)
```

### 7.4 Verify Services are Running

```bash
# Check all containers
docker compose ps

# Expected output - all should be "Up" and "healthy":
# supabase-kong       Up (healthy)
# supabase-auth       Up (healthy)
# supabase-rest       Up (healthy)
# supabase-realtime   Up (healthy)
# supabase-storage    Up (healthy)
# supabase-imgproxy   Up (healthy)
# supabase-meta       Up (healthy)
# supabase-studio     Up (healthy)
# supabase-functions  Up (healthy)

# Check service health
docker compose ps --format "table {{.Name}}\t{{.Status}}"
```

### 7.5 Test Internal Connectivity

```bash
# Test Kong API gateway
curl -s http://localhost:8000/ | head -20

# Test Auth service
curl -s http://localhost:8000/auth/v1/health

# Test REST service (requires API key)
source /root/supabase-secrets/secrets.env
curl -s http://localhost:8000/rest/v1/ \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY"

# Test Storage service
curl -s http://localhost:8000/storage/v1/bucket \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY"
```

---

## Step 8: Configure Nginx Reverse Proxy

Nginx will handle SSL termination (via Cloudflare) and route traffic to Supabase services.

### 8.1 Create Nginx Configuration for API

```bash
# Remove default nginx config
rm -f /etc/nginx/sites-enabled/default

# Create Supabase API configuration
cat > /etc/nginx/sites-available/supabase-api << 'NGINXEOF'
# Supabase API - api.souqjari.com
# Handles all Supabase API traffic

# Upstream definitions
upstream supabase_kong {
    server 127.0.0.1:8000;
    keepalive 64;
}

upstream supabase_studio {
    server 127.0.0.1:3000;
    keepalive 32;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/s;

# API Server - api.souqjari.com
server {
    listen 80;
    listen [::]:80;
    server_name api.souqjari.com;

    # Cloudflare real IP
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 131.0.72.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 2400:cb00::/32;
    set_real_ip_from 2606:4700::/32;
    set_real_ip_from 2803:f800::/32;
    set_real_ip_from 2405:b500::/32;
    set_real_ip_from 2405:8100::/32;
    set_real_ip_from 2c0f:f248::/32;
    set_real_ip_from 2a06:98c0::/29;
    real_ip_header CF-Connecting-IP;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/api.souqjari.com.access.log;
    error_log /var/log/nginx/api.souqjari.com.error.log warn;

    # Health check endpoint
    location /health {
        access_log off;
        return 200 'healthy';
        add_header Content-Type text/plain;
    }

    # Auth endpoints - stricter rate limiting
    location /auth/ {
        limit_req zone=auth_limit burst=20 nodelay;

        proxy_pass http://supabase_kong;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer settings
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # Realtime WebSocket endpoint
    location /realtime/ {
        limit_req zone=api_limit burst=50 nodelay;

        proxy_pass http://supabase_kong;
        proxy_http_version 1.1;

        # WebSocket upgrade headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Long timeouts for WebSocket
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;

        # Disable buffering for real-time
        proxy_buffering off;
    }

    # Storage endpoints - allow larger uploads
    location /storage/ {
        limit_req zone=api_limit burst=100 nodelay;

        # Allow 50MB uploads
        client_max_body_size 52m;

        proxy_pass http://supabase_kong;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Longer timeouts for uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;

        # Disable request buffering for streaming uploads
        proxy_request_buffering off;
    }

    # REST API endpoints
    location /rest/ {
        limit_req zone=api_limit burst=100 nodelay;

        proxy_pass http://supabase_kong;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # GraphQL endpoint
    location /graphql/ {
        limit_req zone=api_limit burst=50 nodelay;

        proxy_pass http://supabase_kong;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Edge Functions
    location /functions/ {
        limit_req zone=api_limit burst=50 nodelay;

        proxy_pass http://supabase_kong;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Default - proxy to Kong
    location / {
        limit_req zone=api_limit burst=50 nodelay;

        proxy_pass http://supabase_kong;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Studio Server - studio.souqjari.com
server {
    listen 80;
    listen [::]:80;
    server_name studio.souqjari.com;

    # Cloudflare real IP (same as above)
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 131.0.72.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    real_ip_header CF-Connecting-IP;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Logging
    access_log /var/log/nginx/studio.souqjari.com.access.log;
    error_log /var/log/nginx/studio.souqjari.com.error.log warn;

    # Studio UI
    location / {
        proxy_pass http://supabase_studio;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for hot reload
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINXEOF

# Enable the configuration
ln -sf /etc/nginx/sites-available/supabase-api /etc/nginx/sites-enabled/
```

### 8.2 Configure Nginx Main Settings

```bash
# Update main nginx.conf for better performance
cat > /etc/nginx/nginx.conf << 'MAINNGINXEOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 4096;
    multi_accept on;
    use epoll;
}

http {
    ##
    # Basic Settings
    ##
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Buffer sizes
    client_body_buffer_size 10K;
    client_header_buffer_size 1k;
    client_max_body_size 52m;
    large_client_header_buffers 4 32k;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ##
    # SSL Settings
    ##
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    ##
    # Logging Settings
    ##
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    ##
    # Gzip Settings
    ##
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript
               application/rss+xml application/atom+xml image/svg+xml;

    ##
    # Virtual Host Configs
    ##
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
MAINNGINXEOF
```

### 8.3 Test and Reload Nginx

```bash
# Test nginx configuration
nginx -t

# If test passes, reload nginx
systemctl reload nginx

# Check nginx status
systemctl status nginx
```

---

## Step 9: SSL/TLS Configuration

Since Cloudflare is handling SSL termination, you have two options:

### Option A: Cloudflare Full SSL (Recommended)

With Cloudflare set to "Full" SSL mode, traffic from Cloudflare to your server is encrypted but doesn't require a valid certificate. The configuration above works as-is since Cloudflare handles HTTPS.

**In Cloudflare Dashboard:**
1. Go to SSL/TLS → Overview
2. Set SSL mode to: **Full** (not "Full (strict)")
3. This encrypts traffic while allowing self-signed or no certificate on origin

### Option B: Cloudflare Full (Strict) SSL with Origin Certificate

For stricter security, use a Cloudflare Origin Certificate:

```bash
# Create directory for certificates
mkdir -p /etc/nginx/ssl

# Generate a Cloudflare Origin Certificate:
# 1. Go to Cloudflare Dashboard → SSL/TLS → Origin Server
# 2. Click "Create Certificate"
# 3. Choose "Generate private key and CSR with Cloudflare"
# 4. Hostnames: *.souqjari.com, souqjari.com
# 5. Validity: 15 years
# 6. Click "Create"
# 7. Copy the certificate and private key

# Save the certificate
cat > /etc/nginx/ssl/cloudflare-origin.crt << 'CERTEOF'
-----BEGIN CERTIFICATE-----
# Paste your Cloudflare Origin Certificate here
-----END CERTIFICATE-----
CERTEOF

# Save the private key
cat > /etc/nginx/ssl/cloudflare-origin.key << 'KEYEOF'
-----BEGIN PRIVATE KEY-----
# Paste your private key here
-----END PRIVATE KEY-----
KEYEOF

# Set correct permissions
chmod 600 /etc/nginx/ssl/cloudflare-origin.key
chmod 644 /etc/nginx/ssl/cloudflare-origin.crt
```

Then update the nginx configuration to use HTTPS:

```bash
# Create HTTPS version of the configuration
cat > /etc/nginx/sites-available/supabase-api-ssl << 'SSLNGINXEOF'
# Supabase API with SSL - api.souqjari.com

upstream supabase_kong {
    server 127.0.0.1:8000;
    keepalive 64;
}

upstream supabase_studio {
    server 127.0.0.1:3000;
    keepalive 32;
}

limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/s;

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name api.souqjari.com studio.souqjari.com;
    return 301 https://$server_name$request_uri;
}

# API Server - HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.souqjari.com;

    # Cloudflare Origin Certificate
    ssl_certificate /etc/nginx/ssl/cloudflare-origin.crt;
    ssl_certificate_key /etc/nginx/ssl/cloudflare-origin.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Cloudflare real IP
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 131.0.72.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    real_ip_header CF-Connecting-IP;

    # [Rest of the configuration same as HTTP version above]
    # Copy the location blocks from the previous config

    location /health {
        access_log off;
        return 200 'healthy';
        add_header Content-Type text/plain;
    }

    location /auth/ {
        limit_req zone=auth_limit burst=20 nodelay;
        proxy_pass http://supabase_kong;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    location /realtime/ {
        limit_req zone=api_limit burst=50 nodelay;
        proxy_pass http://supabase_kong;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        proxy_buffering off;
    }

    location /storage/ {
        limit_req zone=api_limit burst=100 nodelay;
        client_max_body_size 52m;
        proxy_pass http://supabase_kong;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_request_buffering off;
    }

    location / {
        limit_req zone=api_limit burst=50 nodelay;
        proxy_pass http://supabase_kong;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Studio Server - HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name studio.souqjari.com;

    ssl_certificate /etc/nginx/ssl/cloudflare-origin.crt;
    ssl_certificate_key /etc/nginx/ssl/cloudflare-origin.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 173.245.48.0/20;
    # [Add all Cloudflare IP ranges]
    real_ip_header CF-Connecting-IP;

    location / {
        proxy_pass http://supabase_studio;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
SSLNGINXEOF

# To enable SSL version:
# rm /etc/nginx/sites-enabled/supabase-api
# ln -sf /etc/nginx/sites-available/supabase-api-ssl /etc/nginx/sites-enabled/
# nginx -t && systemctl reload nginx
```

---

## Step 10: Verification and Testing

### 10.1 Test Local Services

```bash
# Test all services are healthy
cd /opt/supabase/supabase/docker
docker compose ps --format "table {{.Name}}\t{{.Status}}"

# All should show "Up" and "healthy"
```

### 10.2 Test API Through Nginx

```bash
# Load secrets
source /root/supabase-secrets/secrets.env

# Test health endpoint
curl -s http://localhost/health
# Expected: healthy

# Test auth health (via Kong)
curl -s http://localhost:8000/auth/v1/health
# Expected: {"status":"ready"}

# Test REST API
curl -s http://localhost/rest/v1/ \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY"
# Expected: Empty JSON array or list of tables
```

### 10.3 Test External Access (From Your Local Machine)

```bash
# Test API from internet (after DNS propagation)
curl -s https://api.souqjari.com/health
# Expected: healthy

# Test auth endpoint
curl -s https://api.souqjari.com/auth/v1/health
# Expected: {"status":"ready"}

# Test with API key (replace with your actual anon key)
curl -s https://api.souqjari.com/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 10.4 Test Storage (R2)

```bash
# SSH into app server
ssh souqjari-app

# Load secrets
source /root/supabase-secrets/secrets.env

# Create a test bucket via Storage API
curl -X POST http://localhost:8000/storage/v1/bucket \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "listing-images",
    "name": "listing-images",
    "public": true,
    "file_size_limit": 52428800,
    "allowed_mime_types": ["image/jpeg", "image/png", "image/webp", "image/gif"]
  }'

# Create avatars bucket
curl -X POST http://localhost:8000/storage/v1/bucket \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "avatars",
    "name": "avatars",
    "public": true,
    "file_size_limit": 5242880
  }'

# List buckets
curl -s http://localhost:8000/storage/v1/bucket \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq .
```

### 10.5 Test Realtime WebSocket

```bash
# Install websocat for WebSocket testing
apt-get install -y websocat 2>/dev/null || \
  (wget -q https://github.com/vi/websocat/releases/latest/download/websocat.x86_64-unknown-linux-musl -O /usr/local/bin/websocat && chmod +x /usr/local/bin/websocat)

# Test WebSocket connection (should connect and stay open)
source /root/supabase-secrets/secrets.env
timeout 5 websocat "ws://localhost:8000/realtime/v1/websocket?apikey=$ANON_KEY&vsn=1.0.0" || echo "WebSocket connection test complete"
```

### 10.6 Test Studio Dashboard

```bash
# Open in browser
echo "Studio URL: https://studio.souqjari.com"
echo "Username: souqjari-admin"
echo "Password: (check your secrets file)"
grep DASHBOARD_PASSWORD /root/supabase-secrets/secrets.env
```

### 10.7 Verify Database Connectivity

```bash
# Test that services can connect to external database
docker compose logs auth 2>&1 | tail -20
docker compose logs rest 2>&1 | tail -20
docker compose logs storage 2>&1 | tail -20

# Should not see connection errors
```

---

## Troubleshooting

### Services Won't Start

```bash
# Check logs for specific service
docker compose logs kong
docker compose logs auth
docker compose logs rest
docker compose logs storage

# Check if ports are in use
ss -tlnp | grep -E "8000|3000|9999"

# Restart all services
docker compose down
docker compose up -d
```

### Database Connection Issues

```bash
# Test database connectivity from app server
PGPASSWORD='your_password' psql -h 10.0.0.2 -U authenticator -d supabase -c "SELECT 1;"

# Check firewall on database server
ssh souqjari-db "ufw status | grep 5432"

# Verify PostgreSQL is listening
ssh souqjari-db "ss -tlnp | grep 5432"
```

### Storage/R2 Issues

```bash
# Check storage logs
docker compose logs storage

# Verify R2 credentials
aws s3 ls --endpoint-url $STORAGE_S3_ENDPOINT s3://$STORAGE_S3_BUCKET \
  --profile r2 2>&1 || echo "Check R2 credentials"

# Test R2 connectivity from container
docker exec supabase-storage curl -s https://your-account-id.r2.cloudflarestorage.com
```

### WebSocket/Realtime Issues

```bash
# Check realtime logs
docker compose logs realtime

# Verify realtime database user
ssh souqjari-db "sudo -u postgres psql -d supabase -c \"SELECT rolname, rolreplication FROM pg_roles WHERE rolname = 'supabase_realtime_admin';\""

# Check replication slot
ssh souqjari-db "sudo -u postgres psql -d supabase -c \"SELECT * FROM pg_replication_slots;\""
```

### Nginx Issues

```bash
# Test configuration
nginx -t

# Check error logs
tail -50 /var/log/nginx/error.log
tail -50 /var/log/nginx/api.souqjari.com.error.log

# Verify nginx is running
systemctl status nginx
```

### Memory Issues

```bash
# Check Docker memory usage
docker stats --no-stream

# Check system memory
free -h

# If memory is low, consider reducing services or upgrading server
```

---

## Service Management Commands

### Daily Operations

```bash
# View all service status
cd /opt/supabase/supabase/docker
docker compose ps

# View logs (all services)
docker compose logs -f --tail=100

# View logs (specific service)
docker compose logs -f auth
docker compose logs -f storage

# Restart a specific service
docker compose restart auth
docker compose restart storage

# Restart all services
docker compose restart
```

### Updates

```bash
# Pull latest images
docker compose pull

# Recreate containers with new images
docker compose up -d --force-recreate

# Clean up old images
docker image prune -f
```

### Backup Configuration

```bash
# Backup Supabase configuration
tar -czf /root/supabase-config-backup-$(date +%Y%m%d).tar.gz \
  /opt/supabase/supabase/docker/.env \
  /opt/supabase/supabase/docker/docker-compose.yml \
  /opt/supabase/supabase/docker/volumes/api/kong.yml \
  /etc/nginx/sites-available/supabase-api
```

---

## Phase 3 Completion Checklist

Before proceeding to Phase 4, verify:

- [ ] Docker installed and running
- [ ] All Supabase containers running and healthy:
  - [ ] supabase-kong
  - [ ] supabase-auth
  - [ ] supabase-rest
  - [ ] supabase-realtime
  - [ ] supabase-storage
  - [ ] supabase-imgproxy
  - [ ] supabase-meta
  - [ ] supabase-studio
  - [ ] supabase-functions
- [ ] Nginx configured and running
- [ ] API accessible via https://api.souqjari.com
- [ ] Studio accessible via https://studio.souqjari.com
- [ ] Storage configured with R2 backend
- [ ] Storage buckets created (listing-images, avatars)
- [ ] Realtime WebSocket working
- [ ] All secrets saved securely

---

## Credentials Summary

**Save these for your React Native app configuration:**

| Setting | Value |
|---------|-------|
| Supabase URL | `https://api.souqjari.com` |
| Anon Key | (from secrets.env) |
| Service Role Key | (from secrets.env - **never expose in client!**) |
| Realtime URL | `wss://api.souqjari.com/realtime/v1` |

**React Native .env:**
```
EXPO_PUBLIC_SUPABASE_URL=https://api.souqjari.com
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
```

---

## Next Steps

Proceed to **Phase 4: SMS OTP Integration with Syriatel**

- Create SMS webhook/edge function
- Configure GoTrue for phone authentication
- Update React Native auth flow
- Test OTP from Syrian phone numbers

---

*Document Version: 1.0*
*Last Updated: December 2024*
*Author: SouqJari DevOps*
