#!/bin/bash

# Watch for changes and auto-deploy to VPS
# This watches your local files and syncs them to VPS automatically
# Usage: ./watch-and-deploy.sh

set -e

# Load configuration
if [ -f ".vps-config" ]; then
    source .vps-config
else
    echo "❌ .vps-config not found. Please create it first."
    exit 1
fi

# Check if fswatch is installed (macOS) or inotifywait (Linux)
if command -v fswatch &> /dev/null; then
    WATCHER="fswatch"
elif command -v inotifywait &> /dev/null; then
    WATCHER="inotifywait"
else
    echo "❌ File watcher not found."
    echo "   macOS: brew install fswatch"
    echo "   Linux: apt install inotify-tools"
    exit 1
fi

echo "👀 Watching for changes and auto-deploying to VPS..."
echo "   VPS: $VPS_USER@$VPS_HOST:$VPS_PATH"
echo "   Press Ctrl+C to stop"
echo ""

# Function to sync
sync_to_vps() {
    echo ""
    echo "🔄 [$(date +%H:%M:%S)] Changes detected, syncing..."
    
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.next' \
        --exclude '.git' \
        --exclude 'data/local-db' \
        --exclude '*.log' \
        --exclude '.env.local' \
        --exclude '.DS_Store' \
        ./ $VPS_USER@$VPS_HOST:$VPS_PATH/ > /dev/null 2>&1
    
    echo "✅ [$(date +%H:%M:%S)] Sync complete"
}

# Watch for changes
if [ "$WATCHER" == "fswatch" ]; then
    fswatch -o . | while read f; do
        sync_to_vps
    done
elif [ "$WATCHER" == "inotifywait" ]; then
    while inotifywait -r -e modify,create,delete .; do
        sync_to_vps
    done
fi
