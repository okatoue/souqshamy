# Phase 2: Database Server Setup - PostgreSQL Installation

Complete step-by-step guide for installing and configuring PostgreSQL 15 on the database server for self-hosted Supabase.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Step 1: Install PostgreSQL 15](#step-1-install-postgresql-15)
3. [Step 2: Install Required Extensions](#step-2-install-required-extensions)
4. [Step 3: Configure PostgreSQL for Performance](#step-3-configure-postgresql-for-performance)
5. [Step 4: Configure Remote Access](#step-4-configure-remote-access)
6. [Step 5: Create Supabase Database and Roles](#step-5-create-supabase-database-and-roles)
7. [Step 6: Initialize Supabase Schema](#step-6-initialize-supabase-schema)
8. [Step 7: Verification](#step-7-verification)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting Phase 2, ensure Phase 1 is complete:
- [ ] Database server (`souqjari-db`) is running at private IP `10.0.0.2`
- [ ] App server (`souqjari-app`) is running at private IP `10.0.0.3`
- [ ] SSH access working: `ssh souqjari-db`
- [ ] Private network connectivity verified (ping between servers)
- [ ] Firewall configured (port 5432 open from 10.0.0.0/24)

---

## Step 1: Install PostgreSQL 15

SSH into the database server:

```bash
ssh souqjari-db
```

### 1.1 Add PostgreSQL Official Repository

Ubuntu 24.04 has PostgreSQL 16 as default, but we'll install PostgreSQL 15 for better Supabase compatibility:

```bash
# Install prerequisites
apt update
apt install -y curl ca-certificates gnupg lsb-release

# Add PostgreSQL official GPG key
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg

# Add PostgreSQL repository
echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | tee /etc/apt/sources.list.d/pgdg.list

# Update package lists
apt update
```

### 1.2 Install PostgreSQL 15

```bash
# Install PostgreSQL 15 and development headers
apt install -y postgresql-15 postgresql-client-15 postgresql-contrib-15 postgresql-server-dev-15

# Verify installation
psql --version
# Expected: psql (PostgreSQL) 15.x

# Check PostgreSQL service status
systemctl status postgresql
```

### 1.3 Verify PostgreSQL is Running

```bash
# Check PostgreSQL is listening
ss -tlnp | grep 5432

# Should show:
# LISTEN 0 244 127.0.0.1:5432 0.0.0.0:*  users:(("postgres",pid=xxxx,fd=x))

# Test local connection
sudo -u postgres psql -c "SELECT version();"
```

---

## Step 2: Install Required Extensions

Supabase requires several PostgreSQL extensions. Some are already included, others need to be installed.

### 2.1 Install Build Dependencies

```bash
# Install build tools and dependencies
apt install -y \
  build-essential \
  git \
  libcurl4-openssl-dev \
  libssl-dev \
  libkrb5-dev \
  cmake \
  pkg-config
```

### 2.2 Verify Built-in Extensions

These extensions come with PostgreSQL and just need to be enabled:

```bash
# Connect as postgres user
sudo -u postgres psql << 'EOF'
-- Check available extensions
SELECT name, default_version, comment
FROM pg_available_extensions
WHERE name IN ('uuid-ossp', 'pgcrypto', 'pg_stat_statements', 'pgtap', 'plpgsql')
ORDER BY name;
EOF
```

### 2.3 Install pgjwt (JWT Extension)

```bash
# Clone pgjwt repository
cd /tmp
git clone https://github.com/michelp/pgjwt.git
cd pgjwt

# Install
make install

# Verify installation
ls -la /usr/share/postgresql/15/extension/pgjwt*
```

### 2.4 Install pg_graphql (GraphQL Extension)

```bash
# pg_graphql requires Rust - install it first
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Install pgrx (PostgreSQL extension framework)
cargo install --locked cargo-pgrx@0.11.3

# Initialize pgrx for PostgreSQL 15
cargo pgrx init --pg15 /usr/lib/postgresql/15/bin/pg_config

# Clone and build pg_graphql
cd /tmp
git clone https://github.com/supabase/pg_graphql.git
cd pg_graphql

# Checkout a stable version
git checkout v1.5.0

# Build and install
cargo pgrx install --release --pg-config /usr/lib/postgresql/15/bin/pg_config

# Verify installation
ls -la /usr/share/postgresql/15/extension/pg_graphql*
```

**Note:** pg_graphql compilation takes 5-10 minutes due to Rust compilation.

### 2.5 Install pg_net (HTTP Extension for Webhooks)

```bash
# pg_net is needed for Supabase webhooks
cd /tmp
git clone https://github.com/supabase/pg_net.git
cd pg_net

# Build and install
make PG_CONFIG=/usr/lib/postgresql/15/bin/pg_config
make install PG_CONFIG=/usr/lib/postgresql/15/bin/pg_config

# Verify installation
ls -la /usr/share/postgresql/15/extension/pg_net*
```

### 2.6 Install pgsodium (Encryption Extension)

```bash
# Install libsodium development library
apt install -y libsodium-dev

# Clone pgsodium
cd /tmp
git clone https://github.com/michelp/pgsodium.git
cd pgsodium

# Build and install
make PG_CONFIG=/usr/lib/postgresql/15/bin/pg_config
make install PG_CONFIG=/usr/lib/postgresql/15/bin/pg_config

# Generate pgsodium secret key
mkdir -p /etc/postgresql-common
head -c 32 /dev/urandom | base64 > /etc/postgresql-common/pgsodium_root.key
chmod 600 /etc/postgresql-common/pgsodium_root.key
chown postgres:postgres /etc/postgresql-common/pgsodium_root.key

# Verify installation
ls -la /usr/share/postgresql/15/extension/pgsodium*
```

### 2.7 Install Supabase Auth Helpers (supabase_vault, etc.)

```bash
# Clone supabase/postgres repository for vault and other helpers
cd /tmp
git clone https://github.com/supabase/postgres.git supabase-postgres
cd supabase-postgres

# Install vault extension
cd migrations/db/ext/vault
make PG_CONFIG=/usr/lib/postgresql/15/bin/pg_config
make install PG_CONFIG=/usr/lib/postgresql/15/bin/pg_config
cd /tmp/supabase-postgres

# Verify installation
ls -la /usr/share/postgresql/15/extension/supabase_vault* 2>/dev/null || echo "Vault installed as part of setup"
```

### 2.8 Verify All Extensions are Available

```bash
# List all installed extensions
sudo -u postgres psql << 'EOF'
SELECT name, default_version
FROM pg_available_extensions
WHERE name IN (
  'uuid-ossp',
  'pgcrypto',
  'pg_stat_statements',
  'pgjwt',
  'pg_graphql',
  'pg_net',
  'pgsodium',
  'plpgsql'
)
ORDER BY name;
EOF
```

Expected output should show all extensions available.

---

## Step 3: Configure PostgreSQL for Performance

### 3.1 Backup Original Configuration

```bash
# Backup original config
cp /etc/postgresql/15/main/postgresql.conf /etc/postgresql/15/main/postgresql.conf.backup
```

### 3.2 Create Optimized Configuration

Tune PostgreSQL based on your server's RAM. Below are configurations for different server sizes:

> **Current Production:** ~8GB RAM server uses the "8GB Configuration" values below.

```bash
# Create custom configuration file
cat > /etc/postgresql/15/main/conf.d/supabase-optimized.conf << 'EOF'
# =============================================================================
# SouqJari PostgreSQL Configuration
# Adjust values based on your server RAM (see comments)
# =============================================================================

# -----------------------------------------------------------------------------
# CONNECTION SETTINGS
# -----------------------------------------------------------------------------
# Listen on all interfaces (we'll restrict with pg_hba.conf)
listen_addresses = '*'
port = 5432

# Maximum connections
# Supabase services need multiple connections
# PgBouncer recommended for production, but direct is fine for this scale
max_connections = 100  # 8GB: 100, 32GB: 200

# Connection reserved for superuser
superuser_reserved_connections = 3

# -----------------------------------------------------------------------------
# MEMORY SETTINGS (adjust based on RAM)
# -----------------------------------------------------------------------------
# Shared buffers: 25% of RAM for dedicated database server
# 8GB RAM: 2GB | 16GB RAM: 4GB | 32GB RAM: 8GB
shared_buffers = 2GB

# Effective cache size: RAM available for caching (not just PostgreSQL)
# Set to 75% of RAM
# 8GB RAM: 6GB | 16GB RAM: 12GB | 32GB RAM: 24GB
effective_cache_size = 6GB

# Work memory: Per-operation memory for sorts, hashes, etc.
# Be careful - this is per-operation, not per-connection
# 8GB RAM: 32MB | 16GB RAM: 48MB | 32GB RAM: 64MB
work_mem = 32MB

# Maintenance work memory: Memory for maintenance operations
# (VACUUM, CREATE INDEX, ALTER TABLE ADD FOREIGN KEY)
# 8GB RAM: 512MB | 16GB RAM: 1GB | 32GB RAM: 2GB
maintenance_work_mem = 512MB

# Huge pages: Use if available (requires OS configuration)
huge_pages = try

# -----------------------------------------------------------------------------
# WRITE-AHEAD LOG (WAL) SETTINGS
# -----------------------------------------------------------------------------
# WAL level for replication capability
wal_level = replica

# Minimum WAL kept for replication standby
wal_keep_size = 1GB

# Max WAL size before checkpoint
max_wal_size = 4GB
min_wal_size = 1GB

# Checkpoint completion target: spread out checkpoint writes
checkpoint_completion_target = 0.9

# WAL buffers: 3% of shared_buffers, max 64MB
wal_buffers = 64MB

# -----------------------------------------------------------------------------
# QUERY PLANNER
# -----------------------------------------------------------------------------
# Random page cost: Lower for SSD (default 4.0)
random_page_cost = 1.1

# Effective IO concurrency: Higher for NVMe SSD
effective_io_concurrency = 200

# -----------------------------------------------------------------------------
# PARALLEL QUERY EXECUTION
# -----------------------------------------------------------------------------
# Max parallel workers per gather
max_parallel_workers_per_gather = 4

# Max parallel workers
max_parallel_workers = 8

# Max parallel maintenance workers (for CREATE INDEX, etc.)
max_parallel_maintenance_workers = 4

# Minimum table size for parallel scan (in bytes, default 8MB)
min_parallel_table_scan_size = 8MB
min_parallel_index_scan_size = 512kB

# -----------------------------------------------------------------------------
# BACKGROUND PROCESSES
# -----------------------------------------------------------------------------
# Background writer
bgwriter_delay = 200ms
bgwriter_lru_maxpages = 100
bgwriter_lru_multiplier = 2.0

# -----------------------------------------------------------------------------
# VACUUM AND AUTOVACUUM
# -----------------------------------------------------------------------------
# Autovacuum enabled
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 30s

# More aggressive vacuum thresholds for active tables
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_scale_factor = 0.05

# Autovacuum cost limits (reduce impact on queries)
autovacuum_vacuum_cost_delay = 10ms
autovacuum_vacuum_cost_limit = 1000

# -----------------------------------------------------------------------------
# LOGGING
# -----------------------------------------------------------------------------
# Log destination
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB

# What to log
log_min_duration_statement = 1000  # Log queries taking > 1 second
log_checkpoints = on
log_connections = off  # Too noisy for Supabase
log_disconnections = off
log_lock_waits = on
log_temp_files = 0

# Log format
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'ddl'

# -----------------------------------------------------------------------------
# STATISTICS
# -----------------------------------------------------------------------------
# Enable pg_stat_statements
shared_preload_libraries = 'pg_stat_statements,pg_net,pgsodium'

# pg_stat_statements settings
pg_stat_statements.max = 10000
pg_stat_statements.track = all
pg_stat_statements.track_utility = on

# pgsodium settings
pgsodium.getkey_script = '/usr/share/postgresql/15/extension/pgsodium_getkey.sh'

# Track IO timing (slight overhead, but useful)
track_io_timing = on
track_functions = all

# -----------------------------------------------------------------------------
# CLIENT CONNECTION DEFAULTS
# -----------------------------------------------------------------------------
# Timezone
timezone = 'UTC'
log_timezone = 'UTC'

# Default text search config
default_text_search_config = 'pg_catalog.english'

# Statement timeout: 60 seconds (prevent runaway queries)
statement_timeout = 60000

# Lock timeout: 30 seconds
lock_timeout = 30000

# Idle transaction timeout: 10 minutes
idle_in_transaction_session_timeout = 600000

# -----------------------------------------------------------------------------
# REPLICATION (for future use)
# -----------------------------------------------------------------------------
# Max replication slots
max_replication_slots = 4

# Max WAL senders
max_wal_senders = 4

# Hot standby (for replicas)
hot_standby = on
EOF
```

### 3.3 Create pgsodium Key Script

```bash
# Create the pgsodium key retrieval script
cat > /usr/share/postgresql/15/extension/pgsodium_getkey.sh << 'EOF'
#!/bin/bash
cat /etc/postgresql-common/pgsodium_root.key
EOF

chmod +x /usr/share/postgresql/15/extension/pgsodium_getkey.sh
chown postgres:postgres /usr/share/postgresql/15/extension/pgsodium_getkey.sh
```

### 3.4 Apply Configuration

```bash
# Restart PostgreSQL to apply settings
systemctl restart postgresql

# Verify PostgreSQL started successfully
systemctl status postgresql

# Check current settings
sudo -u postgres psql << 'EOF'
SHOW shared_buffers;
SHOW effective_cache_size;
SHOW work_mem;
SHOW max_connections;
SHOW listen_addresses;
EOF
```

---

## Step 4: Configure Remote Access

### 4.1 Configure pg_hba.conf

The `pg_hba.conf` file controls client authentication. We'll allow connections from the private network only:

```bash
# Backup original pg_hba.conf
cp /etc/postgresql/15/main/pg_hba.conf /etc/postgresql/15/main/pg_hba.conf.backup

# Create new pg_hba.conf
cat > /etc/postgresql/15/main/pg_hba.conf << 'EOF'
# PostgreSQL Client Authentication Configuration File
# ===================================================
# SouqJari Self-Hosted Supabase
#
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections (Unix socket)
local   all             postgres                                peer
local   all             all                                     peer

# IPv4 local connections (localhost)
host    all             all             127.0.0.1/32            scram-sha-256

# IPv6 local connections (localhost)
host    all             all             ::1/128                 scram-sha-256

# =============================================================================
# PRIVATE NETWORK ACCESS (10.0.0.0/24)
# Only allow connections from Hetzner private network
# =============================================================================

# App server (Supabase services) - all databases
host    all             supabase_admin          10.0.0.0/24     scram-sha-256
host    all             authenticator           10.0.0.0/24     scram-sha-256
host    all             supabase_auth_admin     10.0.0.0/24     scram-sha-256
host    all             supabase_storage_admin  10.0.0.0/24     scram-sha-256
host    all             supabase_realtime_admin 10.0.0.0/24     scram-sha-256
host    all             supabase_functions_admin 10.0.0.0/24    scram-sha-256
host    all             postgres                10.0.0.0/24     scram-sha-256
host    all             service_role            10.0.0.0/24     scram-sha-256
host    all             anon                    10.0.0.0/24     scram-sha-256
host    all             authenticated           10.0.0.0/24     scram-sha-256

# Replication (for future read replicas on private network)
host    replication     postgres                10.0.0.0/24     scram-sha-256

# =============================================================================
# DENY ALL OTHER CONNECTIONS
# =============================================================================
# Any connection not matching above rules will be rejected
EOF
```

### 4.2 Reload PostgreSQL Configuration

```bash
# Reload configuration (doesn't require restart)
systemctl reload postgresql

# Verify PostgreSQL is listening on all interfaces
ss -tlnp | grep 5432
# Should show: LISTEN on 0.0.0.0:5432

# Check configuration is loaded
sudo -u postgres psql -c "SHOW hba_file;"
sudo -u postgres psql -c "SELECT * FROM pg_hba_file_rules;"
```

---

## Step 5: Create Supabase Database and Roles

### 5.1 Generate Secure Passwords

First, generate secure passwords for all database roles. **Save these securely - you'll need them for the app server configuration.**

```bash
# Generate secure passwords
echo "=== SAVE THESE PASSWORDS SECURELY ==="
echo ""
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)"
echo "SUPABASE_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)"
echo "AUTHENTICATOR_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)"
echo "AUTH_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)"
echo "STORAGE_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)"
echo "REALTIME_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)"
echo "FUNCTIONS_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)"
echo ""
echo "=== COPY AND SAVE ABOVE PASSWORDS ==="
```

### 5.2 Set PostgreSQL Superuser Password

```bash
# Set password for postgres user
# Replace YOUR_POSTGRES_PASSWORD with the generated password
sudo -u postgres psql << 'EOF'
-- Set postgres password
ALTER USER postgres WITH PASSWORD 'YOUR_POSTGRES_PASSWORD';
EOF
```

**Important:** Replace `YOUR_POSTGRES_PASSWORD` with the password you generated above.

### 5.3 Create Supabase Roles and Database

Create a SQL script to set up all required roles:

```bash
# Create the setup script
cat > /tmp/supabase_setup.sql << 'EOSQL'
-- =============================================================================
-- Supabase Database Setup Script
-- =============================================================================
-- This script creates all roles, schemas, and permissions required by Supabase
-- Run as postgres superuser
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Create Roles
-- -----------------------------------------------------------------------------

-- anon: Public/anonymous role (read-only by default)
CREATE ROLE anon NOLOGIN NOINHERIT;

-- authenticated: Logged-in user role
CREATE ROLE authenticated NOLOGIN NOINHERIT;

-- service_role: Backend service role (bypasses RLS)
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;

-- supabase_admin: Main admin role for Supabase services
CREATE ROLE supabase_admin LOGIN CREATEROLE CREATEDB REPLICATION BYPASSRLS;

-- authenticator: Role that PostgREST uses to connect and switch roles
CREATE ROLE authenticator LOGIN NOINHERIT;

-- Grant role switching to authenticator
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- supabase_auth_admin: GoTrue (auth) service role
CREATE ROLE supabase_auth_admin LOGIN NOINHERIT CREATEROLE CREATEDB;

-- supabase_storage_admin: Storage service role
CREATE ROLE supabase_storage_admin LOGIN NOINHERIT CREATEROLE CREATEDB;

-- supabase_realtime_admin: Realtime service role
CREATE ROLE supabase_realtime_admin LOGIN NOINHERIT;

-- supabase_functions_admin: Edge Functions service role
CREATE ROLE supabase_functions_admin LOGIN NOINHERIT;

-- pgbouncer: Connection pooler role (for future use)
CREATE ROLE pgbouncer LOGIN;

-- pgsodium_keyholder: For encryption key management
CREATE ROLE pgsodium_keyholder NOLOGIN NOINHERIT;
CREATE ROLE pgsodium_keyiduser NOLOGIN NOINHERIT;
CREATE ROLE pgsodium_keymaker NOLOGIN NOINHERIT;

-- Grant pgsodium roles
GRANT pgsodium_keyholder TO postgres WITH ADMIN OPTION;
GRANT pgsodium_keyholder TO supabase_admin WITH ADMIN OPTION;
GRANT pgsodium_keyiduser TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Set Passwords (REPLACE WITH YOUR GENERATED PASSWORDS)
-- -----------------------------------------------------------------------------
ALTER ROLE supabase_admin WITH PASSWORD 'YOUR_SUPABASE_ADMIN_PASSWORD';
ALTER ROLE authenticator WITH PASSWORD 'YOUR_AUTHENTICATOR_PASSWORD';
ALTER ROLE supabase_auth_admin WITH PASSWORD 'YOUR_AUTH_ADMIN_PASSWORD';
ALTER ROLE supabase_storage_admin WITH PASSWORD 'YOUR_STORAGE_ADMIN_PASSWORD';
ALTER ROLE supabase_realtime_admin WITH PASSWORD 'YOUR_REALTIME_ADMIN_PASSWORD';
ALTER ROLE supabase_functions_admin WITH PASSWORD 'YOUR_FUNCTIONS_ADMIN_PASSWORD';

-- -----------------------------------------------------------------------------
-- Create Database
-- -----------------------------------------------------------------------------
CREATE DATABASE supabase OWNER supabase_admin;

-- Connect to the supabase database for further setup
\c supabase

-- -----------------------------------------------------------------------------
-- Create Schemas
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION supabase_storage_admin;
CREATE SCHEMA IF NOT EXISTS realtime AUTHORIZATION supabase_realtime_admin;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS graphql;
CREATE SCHEMA IF NOT EXISTS graphql_public;
CREATE SCHEMA IF NOT EXISTS supabase_functions AUTHORIZATION supabase_functions_admin;
CREATE SCHEMA IF NOT EXISTS _realtime AUTHORIZATION supabase_realtime_admin;
CREATE SCHEMA IF NOT EXISTS vault;
CREATE SCHEMA IF NOT EXISTS pgsodium;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA graphql_public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

-- Grant all on public schema
GRANT ALL ON SCHEMA public TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO supabase_admin;

-- Grant create on public schema for roles that need it
GRANT CREATE ON SCHEMA public TO supabase_admin;
GRANT CREATE ON SCHEMA public TO postgres;

-- -----------------------------------------------------------------------------
-- Enable Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgjwt SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_graphql SCHEMA graphql;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Grant extension usage
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- Grant execute on extension functions to roles
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO anon, authenticated, service_role;

-- Make uuid-ossp accessible
ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- Set up search path
-- -----------------------------------------------------------------------------
ALTER DATABASE supabase SET search_path TO public, extensions;

-- Set search path for roles
ALTER ROLE anon SET search_path TO public, extensions;
ALTER ROLE authenticated SET search_path TO public, extensions;
ALTER ROLE service_role SET search_path TO public, extensions;
ALTER ROLE supabase_admin SET search_path TO public, extensions;

-- -----------------------------------------------------------------------------
-- Create pg_graphql resolver function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION graphql_public.graphql(
    "operationName" text DEFAULT NULL,
    query text DEFAULT NULL,
    variables jsonb DEFAULT NULL,
    extensions jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
AS $$
    SELECT graphql.resolve(
        query := query,
        variables := coalesce(variables, '{}'),
        "operationName" := "operationName",
        extensions := extensions
    );
$$;

GRANT EXECUTE ON FUNCTION graphql_public.graphql TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Grant permissions for realtime
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA realtime TO postgres;
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;

-- -----------------------------------------------------------------------------
-- Create publication for realtime (all tables in public schema)
-- -----------------------------------------------------------------------------
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- Grant replication privileges
ALTER ROLE supabase_realtime_admin WITH REPLICATION;

-- -----------------------------------------------------------------------------
-- Event triggers for schema changes (pg_graphql needs this)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION extensions.grant_pg_graphql_access()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Grant access to graphql schema functions
    GRANT USAGE ON SCHEMA graphql TO anon, authenticated, service_role;
    GRANT USAGE ON SCHEMA graphql_public TO anon, authenticated, service_role;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA graphql_public TO anon, authenticated, service_role;
END;
$$;

CREATE EVENT TRIGGER grant_pg_graphql_access
ON ddl_command_end
WHEN TAG IN ('CREATE FUNCTION')
EXECUTE PROCEDURE extensions.grant_pg_graphql_access();

-- -----------------------------------------------------------------------------
-- Finished
-- -----------------------------------------------------------------------------
SELECT 'Supabase database setup complete!' AS status;
EOSQL
```

### 5.4 Run the Setup Script

**Before running, replace the password placeholders with your actual generated passwords:**

```bash
# Edit the script to replace passwords
nano /tmp/supabase_setup.sql

# Look for these lines and replace with your passwords:
# ALTER ROLE supabase_admin WITH PASSWORD 'YOUR_SUPABASE_ADMIN_PASSWORD';
# ALTER ROLE authenticator WITH PASSWORD 'YOUR_AUTHENTICATOR_PASSWORD';
# etc.

# Once passwords are set, run the script
sudo -u postgres psql -f /tmp/supabase_setup.sql

# Clean up
rm /tmp/supabase_setup.sql
```

### 5.5 Verify Role Setup

```bash
sudo -u postgres psql -d supabase << 'EOF'
-- List all roles
SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolreplication, rolbypassrls
FROM pg_roles
WHERE rolname NOT LIKE 'pg_%'
ORDER BY rolname;

-- List all schemas
SELECT schema_name, schema_owner
FROM information_schema.schemata
WHERE schema_name NOT LIKE 'pg_%'
AND schema_name != 'information_schema'
ORDER BY schema_name;

-- List enabled extensions
SELECT extname, extversion FROM pg_extension ORDER BY extname;
EOF
```

---

## Step 6: Initialize Supabase Schema

### 6.1 Download Supabase Migrations

Supabase requires specific schema structures for auth and storage. We'll apply these:

```bash
# Create migrations directory
mkdir -p /tmp/supabase_migrations
cd /tmp/supabase_migrations

# Download auth schema migration
cat > 00-auth-schema.sql << 'EOSQL'
-- =============================================================================
-- Auth Schema (GoTrue)
-- =============================================================================
-- Based on Supabase GoTrue migrations

\c supabase

-- Set role
SET ROLE supabase_auth_admin;

-- Create auth tables
CREATE TABLE IF NOT EXISTS auth.users (
    instance_id uuid,
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    aud varchar(255),
    role varchar(255),
    email varchar(255) UNIQUE,
    encrypted_password varchar(255),
    email_confirmed_at timestamptz,
    invited_at timestamptz,
    confirmation_token varchar(255),
    confirmation_sent_at timestamptz,
    recovery_token varchar(255),
    recovery_sent_at timestamptz,
    email_change_token_new varchar(255),
    email_change varchar(255),
    email_change_sent_at timestamptz,
    last_sign_in_at timestamptz,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    phone varchar(15) UNIQUE,
    phone_confirmed_at timestamptz,
    phone_change varchar(15),
    phone_change_token varchar(255),
    phone_change_sent_at timestamptz,
    confirmed_at timestamptz GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current varchar(255),
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamptz,
    reauthentication_token varchar(255),
    reauthentication_sent_at timestamptz,
    is_sso_user boolean DEFAULT false,
    deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    instance_id uuid,
    id bigserial PRIMARY KEY,
    token varchar(255),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    revoked boolean,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    parent varchar(255),
    session_id uuid
);

CREATE TABLE IF NOT EXISTS auth.instances (
    id uuid PRIMARY KEY,
    uuid uuid,
    raw_base_config text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth.audit_log_entries (
    instance_id uuid,
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    payload json,
    created_at timestamptz DEFAULT now(),
    ip_address varchar(64) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS auth.schema_migrations (
    version varchar(255) PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS auth.identities (
    id text NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    email text GENERATED ALWAYS AS (lower(identity_data->>'email')) STORED,
    CONSTRAINT identities_pkey PRIMARY KEY (provider, id)
);

CREATE TABLE IF NOT EXISTS auth.sessions (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    factor_id uuid,
    aal varchar(255),
    not_after timestamptz,
    refreshed_at timestamptz,
    user_agent text,
    ip inet,
    tag text
);

CREATE TABLE IF NOT EXISTS auth.mfa_factors (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friendly_name text,
    factor_type varchar(255) NOT NULL,
    status varchar(255) NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    secret text
);

CREATE TABLE IF NOT EXISTS auth.mfa_challenges (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    factor_id uuid NOT NULL REFERENCES auth.mfa_factors(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    verified_at timestamptz,
    ip_address inet NOT NULL
);

CREATE TABLE IF NOT EXISTS auth.mfa_amr_claims (
    session_id uuid NOT NULL REFERENCES auth.sessions(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    authentication_method text NOT NULL,
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4()
);

CREATE TABLE IF NOT EXISTS auth.sso_providers (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    resource_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth.sso_domains (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    sso_provider_id uuid NOT NULL REFERENCES auth.sso_providers(id) ON DELETE CASCADE,
    domain text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth.saml_providers (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    sso_provider_id uuid NOT NULL REFERENCES auth.sso_providers(id) ON DELETE CASCADE,
    entity_id text NOT NULL UNIQUE,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth.saml_relay_states (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    sso_provider_id uuid NOT NULL REFERENCES auth.sso_providers(id) ON DELETE CASCADE,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    from_ip_address inet,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth.flow_state (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    auth_code text NOT NULL,
    code_challenge_method varchar(255) NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    authentication_method text NOT NULL
);

CREATE TABLE IF NOT EXISTS auth.one_time_tokens (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_type varchar(255) NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS users_instance_id_email_idx ON auth.users (instance_id, lower(email));
CREATE INDEX IF NOT EXISTS users_instance_id_idx ON auth.users (instance_id);
CREATE INDEX IF NOT EXISTS users_is_phone_confirmed_idx ON auth.users (phone_confirmed_at);
CREATE INDEX IF NOT EXISTS refresh_tokens_instance_id_idx ON auth.refresh_tokens (instance_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens (instance_id, user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx ON auth.refresh_tokens (token);
CREATE INDEX IF NOT EXISTS refresh_tokens_parent_idx ON auth.refresh_tokens (parent);
CREATE INDEX IF NOT EXISTS refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens (session_id, revoked);
CREATE INDEX IF NOT EXISTS audit_logs_instance_id_idx ON auth.audit_log_entries (instance_id);
CREATE INDEX IF NOT EXISTS identities_user_id_idx ON auth.identities (user_id);
CREATE INDEX IF NOT EXISTS identities_email_idx ON auth.identities (email);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON auth.sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_not_after_idx ON auth.sessions (not_after);
CREATE INDEX IF NOT EXISTS mfa_factors_user_id_idx ON auth.mfa_factors (user_id);
CREATE INDEX IF NOT EXISTS one_time_tokens_user_id_token_type_idx ON auth.one_time_tokens (user_id, token_type);
CREATE INDEX IF NOT EXISTS one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);

-- Grant permissions
GRANT USAGE ON SCHEMA auth TO service_role, supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role, supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role, supabase_auth_admin;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO service_role, supabase_auth_admin;

-- Reset role
RESET ROLE;

SELECT 'Auth schema initialized!' AS status;
EOSQL

# Download storage schema migration
cat > 01-storage-schema.sql << 'EOSQL'
-- =============================================================================
-- Storage Schema
-- =============================================================================

\c supabase

-- Set role
SET ROLE supabase_storage_admin;

-- Create storage tables
CREATE TABLE IF NOT EXISTS storage.buckets (
    id text PRIMARY KEY,
    name text NOT NULL UNIQUE,
    owner uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    bucket_id text REFERENCES storage.buckets(id),
    name text,
    owner uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_accessed_at timestamptz DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
    version text,
    owner_id text
);

CREATE TABLE IF NOT EXISTS storage.migrations (
    id integer PRIMARY KEY,
    name varchar(100) NOT NULL UNIQUE,
    hash varchar(40) NOT NULL,
    executed_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS bucketid_objname ON storage.objects (bucket_id, name);
CREATE INDEX IF NOT EXISTS objects_owner_idx ON storage.objects (owner);
CREATE INDEX IF NOT EXISTS objects_bucket_id_idx ON storage.objects (bucket_id);
CREATE INDEX IF NOT EXISTS objects_name_idx ON storage.objects (name);

-- Create storage functions
CREATE OR REPLACE FUNCTION storage.filename(name text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN split_part(name, '/', -1);
END;
$$;

CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE plpgsql
AS $$
DECLARE
    _parts text[];
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    RETURN _parts[1:array_length(_parts, 1) - 1];
END;
$$;

CREATE OR REPLACE FUNCTION storage.extension(name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT split_part(name, '/', -1) INTO _filename;
    SELECT string_to_array(_filename, '.') INTO _parts;
    IF array_length(_parts, 1) > 1 THEN
        RETURN _parts[array_length(_parts, 1)];
    END IF;
    RETURN '';
END;
$$;

-- Search function for storage
CREATE OR REPLACE FUNCTION storage.search(
    prefix text,
    bucketname text,
    limits integer DEFAULT 100,
    levels integer DEFAULT 1,
    offsets integer DEFAULT 0,
    search text DEFAULT '',
    sortcolumn text DEFAULT 'name',
    sortorder text DEFAULT 'asc'
)
RETURNS TABLE (
    name text,
    id uuid,
    updated_at timestamptz,
    created_at timestamptz,
    last_accessed_at timestamptz,
    metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY EXECUTE format(
        'SELECT name, id, updated_at, created_at, last_accessed_at, metadata
         FROM storage.objects
         WHERE bucket_id = %L
         AND name ILIKE %L || ''%%''
         AND CASE WHEN %L != '''' THEN name ILIKE ''%%'' || %L || ''%%'' ELSE true END
         ORDER BY %I %s
         LIMIT %L
         OFFSET %L',
        bucketname, prefix, search, search, sortcolumn, sortorder, limits, offsets
    );
END;
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role, supabase_storage_admin;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO service_role, supabase_storage_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA storage TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO service_role, supabase_storage_admin;
GRANT ALL ON ALL ROUTINES IN SCHEMA storage TO service_role, supabase_storage_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA storage TO anon, authenticated;

-- Reset role
RESET ROLE;

SELECT 'Storage schema initialized!' AS status;
EOSQL

# Download realtime schema migration
cat > 02-realtime-schema.sql << 'EOSQL'
-- =============================================================================
-- Realtime Schema
-- =============================================================================
-- IMPORTANT: Supabase Realtime (Elixir/Phoenix) expects 'timestamp' NOT 'timestamptz'
-- Using timestamptz causes DateTime encoding errors during migrations

\c supabase

-- Grant realtime permissions
GRANT USAGE ON SCHEMA realtime TO authenticated, anon, service_role;
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;

-- Create realtime schema_migrations table
-- CRITICAL: Use 'timestamp' (NaiveDateTime) not 'timestamptz' (DateTime)
-- The Realtime service uses Ecto which expects timestamp without timezone
CREATE TABLE IF NOT EXISTS realtime.schema_migrations (
    version bigint PRIMARY KEY,
    inserted_at timestamp(0) NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);

-- Set ownership
ALTER TABLE realtime.schema_migrations OWNER TO supabase_realtime_admin;

-- Grant comprehensive permissions
GRANT ALL ON TABLE realtime.schema_migrations TO supabase_realtime_admin;
GRANT ALL ON ALL TABLES IN SCHEMA realtime TO supabase_realtime_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA realtime TO supabase_realtime_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA realtime GRANT ALL ON TABLES TO supabase_realtime_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA realtime GRANT ALL ON SEQUENCES TO supabase_realtime_admin;

-- Grant permissions on _realtime schema (used for internal state)
GRANT USAGE ON SCHEMA _realtime TO supabase_realtime_admin;
GRANT ALL ON ALL TABLES IN SCHEMA _realtime TO supabase_realtime_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA _realtime TO supabase_realtime_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA _realtime GRANT ALL ON TABLES TO supabase_realtime_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA _realtime GRANT ALL ON SEQUENCES TO supabase_realtime_admin;

-- Grant select on realtime tables to API roles
GRANT SELECT ON ALL TABLES IN SCHEMA realtime TO authenticated, anon, service_role;

SELECT 'Realtime schema initialized!' AS status;
EOSQL
```

### 6.2 Apply Migrations

```bash
# Apply auth schema
sudo -u postgres psql -f /tmp/supabase_migrations/00-auth-schema.sql

# Apply storage schema
sudo -u postgres psql -f /tmp/supabase_migrations/01-storage-schema.sql

# Apply realtime schema
sudo -u postgres psql -f /tmp/supabase_migrations/02-realtime-schema.sql

# Clean up
rm -rf /tmp/supabase_migrations
```

---

## Step 7: Verification

### 7.1 Test Local Connection

```bash
# Test as postgres
sudo -u postgres psql -d supabase -c "SELECT current_database(), current_user;"

# Test extensions
sudo -u postgres psql -d supabase -c "SELECT extname, extversion FROM pg_extension ORDER BY extname;"
```

### 7.2 Test Remote Connection from App Server

From your local machine, SSH into the app server and test the database connection:

```bash
ssh souqjari-app
```

Then on the app server:

```bash
# Install PostgreSQL client
apt update && apt install -y postgresql-client

# Test connection (replace YOUR_AUTHENTICATOR_PASSWORD with actual password)
PGPASSWORD='YOUR_AUTHENTICATOR_PASSWORD' psql -h 10.0.0.2 -U authenticator -d supabase -c "SELECT current_database(), current_user;"

# Test as supabase_admin
PGPASSWORD='YOUR_SUPABASE_ADMIN_PASSWORD' psql -h 10.0.0.2 -U supabase_admin -d supabase -c "SELECT current_database(), current_user;"

# Exit app server
exit
```

### 7.3 Test All Roles

Back on the database server:

```bash
ssh souqjari-db

# Test role switching
sudo -u postgres psql -d supabase << 'EOF'
-- Test anon role
SET ROLE anon;
SELECT current_user;
RESET ROLE;

-- Test authenticated role
SET ROLE authenticated;
SELECT current_user;
RESET ROLE;

-- Test service_role
SET ROLE service_role;
SELECT current_user;
RESET ROLE;

-- Test authenticator can switch roles
SET ROLE authenticator;
SET ROLE anon;
SELECT current_user;
RESET ROLE;
RESET ROLE;

SELECT 'All role tests passed!' AS status;
EOF

exit
```

### 7.4 Verify Schema Structure

```bash
ssh souqjari-db

sudo -u postgres psql -d supabase << 'EOF'
-- Check schemas
SELECT schema_name FROM information_schema.schemata
WHERE schema_name NOT LIKE 'pg_%'
AND schema_name != 'information_schema'
ORDER BY schema_name;

-- Check auth tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'auth'
ORDER BY table_name;

-- Check storage tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'storage'
ORDER BY table_name;

-- Check extensions
SELECT extname, extversion FROM pg_extension ORDER BY extname;
EOF

exit
```

### 7.5 Verify Performance Settings

```bash
ssh souqjari-db

sudo -u postgres psql << 'EOF'
-- Check critical settings
SELECT name, setting, unit
FROM pg_settings
WHERE name IN (
    'shared_buffers',
    'effective_cache_size',
    'work_mem',
    'maintenance_work_mem',
    'max_connections',
    'listen_addresses',
    'wal_level',
    'max_wal_size'
)
ORDER BY name;
EOF

exit
```

Expected output (values depend on server RAM - below is for ~8GB server):
```
        name         | setting  |  unit
---------------------+----------+--------
 effective_cache_size| 786432   | 8kB (≈6GB)
 listen_addresses    | *        |
 maintenance_work_mem| 524288   | kB (≈512MB)
 max_connections     | 100      |
 max_wal_size        | 4096     | MB
 shared_buffers      | 262144   | 8kB (≈2GB)
 wal_level           | replica  |
 work_mem            | 32768    | kB (≈32MB)
```

---

## Troubleshooting

### PostgreSQL Won't Start

```bash
# Check logs
journalctl -u postgresql -n 50

# Check PostgreSQL logs
tail -50 /var/log/postgresql/postgresql-15-main.log

# Check config syntax
sudo -u postgres /usr/lib/postgresql/15/bin/postgres -D /var/lib/postgresql/15/main -C config_file

# Reset to default config if needed
cp /etc/postgresql/15/main/postgresql.conf.backup /etc/postgresql/15/main/postgresql.conf
systemctl restart postgresql
```

### Extension Installation Fails

```bash
# Check if build tools are installed
apt install -y build-essential postgresql-server-dev-15

# For pgrx/pg_graphql issues, ensure Rust is in PATH
source $HOME/.cargo/env

# Verify pg_config path
/usr/lib/postgresql/15/bin/pg_config --version
```

### Remote Connection Fails

```bash
# Verify PostgreSQL is listening
ss -tlnp | grep 5432

# Check pg_hba.conf is correct
sudo -u postgres psql -c "SELECT * FROM pg_hba_file_rules;"

# Check firewall on database server
ufw status verbose | grep 5432

# Test from app server
ssh souqjari-app "nc -zv 10.0.0.2 5432"
```

### Memory Errors (Out of Memory)

```bash
# Reduce shared_buffers temporarily
sudo -u postgres psql -c "ALTER SYSTEM SET shared_buffers = '4GB';"
systemctl restart postgresql

# Check system memory
free -h
```

### Role/Permission Issues

```bash
# Reset role permissions
sudo -u postgres psql -d supabase << 'EOF'
-- Re-grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_admin;
GRANT anon, authenticated, service_role TO authenticator;
EOF
```

---

## Phase 2 Completion Checklist

Before proceeding to Phase 3, verify:

- [ ] PostgreSQL 15 installed and running
- [ ] All required extensions installed:
  - [ ] uuid-ossp
  - [ ] pgcrypto
  - [ ] pgjwt
  - [ ] pg_stat_statements
  - [ ] pg_graphql
  - [ ] pg_net
  - [ ] pgsodium
- [ ] PostgreSQL tuned for your server's RAM (current prod: ~8GB)
- [ ] Remote access configured for private network (10.0.0.0/24)
- [ ] All Supabase roles created with secure passwords
- [ ] supabase database created
- [ ] Auth, storage, and realtime schemas initialized
- [ ] Remote connection from app server works
- [ ] Passwords saved securely for Phase 3

---

## Credentials Summary

**Save these credentials securely - you'll need them for Phase 3!**

| Role | Purpose | Password Variable |
|------|---------|------------------|
| postgres | Database superuser | POSTGRES_PASSWORD |
| supabase_admin | Main Supabase admin | SUPABASE_ADMIN_PASSWORD |
| authenticator | PostgREST connection | AUTHENTICATOR_PASSWORD |
| supabase_auth_admin | GoTrue service | AUTH_ADMIN_PASSWORD |
| supabase_storage_admin | Storage service | STORAGE_ADMIN_PASSWORD |
| supabase_realtime_admin | Realtime service | REALTIME_ADMIN_PASSWORD |
| supabase_functions_admin | Edge Functions | FUNCTIONS_ADMIN_PASSWORD |

**Database Connection String (for Phase 3):**
```
postgresql://supabase_admin:YOUR_PASSWORD@10.0.0.2:5432/supabase
```

---

## Next Steps

Proceed to **Phase 3: App Server Setup (Docker & Supabase Services)**

- Install Docker and Docker Compose
- Deploy Supabase services pointing to this database
- Configure Kong, GoTrue, PostgREST, Realtime, Storage

---

*Document Version: 1.1*
*Last Updated: December 2024*
*Author: SouqJari DevOps*

### Changelog
- v1.1: Updated PostgreSQL tuning to be RAM-flexible (current prod: ~8GB), added scaling guidelines
- v1.0: Initial documentation
