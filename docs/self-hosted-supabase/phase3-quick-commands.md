# Phase 3: Quick Commands Reference

Copy-paste commands for Phase 3 - App Server Setup. Run these in sequence on the app server.

**Prerequisites:** Phase 1 and Phase 2 completed.

**Required from Phase 2:**
- Database server: `10.0.0.2` (souqjari-db)
- App server: `10.0.0.3` (souqjari-app)
- `SUPABASE_ADMIN_PASSWORD` → used as main POSTGRES_PASSWORD
- `AUTHENTICATOR_PASSWORD` → PostgREST
- `AUTH_ADMIN_PASSWORD` → GoTrue (Auth)
- `STORAGE_ADMIN_PASSWORD` → Storage API
- `REALTIME_ADMIN_PASSWORD` → Realtime
- `FUNCTIONS_ADMIN_PASSWORD` → Edge Functions

---

## SSH Into App Server

```bash
ssh souqjari-app
```

---

## 1. Install Docker

```bash
# Remove old versions
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
    apt-get remove -y $pkg 2>/dev/null || true
done

# Install prerequisites
apt-get update
apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker repository
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Configure Docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {"max-size": "10m", "max-file": "3"},
  "storage-driver": "overlay2",
  "live-restore": true
}
EOF

systemctl restart docker
systemctl enable docker

# Verify
docker --version
docker compose version
```

---

## 2. Generate Secrets

```bash
mkdir -p /root/supabase-secrets
cd /root/supabase-secrets

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)
echo "JWT_SECRET=$JWT_SECRET" > secrets.env

# Generate JWT keys
cat > /tmp/gen_keys.sh << 'EOF'
#!/bin/bash
JWT_SECRET="$1"
base64url_encode() { openssl base64 -e -A | tr '+/' '-_' | tr -d '='; }

ANON_HEADER='{"alg":"HS256","typ":"JWT"}'
ANON_PAYLOAD='{"role":"anon","iss":"supabase","iat":1700000000,"exp":2000000000}'
ANON_H=$(echo -n "$ANON_HEADER" | base64url_encode)
ANON_P=$(echo -n "$ANON_PAYLOAD" | base64url_encode)
ANON_S=$(echo -n "${ANON_H}.${ANON_P}" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | base64url_encode)
echo "ANON_KEY=${ANON_H}.${ANON_P}.${ANON_S}"

SERVICE_HEADER='{"alg":"HS256","typ":"JWT"}'
SERVICE_PAYLOAD='{"role":"service_role","iss":"supabase","iat":1700000000,"exp":2000000000}'
SERVICE_H=$(echo -n "$SERVICE_HEADER" | base64url_encode)
SERVICE_P=$(echo -n "$SERVICE_PAYLOAD" | base64url_encode)
SERVICE_S=$(echo -n "${SERVICE_H}.${SERVICE_P}" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | base64url_encode)
echo "SERVICE_ROLE_KEY=${SERVICE_H}.${SERVICE_P}.${SERVICE_S}"
EOF

chmod +x /tmp/gen_keys.sh
/tmp/gen_keys.sh "$JWT_SECRET" >> secrets.env

# Generate dashboard password
echo "DASHBOARD_USERNAME=souqjari-admin" >> secrets.env
echo "DASHBOARD_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)" >> secrets.env

# Display secrets - SAVE THESE!
echo "========================================"
echo "SAVE THESE SECRETS SECURELY!"
echo "========================================"
cat secrets.env
echo "========================================"
```

---

## 3. Clone Supabase

```bash
mkdir -p /opt/supabase
cd /opt/supabase
git clone --depth 1 https://github.com/supabase/supabase.git
cd supabase/docker
cp .env.example .env
```

---

## 4. Create .env File

**IMPORTANT:** Replace all `YOUR_*` placeholders with actual values!

