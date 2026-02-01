# Direct Deployment from Cursor to VPS

This guide shows you how to deploy directly from your Cursor development environment to your VPS.

## Quick Setup

### 1. Configure VPS Connection

Create a `.vps-config` file in the `nexus` directory:

```bash
cp .vps-config.example .vps-config
nano .vps-config
```

Update with your VPS details:
```bash
VPS_USER="root"
VPS_HOST="your-vps-ip-address"
VPS_PATH="/root/nexus/nexus"
BRANCH="privacy-chile"
```

### 2. Set Up SSH Key (One-time)

To avoid entering passwords, set up SSH key authentication:

```bash
# Generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096

# Copy key to VPS
ssh-copy-id root@your-vps-ip
```

## Deployment Methods

### Method 1: Git-Based Deployment (Recommended)

Deploys via git push/pull. Best for production.

```bash
./deploy-to-vps.sh
```

**What it does:**
1. Commits your changes (optional)
2. Pushes to git repository
3. Connects to VPS via SSH
4. Pulls latest code from git
5. Installs dependencies
6. Restarts PM2 process

**First time setup on VPS:**
```bash
# On VPS, clone your repository
cd /root
git clone <your-repo-url> nexus
cd nexus/nexus
npm install
pm2 start npm --name "nexus-dev" -- run dev
```

### Method 2: Direct Sync (Fast for Development)

Syncs files directly without git. Best for quick iterations.

```bash
./sync-to-vps.sh
```

**What it does:**
1. Uses `rsync` to copy files to VPS
2. Excludes `node_modules`, `.next`, `.git`
3. Installs dependencies on VPS
4. Restarts PM2 process

**Requirements:**
- `rsync` installed on your local machine
- SSH access to VPS

### Method 3: Watch and Auto-Deploy

Automatically syncs changes as you code. Best for active development.

```bash
./watch-and-deploy.sh
```

**What it does:**
1. Watches your local files for changes
2. Automatically syncs to VPS when files change
3. Runs continuously until you stop it (Ctrl+C)

**Requirements:**
- macOS: `brew install fswatch`
- Linux: `apt install inotify-tools`

## Using in Cursor/VS Code

### Option 1: Terminal Integration

1. Open terminal in Cursor (`Ctrl+`` or `Cmd+``)
2. Navigate to `nexus` directory
3. Run deployment script:
   ```bash
   ./deploy-to-vps.sh
   ```

### Option 2: Tasks Configuration

Add this to `.vscode/tasks.json` (create if it doesn't exist):

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Deploy to VPS",
      "type": "shell",
      "command": "./deploy-to-vps.sh",
      "group": {
        "kind": "build",
        "isDefault": false
      },
      "presentation": {
        "reveal": "always",
        "panel": "new"
      },
      "problemMatcher": []
    },
    {
      "label": "Sync to VPS",
      "type": "shell",
      "command": "./sync-to-vps.sh",
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    },
    {
      "label": "Watch and Deploy",
      "type": "shell",
      "command": "./watch-and-deploy.sh",
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "new",
        "close": false
      },
      "isBackground": true,
      "problemMatcher": {
        "pattern": {
          "regexp": "^$",
          "file": 1,
          "location": 2,
          "message": 3
        },
        "background": {
          "activeOnStart": true,
          "beginsPattern": "Watching",
          "endsPattern": "Sync complete"
        }
      }
    }
  ]
}
```

**To use:**
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Tasks: Run Task"
3. Select "Deploy to VPS" or "Sync to VPS"

### Option 3: Keyboard Shortcuts

Add to `.vscode/keybindings.json`:

```json
[
  {
    "key": "cmd+shift+d",
    "command": "workbench.action.tasks.runTask",
    "args": "Deploy to VPS"
  },
  {
    "key": "cmd+shift+s",
    "command": "workbench.action.tasks.runTask",
    "args": "Sync to VPS"
  }
]
```

## Workflow Examples

### Daily Development Workflow

1. **Start watch mode** (in separate terminal):
   ```bash
   ./watch-and-deploy.sh
   ```

2. **Code in Cursor** - changes auto-sync to VPS

3. **Check VPS logs** (if needed):
   ```bash
   ssh root@your-vps-ip 'pm2 logs nexus-dev'
   ```

### Production Deployment Workflow

1. **Make changes in Cursor**

2. **Deploy via git**:
   ```bash
   ./deploy-to-vps.sh
   ```

3. **Verify deployment**:
   ```bash
   curl http://your-vps-ip:3000/api/health
   ```

### Quick Fix Workflow

1. **Make small fix**

2. **Quick sync**:
   ```bash
   ./sync-to-vps.sh
   ```

## Troubleshooting

### SSH Connection Issues

```bash
# Test SSH connection
ssh root@your-vps-ip

# If password required, set up SSH keys
ssh-copy-id root@your-vps-ip
```

### Permission Denied

```bash
# Make scripts executable
chmod +x deploy-to-vps.sh sync-to-vps.sh watch-and-deploy.sh
```

### VPS Path Not Found

```bash
# Check if path exists on VPS
ssh root@your-vps-ip 'ls -la /root/nexus/nexus'

# If not, create it
ssh root@your-vps-ip 'mkdir -p /root/nexus/nexus'
```

### PM2 Not Found on VPS

```bash
# Install PM2 on VPS
ssh root@your-vps-ip 'npm install -g pm2'
```

### Sync is Slow

- Exclude large directories in `sync-to-vps.sh`
- Use git-based deployment instead
- Only sync specific files/directories

## Advanced: Custom Sync Rules

Edit `sync-to-vps.sh` to customize what gets synced:

```bash
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude 'data/local-db' \
    --include 'app/**' \
    --include 'lib/**' \
    --include 'models/**' \
    ./ $VPS_USER@$VPS_HOST:$VPS_PATH/
```

## Security Notes

1. **Never commit `.vps-config`** - it contains sensitive info
2. **Use SSH keys** instead of passwords
3. **Restrict SSH access** to your IP if possible
4. **Use non-root user** for production (update `VPS_USER`)

## Quick Reference

| Command | Use Case | Speed |
|---------|----------|-------|
| `./deploy-to-vps.sh` | Production deployment | Medium |
| `./sync-to-vps.sh` | Quick development sync | Fast |
| `./watch-and-deploy.sh` | Active development | Continuous |

## Next Steps

1. Set up `.vps-config` with your VPS details
2. Test connection: `ssh root@your-vps-ip`
3. Run first deployment: `./deploy-to-vps.sh`
4. Set up watch mode for active development: `./watch-and-deploy.sh`
