# Phase 2: Quick Command Reference

Copy-paste ready commands for Phase 2 PostgreSQL setup. See `phase2-database-setup.md` for detailed explanations.

---

## Generate Passwords First (Run Locally)

```bash
# Generate and save these passwords before starting!
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)"
echo "SUPABASE_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)"
echo "AUTHENTICATOR_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)"
echo "AUTH_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)"
echo "STORAGE_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)"
echo "REALTIME_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)"
echo "FUNCTIONS_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)"
```

**SAVE THESE PASSWORDS SECURELY BEFORE PROCEEDING!**

---

## Database Server Setup

SSH into database server: `ssh souqjari-db`

### Part 1: Install PostgreSQL 15

```bash
#!/bin/bash
# Run as root on database server

# Add PostgreSQL repository
apt update
apt install -y curl ca-certificates gnupg lsb-release

curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | tee /etc/apt/sources.list.d/pgdg.list

apt update

# Install PostgreSQL 15
apt install -y postgresql-15 postgresql-client-15 postgresql-contrib-15 postgresql-server-dev-15

# Verify installation
psql --version
systemctl status postgresql
```

### Part 2: Install Build Dependencies

```bash
# Install build tools
apt install -y \
  build-essential \
  git \
  libcurl4-openssl-dev \
  libssl-dev \
  libkrb5-dev \
  cmake \
  pkg-config \
  libsodium-dev
```

### Part 3: Install pgjwt Extension

```bash
cd /tmp
git clone https://github.com/michelp/pgjwt.git
cd pgjwt
make install
ls -la /usr/share/postgresql/15/extension/pgjwt*
```

### Part 4: Install pg_graphql Extension (Takes 5-10 minutes)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Install pgrx
cargo install --locked cargo-pgrx@0.11.3
cargo pgrx init --pg15 /usr/lib/postgresql/15/bin/pg_config

# Build pg_graphql
cd /tmp
git clone https://github.com/supabase/pg_graphql.git
cd pg_graphql
git checkout v1.5.0
cargo pgrx install --release --pg-config /usr/lib/postgresql/15/bin/pg_config

ls -la /usr/share/postgresql/15/extension/pg_graphql*
```

### Part 5: Install pg_net Extension

```bash
cd /tmp
git clone https://github.com/supabase/pg_net.git
cd pg_net
make PG_CONFIG=/usr/lib/postgresql/15/bin/pg_config
make install PG_CONFIG=/usr/lib/postgresql/15/bin/pg_config
ls -la /usr/share/postgresql/15/extension/pg_net*
```

### Part 6: Install pgsodium Extension

```bash
cd /tmp
git clone https://github.com/michelp/pgsodium.git
cd pgsodium
make PG_CONFIG=/usr/lib/postgresql/15/bin/pg_config
make install PG_CONFIG=/usr/lib/postgresql/15/bin/pg_config

# Generate secret key
mkdir -p /etc/postgresql-common
head -c 32 /dev/urandom | base64 > /etc/postgresql-common/pgsodium_root.key
chmod 600 /etc/postgresql-common/pgsodium_root.key
chown postgres:postgres /etc/postgresql-common/pgsodium_root.key

ls -la /usr/share/postgresql/15/extension/pgsodium*
```

### Part 7: Create pgsodium Key Script

```bash
cat > /usr/share/postgresql/15/extension/pgsodium_getkey.sh << 'EOF'
#!/bin/bash
cat /etc/postgresql-common/pgsodium_root.key
EOF

chmod +x /usr/share/postgresql/15/extension/pgsodium_getkey.sh
chown postgres:postgres /usr/share/postgresql/15/extension/pgsodium_getkey.sh
```

### Part 8: Configure PostgreSQL (32GB RAM Optimized)

```bash
# Backup original config
cp /etc/postgresql/15/main/postgresql.conf /etc/postgresql/15/main/postgresql.conf.backup

# Create optimized config
cat > /etc/postgresql/15/main/conf.d/supabase-optimized.conf << 'EOF'
# SouqJari PostgreSQL - CCX33 (8 vCPU, 32GB RAM)

# Connection
listen_addresses = '*'
port = 5432
max_connections = 200
superuser_reserved_connections = 3

