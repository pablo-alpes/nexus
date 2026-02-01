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
if [ "$VPS_HOST" == "your-vps-ip" ] || [ "$VPS_HOST" == "your-vps-tailscale-ip" ]; then
    echo "❌ Please configure VPS settings first!"
    echo ""
    echo "Create a .vps-config file with:"
    echo "  VPS_USER=root"
    echo "  VPS_HOST=your-vps-ip"
    echo "  VPS_PATH=/root/nexus/nexus"
    echo "  BRANCH=privacy-chile"
    echo "  GITHUB_TOKEN=your-github-token"
    exit 1
fi

# Validate GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GITHUB_TOKEN not set in .vps-config!"
    echo "   Create a token at: https://github.com/settings/tokens"
    echo "   Add to .vps-config: GITHUB_TOKEN=\"your-token\""
    exit 1
fi

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not a git repository. Please run from the nexus directory."
    exit 1
fi

# Get current branch (use BRANCH from config if set, otherwise current branch)
CURRENT_BRANCH=${BRANCH:-$(git branch --show-current)}
echo "📦 Using branch: $CURRENT_BRANCH"

# Get git remote URL
GIT_REMOTE=$(git remote get-url origin)
echo "🔗 Git remote: $GIT_REMOTE"

# Extract repo path from remote URL
if [[ $GIT_REMOTE == git@* ]]; then
    # Convert git@github.com:user/repo.git to user/repo
    REPO_PATH=$(echo $GIT_REMOTE | sed 's/git@github.com://' | sed 's/\.git$//')
