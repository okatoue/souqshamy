# Phase 1: Infrastructure Setup for Self-Hosted Supabase

## Overview

This guide provides step-by-step instructions to set up a VPS infrastructure for hosting Supabase, specifically designed to be accessible from Syria (bypassing Supabase Cloud's OFAC restrictions).

**Target Environment:**
- VPS: Ubuntu 24.04 LTS
- Local Dev: Windows 11 with WSL2
- Domain: Managed via Cloudflare

---

## Table of Contents

1. [VPS Provider Selection](#1-vps-provider-selection)
2. [Initial VPS Purchase & Access](#2-initial-vps-purchase--access)
3. [Server Security Hardening](#3-server-security-hardening)
4. [Docker Installation](#4-docker-installation)
5. [Domain & DNS Setup with Cloudflare](#5-domain--dns-setup-with-cloudflare)
6. [Verification Checklist](#6-verification-checklist)

---

## 1. VPS Provider Selection

### Recommended: Hetzner Cloud (Germany/Finland)

**Why Hetzner:**
- European data centers (no OFAC restrictions)
- Excellent price/performance ratio
- No IP reputation issues
- Reliable network connectivity

**Recommended Plan: CX31 or CX41**

| Plan | vCPUs | RAM | SSD | Traffic | Price/Month |
|------|-------|-----|-----|---------|-------------|
| CX31 | 2 | 8 GB | 80 GB | 20 TB | ~€10.59 |
| CX41 | 4 | 16 GB | 160 GB | 20 TB | ~€18.29 |

**Recommendation:** Start with **CX31** for development/testing, upgrade to **CX41** for production with >1000 users.

### Alternative: Contabo (Germany)

**Plan: Cloud VPS M**

| Spec | Value |
|------|-------|
| vCPUs | 6 |
| RAM | 16 GB |
| SSD | 200 GB |
| Traffic | Unlimited |
| Price | ~€8.99/month |

**Note:** Contabo is cheaper but has slower support. Good for budget-conscious deployments.

### Alternative: OVHcloud (France)

European provider with good Syrian accessibility. Consider if Hetzner has issues.

---

## 2. Initial VPS Purchase & Access

### Step 2.1: Purchase VPS (Hetzner Example)

1. Go to https://console.hetzner.cloud/
2. Create account with non-Syrian email (Gmail works)
3. Add payment method (credit card or PayPal)
4. Create new project: `souqshamy-production`
5. Add server:
   - **Location:** Helsinki (FSN) or Nuremberg (NBG) - both in EU
   - **Image:** Ubuntu 24.04
   - **Type:** CX31 (8GB RAM)
   - **Networking:** Public IPv4 + IPv6
   - **SSH Key:** Add your public key (instructions below)
   - **Name:** `souqshamy-api-01`

### Step 2.2: Generate SSH Key (Windows 11)

Open PowerShell as Administrator:

```powershell
# Generate SSH key pair
ssh-keygen -t ed25519 -C "souqshamy-server"

# When prompted, press Enter for default location (~/.ssh/id_ed25519)
# Set a strong passphrase

# View your public key (copy this to Hetzner)
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

Or in WSL2:

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "souqshamy-server"

# View public key
cat ~/.ssh/id_ed25519.pub
```

### Step 2.3: First Connection

After VPS is created, note the IP address (e.g., `116.203.xxx.xxx`).

From PowerShell or WSL2:

```bash
# First connection (accept fingerprint when prompted)
ssh root@YOUR_SERVER_IP

# Example:
ssh root@116.203.123.45
```

**Expected output:**
```
Welcome to Ubuntu 24.04 LTS (GNU/Linux 6.5.0-xx-generic x86_64)
...
root@souqshamy-api-01:~#
```

---

## 3. Server Security Hardening

### Step 3.1: Run the Automated Setup Script

First, copy the setup script to your server. From your **local machine** (WSL2 or PowerShell):

```bash
# Copy the script to your server
scp docs/self-hosted/scripts/server-setup.sh root@YOUR_SERVER_IP:/root/
```

Then SSH into your server and run it:

```bash
ssh root@YOUR_SERVER_IP
chmod +x /root/server-setup.sh
/root/server-setup.sh
```

### Step 3.2: Manual Setup (If You Prefer)

If you prefer to run commands manually, follow these steps:

#### Update System

```bash
# Update package lists and upgrade
apt update && apt upgrade -y

# Install essential packages
apt install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    tmux \
    ufw \
    fail2ban \
    unzip \
    jq \
    net-tools \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release
```

#### Create Non-Root User

```bash
# Create deploy user
adduser --disabled-password --gecos "" deploy

# Add to sudo group
usermod -aG sudo deploy

# Allow sudo without password (for automation)
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy

# Create SSH directory
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh

# Copy SSH keys from root
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

#### Configure SSH Security

```bash
# Backup original config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Create secure SSH config
cat > /etc/ssh/sshd_config.d/hardened.conf << 'EOF'
# Disable root login via SSH
PermitRootLogin no

# Disable password authentication (key-only)
PasswordAuthentication no
ChallengeResponseAuthentication no
UsePAM yes

# Only allow deploy user
AllowUsers deploy

# Use strong ciphers
Ciphers aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512,hmac-sha2-256
KexAlgorithms curve25519-sha256@libssh.org,ecdh-sha2-nistp521,ecdh-sha2-nistp384,ecdh-sha2-nistp256,diffie-hellman-group-exchange-sha256

# Timeouts
ClientAliveInterval 300
ClientAliveCountMax 2

# Disable X11 forwarding
X11Forwarding no

# Max authentication attempts
MaxAuthTries 3
EOF

# Test SSH config
sshd -t

# Restart SSH
systemctl restart sshd
```

**IMPORTANT:** Before logging out as root, test the new user login in a **new terminal**:

```bash
ssh deploy@YOUR_SERVER_IP
```

#### Configure UFW Firewall

```bash
# Reset UFW to defaults
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (IMPORTANT: Do this first!)
ufw allow 22/tcp comment 'SSH'

# Allow HTTP and HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Allow PostgreSQL (only if external access needed)
# ufw allow 5432/tcp comment 'PostgreSQL'

# Enable UFW
ufw --force enable

# Check status
ufw status verbose
```

#### Configure Fail2Ban

```bash
# Create jail configuration
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400
EOF

# Restart fail2ban
systemctl enable fail2ban
systemctl restart fail2ban

# Check status
fail2ban-client status sshd
```

#### Set Timezone and Configure NTP

```bash
# Set timezone to UTC (recommended for servers)
timedatectl set-timezone UTC

# Enable NTP sync
timedatectl set-ntp true

# Verify
timedatectl status
```

#### Configure System Limits

```bash
# Increase file limits for Supabase
cat >> /etc/security/limits.conf << 'EOF'

# Supabase/Docker limits
* soft nofile 65535
* hard nofile 65535
* soft nproc 65535
* hard nproc 65535
EOF

# Configure sysctl for better performance
cat > /etc/sysctl.d/99-supabase.conf << 'EOF'
# Increase max connections
net.core.somaxconn = 65535

# Increase network buffers
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216

# TCP tuning
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 5

# Enable TCP BBR congestion control
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr

# VM settings
vm.swappiness = 10
vm.dirty_ratio = 60
vm.dirty_background_ratio = 2
EOF

# Apply sysctl settings
sysctl --system
```

#### Create Swap Space

```bash
# Create 4GB swap file
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Verify
swapon --show
free -h
```

---

## 4. Docker Installation

### Step 4.1: Run the Docker Installation Script

From your **local machine**, copy and run the script:

```bash
# Copy script to server
scp docs/self-hosted/scripts/install-docker.sh deploy@YOUR_SERVER_IP:/home/deploy/

# SSH in and run
ssh deploy@YOUR_SERVER_IP
chmod +x /home/deploy/install-docker.sh
/home/deploy/install-docker.sh
```

### Step 4.2: Manual Docker Installation

If you prefer manual installation:

```bash
# Remove old Docker versions (if any)
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add deploy user to docker group
sudo usermod -aG docker deploy

# Enable and start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Log out and back in to apply group changes
# OR use: newgrp docker

# Verify installation
docker --version
docker compose version
docker run hello-world
```

### Step 4.3: Configure Docker for Supabase

```bash
# Create directories for Supabase
sudo mkdir -p /opt/supabase
sudo chown deploy:deploy /opt/supabase

# Create Docker network for Supabase
docker network create supabase-network 2>/dev/null || true

# Configure Docker daemon for better performance
sudo mkdir -p /etc/docker
sudo cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65535,
      "Soft": 65535
    }
  }
}
EOF

# Restart Docker to apply changes
sudo systemctl restart docker
```

### Step 4.4: Install Docker Registry (For Air-Gapped Deployment)

Since Docker Hub may be inaccessible from Syria, we'll set up a local registry:

```bash
# Create directory for registry data
sudo mkdir -p /opt/docker-registry/data
sudo chown -R deploy:deploy /opt/docker-registry

# Start local registry container
docker run -d \
  --name registry \
  --restart=always \
  -p 5000:5000 \
  -v /opt/docker-registry/data:/var/lib/registry \
  registry:2

# Verify registry is running
curl http://localhost:5000/v2/_catalog
```

---

## 5. Domain & DNS Setup with Cloudflare

### Step 5.1: Add Domain to Cloudflare

1. Log in to Cloudflare (https://dash.cloudflare.com)
2. Click "Add a Site"
3. Enter your domain: `souqshamy.com`
4. Select Free plan
5. Update nameservers at your registrar to Cloudflare's nameservers

### Step 5.2: Configure DNS Records

Add the following DNS records in Cloudflare:

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| A | `api` | YOUR_SERVER_IP | Proxied (orange cloud) | Auto |
| A | `studio` | YOUR_SERVER_IP | Proxied (orange cloud) | Auto |
| A | `storage` | YOUR_SERVER_IP | Proxied (orange cloud) | Auto |
| A | `realtime` | YOUR_SERVER_IP | DNS only (gray cloud) | Auto |

**Important Notes:**
- `realtime` should be **DNS only** (gray cloud) because WebSocket connections work better without Cloudflare proxy
- Alternatively, keep all proxied and configure Cloudflare WebSocket support

### Step 5.3: Configure Cloudflare SSL/TLS

1. Go to SSL/TLS settings
2. Set mode to **Full (strict)**
3. Enable **Always Use HTTPS**
4. Enable **Automatic HTTPS Rewrites**
5. Minimum TLS Version: **TLS 1.2**

### Step 5.4: Configure Cloudflare Security

1. **Firewall Rules:**
   - Go to Security > WAF
   - Create rule to allow Syrian IPs (if needed)

2. **Under Attack Mode:**
   - Keep disabled normally
   - Enable only if experiencing DDoS

3. **Bot Fight Mode:**
   - Enable but watch for false positives with API calls

### Step 5.5: Get Cloudflare API Token (for SSL cert automation)

1. Go to My Profile > API Tokens
2. Create Token > Edit zone DNS template
3. Permissions:
   - Zone - DNS - Edit
   - Zone - Zone - Read
4. Zone Resources: Include - Specific zone - souqshamy.com
5. Save the token securely

### Step 5.6: Cloudflare Origin Certificate (Alternative to Let's Encrypt)

For simplest SSL setup:

1. Go to SSL/TLS > Origin Server
2. Create Certificate
3. Choose key type: RSA (2048)
4. Hostnames: `*.souqshamy.com, souqshamy.com`
5. Validity: 15 years
6. Create and save both:
   - Origin Certificate → `/etc/ssl/cloudflare/souqshamy.com.pem`
   - Private Key → `/etc/ssl/cloudflare/souqshamy.com.key`

On your server:

```bash
# Create SSL directory
sudo mkdir -p /etc/ssl/cloudflare

# Create certificate file (paste content from Cloudflare)
sudo nano /etc/ssl/cloudflare/souqshamy.com.pem

# Create private key file (paste content from Cloudflare)
sudo nano /etc/ssl/cloudflare/souqshamy.com.key

# Set permissions
sudo chmod 600 /etc/ssl/cloudflare/souqshamy.com.key
sudo chmod 644 /etc/ssl/cloudflare/souqshamy.com.pem
```

---

## 6. Verification Checklist

### Server Health Check

```bash
# Check system info
hostnamectl
lsb_release -a
uname -r

# Check resources
free -h
df -h
nproc
cat /proc/cpuinfo | grep "model name" | head -1

# Check swap
swapon --show

# Check firewall
sudo ufw status

# Check fail2ban
sudo fail2ban-client status
```

### Docker Health Check

```bash
# Docker version
docker --version
docker compose version

# Docker running
sudo systemctl status docker

# Test container
docker run --rm hello-world

# Check registry (if installed)
curl http://localhost:5000/v2/_catalog
```

### Network Health Check

```bash
# Check listening ports
sudo netstat -tlnp

# Check DNS resolution
dig api.souqshamy.com
dig studio.souqshamy.com

# Check external connectivity
curl -I https://api.souqshamy.com 2>/dev/null || echo "Domain not yet configured"
```

### Security Check

```bash
# SSH as deploy user works
# (from local machine)
ssh deploy@YOUR_SERVER_IP

# Root login disabled
# (should fail)
ssh root@YOUR_SERVER_IP

# Password login disabled
# (should fail)
ssh -o PreferredAuthentications=password deploy@YOUR_SERVER_IP
```

---

## Quick Reference: Connection Details

After completing Phase 1, save these details:

```
SERVER DETAILS
==============
Provider: Hetzner Cloud
Plan: CX31
Location: Helsinki (or your choice)
IP Address: _______________
IPv6: _______________

SSH ACCESS
==========
User: deploy
Key: ~/.ssh/id_ed25519
Command: ssh deploy@YOUR_SERVER_IP

DOMAINS (after DNS propagation)
===============================
API: https://api.souqshamy.com
Studio: https://studio.souqshamy.com
Storage: https://storage.souqshamy.com
Realtime: wss://realtime.souqshamy.com

CLOUDFLARE
==========
API Token: _______________
Origin Cert Location: /etc/ssl/cloudflare/
```

---

## Troubleshooting

### Can't SSH after hardening

1. Check if you tested deploy user login before disabling root
2. Use Hetzner Console (VNC) from control panel to fix
3. Reset sshd_config if needed

### UFW locked you out

1. Use Hetzner Console to access server
2. Run: `sudo ufw allow 22/tcp && sudo ufw enable`

### Docker permission denied

```bash
# Add yourself to docker group
sudo usermod -aG docker $USER

# Apply without logout
newgrp docker
```

### DNS not resolving

1. Wait for propagation (up to 24 hours, usually faster)
2. Check with: `dig +short api.souqshamy.com`
3. Verify Cloudflare nameservers are set at registrar

---

## Next Steps

After completing Phase 1, proceed to:
- **[Phase 2: Supabase Deployment](./PHASE2-DEPLOYMENT.md)** - Deploy Supabase using air-gapped method

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review server logs: `journalctl -xe`
3. Check Docker logs: `docker logs <container_name>`
