#!/bin/bash

# Setup Tailscale on VPS
# Run this script on your VPS to install and configure Tailscale

set -e

echo "🔧 Setting up Tailscale on VPS..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (sudo)"
    exit 1
fi

# Install Tailscale
if ! command -v tailscale &> /dev/null; then
    echo "📦 Installing Tailscale..."
    curl -fsSL https://tailscale.com/install.sh | sh
else
    echo "✅ Tailscale already installed"
fi

# Start Tailscale
echo "🚀 Starting Tailscale..."
tailscale up

# Get Tailscale IP
TAILSCALE_IP=$(tailscale ip -4)

echo ""
echo "✅ Tailscale setup complete!"
echo ""
echo "📝 Your VPS Tailscale IP: $TAILSCALE_IP"
echo ""
echo "📋 Next steps:"
echo "1. Note this IP: $TAILSCALE_IP"
echo "2. Update .vps-config on your local machine:"
echo "   VPS_HOST=\"$TAILSCALE_IP\""
echo "3. Test connection: ssh root@$TAILSCALE_IP"
echo ""
echo "🔍 To check Tailscale status:"
echo "   tailscale status"
echo "   tailscale ip -4"
