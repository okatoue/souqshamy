#!/bin/bash
# diagnose-storage.sh
# Run this script on the Supabase app server (souqjari-app) to diagnose storage issues
# Usage: bash diagnose-storage.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "SouqJari Storage Diagnostic Script"
echo "========================================"
echo ""

# Load secrets
SECRETS_FILE="/root/supabase-secrets/secrets.env"
if [ -f "$SECRETS_FILE" ]; then
    echo -e "${GREEN}✓ Found secrets file${NC}"
    source "$SECRETS_FILE"
else
    echo -e "${RED}✗ Secrets file not found at $SECRETS_FILE${NC}"
    echo "  Please ensure the file exists or set SERVICE_ROLE_KEY manually"
    exit 1
fi

# Check required variables
if [ -z "$SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}✗ SERVICE_ROLE_KEY not set${NC}"
    exit 1
fi

SUPABASE_DIR="/opt/supabase/supabase/docker"
API_URL="https://api.souqjari.com"

echo ""
echo "========================================"
echo "1. Checking Storage Service Health"
echo "========================================"
cd "$SUPABASE_DIR"

# Check if storage container is running
STORAGE_STATUS=$(docker compose ps storage --format "{{.Status}}" 2>/dev/null || echo "not found")
if [[ "$STORAGE_STATUS" == *"Up"* ]]; then
    echo -e "${GREEN}✓ Storage container is running${NC}"
else
    echo -e "${RED}✗ Storage container status: $STORAGE_STATUS${NC}"
    echo "  Attempting to start storage service..."
    docker compose up -d storage
fi

echo ""
echo "========================================"
echo "2. Recent Storage Logs (last 50 lines)"
echo "========================================"
docker compose logs storage --tail=50 2>&1 | grep -E "(error|Error|ERROR|warn|Warn|WARN|fail|Fail|FAIL|S3|R2|bucket)" || echo "No error keywords found in recent logs"

echo ""
echo "========================================"
echo "3. Checking Storage Environment"
echo "========================================"
echo "Checking storage container environment variables..."
docker exec supabase-storage env 2>/dev/null | grep -E "^(STORAGE_|GLOBAL_)" | while read line; do
    KEY=$(echo "$line" | cut -d= -f1)
    VALUE=$(echo "$line" | cut -d= -f2-)
    if [ -z "$VALUE" ] || [ "$VALUE" = "placeholder" ] || [ "$VALUE" = "your_" ]; then
        echo -e "${RED}✗ $KEY is empty or placeholder${NC}"
    else
        # Mask sensitive values
        if [[ "$KEY" == *"KEY"* ]] || [[ "$KEY" == *"SECRET"* ]]; then
            echo -e "${GREEN}✓ $KEY is set${NC} (value hidden)"
        else
            echo -e "${GREEN}✓ $KEY = $VALUE${NC}"
        fi
    fi
done

echo ""
echo "========================================"
echo "4. Checking Storage Buckets via API"
echo "========================================"
BUCKETS_RESPONSE=$(curl -s "$API_URL/storage/v1/bucket" \
    -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" 2>&1)

if echo "$BUCKETS_RESPONSE" | grep -q "listing-images"; then
    echo -e "${GREEN}✓ 'listing-images' bucket exists${NC}"
    echo "$BUCKETS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$BUCKETS_RESPONSE"
else
    echo -e "${RED}✗ 'listing-images' bucket NOT found${NC}"
    echo "Current buckets:"
    echo "$BUCKETS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$BUCKETS_RESPONSE"

    echo ""
    echo -e "${YELLOW}Creating 'listing-images' bucket...${NC}"
    CREATE_RESPONSE=$(curl -s -X POST "$API_URL/storage/v1/bucket" \
        -H "apikey: $SERVICE_ROLE_KEY" \
        -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "id": "listing-images",
            "name": "listing-images",
            "public": true,
            "file_size_limit": 10485760,
            "allowed_mime_types": ["image/jpeg", "image/png", "image/webp", "image/gif"]
        }' 2>&1)

    if echo "$CREATE_RESPONSE" | grep -qE "(\"name\":\"listing-images\"|already exists)"; then
        echo -e "${GREEN}✓ Bucket created successfully${NC}"
    else
        echo -e "${RED}✗ Failed to create bucket:${NC}"
        echo "$CREATE_RESPONSE"
    fi
fi

echo ""
echo "========================================"
echo "5. Checking RLS Policies on storage.objects"
echo "========================================"
# Connect to database and check policies
DB_HOST="${DB_HOST:-10.0.0.2}"
echo "Connecting to database at $DB_HOST..."

POLICIES=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -U postgres -d supabase -t -c "
SELECT policyname, cmd, roles::text
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;" 2>&1)

if echo "$POLICIES" | grep -qi "listing_images_insert"; then
    echo -e "${GREEN}✓ Insert policy for listing-images exists${NC}"
else
    echo -e "${RED}✗ Insert policy for listing-images NOT found${NC}"
    echo "Current policies:"
    echo "$POLICIES"

    echo ""
    echo -e "${YELLOW}Creating RLS policies...${NC}"
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -U postgres -d supabase -c "
    -- Allow authenticated users to insert into listing-images bucket
    CREATE POLICY IF NOT EXISTS listing_images_insert_auth
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'listing-images');

    -- Allow authenticated users to select from listing-images bucket
    CREATE POLICY IF NOT EXISTS listing_images_select_auth
        ON storage.objects FOR SELECT TO authenticated
        USING (bucket_id = 'listing-images');

    -- Allow public read access for listing-images (since bucket is public)
    CREATE POLICY IF NOT EXISTS listing_images_select_public
        ON storage.objects FOR SELECT TO anon
        USING (bucket_id = 'listing-images');
    " 2>&1 && echo -e "${GREEN}✓ Policies created${NC}" || echo -e "${RED}✗ Failed to create policies${NC}"
fi

echo ""
echo "$POLICIES"

echo ""
echo "========================================"
echo "6. Testing R2 Connectivity"
echo "========================================"
R2_TEST=$(docker exec supabase-storage sh -c 'curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 $STORAGE_S3_ENDPOINT 2>/dev/null' 2>&1)
if [ "$R2_TEST" = "403" ] || [ "$R2_TEST" = "200" ]; then
    echo -e "${GREEN}✓ R2 endpoint is reachable (HTTP $R2_TEST)${NC}"
else
    echo -e "${RED}✗ R2 endpoint returned: $R2_TEST${NC}"
    echo "  Check STORAGE_S3_ENDPOINT and network connectivity"
fi

echo ""
echo "========================================"
echo "7. Test Upload (optional)"
echo "========================================"
echo "To test upload manually, run:"
echo ""
echo 'echo "test" | base64 > /tmp/test.txt'
echo "curl -X POST '$API_URL/storage/v1/object/listing-images/test-\$(date +%s).txt' \\"
echo "  -H 'apikey: \$SERVICE_ROLE_KEY' \\"
echo "  -H 'Authorization: Bearer \$SERVICE_ROLE_KEY' \\"
echo "  -H 'Content-Type: text/plain' \\"
echo "  --data-binary '@/tmp/test.txt'"

echo ""
echo "========================================"
echo "Diagnostic Summary"
echo "========================================"
echo "If issues persist after running this script:"
echo "1. Check full storage logs: docker compose logs storage"
echo "2. Verify R2 credentials in .env file"
echo "3. Check R2 bucket CORS configuration for exp://* origin"
echo "4. Restart storage: docker compose restart storage"
echo ""