```bash
cat > /opt/supabase/supabase/docker/.env << 'EOF'
# PostgreSQL (external - from Phase 2)
POSTGRES_HOST=10.0.0.2
POSTGRES_PORT=5432
POSTGRES_DB=supabase
POSTGRES_USER=supabase_admin
POSTGRES_PASSWORD=YOUR_SUPABASE_ADMIN_PASSWORD

# JWT (from secrets.env)
JWT_SECRET=YOUR_JWT_SECRET
ANON_KEY=YOUR_ANON_KEY
SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
JWT_EXPIRY=3600

# URLs
SITE_URL=https://api.souqjari.com
API_EXTERNAL_URL=https://api.souqjari.com
ADDITIONAL_REDIRECT_URLS=https://souqjari.com,exp://

# PostgREST
PGRST_DB_URI=postgresql://authenticator:YOUR_AUTHENTICATOR_PASSWORD@10.0.0.2:5432/supabase
PGRST_DB_SCHEMAS=public,storage,graphql_public
PGRST_DB_ANON_ROLE=anon
PGRST_JWT_SECRET=YOUR_JWT_SECRET

# GoTrue (Auth)
GOTRUE_DB_DATABASE_URL=postgresql://supabase_auth_admin:YOUR_AUTH_ADMIN_PASSWORD@10.0.0.2:5432/supabase
GOTRUE_DB_DRIVER=postgres
GOTRUE_SITE_URL=https://api.souqjari.com
GOTRUE_URI_ALLOW_LIST=https://souqjari.com,exp://*
GOTRUE_DISABLE_SIGNUP=false
GOTRUE_JWT_SECRET=YOUR_JWT_SECRET
GOTRUE_JWT_EXP=3600
GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated
GOTRUE_EXTERNAL_EMAIL_ENABLED=true
GOTRUE_EXTERNAL_PHONE_ENABLED=true
GOTRUE_MAILER_AUTOCONFIRM=false
GOTRUE_SMS_AUTOCONFIRM=false

# Realtime
REALTIME_DB_HOST=10.0.0.2
REALTIME_DB_PORT=5432
REALTIME_DB_NAME=supabase
REALTIME_DB_USER=supabase_realtime_admin
REALTIME_DB_PASSWORD=YOUR_REALTIME_ADMIN_PASSWORD
REALTIME_DB_SSL=false
REALTIME_SECURE_CHANNELS=true
REALTIME_JWT_SECRET=YOUR_JWT_SECRET

# Storage - Cloudflare R2
STORAGE_BACKEND=s3
STORAGE_S3_BUCKET=souqjari-storage
STORAGE_S3_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
STORAGE_S3_REGION=auto
STORAGE_S3_ACCESS_KEY=YOUR_R2_ACCESS_KEY
STORAGE_S3_SECRET_KEY=YOUR_R2_SECRET_KEY
STORAGE_S3_FORCE_PATH_STYLE=true
STORAGE_FILE_SIZE_LIMIT=52428800
STORAGE_DB_HOST=10.0.0.2
STORAGE_DB_PORT=5432
STORAGE_DB_NAME=supabase
STORAGE_DB_USER=supabase_storage_admin
STORAGE_DB_PASSWORD=YOUR_STORAGE_ADMIN_PASSWORD

# Meta
META_DB_HOST=10.0.0.2
META_DB_PORT=5432
META_DB_NAME=supabase
META_DB_USER=supabase_admin
META_DB_PASSWORD=YOUR_SUPABASE_ADMIN_PASSWORD

# Studio
STUDIO_DEFAULT_ORGANIZATION=SouqJari
STUDIO_DEFAULT_PROJECT=SouqJari Production
STUDIO_PORT=3000
STUDIO_PG_META_URL=http://pg-meta:8080
DASHBOARD_USERNAME=souqjari-admin
DASHBOARD_PASSWORD=YOUR_DASHBOARD_PASSWORD

# Kong
KONG_HTTP_PORT=8000
KONG_HTTPS_PORT=8443

# Functions
FUNCTIONS_VERIFY_JWT=true
FUNCTIONS_DB_HOST=10.0.0.2
FUNCTIONS_DB_PORT=5432
FUNCTIONS_DB_NAME=supabase
FUNCTIONS_DB_USER=supabase_functions_admin
FUNCTIONS_DB_PASSWORD=YOUR_FUNCTIONS_ADMIN_PASSWORD

# Analytics (disabled)
ENABLE_ANALYTICS=false
LOGFLARE_API_KEY=

# Image Proxy
IMGPROXY_ENABLE_WEBP_DETECTION=true
EOF

echo "NOW EDIT /opt/supabase/supabase/docker/.env AND REPLACE ALL YOUR_* VALUES!"
```

---

## 5. Create Docker Compose (External DB)

