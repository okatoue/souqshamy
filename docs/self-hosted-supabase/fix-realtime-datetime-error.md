# Fix: Supabase Realtime DateTime Encoding Error

This document provides the solution for the DateTime encoding error encountered when running Supabase Realtime with an external PostgreSQL database.

## Error Description

```
[error] Postgrex expected %DateTime{}, got ~N[2025-12-10 21:34:02]
** (ArgumentError) errors were found at the given arguments:
  * 1st argument: not a textual representation of a date and time
```

## Root Cause

The error occurs because of a mismatch between the `realtime.schema_migrations` table column type and what the Supabase Realtime service (Elixir/Phoenix application) expects:

| What You Have | What Realtime Expects |
|--------------|----------------------|
| `inserted_at timestamptz` | `inserted_at timestamp` (without timezone) |
| Returns `DateTime` | Expects `NaiveDateTime` |

When Postgrex (Elixir's PostgreSQL driver) reads from a `timestamptz` column, it returns timezone-aware DateTime. However, Ecto (the ORM) expects NaiveDateTime for timestamp columns, causing the encoding error during migrations.

---

## Solution

### Step 1: Fix the Database Schema

SSH into your database server and run these commands:

```bash
ssh souqjari-db
```

Then execute the following SQL:

```bash
sudo -u postgres psql -d supabase << 'EOF'
-- =============================================================================
-- Fix Realtime Schema for Supabase Realtime Service
-- =============================================================================

-- Drop the existing schema_migrations table if it has wrong column types
DROP TABLE IF EXISTS realtime.schema_migrations CASCADE;

-- Create the correct schema_migrations table with NaiveDateTime compatible columns
-- The Realtime service uses Ecto which expects 'timestamp' not 'timestamptz'
CREATE TABLE realtime.schema_migrations (
    version bigint PRIMARY KEY,
    inserted_at timestamp(0) NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);

-- Grant permissions
ALTER TABLE realtime.schema_migrations OWNER TO supabase_realtime_admin;
GRANT ALL ON TABLE realtime.schema_migrations TO supabase_realtime_admin;

-- Verify the column type
SELECT column_name, data_type, datetime_precision
FROM information_schema.columns
WHERE table_schema = 'realtime' AND table_name = 'schema_migrations';

-- Also create other tables that Realtime needs (these will be auto-created but
-- having them ensures proper ownership)

-- Drop any existing Realtime tables that may have wrong types
DROP TABLE IF EXISTS realtime.subscription CASCADE;
DROP TABLE IF EXISTS realtime.messages CASCADE;

-- The Realtime service will create its own tables with correct types during migration

-- Grant comprehensive permissions to the realtime role
GRANT USAGE ON SCHEMA realtime TO supabase_realtime_admin;
GRANT ALL ON ALL TABLES IN SCHEMA realtime TO supabase_realtime_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA realtime TO supabase_realtime_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA realtime GRANT ALL ON TABLES TO supabase_realtime_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA realtime GRANT ALL ON SEQUENCES TO supabase_realtime_admin;

-- Grant permissions on _realtime schema as well (used for internal state)
GRANT USAGE ON SCHEMA _realtime TO supabase_realtime_admin;
GRANT ALL ON ALL TABLES IN SCHEMA _realtime TO supabase_realtime_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA _realtime TO supabase_realtime_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA _realtime GRANT ALL ON TABLES TO supabase_realtime_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA _realtime GRANT ALL ON SEQUENCES TO supabase_realtime_admin;

-- Ensure the publication exists for realtime
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- Ensure replication role is set
ALTER ROLE supabase_realtime_admin WITH REPLICATION;

-- Verify everything is correct
SELECT 'Schema migrations table:' AS check;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'realtime' AND table_name = 'schema_migrations';

SELECT 'Replication role:' AS check;
SELECT rolname, rolreplication FROM pg_roles WHERE rolname = 'supabase_realtime_admin';

SELECT 'Publications:' AS check;
SELECT pubname FROM pg_publication WHERE pubname = 'supabase_realtime';

SELECT 'Realtime schema fix complete!' AS status;
EOF
```

Expected output for the column check:
```
 column_name | data_type
-------------+-----------
 version     | bigint
 inserted_at | timestamp without time zone
```

### Step 2: Verify Database Configuration

Ensure PostgreSQL is configured correctly for Realtime:

```bash
# Check wal_level is set to replica (required for replication)
sudo -u postgres psql -c "SHOW wal_level;"
# Expected: replica

# Check max_replication_slots
sudo -u postgres psql -c "SHOW max_replication_slots;"
# Expected: 4 or higher

# Check max_wal_senders
sudo -u postgres psql -c "SHOW max_wal_senders;"
# Expected: 4 or higher

# Verify replication permissions
sudo -u postgres psql -c "SELECT rolname, rolreplication FROM pg_roles WHERE rolname = 'supabase_realtime_admin';"
# Expected: supabase_realtime_admin | t
```

### Step 3: Update the Docker Compose Realtime Service

On your app server, update the Realtime service configuration:

```bash
ssh souqjari-app
cd /opt/supabase/supabase/docker
```

The Realtime service configuration in `docker-compose.yml` should be:

```yaml
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
      DB_HOST: ${REALTIME_DB_HOST:-10.0.0.2}
      DB_PORT: ${REALTIME_DB_PORT:-5432}
      DB_NAME: ${REALTIME_DB_NAME:-supabase}
      DB_USER: ${REALTIME_DB_USER:-supabase_realtime_admin}
      DB_PASSWORD: ${REALTIME_DB_PASSWORD}
      DB_SSL: "false"
      DB_AFTER_CONNECT_QUERY: "SET search_path TO realtime"
      DB_ENC_KEY: ${DB_ENC_KEY:-supabaserealtime}
      API_JWT_SECRET: ${JWT_SECRET}
      SECRET_KEY_BASE: ${JWT_SECRET}
      ERL_AFLAGS: "-proto_dist inet_tcp"
      ENABLE_TAILSCALE: "false"
      DNS_NODES: "''"
      SECURE_CHANNELS: ${REALTIME_SECURE_CHANNELS:-true}
      SLOT_NAME: supabase_realtime_rls
      TEMPORARY_SLOT: "true"
      MAX_REPLICATION_LAG_MB: "1000"
      APP_NAME: realtime
      RLIMIT_NOFILE: "65536"
      # Explicitly set to avoid timezone issues
      REPLICATION_MODE: "RLS"
      REPLICATION_POLL_INTERVAL: "100"
      SUBSCRIPTION_SYNC_INTERVAL: "60000"
    networks:
      - supabase-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:4000/api/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
```

### Step 4: Add Required Environment Variables

Ensure these are in your `.env` file:

```bash
# Add/verify these in /opt/supabase/supabase/docker/.env

# Realtime Configuration
REALTIME_DB_HOST=10.0.0.2
REALTIME_DB_PORT=5432
REALTIME_DB_NAME=supabase
REALTIME_DB_USER=supabase_realtime_admin
REALTIME_DB_PASSWORD=YOUR_REALTIME_ADMIN_PASSWORD
REALTIME_DB_SSL=false
REALTIME_SECURE_CHANNELS=true
DB_ENC_KEY=supabaserealtime
```

### Step 5: Restart the Realtime Service

```bash
cd /opt/supabase/supabase/docker

# Stop just the realtime container
docker compose stop realtime
docker compose rm -f realtime

# Start fresh
docker compose up -d realtime

# Watch the logs
docker compose logs -f realtime
```

### Step 6: Verify Realtime is Working

```bash
# Check container health
docker compose ps realtime

# Test the health endpoint
curl -s http://localhost:4000/api/health
# Expected: {"status":"ok"} or similar

# Check logs for successful startup
docker compose logs realtime | head -50

# Look for: "Running migrations" followed by success messages
# NOT the DateTime error
```

---

## Alternative: Use an Older Compatible Version

If v2.30.23 continues to have issues, try v2.28.36 which is known to work well:

```yaml
  realtime:
    image: supabase/realtime:v2.28.36
    # ... rest of config same as above
```

### Version Compatibility Matrix

| Realtime Version | PostgreSQL 15 | External DB | Notes |
|-----------------|---------------|-------------|-------|
| v2.30.23 | Yes | Yes | Requires correct schema_migrations table |
| v2.28.36 | Yes | Yes | Stable, recommended for external DB |
| v2.28.32 | No | No | Missing run.sh script |
| v2.25.x | Yes | Yes | Older but stable |

---

## Troubleshooting

### Error: "relation realtime.schema_migrations does not exist"

The schema wasn't created properly. Re-run Step 1.

### Error: "permission denied for schema realtime"

Grant permissions again:
```sql
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;
GRANT ALL ON ALL TABLES IN SCHEMA realtime TO supabase_realtime_admin;
```

### Error: "replication slot already exists"

Drop the existing slot:
```sql
SELECT pg_drop_replication_slot('supabase_realtime_rls');
```

### Container keeps restarting

Check logs for the actual error:
```bash
docker compose logs realtime --tail=100
```

### WebSocket connections fail

1. Verify Kong is routing correctly:
```bash
curl -s http://localhost:8000/realtime/v1/
```

2. Check Nginx WebSocket configuration includes:
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

---

## Testing Realtime

### Test from Command Line

```bash
# Install websocat if needed
apt-get install -y websocat 2>/dev/null || \
  wget -q https://github.com/vi/websocat/releases/latest/download/websocat.x86_64-unknown-linux-musl -O /usr/local/bin/websocat && chmod +x /usr/local/bin/websocat

# Source your secrets
source /root/supabase-secrets/secrets.env

# Test WebSocket connection
websocat -v "ws://localhost:4000/socket/websocket?apikey=$ANON_KEY&vsn=1.0.0"
```

### Test from JavaScript

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://api.souqjari.com',
  'your-anon-key'
)