elif [[ $GIT_REMOTE == https://* ]]; then
    # Extract from https://github.com/user/repo.git
    REPO_PATH=$(echo $GIT_REMOTE | sed 's|https://github.com/||' | sed 's|https://.*@github.com/||' | sed 's|\.git$||')
else
    echo "❌ Unknown git remote format: $GIT_REMOTE"
    exit 1
fi

echo "📦 Repository: $REPO_PATH"

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

echo "📂 Current directory: $(pwd)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "⚠️  npm not found. Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    if ! command -v npm &> /dev/null; then
        echo "❌ Failed to install npm. Please install Node.js manually on VPS."
        exit 1
    fi
    echo "✅ Node.js and npm installed"
fi

# Set up git credential helper with token
git config --global credential.helper store
echo "https://GITHUB_TOKEN:x-oauth-basic@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials

# Update remote to use HTTPS
git remote set-url origin https://github.com/REPO_PATH.git

# Fetch and pull
echo "📥 Fetching latest code..."
git fetch origin
git checkout DEPLOY_BRANCH
git pull origin DEPLOY_BRANCH

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if data needs to be loaded (for privacy-chile branch)
if [ "$DEPLOY_BRANCH" == "privacy-chile" ]; then
    echo "🔍 Checking if database needs initial data..."
    
    # Check if using local storage and if it's empty
    if [ -d "data/local-db" ]; then
        # Check if LegalRequirement.json exists and has content
        if [ ! -f "data/local-db/LegalRequirement.json" ] || [ ! -s "data/local-db/LegalRequirement.json" ] || [ "$(wc -l < data/local-db/LegalRequirement.json 2>/dev/null || echo 0)" -lt 5 ]; then
            echo "📦 Database appears empty, running complete Chilean Privacy setup..."
            echo "   This will set up:"
            echo "     - Requirements (from Chilean Privacy Law)"
            echo "     - Controls (from ISO 27701 and ISO 27002)"
            echo "     - Requirement→Control mappings"
            echo "     - Question→Requirement mappings (NLP-based)"
            echo "   This may take a few minutes..."
            npm run setup:chilean-privacy-complete || {
                echo "⚠️  Complete setup failed, trying basic data load..."
                npm run load:chilean-privacy || {
                    echo "⚠️  Data loading failed, but continuing deployment..."
                    echo "   You can manually run: npm run setup:chilean-privacy-complete"
                }
            }
            echo "✅ Chilean Privacy setup complete"
        else
            echo "✅ Database already has data, skipping data load"
            echo "   To rerun complete setup, use: npm run setup:chilean-privacy-complete"
        fi
    else
        # If using MongoDB, check if requirements exist via API or just try to load
        echo "📦 Checking MongoDB for existing data..."
        # For MongoDB, we'll attempt complete setup - it will skip if data exists
        npm run setup:chilean-privacy-complete || {
            echo "⚠️  Complete setup failed, trying basic data load..."
            npm run load:chilean-privacy || {
                echo "⚠️  Data loading failed or data already exists, continuing..."
            }
        }
    fi
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Create or update .env file
echo "📝 Updating .env file..."
# Don't set NEXT_PUBLIC_API_URL - let it use relative URLs (window.location.origin)
# This way it works whether accessed via public IP, Tailscale IP, or localhost
cat > .env << ENVFILE
TEST_MODE=true
USE_LOCAL_STORAGE=true
NODE_ENV=development
ENVFILE

# Determine which app to start based on branch
if [ "$DEPLOY_BRANCH" == "privacy-chile" ]; then
    APP_NAME="nexus-privacy"
    NPM_SCRIPT="dev:privacy"
    PORT=3001
else
    APP_NAME="nexus-dev"
    NPM_SCRIPT="dev"
    PORT=3000
fi

# Stop any existing process
pm2 delete $APP_NAME 2>/dev/null || pm2 delete nexus-dev 2>/dev/null || pm2 delete nexus 2>/dev/null || true

# Start the application with hostname binding
echo "🚀 Starting application with PM2..."
echo "   App: $APP_NAME"
echo "   Script: $NPM_SCRIPT"
echo "   Port: $PORT"
pm2 start npm --name "$APP_NAME" -- run $NPM_SCRIPT -- -H 0.0.0.0 -p $PORT
pm2 save

# Wait a moment for app to start
sleep 3

# Show PM2 status
echo ""
echo "📊 PM2 Status:"
pm2 list

# Show recent logs
echo ""
echo "📋 Recent logs:"
pm2 logs $APP_NAME --lines 15 --nostream || true

echo ""
echo "✅ Deployment complete on VPS"
echo "🌐 App should be accessible at: http://${TAILSCALE_IP}:${PORT}"
DEPLOY_SCRIPT

# Replace placeholders
sed -i.bak "s|DEPLOY_PATH|$VPS_PATH|g" /tmp/vps-deploy.sh
sed -i.bak "s|DEPLOY_BRANCH|$CURRENT_BRANCH|g" /tmp/vps-deploy.sh
sed -i.bak "s|GITHUB_TOKEN|$GITHUB_TOKEN|g" /tmp/vps-deploy.sh
sed -i.bak "s|REPO_PATH|$REPO_PATH|g" /tmp/vps-deploy.sh
rm /tmp/vps-deploy.sh.bak 2>/dev/null || true

# Copy and execute on VPS
echo "📤 Copying deployment script to VPS..."
scp /tmp/vps-deploy.sh $VPS_USER@$VPS_HOST:/tmp/vps-deploy.sh
echo "▶️  Executing deployment on VPS..."
ssh $VPS_USER@$VPS_HOST "chmod +x /tmp/vps-deploy.sh && bash /tmp/vps-deploy.sh"

# Cleanup
rm /tmp/vps-deploy.sh

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your app should be running at: http://$VPS_HOST:3001"
echo ""
echo "📝 Useful commands:"
echo "   ssh $VPS_USER@$VPS_HOST 'pm2 list'                    # Check status"
echo "   ssh $VPS_USER@$VPS_HOST 'pm2 logs nexus-privacy'      # View logs"
echo "   ssh $VPS_USER@$VPS_HOST 'pm2 restart nexus-privacy' # Restart app"