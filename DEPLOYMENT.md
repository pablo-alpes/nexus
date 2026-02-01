# Quick VPS Deployment Guide

This guide will help you deploy your Nexus application to a VPS quickly.

## Prerequisites

- VPS with Ubuntu 20.04+ (or similar Linux distribution)
- Root or sudo access
- Domain name (optional, for SSL)
- MongoDB Atlas account (recommended) or local MongoDB

## Quick Deployment Steps

### 1. Connect to Your VPS

```bash
ssh root@your-vps-ip
```

### 2. Install Node.js 18+

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 3. Install PM2 (Process Manager)

```bash
npm install -g pm2
```

### 4. Install Nginx (Reverse Proxy)

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 5. Clone Your Repository

```bash
# Install Git if not already installed
apt install -y git

# Clone your repository
cd /var/www
git clone <your-repository-url> nexus
cd nexus/nexus
```

Or upload your code using SCP:

```bash
# From your local machine
scp -r nexus root@your-vps-ip:/var/www/nexus
```

### 6. Install Dependencies

```bash
cd /var/www/nexus/nexus
npm install
```

### 7. Set Up Environment Variables

```bash
# Create .env file
nano .env
```

Add the following (adjust values as needed):

```env
# MongoDB (use MongoDB Atlas for production)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dora_compliance

# JWT Authentication (generate a secure secret)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=30d

# Azure Blob Storage (optional)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=youraccount;AccountKey=yourkey;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=dora-evidence

# Encryption Key (32 characters)
ENCRYPTION_KEY=your-32-character-encryption-key-here

# API URL (update with your domain)
NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# Production mode
NODE_ENV=production
TEST_MODE=false
```

**Generate secure keys:**

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Encryption Key
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 8. Build the Application

```bash
npm run build
```

### 9. Start with PM2

```bash
# Start the application
pm2 start npm --name "nexus" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown
```

### 10. Configure Nginx

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/nexus
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # If you don't have a domain, use your VPS IP
    # server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
# Create symlink
ln -s /etc/nginx/sites-available/nexus /etc/nginx/sites-enabled/

# Remove default site (optional)
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

### 11. Set Up SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot will automatically update your Nginx config
# Certificates auto-renew via cron
```

### 12. Configure Firewall

```bash
# Install UFW if not installed
apt install -y ufw

# Allow SSH, HTTP, and HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
```

### 13. Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check PM2 logs
pm2 logs nexus

# Check Nginx status
systemctl status nginx

# Test your application
curl http://localhost:3000/api/health
```

## MongoDB Setup Options

### Option 1: MongoDB Atlas (Recommended for Production)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Create database user
4. Whitelist your VPS IP address
5. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/dora_compliance`
6. Add to `.env` file

### Option 2: Local MongoDB on VPS

```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt update
apt install -y mongodb-org

# Start MongoDB
systemctl start mongod
systemctl enable mongod

# Update .env
MONGODB_URI=mongodb://localhost:27017/dora_compliance
```

## Useful PM2 Commands

```bash
# View logs
pm2 logs nexus

# Restart application
pm2 restart nexus

# Stop application
pm2 stop nexus

# Monitor resources
pm2 monit

# View detailed info
pm2 show nexus
```

## Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs nexus --lines 100

# Check if port 3000 is in use
netstat -tulpn | grep 3000

# Restart PM2
pm2 restart nexus
```

### Nginx 502 Bad Gateway

```bash
# Check if Next.js is running
pm2 status

# Check Next.js logs
pm2 logs nexus

# Verify port 3000 is accessible
curl http://localhost:3000
```

### MongoDB Connection Issues

```bash
# Test MongoDB connection
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(e => console.error(e))"

# Check MongoDB status (if local)
systemctl status mongod
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

## Updating the Application

```bash
# Navigate to app directory
cd /var/www/nexus/nexus

# Pull latest changes
git pull

# Install new dependencies (if any)
npm install

# Rebuild
npm run build

# Restart application
pm2 restart nexus
```

## Performance Optimization

### Increase Node.js Memory (if needed)

```bash
# Edit PM2 ecosystem file
pm2 ecosystem

# Or update PM2 start command
pm2 delete nexus
pm2 start npm --name "nexus" -- start --max-memory-restart 1G
pm2 save
```

### Enable Gzip Compression in Nginx

Add to your Nginx config:

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
```

## Security Checklist

- [ ] Changed default JWT_SECRET
- [ ] Changed default ENCRYPTION_KEY
- [ ] Set TEST_MODE=false
- [ ] Set NODE_ENV=production
- [ ] Configured firewall (UFW)
- [ ] Set up SSL certificate
- [ ] MongoDB credentials are secure
- [ ] Azure Storage credentials are secure
- [ ] .env file has proper permissions (chmod 600 .env)

## Quick Deployment Script

Save this as `deploy.sh` and run it:

```bash
#!/bin/bash

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
apt install -y nginx

# Install Git
apt install -y git

# Install UFW
apt install -y ufw

# Configure firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "✅ Basic setup complete!"
echo "📝 Next steps:"
echo "1. Clone your repository"
echo "2. Install dependencies: npm install"
echo "3. Create .env file with your configuration"
echo "4. Build: npm run build"
echo "5. Start with PM2: pm2 start npm --name 'nexus' -- start"
echo "6. Configure Nginx"
echo "7. Set up SSL with Certbot"
```

Make it executable:

```bash
chmod +x deploy.sh
./deploy.sh
```

## Support

For issues, check:
- PM2 logs: `pm2 logs nexus`
- Nginx logs: `/var/log/nginx/error.log`
- System logs: `journalctl -u nginx`