# Memory (32GB RAM)
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 64MB
maintenance_work_mem = 2GB
huge_pages = try

# WAL
wal_level = replica
wal_keep_size = 1GB
max_wal_size = 4GB
min_wal_size = 1GB
checkpoint_completion_target = 0.9
wal_buffers = 64MB

# Query Planner (NVMe SSD)
random_page_cost = 1.1
effective_io_concurrency = 200

# Parallel Query
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4
min_parallel_table_scan_size = 8MB
min_parallel_index_scan_size = 512kB

# Background Writer
bgwriter_delay = 200ms
bgwriter_lru_maxpages = 100
bgwriter_lru_multiplier = 2.0

# Autovacuum
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 30s
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_scale_factor = 0.05
autovacuum_vacuum_cost_delay = 10ms
autovacuum_vacuum_cost_limit = 1000

# Logging
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_duration_statement = 1000
log_checkpoints = on
log_lock_waits = on
log_temp_files = 0
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'ddl'

# Extensions
shared_preload_libraries = 'pg_stat_statements,pg_net,pgsodium'
pg_stat_statements.max = 10000
pg_stat_statements.track = all
pg_stat_statements.track_utility = on
pgsodium.getkey_script = '/usr/share/postgresql/15/extension/pgsodium_getkey.sh'

# Statistics
track_io_timing = on
track_functions = all

# Defaults
timezone = 'UTC'
log_timezone = 'UTC'
default_text_search_config = 'pg_catalog.english'

# Timeouts
statement_timeout = 60000
lock_timeout = 30000
idle_in_transaction_session_timeout = 600000

# Replication
max_replication_slots = 4
max_wal_senders = 4
hot_standby = on
EOF

# Restart PostgreSQL
systemctl restart postgresql
systemctl status postgresql
```

### Part 9: Configure pg_hba.conf (Remote Access)

```bash
cp /etc/postgresql/15/main/pg_hba.conf /etc/postgresql/15/main/pg_hba.conf.backup

cat > /etc/postgresql/15/main/pg_hba.conf << 'EOF'
# PostgreSQL Client Authentication - SouqJari
# TYPE  DATABASE  USER            ADDRESS        METHOD

# Local connections
local   all       postgres                       peer
local   all       all                            peer

# Localhost
host    all       all             127.0.0.1/32   scram-sha-256
host    all       all             ::1/128        scram-sha-256

# Private network (10.0.0.0/24) - Supabase services
host    all       supabase_admin          10.0.0.0/24  scram-sha-256
host    all       authenticator           10.0.0.0/24  scram-sha-256
host    all       supabase_auth_admin     10.0.0.0/24  scram-sha-256
host    all       supabase_storage_admin  10.0.0.0/24  scram-sha-256
host    all       supabase_realtime_admin 10.0.0.0/24  scram-sha-256
host    all       supabase_functions_admin 10.0.0.0/24 scram-sha-256
host    all       postgres                10.0.0.0/24  scram-sha-256
host    all       service_role            10.0.0.0/24  scram-sha-256
host    all       anon                    10.0.0.0/24  scram-sha-256
host    all       authenticated           10.0.0.0/24  scram-sha-256

# Replication
host    replication postgres        10.0.0.0/24  scram-sha-256
EOF

systemctl reload postgresql
```

### Part 10: Create Roles and Database

**IMPORTANT: Replace password placeholders with your generated passwords!**

```bash
# Set postgres password first
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'YOUR_POSTGRES_PASSWORD';"

# Create all roles and database
sudo -u postgres psql << 'EOSQL'
-- Create roles
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
CREATE ROLE supabase_admin LOGIN CREATEROLE CREATEDB REPLICATION BYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT;
CREATE ROLE supabase_auth_admin LOGIN NOINHERIT CREATEROLE CREATEDB;
CREATE ROLE supabase_storage_admin LOGIN NOINHERIT CREATEROLE CREATEDB;
CREATE ROLE supabase_realtime_admin LOGIN NOINHERIT;
CREATE ROLE supabase_functions_admin LOGIN NOINHERIT;
CREATE ROLE pgbouncer LOGIN;
CREATE ROLE pgsodium_keyholder NOLOGIN NOINHERIT;
CREATE ROLE pgsodium_keyiduser NOLOGIN NOINHERIT;
CREATE ROLE pgsodium_keymaker NOLOGIN NOINHERIT;

