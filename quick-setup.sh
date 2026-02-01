#!/bin/bash

# Quick VPS Setup Script for Dev Mode
# Run this on your VPS: bash quick-setup.sh

set -e

echo "🚀 Starting quick setup for Nexus Dev Mode..."

# Get VPS IP
VPS_IP=$(hostname -I | awk '{print $1}')

# Update system
echo "📦 Updating system packages..."
apt update -qq

# Install Node.js 18
echo "📦 Installing Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
    apt install -y nodejs > /dev/null 2>&1
fi

# Install Git
echo "📦 Installing Git..."
apt install -y git > /dev/null 2>&1

# Install PM2
echo "📦 Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2 > /dev/null 2>&1
fi

# Check if code is already there
if [ ! -d "/root/nexus/nexus" ]; then
    echo "⚠️  Code not found at /root/nexus/nexus"
    echo "Please upload your code first or clone the repository:"
    echo "  git clone <your-repo-url> /root/nexus"
    echo "Then run this script again."
    exit 1
fi

# Navigate to project
cd /root/nexus/nexus

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Test mode (bypasses authentication)
TEST_MODE=true

# Use local storage (no MongoDB needed)
USE_LOCAL_STORAGE=true

# API URL
NEXT_PUBLIC_API_URL=http://${VPS_IP}:3000/api

# JWT (not needed in TEST_MODE, but good to have)
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRE=30d

# Node environment
NODE_ENV=development
EOF
    echo "✅ .env file created"
else
    echo "ℹ️  .env file already exists, skipping..."
fi

# Stop existing PM2 process if running
if pm2 list | grep -q "nexus-dev"; then
    echo "🛑 Stopping existing nexus-dev process..."
    pm2 delete nexus-dev > /dev/null 2>&1 || true
fi

# Start with PM2
echo "🚀 Starting application with PM2..."
pm2 start npm --name "nexus-dev" -- run dev > /dev/null 2>&1

# Save PM2 config
pm2 save > /dev/null 2>&1

# Setup firewall
echo "🔥 Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 3000/tcp > /dev/null 2>&1 || true
    ufw allow 3001/tcp > /dev/null 2>&1 || true
fi

# Wait a moment for server to start
sleep 3

# Check if server is running
if pm2 list | grep -q "nexus-dev.*online"; then
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "📊 Application Status:"
    pm2 list | grep nexus-dev
    echo ""
    echo "🌐 Access your application at:"
    echo "   http://${VPS_IP}:3000"
    echo ""
    echo "📝 Useful commands:"
    echo "   pm2 logs nexus-dev    # View logs"
    echo "   pm2 restart nexus-dev # Restart app"
    echo "   pm2 stop nexus-dev    # Stop app"
    echo "   pm2 monit             # Monitor resources"
else
    echo "⚠️  Application may not have started correctly"
    echo "Check logs with: pm2 logs nexus-dev"
fi