// Subscribe to changes
const subscription = supabase
  .channel('test-channel')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'your_table' },
    (payload) => {
      console.log('Change received:', payload)
    }
  )
  .subscribe()
```

---

## Complete Fix Script

For convenience, here's a complete script to fix the Realtime issue:

```bash
#!/bin/bash
# fix-realtime.sh
# Run this on the database server

set -e

echo "=== Fixing Supabase Realtime Schema ==="

sudo -u postgres psql -d supabase << 'EOSQL'
-- Drop and recreate schema_migrations with correct types
DROP TABLE IF EXISTS realtime.schema_migrations CASCADE;

CREATE TABLE realtime.schema_migrations (
    version bigint PRIMARY KEY,
    inserted_at timestamp(0) NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);

ALTER TABLE realtime.schema_migrations OWNER TO supabase_realtime_admin;

-- Grant all necessary permissions
GRANT USAGE ON SCHEMA realtime TO supabase_realtime_admin;
GRANT ALL ON ALL TABLES IN SCHEMA realtime TO supabase_realtime_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA realtime TO supabase_realtime_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA realtime GRANT ALL ON TABLES TO supabase_realtime_admin;

GRANT USAGE ON SCHEMA _realtime TO supabase_realtime_admin;
GRANT ALL ON ALL TABLES IN SCHEMA _realtime TO supabase_realtime_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA _realtime TO supabase_realtime_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA _realtime GRANT ALL ON TABLES TO supabase_realtime_admin;