-- Grant role switching
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
GRANT pgsodium_keyholder TO postgres WITH ADMIN OPTION;
GRANT pgsodium_keyholder TO supabase_admin WITH ADMIN OPTION;
GRANT pgsodium_keyiduser TO anon, authenticated, service_role;

-- Set passwords (REPLACE THESE!)
ALTER ROLE supabase_admin WITH PASSWORD 'YOUR_SUPABASE_ADMIN_PASSWORD';
ALTER ROLE authenticator WITH PASSWORD 'YOUR_AUTHENTICATOR_PASSWORD';
ALTER ROLE supabase_auth_admin WITH PASSWORD 'YOUR_AUTH_ADMIN_PASSWORD';
ALTER ROLE supabase_storage_admin WITH PASSWORD 'YOUR_STORAGE_ADMIN_PASSWORD';
ALTER ROLE supabase_realtime_admin WITH PASSWORD 'YOUR_REALTIME_ADMIN_PASSWORD';
ALTER ROLE supabase_functions_admin WITH PASSWORD 'YOUR_FUNCTIONS_ADMIN_PASSWORD';

-- Create database
CREATE DATABASE supabase OWNER supabase_admin;
EOSQL
```

### Part 11: Initialize Supabase Schemas

```bash
sudo -u postgres psql -d supabase << 'EOSQL'
-- Create schemas
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
GRANT ALL ON SCHEMA public TO supabase_admin;
GRANT CREATE ON SCHEMA public TO supabase_admin, postgres;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgjwt SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_graphql SCHEMA graphql;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Grant extension usage
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO anon, authenticated, service_role;

-- Set search path
ALTER DATABASE supabase SET search_path TO public, extensions;
ALTER ROLE anon SET search_path TO public, extensions;
ALTER ROLE authenticated SET search_path TO public, extensions;
ALTER ROLE service_role SET search_path TO public, extensions;
ALTER ROLE supabase_admin SET search_path TO public, extensions;

-- Create GraphQL resolver
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

-- Realtime publication
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
ALTER ROLE supabase_realtime_admin WITH REPLICATION;
GRANT USAGE ON SCHEMA realtime TO postgres, supabase_realtime_admin;
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;

SELECT 'Database setup complete!' AS status;
EOSQL
```

### Part 12: Initialize Auth Schema

```bash
sudo -u postgres psql -d supabase << 'EOSQL'
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

