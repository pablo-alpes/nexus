# Tailscale Deployment Setup

Deploying through Tailscale provides a secure, private network connection without exposing your VPS to the public internet.

## Benefits of Tailscale

- ✅ **Secure**: Encrypted mesh VPN
- ✅ **Private**: No need to expose SSH ports publicly
- ✅ **Easy**: Works behind NAT/firewalls
- ✅ **Fast**: Direct peer-to-peer connections
- ✅ **Free**: Up to 100 devices

## Setup Steps

### 1. Install Tailscale on Your Local Machine

**macOS:**
```bash
brew install tailscale
# Or download from: https://tailscale.com/download
```

**Linux:**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

**Windows:**
Download from: https://tailscale.com/download

### 2. Install Tailscale on VPS

```bash
# Connect to VPS
ssh root@your-vps-public-ip

# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Start Tailscale
tailscale up

# Note the Tailscale IP shown (e.g., 100.x.x.x)
tailscale ip -4
```

### 3. Verify Connection

**On your local machine:**
```bash
# Check Tailscale status
tailscale status

# Ping VPS via Tailscale
ping 100.x.x.x  # Replace with your VPS Tailscale IP
```

**On VPS:**
```bash
# Check Tailscale status
tailscale status

# Get Tailscale IP
tailscale ip -4
```

### 4. Configure Deployment

Create `.vps-config` file:

```bash
cd nexus
cp .vps-config.example .vps-config
nano .vps-config
```

Update with Tailscale IP:
```bash
VPS_USER="root"
VPS_HOST="100.x.x.x"  # Your VPS Tailscale IP
VPS_PATH="/root/nexus/nexus"
BRANCH="privacy-chile"
```

Or use Tailscale hostname:
```bash
VPS_USER="root"
VPS_HOST="your-vps-name.tailscale-name.ts.net"
VPS_PATH="/root/nexus/nexus"
BRANCH="privacy-chile"
```

### 5. Test SSH Connection via Tailscale

```bash
# Test SSH connection using Tailscale IP
ssh root@100.x.x.x

# Should connect without needing public IP or port forwarding
```

### 6. Deploy!

Now you can use the deployment scripts normally:

```bash
# Git-based deployment
./deploy-to-vps.sh

# Direct sync
./sync-to-vps.sh

# Watch mode
./watch-and-deploy.sh
```

## Security Benefits

### Without Tailscale (Public IP):
- ❌ SSH exposed to internet
- ❌ Need firewall rules
- ❌ Risk of brute force attacks
- ❌ Need to manage SSH keys carefully

### With Tailscale:
- ✅ SSH only accessible via Tailscale network
- ✅ No public port exposure needed
- ✅ Encrypted by default
- ✅ Access control via Tailscale admin console
- ✅ Can revoke access instantly

## VPS Firewall Configuration

With Tailscale, you can be more restrictive with your firewall:

```bash
# On VPS, only allow Tailscale interface
ufw default deny incoming
ufw default allow outgoing

# Allow Tailscale (optional, usually not needed)
ufw allow in on tailscale0

# Allow HTTP/HTTPS for public access (if needed)
ufw allow 80/tcp
ufw allow 443/tcp

# Block SSH on public interface (use Tailscale instead)
# ufw deny 22/tcp  # Only if you want to force Tailscale

ufw enable
```

## Accessing Your App

### Option 1: Via Tailscale (Private)

Your app running on VPS can be accessed via Tailscale IP:

```bash
# On VPS, app runs on localhost:3000
# Access from your local machine via Tailscale:
http://100.x.x.x:3000
```

### Option 2: Public Access (if needed)

If you need public access, use Nginx reverse proxy:

```nginx
# /etc/nginx/sites-available/nexus
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Can't connect via Tailscale IP

```bash
# Check Tailscale status on both machines
tailscale status

# Check if machines are in same Tailscale network
# (They should appear in each other's status output)

# Restart Tailscale if needed
sudo systemctl restart tailscaled  # Linux
# Or restart Tailscale app on macOS
```

### SSH connection refused

```bash
# Make sure SSH is running on VPS
sudo systemctl status ssh

# Check if SSH is listening on Tailscale interface
sudo netstat -tlnp | grep :22

# Test connection
ping 100.x.x.x  # Should work if Tailscale is connected
```

### Find Tailscale IP

```bash
# On VPS
tailscale ip -4

# On local machine
tailscale status | grep your-vps-name
```

### Tailscale not connecting

```bash
# Check Tailscale logs
sudo journalctl -u tailscaled -f  # Linux
# Or check Tailscale app logs on macOS

# Re-authenticate
tailscale up
```

## Advanced: Tailscale ACLs

You can restrict access using Tailscale ACLs (Access Control Lists):

1. Go to Tailscale admin console: https://login.tailscale.com/admin/acls
2. Create ACL rules to control access
3. Example: Only allow specific users to access VPS

## Quick Reference

| Task | Command |
|------|---------|
| Get Tailscale IP | `tailscale ip -4` |
| Check status | `tailscale status` |
| Restart Tailscale | `sudo systemctl restart tailscaled` (Linux) |
| Test connection | `ping 100.x.x.x` |
| SSH via Tailscale | `ssh root@100.x.x.x` |

## Next Steps

1. ✅ Install Tailscale on local machine and VPS
2. ✅ Connect both to same Tailscale network
3. ✅ Get VPS Tailscale IP: `tailscale ip -4`
4. ✅ Update `.vps-config` with Tailscale IP
5. ✅ Test SSH: `ssh root@100.x.x.x`
6. ✅ Deploy: `./deploy-to-vps.sh`

Your deployment scripts will work exactly the same, just using the Tailscale IP instead of public IP!
