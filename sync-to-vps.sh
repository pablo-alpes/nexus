#!/bin/bash

# Quick Sync to VPS (for dev mode)
# This syncs your local changes directly to VPS without git
# Usage: ./sync-to-vps.sh

set -e

# Load configuration
if [ -f ".vps-config" ]; then
    source .vps-config
else
    echo "❌ .vps-config not found. Please create it first."
    echo "   Copy .vps-config.example to .vps-config and update it."
    exit 1
fi

# Validate
if [ "$VPS_HOST" == "your-vps-ip" ]; then
    echo "❌ Please update .vps-config with your VPS details"
    exit 1
fi

echo "🔄 Syncing code to VPS..."

# Exclude files that shouldn't be synced
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude 'data/local-db' \
    --exclude '*.log' \
    --exclude '.env.local' \
    --exclude '.DS_Store' \
    ./ $VPS_USER@$VPS_HOST:$VPS_PATH/

echo ""
echo "📦 Installing dependencies on VPS..."
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && npm install"

echo ""
echo "🔄 Restarting application on VPS..."
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && pm2 restart nexus-dev 2>/dev/null || pm2 restart nexus 2>/dev/null || echo 'PM2 not running, start manually with: pm2 start npm --name nexus-dev -- run dev'"

echo ""
echo "✅ Sync complete!"
echo "🌐 Check your app at: http://$VPS_HOST:3000"
