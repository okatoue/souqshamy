# Quick Start Guide for Windows 11 Users

## Prerequisites

Ensure you have:
- [ ] Windows 11 with WSL2 installed
- [ ] OR PowerShell (built-in)
- [ ] SSH client (built into Windows 10+)

---

## Option A: Using PowerShell (Recommended)

### Step 1: Generate SSH Key

Open **PowerShell** (run as Administrator):

```powershell
# Generate SSH key pair
ssh-keygen -t ed25519 -C "souqshamy-server"

# Press Enter for default location
# Set a strong passphrase when prompted

# View your public key (copy this to Hetzner when creating server)
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

### Step 2: Purchase VPS

1. Go to https://console.hetzner.cloud/
2. Sign up and add payment method
3. Create new project: `souqshamy`
4. Click **Add Server**:
   - Location: **Helsinki** or **Nuremberg**
   - Image: **Ubuntu 24.04**
   - Type: **CX31** (8GB RAM, 2 vCPU)
   - SSH Key: Paste your public key from Step 1
   - Name: `souqshamy-api-01`
5. Click **Create & Buy**
6. Note the IP address (e.g., `116.203.xxx.xxx`)

### Step 3: Connect to Server

```powershell
# Connect to your server
ssh root@YOUR_SERVER_IP

# Example:
ssh root@116.203.123.45

# Accept fingerprint by typing 'yes' when prompted
```

### Step 4: Upload Setup Script

In a **new PowerShell window** (keep SSH connected):

```powershell
# Navigate to your project
cd C:\path\to\souqshamy

# Copy server setup script to server
scp docs/self-hosted/scripts/server-setup.sh root@YOUR_SERVER_IP:/root/
```

### Step 5: Run Server Setup

Back in your **SSH session**:

```bash
# Make script executable and run
chmod +x /root/server-setup.sh
/root/server-setup.sh

# Follow the prompts
```

### Step 6: Test New User Login

**Before closing the root SSH session**, open a **new PowerShell window**:

```powershell
# Test login as deploy user
ssh deploy@YOUR_SERVER_IP

# If this works, you can close the root session
```

### Step 7: Upload and Run Docker Script

From PowerShell:

```powershell
# Copy Docker installation script
scp docs/self-hosted/scripts/install-docker.sh deploy@YOUR_SERVER_IP:/home/deploy/
```

SSH as deploy user:

```bash
ssh deploy@YOUR_SERVER_IP

# Run Docker installation
chmod +x /home/deploy/install-docker.sh
/home/deploy/install-docker.sh

# After completion, apply Docker group
newgrp docker

# Verify Docker works
docker run --rm hello-world
```

---

## Option B: Using WSL2 (Ubuntu)

### Step 1: Install WSL2

Open PowerShell as Administrator:

```powershell
wsl --install
# Restart computer when prompted

# After restart, set up Ubuntu user/password
```

### Step 2: Generate SSH Key in WSL

Open **Ubuntu** from Start Menu:

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "souqshamy-server"

# View public key
cat ~/.ssh/id_ed25519.pub
```

### Step 3: Copy Project Files to WSL

```bash
# Create project directory
mkdir -p ~/projects

# Copy from Windows (adjust path)
cp -r /mnt/c/Users/YOUR_USERNAME/path/to/souqshamy ~/projects/
```

### Step 4: Follow Main Guide

From WSL, follow the same commands as in the main guide:

```bash
cd ~/projects/souqshamy

# Copy scripts to server
scp docs/self-hosted/scripts/server-setup.sh root@YOUR_SERVER_IP:/root/

# Connect to server
ssh root@YOUR_SERVER_IP
```

---

## Copy-Paste Command Blocks

### Complete Setup Sequence (PowerShell)

