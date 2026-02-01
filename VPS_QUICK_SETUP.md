# Quick VPS Setup - Dev Mode (Minimum Configuration)

This is the **fastest way** to get your application running on a VPS in development mode.

## Minimum Requirements

- VPS with Ubuntu 20.04+ (1GB RAM minimum, 2GB recommended)
- Root or sudo access
- Port 3000 (or 3001) accessible

## Quick Setup (5 minutes)

### 1. Connect to VPS

```bash
ssh root@your-vps-ip
```

### 2. Install Node.js 18

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
```

### 3. Install Git

```bash
apt install -y git
```

### 4. Clone/Upload Your Code

**Option A: Git Clone**
```bash
cd /root
git clone <your-repo-url> nexus
cd nexus/nexus
```

**Option B: Upload via SCP (from your local machine)**
```bash
# From your local machine
scp -r nexus root@your-vps-ip:/root/nexus
```

### 5. Install Dependencies

```bash
cd /root/nexus/nexus
npm install
```

### 6. Create Minimal .env File

```bash
nano .env
```

**Minimum configuration (dev mode):**

```env
# Test mode (bypasses authentication)
TEST_MODE=true

# Use local storage (no MongoDB needed)
USE_LOCAL_STORAGE=true

# API URL
NEXT_PUBLIC_API_URL=http://your-vps-ip:3000/api

# Optional: MongoDB (if you want to use it)
# MONGODB_URI=mongodb://localhost:27017/dora_compliance

# Optional: JWT (not needed in TEST_MODE, but good to have)
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRE=30d
```

### 7. Run in Dev Mode

**Option A: Direct run (for testing)**
```bash
npm run dev
```

**Option B: Run in background with PM2 (recommended)**

```bash
# Install PM2 globally
npm install -g pm2

# Start in dev mode
pm2 start npm --name "nexus-dev" -- run dev

# View logs
pm2 logs nexus-dev

# Save PM2 config
pm2 save
```

### 8. Open Firewall Port (if needed)

```bash
# Allow port 3000
ufw allow 3000/tcp

# Or if UFW is not installed
iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

### 9. Access Your Application

Open in browser:
- `http://your-vps-ip:3000` (main app)
- `http://your-vps-ip:3001` (if using dev:privacy)

## One-Line Setup Script

Save this as `quick-setup.sh` and run it:

```bash
#!/bin/bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
apt install -y nodejs git && \
npm install -g pm2 && \
cd /root/nexus/nexus && \
npm install && \
echo "TEST_MODE=true" > .env && \
echo "USE_LOCAL_STORAGE=true" >> .env && \
echo "NEXT_PUBLIC_API_URL=http://$(hostname -I | awk '{print $1}'):3000/api" >> .env && \
pm2 start npm --name "nexus-dev" -- run dev && \
pm2 save && \
ufw allow 3000/tcp && \
echo "✅ Setup complete! Access at http://$(hostname -I | awk '{print $1}'):3000"
```

Make it executable and run:
```bash
chmod +x quick-setup.sh
./quick-setup.sh
```

## Running Multiple Instances

If you need both DORA and Privacy apps:

```bash
# Terminal 1: DORA app (port 3000)
cd /root/nexus/nexus
npm run dev:dora

# Terminal 2: Privacy app (port 3001)
cd /root/nexus/nexus
npm run dev:privacy
```

Or with PM2:

```bash
# DORA app
pm2 start npm --name "nexus-dora" -- run dev:dora

# Privacy app
pm2 start npm --name "nexus-privacy" -- run dev:privacy

# View all
pm2 list
pm2 logs
```

## Quick Commands

```bash
# View logs
pm2 logs nexus-dev

# Restart
pm2 restart nexus-dev

# Stop
pm2 stop nexus-dev

# Monitor
pm2 monit

# Check status
pm2 status
```

## Troubleshooting

### Port already in use
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Can't access from browser
```bash
# Check if app is running
pm2 status

# Check firewall
ufw status

# Test locally on VPS
curl http://localhost:3000/api/health
```

### Out of memory
```bash
# Check memory
free -h

# If low, add swap space
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## Next Steps (Optional)

Once running, you can optionally:

1. **Add Nginx reverse proxy** (for port 80/443)
2. **Add SSL certificate** (Let's Encrypt)
3. **Set up MongoDB** (instead of local storage)
4. **Configure production mode** (TEST_MODE=false)

See `DEPLOYMENT.md` for full production setup.

## Minimal Production Mode

If you want production mode but still minimal:

```bash
# Update .env
TEST_MODE=false
NODE_ENV=production
USE_LOCAL_STORAGE=true  # or set MONGODB_URI

# Build
npm run build

# Start with PM2
pm2 delete nexus-dev
pm2 start npm --name "nexus" -- start
pm2 save
```
