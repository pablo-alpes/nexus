#!/bin/bash

# Deploy to VPS Script
# Run this from your local machine to deploy to VPS
# Usage: ./deploy-to-vps.sh

set -e

# Configuration - UPDATE THESE VALUES
VPS_USER="root"
VPS_HOST="your-vps-ip"
VPS_PATH="/root/nexus/nexus"
BRANCH="privacy-chile"  # or your deployment branch

echo "🚀 Deploying to VPS..."

# Check if .vps-config exists
if [ -f ".vps-config" ]; then
    echo "📝 Loading VPS configuration..."
    source .vps-config
fi

# Validate configuration
if [ "$VPS_HOST" == "your-vps-ip" ]; then
    echo "❌ Please configure VPS settings first!"
    echo ""
    echo "Create a .vps-config file with:"
    echo "  VPS_USER=root"
    echo "  VPS_HOST=your-vps-ip"
    echo "  VPS_PATH=/root/nexus/nexus"
    echo "  BRANCH=privacy-chile"
    exit 1
fi

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not a git repository. Please run from the nexus directory."
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📦 Current branch: $CURRENT_BRANCH"

# Ask if user wants to commit changes
if [ -n "$(git status --porcelain)" ]; then
    echo ""
    echo "⚠️  You have uncommitted changes:"
    git status --short
    echo ""
    read -p "Do you want to commit and push changes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Commit message: " COMMIT_MSG
        git add .
        git commit -m "$COMMIT_MSG"
        git push origin $CURRENT_BRANCH
        echo "✅ Changes committed and pushed"
    else
        echo "⚠️  Deploying without committing changes..."
    fi
fi

# Deploy to VPS
echo ""
echo "📤 Deploying to VPS ($VPS_USER@$VPS_HOST)..."
echo "   Path: $VPS_PATH"
echo "   Branch: $CURRENT_BRANCH"
echo ""

# Create deployment script for VPS
cat > /tmp/vps-deploy.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e
cd DEPLOY_PATH
git fetch origin
git checkout DEPLOY_BRANCH
git pull origin DEPLOY_BRANCH
npm install
if [ -f "package.json" ]; then
    # If PM2 is running, restart it
    if command -v pm2 &> /dev/null && pm2 list | grep -q "nexus"; then
        echo "🔄 Restarting PM2 process..."
        pm2 restart nexus-dev 2>/dev/null || pm2 restart nexus 2>/dev/null || true
    fi
fi
echo "✅ Deployment complete on VPS"
DEPLOY_SCRIPT

# Replace placeholders
sed -i.bak "s|DEPLOY_PATH|$VPS_PATH|g" /tmp/vps-deploy.sh
sed -i.bak "s|DEPLOY_BRANCH|$CURRENT_BRANCH|g" /tmp/vps-deploy.sh
rm /tmp/vps-deploy.sh.bak 2>/dev/null || true

# Copy and execute on VPS
scp /tmp/vps-deploy.sh $VPS_USER@$VPS_HOST:/tmp/vps-deploy.sh
ssh $VPS_USER@$VPS_HOST "chmod +x /tmp/vps-deploy.sh && bash /tmp/vps-deploy.sh"

# Cleanup
rm /tmp/vps-deploy.sh

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your app should be running at: http://$VPS_HOST:3000"
echo ""
echo "📝 To check logs on VPS:"
echo "   ssh $VPS_USER@$VPS_HOST 'pm2 logs nexus-dev'"