CREATE TABLE IF NOT EXISTS auth.audit_log_entries (
    instance_id uuid,
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    payload json,
    created_at timestamptz DEFAULT now(),
    ip_address varchar(64) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS auth.instances (
    id uuid PRIMARY KEY,
    uuid uuid,
    raw_base_config text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth.schema_migrations (
    version varchar(255) PRIMARY KEY
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

CREATE TABLE IF NOT EXISTS auth.one_time_tokens (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_type varchar(255) NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS users_instance_id_email_idx ON auth.users (instance_id, lower(email));
CREATE INDEX IF NOT EXISTS users_instance_id_idx ON auth.users (instance_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx ON auth.refresh_tokens (token);
CREATE INDEX IF NOT EXISTS refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens (session_id, revoked);
CREATE INDEX IF NOT EXISTS identities_user_id_idx ON auth.identities (user_id);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON auth.sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_not_after_idx ON auth.sessions (not_after);

-- Grant permissions
GRANT USAGE ON SCHEMA auth TO service_role, supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role, supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role, supabase_auth_admin;

RESET ROLE;
SELECT 'Auth schema initialized!' AS status;
EOSQL
```

### Part 13: Initialize Storage Schema

```bash
sudo -u postgres psql -d supabase << 'EOSQL'
SET ROLE supabase_storage_admin;

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

CREATE UNIQUE INDEX IF NOT EXISTS bucketid_objname ON storage.objects (bucket_id, name);
CREATE INDEX IF NOT EXISTS objects_bucket_id_idx ON storage.objects (bucket_id);

-- Storage functions
CREATE OR REPLACE FUNCTION storage.filename(name text)
RETURNS text LANGUAGE plpgsql AS $$
BEGIN RETURN split_part(name, '/', -1); END; $$;

CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[] LANGUAGE plpgsql AS $$
DECLARE _parts text[];
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    RETURN _parts[1:array_length(_parts, 1) - 1];
END; $$;

CREATE OR REPLACE FUNCTION storage.extension(name text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE _parts text[]; _filename text;
BEGIN
    SELECT split_part(name, '/', -1) INTO _filename;
    SELECT string_to_array(_filename, '.') INTO _parts;
    IF array_length(_parts, 1) > 1 THEN RETURN _parts[array_length(_parts, 1)]; END IF;
    RETURN '';
END; $$;

-- Grant permissions
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role, supabase_storage_admin;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO service_role, supabase_storage_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA storage TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO service_role, supabase_storage_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA storage TO anon, authenticated, service_role;

RESET ROLE;
SELECT 'Storage schema initialized!' AS status;
EOSQL
```

---

## Verification Commands

### Test Configuration

```bash
# Check PostgreSQL status
systemctl status postgresql

# Check listening
ss -tlnp | grep 5432

# Check memory settings
sudo -u postgres psql -c "SHOW shared_buffers; SHOW effective_cache_size; SHOW work_mem; SHOW max_connections;"

# Check extensions
sudo -u postgres psql -d supabase -c "SELECT extname, extversion FROM pg_extension ORDER BY extname;"

# Check roles
sudo -u postgres psql -c "SELECT rolname, rolcanlogin, rolbypassrls FROM pg_roles WHERE rolname NOT LIKE 'pg_%' ORDER BY rolname;"

# Check schemas
sudo -u postgres psql -d supabase -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT LIKE 'pg_%' AND schema_name != 'information_schema' ORDER BY schema_name;"
```

### Test Remote Connection (from App Server)

```bash
# SSH to app server
ssh souqjari-app

# Install psql client
apt update && apt install -y postgresql-client

# Test connection (replace password)
PGPASSWORD='YOUR_AUTHENTICATOR_PASSWORD' psql -h 10.0.0.2 -U authenticator -d supabase -c "SELECT current_database(), current_user;"

# Exit
exit
```

---

## Troubleshooting

### PostgreSQL won't start

```bash
# Check logs
journalctl -u postgresql -n 50
tail -50 /var/log/postgresql/postgresql-15-main.log

# Reset config if needed
cp /etc/postgresql/15/main/postgresql.conf.backup /etc/postgresql/15/main/postgresql.conf
systemctl restart postgresql
```

### Extension installation fails

```bash
# Ensure Rust is available
source $HOME/.cargo/env

# Check pg_config
/usr/lib/postgresql/15/bin/pg_config --version
```

### Remote connection fails

```bash
# Check listening
ss -tlnp | grep 5432

# Check firewall
ufw status verbose | grep 5432

# Check pg_hba.conf
sudo -u postgres psql -c "SELECT * FROM pg_hba_file_rules WHERE database = '{all}';"

# Test from app server
ssh souqjari-app "nc -zv 10.0.0.2 5432"
```

---

## Password Template

Save this filled in somewhere secure:

```
POSTGRES_PASSWORD=
SUPABASE_ADMIN_PASSWORD=
AUTHENTICATOR_PASSWORD=
AUTH_ADMIN_PASSWORD=
STORAGE_ADMIN_PASSWORD=
REALTIME_ADMIN_PASSWORD=
FUNCTIONS_ADMIN_PASSWORD=
```

Database connection string for Phase 3:
```
postgresql://supabase_admin:<SUPABASE_ADMIN_PASSWORD>@10.0.0.2:5432/supabase
```

---

## Phase 2 Checklist

- [ ] PostgreSQL 15 installed
- [ ] Extensions installed: uuid-ossp, pgcrypto, pgjwt, pg_stat_statements, pg_graphql, pg_net, pgsodium
- [ ] PostgreSQL configured for 32GB RAM
- [ ] Remote access configured (10.0.0.0/24)
- [ ] All roles created with secure passwords
- [ ] supabase database created
- [ ] Schemas initialized: auth, storage, realtime, extensions, graphql, etc.
- [ ] Remote connection from app server works
- [ ] All passwords saved securely

---

## Next: Phase 3

Proceed to Phase 3: Docker & Supabase Services on App Server