-- Ensure publication exists
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- Ensure replication role
ALTER ROLE supabase_realtime_admin WITH REPLICATION;

SELECT 'Realtime schema fixed!' AS status;
EOSQL

echo "=== Done! Now restart the Realtime container on the app server ==="
echo "Run: docker compose restart realtime"
```

---

## Step 7: Create Realtime Tenant (CRITICAL)

After fixing the DateTime error and restarting Realtime, you may encounter **403 Forbidden** or **500 Internal Server Error** on WebSocket connections. This is because the `realtime.tenants` table is empty.

### Problem: TenantNotFound Error

The Realtime logs will show:
```
TenantNotFound: Tenant not found: realtime
```

Or encryption errors like:
```
(ArgumentError) errors were found at the given arguments:
  * 3rd argument: out of range
    (stdlib 5.2.3) :binary.part(..., 0, -114)
    lib/realtime/encryption.ex:53: Realtime.Crypto.unpad/1
```

### Solution: Create Tenant with Encrypted JWT Secret

The `jwt_secret` field must be encrypted using the `DB_ENC_KEY`. **Do NOT insert plain text JWT secrets** - this will cause the encryption error above.

#### Step 7a: Encrypt the JWT Secret

Use the Realtime container's built-in encryption:

```bash
# On the app server
cd /opt/supabase/supabase/docker

# Get your JWT_SECRET from .env
JWT_SECRET=$(grep "^JWT_SECRET=" .env | head -1 | cut -d'=' -f2 | tr -d '\n\r')

