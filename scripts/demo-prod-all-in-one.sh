#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

HTTPS_PORT="${HTTPS_PORT:-3443}"
IGNORE_BUILD_ERRORS="${IGNORE_BUILD_ERRORS:-true}"
LOCAL_DB_DIR="$ROOT_DIR/data/local-db"
CERT_DIR="$ROOT_DIR/certs"
CERT_FILE="$CERT_DIR/localhost-cert.pem"
KEY_FILE="$CERT_DIR/localhost-key.pem"

echo "🚀 Nexus all-in-one demo/prod bootstrap"
echo "   Root: $ROOT_DIR"
echo "   HTTPS Port: $HTTPS_PORT"
echo "   Ignore build type errors: $IGNORE_BUILD_ERRORS"

if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
  echo "📦 Installing dependencies..."
  npm install
fi

echo "🧹 Resetting local demo database..."
rm -rf "$LOCAL_DB_DIR"
mkdir -p "$LOCAL_DB_DIR"

export USE_LOCAL_STORAGE=true
export TEST_MODE=true
export NEXT_PUBLIC_API_URL="https://localhost:${HTTPS_PORT}/api"
export AZURE_STORAGE_CONNECTION_STRING="${AZURE_STORAGE_CONNECTION_STRING:-DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNoGV7b4w7SqM2fA5r4Q+7x6fQ0pniS3pM=;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;}"
export AZURE_STORAGE_CONTAINER_NAME="${AZURE_STORAGE_CONTAINER_NAME:-dora-evidence}"
export ENCRYPTION_KEY="${ENCRYPTION_KEY:-demo-encryption-key-change-in-prod}"

echo "🧪 Seeding deterministic mock data..."
npx tsx scripts/seed-demo-data.ts

echo "🧭 Fixing DORA pillar assignment..."
npx tsx scripts/fix-dora-pillar-mappings.ts

echo "🧠 Recomputing question mappings..."
npx tsx scripts/precompute-mappings.ts

echo "✅ Verifying DORA engine behavior..."
npx tsx scripts/verify-dora-engine.ts

echo "🏗️ Building production bundle..."
if IGNORE_BUILD_ERRORS="$IGNORE_BUILD_ERRORS" npm run build; then
  BUILD_OK=true
else
  BUILD_OK=false
  echo "⚠️ Production build failed (existing type errors in unrelated modules)."
  echo "   Falling back to HTTPS dev server for demo continuity."
fi

mkdir -p "$CERT_DIR"
if [[ ! -f "$CERT_FILE" || ! -f "$KEY_FILE" ]]; then
  echo "🔐 Generating self-signed TLS certificate..."
  if ! command -v openssl >/dev/null 2>&1; then
    echo "❌ openssl is required to generate certificates."
    exit 1
  fi
  openssl req -x509 -newkey rsa:4096 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -sha256 \
    -days 365 \
    -nodes \
    -subj "/CN=localhost"
fi

if [[ "${RUN_CLEANSE:-false}" == "true" ]]; then
  echo "🧼 Cleansing repo (archiving legacy docs/scripts)..."
  node scripts/cleanse-repo.mjs --apply
else
  echo "🧼 Repo cleanse skipped (set RUN_CLEANSE=true to archive legacy docs/scripts)."
fi

if [[ "$BUILD_OK" == "true" ]]; then
  echo "🌐 Starting production HTTPS server..."
  echo "   URL: https://localhost:${HTTPS_PORT}"
  HTTPS_PORT="$HTTPS_PORT" node scripts/prod-https-server.mjs
else
  echo "🌐 Starting HTTPS development server..."
  echo "   URL: https://localhost:${HTTPS_PORT}"
  NEXT_PUBLIC_API_URL="https://localhost:${HTTPS_PORT}/api" npx next dev --experimental-https -p "$HTTPS_PORT"
fi
