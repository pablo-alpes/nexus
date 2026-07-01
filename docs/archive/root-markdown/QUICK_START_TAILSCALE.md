# Quick Start: Deploy via Tailscale

The fastest way to get your app running on VPS using Tailscale.

## 5-Minute Setup

### Step 1: Install Tailscale Locally

**macOS:**
```bash
brew install tailscale
# Or download: https://tailscale.com/download
```

**Linux:**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

**Windows:**
Download from: https://tailscale.com/download

### Step 2: Install Tailscale on VPS

```bash
# SSH to VPS (using public IP for first time)
ssh root@your-vps-public-ip

# Run setup script
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# Get Tailscale IP
tailscale ip -4
# Note this IP (e.g., 100.64.23.45)
```

### Step 3: Configure Deployment

On your **local machine**:

```bash
cd nexus
cp .vps-config.example .vps-config
nano .vps-config
```

Update with Tailscale IP:
```bash
VPS_USER="root"
VPS_HOST="100.64.23.45"  # Your VPS Tailscale IP from Step 2
VPS_PATH="/root/nexus/nexus"
BRANCH="privacy-chile"
```

### Step 4: Test Connection

```bash
# Test SSH via Tailscale
ssh root@100.64.23.45

# Should connect! Exit when done
exit
```

### Step 5: Deploy!

```bash
# From your local machine in nexus directory
./deploy-to-vps.sh
```

Or for quick sync:
```bash
./sync-to-vps.sh
```

## That's It! 🎉

Your app is now accessible at:
- **Via Tailscale (private)**: `http://100.64.23.45:3000`
- **Via public IP** (if configured): `http://your-vps-ip:3000`

## Troubleshooting

**Can't connect?**
```bash
# Check Tailscale status on both machines
tailscale status

# Restart Tailscale if needed
sudo systemctl restart tailscaled  # Linux
# Or restart Tailscale app on macOS
```

**Need help?**
See [TAILSCALE_SETUP.md](./TAILSCALE_SETUP.md) for detailed guide.
