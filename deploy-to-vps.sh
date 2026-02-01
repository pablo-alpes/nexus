# Create deployment script for VPS
cat > /tmp/vps-deploy.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e
cd DEPLOY_PATH

echo "📂 Current directory: $(pwd)"
echo "📁 Files in directory:"
ls -la | head -10

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

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'ENVFILE'
TEST_MODE=true
USE_LOCAL_STORAGE=true
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NODE_ENV=development
ENVFILE
fi

# Stop any existing process
pm2 delete nexus-dev 2>/dev/null || pm2 delete nexus 2>/dev/null || true

# Start the application
echo "🚀 Starting application with PM2..."
pm2 start npm --name "nexus-dev" -- run dev
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
pm2 logs nexus-dev --lines 10 --nostream || true

echo ""
echo "✅ Deployment complete on VPS"
DEPLOY_SCRIPT