```bash
cat > /opt/supabase/supabase/docker/docker-compose.yml << 'COMPOSE'
version: "3.8"

services:
  kong:
    image: kong:2.8.1
    container_name: supabase-kong
    restart: unless-stopped
    ports:
      - "8000:8000"
      - "8443:8443"
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /var/lib/kong/kong.yml
      KONG_DNS_ORDER: LAST,A,CNAME
      KONG_PLUGINS: request-transformer,cors,key-auth,acl,basic-auth
      KONG_LOG_LEVEL: warn
    volumes:
      - ./volumes/api/kong.yml:/var/lib/kong/kong.yml:ro
    networks:
      - supabase-network

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
    networks:
      - supabase-network

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
    networks:
      - supabase-network

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
      API_JWT_SECRET: ${JWT_SECRET}
      SECRET_KEY_BASE: ${JWT_SECRET}
      SECURE_CHANNELS: ${REALTIME_SECURE_CHANNELS:-true}
    networks:
      - supabase-network

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
      FILE_SIZE_LIMIT: ${STORAGE_FILE_SIZE_LIMIT:-52428800}
      STORAGE_BACKEND: ${STORAGE_BACKEND:-s3}
      STORAGE_S3_BUCKET: ${STORAGE_S3_BUCKET}
      STORAGE_S3_ENDPOINT: ${STORAGE_S3_ENDPOINT}
      STORAGE_S3_REGION: ${STORAGE_S3_REGION:-auto}
      STORAGE_S3_ACCESS_KEY: ${STORAGE_S3_ACCESS_KEY}
      STORAGE_S3_SECRET_KEY: ${STORAGE_S3_SECRET_KEY}
      STORAGE_S3_FORCE_PATH_STYLE: ${STORAGE_S3_FORCE_PATH_STYLE:-true}
      GLOBAL_S3_BUCKET: ${STORAGE_S3_BUCKET}
      IMGPROXY_URL: http://imgproxy:8080
      ENABLE_IMAGE_TRANSFORMATION: "true"
    networks:
      - supabase-network

  imgproxy:
    image: darthsim/imgproxy:v3.21
    container_name: supabase-imgproxy
    restart: unless-stopped
    environment:
      IMGPROXY_BIND: ":8080"
      IMGPROXY_LOCAL_FILESYSTEM_ROOT: /
      IMGPROXY_USE_ETAG: "true"
    networks:
      - supabase-network

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
    networks:
      - supabase-network

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
      VERIFY_JWT: ${FUNCTIONS_VERIFY_JWT:-true}
    volumes:
      - ./volumes/functions:/home/deno/functions:Z
    networks:
      - supabase-network

networks:
  supabase-network:
    driver: bridge
COMPOSE
```

---

## 6. Create Kong Configuration

```bash
mkdir -p /opt/supabase/supabase/docker/volumes/api
mkdir -p /opt/supabase/supabase/docker/volumes/functions

cat > /opt/supabase/supabase/docker/volumes/api/kong.yml << 'KONG'
_format_version: "2.1"
_transform: true

services:
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

  - name: auth-v1
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

  - name: rest-v1
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

  - name: realtime-v1-ws
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

  - name: storage-v1
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

  - name: functions-v1
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

  - name: meta
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
KONG
```

---

## 7. Start Supabase

```bash
cd /opt/supabase/supabase/docker

# Validate config
docker compose config --quiet && echo "Config valid!"

# Pull images
docker compose pull

# Start services
docker compose up -d

# Check status (wait 30-60 seconds for startup)
sleep 30
docker compose ps

# View logs
docker compose logs -f --tail=50
```

---

## 8. Configure Nginx

```bash
rm -f /etc/nginx/sites-enabled/default

cat > /etc/nginx/sites-available/supabase-api << 'NGINX'
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

server {
    listen 80;
    server_name api.souqjari.com;

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

    location /health {
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
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
    }

    location /realtime/ {
        proxy_pass http://supabase_kong;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        proxy_buffering off;
    }

    location /storage/ {
        client_max_body_size 52m;
        proxy_pass http://supabase_kong;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name studio.souqjari.com;

    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 173.245.48.0/20;
    real_ip_header CF-Connecting-IP;

    location / {
        proxy_pass http://supabase_studio;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

ln -sf /etc/nginx/sites-available/supabase-api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 9. Create Storage Buckets

```bash
source /root/supabase-secrets/secrets.env

# Create listing-images bucket
curl -X POST http://localhost:8000/storage/v1/bucket \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":"listing-images","name":"listing-images","public":true,"file_size_limit":52428800,"allowed_mime_types":["image/jpeg","image/png","image/webp","image/gif"]}'

# Create avatars bucket
curl -X POST http://localhost:8000/storage/v1/bucket \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":"avatars","name":"avatars","public":true,"file_size_limit":5242880}'

# List buckets
curl -s http://localhost:8000/storage/v1/bucket \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq .
```

---

## 10. Verify Installation

```bash
# Check all services
docker compose ps

# Test health
curl -s http://localhost/health

# Test auth
curl -s http://localhost:8000/auth/v1/health

# Test REST API
source /root/supabase-secrets/secrets.env
curl -s http://localhost/rest/v1/ \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY"

# Test storage
curl -s http://localhost/storage/v1/bucket \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY"

# Display credentials for React Native
echo ""
echo "========================================"
echo "REACT NATIVE CONFIGURATION"
echo "========================================"
echo "EXPO_PUBLIC_SUPABASE_URL=https://api.souqjari.com"
echo "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$(grep ANON_KEY /root/supabase-secrets/secrets.env | cut -d'=' -f2)"
echo "========================================"
```

---

## Useful Commands

```bash
# View logs
cd /opt/supabase/supabase/docker
docker compose logs -f --tail=100

# Restart service
docker compose restart auth
docker compose restart storage

# Restart all
docker compose restart

# Stop all
docker compose down

# Start all
docker compose up -d

# Update images
docker compose pull
docker compose up -d --force-recreate
```

---

*Quick reference for Phase 3 - See full documentation for details.*
