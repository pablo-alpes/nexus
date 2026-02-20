#!/bin/bash

# Start the Next.js server in the background using PM2
# Usage: ./scripts/start-server-background.sh [dev|privacy|dora]

set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

# Determine which app to start
MODE=${1:-privacy}

case "$MODE" in
    privacy|privacy-chile)
        APP_NAME="nexus-privacy"
        NPM_SCRIPT="dev:privacy"
        PORT=3001
        ;;
    dora)
        APP_NAME="nexus-dora"
        NPM_SCRIPT="dev:dora"
        PORT=3000
        ;;
    dev|*)
        APP_NAME="nexus-dev"
        NPM_SCRIPT="dev"
        PORT=3000
        ;;
esac

echo "🚀 Starting server in background..."
echo "   Mode: $MODE"
echo "   App Name: $APP_NAME"
echo "   Script: $NPM_SCRIPT"
echo "   Port: $PORT"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Stop any existing process with the same name
echo "🛑 Stopping any existing $APP_NAME process..."
pm2 delete $APP_NAME 2>/dev/null || true

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << ENVFILE
TEST_MODE=true
USE_LOCAL_STORAGE=true
NODE_ENV=development
ENVFILE
fi

# Start the application with PM2
echo "🚀 Starting $APP_NAME with PM2..."
pm2 start npm --name "$APP_NAME" -- run $NPM_SCRIPT -- -H 0.0.0.0 -p $PORT

# Save PM2 configuration
pm2 save

# Wait a moment for app to start
sleep 3

# Show PM2 status
echo ""
echo "📊 PM2 Status:"
pm2 list

# Show recent logs
echo ""
echo "📋 Recent logs (last 20 lines):"
pm2 logs $APP_NAME --lines 20 --nostream || true

echo ""
echo "✅ Server started in background!"
echo ""
echo "📝 Useful commands:"
echo "   View logs:        pm2 logs $APP_NAME"
echo "   View status:      pm2 status"
echo "   Restart:          pm2 restart $APP_NAME"
echo "   Stop:             pm2 stop $APP_NAME"
echo "   Monitor:          pm2 monit"
echo ""
echo "🌐 App should be accessible at: http://0.0.0.0:$PORT"
echo "   (Replace 0.0.0.0 with your VPS IP or localhost if running locally)"
