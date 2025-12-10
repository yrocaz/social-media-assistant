#!/bin/bash

# Setup script for Social Media Manager
# This script creates all required Cloudflare resources and syncs secrets

echo "🚀 Setting up Social Media Manager..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Create D1 Database
echo -e "${BLUE}📦 Step 1: Creating D1 database...${NC}"
echo "Running: npx wrangler d1 create smm-db"
echo -e "${YELLOW}Note: You may be prompted to update wrangler - answer as needed${NC}"
echo ""
DB_OUTPUT=$(npx wrangler d1 create smm-db 2>&1) || {
  echo -e "${YELLOW}⚠️  Database creation failed or already exists${NC}"
  DB_OUTPUT=""
}
echo "$DB_OUTPUT"

# Extract database_id from output
DATABASE_ID=$(echo "$DB_OUTPUT" | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2)

if [ -z "$DATABASE_ID" ]; then
  echo -e "${YELLOW}⚠️  Could not extract database ID. It may already exist.${NC}"
  echo "Please check wrangler.jsonc and update the database_id manually if needed."
else
  echo -e "${GREEN}✅ Database created with ID: $DATABASE_ID${NC}"
  echo ""
  echo -e "${YELLOW}📝 Update wrangler.jsonc with this database_id:${NC}"
  echo "   \"database_id\": \"$DATABASE_ID\""
fi

echo ""

# Step 2: Create R2 Bucket
echo -e "${BLUE}🪣 Step 2: Creating R2 bucket...${NC}"
echo "Running: npx wrangler r2 bucket create smm-assets"
npx wrangler r2 bucket create smm-assets 2>&1 || echo -e "${YELLOW}⚠️  Bucket may already exist${NC}"
echo -e "${GREEN}✅ R2 bucket ready${NC}"
echo ""

# Step 3: Run Database Migrations
echo -e "${BLUE}🗄️  Step 3: Running database migrations...${NC}"
echo "Running: bun run db:migrate:remote"
bun run db:migrate:remote
echo -e "${GREEN}✅ Migrations applied${NC}"
echo ""

# Step 4: Sync Secrets
echo -e "${BLUE}🔐 Step 4: Syncing secrets from .dev.vars...${NC}"

if [ ! -f ".dev.vars" ]; then
  echo -e "${YELLOW}⚠️  .dev.vars file not found. Skipping secret sync.${NC}"
  echo "Create a .dev.vars file with your secrets and run this script again."
else
  while IFS='=' read -r key value; do
    # Skip empty lines and comments
    if [[ -z "$key" ]] || [[ "$key" =~ ^#.* ]]; then
      continue
    fi

    # Trim whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)

    if [[ -n "$key" ]] && [[ -n "$value" ]]; then
      echo "Setting secret: $key"
      echo "$value" | npx wrangler secret put "$key"
    fi
  done < .dev.vars

  echo -e "${GREEN}✅ All secrets synced${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Update wrangler.jsonc with the database_id if not already done"
echo "2. Configure R2 custom domain in Cloudflare Dashboard (optional)"
echo "   - Go to R2 → smm-assets → Settings → Custom Domains"
echo "3. Update CDN_URL in wrangler.jsonc with your R2 domain"
echo "4. Run: bun run dev (to test locally)"
echo "5. Run: bun run deploy (to deploy to production)"