# Encrypt it using the Realtime container
ENCRYPTED_SECRET=$(docker exec supabase-realtime bin/realtime eval '
jwt_secret = "'"${JWT_SECRET}"'"
encrypted = Realtime.Crypto.encrypt!(jwt_secret)
IO.puts(encrypted)
' 2>/dev/null)

echo "Encrypted secret: $ENCRYPTED_SECRET"
```

#### Step 7b: Insert the Tenant

```bash
# Get the realtime database password
REALTIME_DB_PASSWORD=$(grep "^REALTIME_DB_PASSWORD=" .env | cut -d'=' -f2)

# Insert the tenant with the encrypted secret
PGPASSWORD="${REALTIME_DB_PASSWORD}" psql -h 10.0.0.2 -U supabase_realtime_admin -d supabase << EOF
INSERT INTO realtime.tenants (
    id,
    external_id,
    name,
    jwt_secret,
    max_concurrent_users,
    max_events_per_second,
    postgres_cdc_default,
    max_bytes_per_second,
    max_channels_per_client,
    max_joins_per_second,
    inserted_at,
    updated_at
) VALUES (
    extensions.uuid_generate_v4(),
    'realtime',
    'realtime',
    '${ENCRYPTED_SECRET}',
    200,
    100,
    'postgres_cdc_rls',
    100000,
    100,
    100,
    now(),
    now()
);
EOF
```

### Step 8: Create Realtime Extension

After creating the tenant, you may get another error:
```
(MatchError) no match of right hand side value: []
    lib/realtime/postgres_cdc.ex:62: Realtime.PostgresCdc.filter_settings/2
```

This means the `realtime.extensions` table is empty. Create the extension:

```bash
PGPASSWORD="${REALTIME_DB_PASSWORD}" psql -h 10.0.0.2 -U supabase_realtime_admin -d supabase << 'EOF'
INSERT INTO realtime.extensions (
    id,
    type,
    settings,
    tenant_external_id,
    inserted_at,
    updated_at
) VALUES (
    extensions.uuid_generate_v4(),
    'postgres_cdc_rls',
    jsonb_build_object(
        'db_host', '10.0.0.2',
        'db_port', '5432',
        'db_name', 'supabase',
        'db_user', 'supabase_realtime_admin',
        'db_password', 'YOUR_REALTIME_DB_PASSWORD',
        'poll_interval_ms', 100,
        'poll_max_record_bytes', 1048576,
        'region', 'us-east-1',
        'ssl_enforced', false
    ),
    'realtime',
    now(),
    now()
);
EOF
```

> **Note**: Replace `YOUR_REALTIME_DB_PASSWORD` with your actual `REALTIME_DB_PASSWORD` from `.env`.

### Step 9: Verify WebSocket Connection

Test the WebSocket connection through Kong:

```bash
ANON_KEY=$(grep "^ANON_KEY=" .env | head -1 | cut -d'=' -f2)

curl -i "http://localhost:8000/realtime/v1/websocket?apikey=${ANON_KEY}&vsn=1.0.0" \
  -H "Upgrade: websocket" \
  -H "Connection: Upgrade" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13"
```

**Expected Output:**
```
HTTP/1.1 101 Switching Protocols
Connection: upgrade
sec-websocket-accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
server: Cowboy
upgrade: websocket
```

The `101 Switching Protocols` response confirms Realtime WebSocket is working correctly!

### Note on Docker Health Status

The container may still show `unhealthy` status because Docker's healthcheck endpoint differs from actual WebSocket functionality. **As long as you get `101 Switching Protocols` from the WebSocket test, Realtime is working correctly.**

---

## Summary

The complete Realtime fix for self-hosted Supabase with external PostgreSQL involves:

1. **Database Schema Fix**: Recreate `realtime.schema_migrations` with `timestamp(0)` instead of `timestamptz`
2. **Permissions**: Grant all necessary permissions to `supabase_realtime_admin`
3. **Environment Variables**: Ensure `JWT_SECRET` and `DB_ENC_KEY` are set correctly
4. **Tenant Creation**: Create tenant with **encrypted** JWT secret (not plain text!)
5. **Extension Configuration**: Create `postgres_cdc_rls` extension with database connection settings
6. **Verification**: Test WebSocket connection - look for `101 Switching Protocols`

After applying all these fixes, the Realtime service will work correctly for WebSocket subscriptions.

---

*Document Version: 1.1*
*Last Updated: December 2024*
*Related to: Phase 2 Database Setup, Phase 3 App Server Setup*
