#!/usr/bin/env bash
set -euo pipefail

# Nexus VPS bootstrap (run ON the VPS)
# Usage:
#   bash scripts/vps-bootstrap.sh
# Optional env:
#   APP_PORT=3000
#   APP_HOST=127.0.0.1
#   PM2_APP_NAME=nexus
#   USE_LOCAL_STORAGE=true
#   TEST_MODE=true
#   IGNORE_BUILD_ERRORS=true
#   NEXT_PUBLIC_API_URL=https://your-domain/api

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_PORT="${APP_PORT:-3000}"
APP_HOST="${APP_HOST:-127.0.0.1}"
PM2_APP_NAME="${PM2_APP_NAME:-nexus}"
USE_LOCAL_STORAGE="${USE_LOCAL_STORAGE:-true}"
TEST_MODE="${TEST_MODE:-true}"
IGNORE_BUILD_ERRORS="${IGNORE_BUILD_ERRORS:-true}"
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-}"

echo "🚀 Nexus VPS bootstrap"
echo "   Root: $ROOT_DIR"
echo "   App:  $PM2_APP_NAME"
echo "   Bind: $APP_HOST:$APP_PORT"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is required (v18+). Please install it first."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "❌ npm is required. Please install Node.js/npm first."
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "📦 Installing dependencies..."
  npm install
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "📦 Installing PM2..."
  npm install -g pm2
fi

cat > .env.vps <<EOF
USE_LOCAL_STORAGE=$USE_LOCAL_STORAGE
TEST_MODE=$TEST_MODE
NODE_ENV=production
IGNORE_BUILD_ERRORS=$IGNORE_BUILD_ERRORS
AZURE_STORAGE_CONNECTION_STRING=${AZURE_STORAGE_CONNECTION_STRING:-DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNoGV7b4w7SqM2fA5r4Q+7x6fQ0pniS3pM=;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;}
AZURE_STORAGE_CONTAINER_NAME=${AZURE_STORAGE_CONTAINER_NAME:-dora-evidence}
ENCRYPTION_KEY=${ENCRYPTION_KEY:-demo-encryption-key-change-in-prod}
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
EOF

echo "🧪 Seeding and preparing data..."
USE_LOCAL_STORAGE="$USE_LOCAL_STORAGE" TEST_MODE="$TEST_MODE" npx tsx scripts/seed-demo-data.ts
USE_LOCAL_STORAGE="$USE_LOCAL_STORAGE" npx tsx scripts/fix-dora-pillar-mappings.ts
USE_LOCAL_STORAGE="$USE_LOCAL_STORAGE" npx tsx scripts/precompute-mappings.ts

echo "🏗️ Building app..."
set +e
set -a
source .env.vps
set +a
npm run build
BUILD_EXIT=$?
set -e

if [[ $BUILD_EXIT -ne 0 ]]; then
  echo "⚠️ Build failed. Starting HTTPS dev mode fallback on VPS."
  pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
  pm2 start npm --name "$PM2_APP_NAME" -- run dev:https -- -H 0.0.0.0
  pm2 save
  echo "✅ Started fallback server. Put Nginx in front for public HTTPS."
  exit 0
fi

echo "▶️ Starting app with PM2..."
pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
pm2 start npm --name "$PM2_APP_NAME" -- run start -- -H "$APP_HOST" -p "$APP_PORT"
pm2 save

echo ""
echo "✅ VPS bootstrap complete."
echo "📌 Next step: configure Nginx + Let's Encrypt on your domain."
echo "📌 PM2 status: pm2 list"