```powershell
# 1. Generate SSH key (only once)
ssh-keygen -t ed25519 -C "souqshamy-server"
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub

# 2. After VPS is created, set server IP
$SERVER_IP = "YOUR_SERVER_IP_HERE"

# 3. Copy setup script
scp docs/self-hosted/scripts/server-setup.sh "root@${SERVER_IP}:/root/"

# 4. SSH and run setup
ssh "root@$SERVER_IP" "chmod +x /root/server-setup.sh && /root/server-setup.sh"

# 5. Test deploy user (in new window)
ssh "deploy@$SERVER_IP"

# 6. Copy Docker script
scp docs/self-hosted/scripts/install-docker.sh "deploy@${SERVER_IP}:/home/deploy/"

# 7. Run Docker installation
ssh "deploy@$SERVER_IP" "chmod +x /home/deploy/install-docker.sh && /home/deploy/install-docker.sh"
```

---

## Useful PowerShell Aliases

Add to your PowerShell profile (`$PROFILE`):

```powershell
# Open profile
notepad $PROFILE

# Add these lines:
function souq-ssh { ssh deploy@YOUR_SERVER_IP }
function souq-root { ssh root@YOUR_SERVER_IP }
function souq-copy { param($file) scp $file deploy@YOUR_SERVER_IP:/home/deploy/ }

# Save and reload
. $PROFILE

# Now you can use:
# souq-ssh      - Connect as deploy
# souq-root     - Connect as root
# souq-copy file.txt - Copy file to server
```

---

## VS Code Remote SSH

For easier file editing on the server:

1. Install **Remote - SSH** extension in VS Code
2. Press `F1` → "Remote-SSH: Connect to Host"
3. Enter: `deploy@YOUR_SERVER_IP`
4. Select Linux when prompted
5. Now you can edit server files directly!

---

## Troubleshooting Windows

### SSH Connection Refused

```powershell
# Check if SSH client is installed
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH*'

# Install if needed
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

### Permission Denied (Public Key)

```powershell
# Check key permissions
icacls $env:USERPROFILE\.ssh\id_ed25519

# Reset permissions if needed
icacls $env:USERPROFILE\.ssh\id_ed25519 /reset
icacls $env:USERPROFILE\.ssh\id_ed25519 /grant:r "$($env:USERNAME):(R)"
icacls $env:USERPROFILE\.ssh\id_ed25519 /inheritance:r
```

### SCP Not Found

```powershell
# SCP is included with OpenSSH, verify it's in PATH
where.exe scp

# If not found, use full path
C:\Windows\System32\OpenSSH\scp.exe
```

### WSL Cannot Access Windows Files

```bash
# Windows C: drive is at /mnt/c/
ls /mnt/c/Users/$USER/

# If not mounted, try:
sudo mount -t drvfs C: /mnt/c
```

---

## Quick Reference Card

| Action | PowerShell Command |
|--------|-------------------|
| Connect to server | `ssh deploy@SERVER_IP` |
| Copy file to server | `scp file.txt deploy@SERVER_IP:/home/deploy/` |
| Copy folder to server | `scp -r folder deploy@SERVER_IP:/home/deploy/` |
| View SSH public key | `Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub` |
| Check server status | `ssh deploy@SERVER_IP "sudo systemctl status docker"` |
| View Docker logs | `ssh deploy@SERVER_IP "docker logs container_name"` |
| Restart server | `ssh deploy@SERVER_IP "sudo reboot"` |

---

## Environment Variables

Store these in a `.env` file locally for reference (do not commit):

```env
# Server Details
SERVER_IP=116.203.xxx.xxx
SERVER_USER=deploy

# Domain (after Cloudflare setup)
DOMAIN=souqshamy.com
API_URL=https://api.souqshamy.com
STUDIO_URL=https://studio.souqshamy.com
STORAGE_URL=https://storage.souqshamy.com
REALTIME_URL=wss://realtime.souqshamy.com

# Cloudflare (after setup)
CF_API_TOKEN=
CF_ZONE_ID=
```
