# Phase 1: Infrastructure Setup - Self-Hosted Supabase

Complete step-by-step guide for setting up Hetzner servers with private networking for SouqJari.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Step 1: Hetzner Account Setup](#step-1-hetzner-account-setup)
3. [Step 2: Generate SSH Keys](#step-2-generate-ssh-keys)
4. [Step 3: Create Private Network](#step-3-create-private-network)
5. [Step 4: Create Database Server (CCX33)](#step-4-create-database-server-ccx33)
6. [Step 5: Create App Server (CPX41)](#step-5-create-app-server-cpx41)
7. [Step 6: Initial Server Access](#step-6-initial-server-access)
8. [Step 7: Configure Private Network IPs](#step-7-configure-private-network-ips)
9. [Step 8: Security Hardening - Database Server](#step-8-security-hardening---database-server)
10. [Step 9: Security Hardening - App Server](#step-9-security-hardening---app-server)
11. [Step 10: Cloudflare DNS Setup](#step-10-cloudflare-dns-setup)
12. [Step 11: Verification Checklist](#step-11-verification-checklist)

---

## Prerequisites

Before starting, you need:
- [ ] Hetzner Cloud account (https://console.hetzner.cloud)
- [ ] Cloudflare account with your domain added (https://cloudflare.com)
- [ ] Domain name (e.g., `souqjari.com`)
- [ ] Credit card for Hetzner billing
- [ ] Local machine with SSH client (Windows PowerShell, WSL, or terminal)

---

## Step 1: Hetzner Account Setup

### 1.1 Create Hetzner Cloud Account
1. Go to https://console.hetzner.cloud/registration
2. Complete registration with email verification
3. Add payment method (credit card)
4. Create a new project: **SouqJari Production**

### 1.2 Install Hetzner CLI (Optional but Recommended)

**On Windows (PowerShell as Administrator):**
```powershell
# Using Scoop
scoop install hcloud

# Or download from GitHub releases:
# https://github.com/hetznercloud/cli/releases
```

**On WSL/Linux:**
```bash
# Download latest release
curl -Lo hcloud.tar.gz https://github.com/hetznercloud/cli/releases/latest/download/hcloud-linux-amd64.tar.gz
tar -xzf hcloud.tar.gz
sudo mv hcloud /usr/local/bin/
rm hcloud.tar.gz

# Verify installation
hcloud version
```

### 1.3 Create API Token
1. In Hetzner Console, go to **Security** → **API Tokens**
2. Click **Generate API Token**
3. Name: `souqjari-setup`
4. Permission: **Read & Write**
5. Copy the token immediately (shown only once!)

### 1.4 Configure CLI (if using)
```bash
hcloud context create souqjari
# Paste your API token when prompted
```

---

## Step 2: Generate SSH Keys

Generate SSH keys on your local machine for secure server access.

### 2.1 Generate Keys

**On Windows PowerShell:**
```powershell
# Create .ssh directory if it doesn't exist
if (!(Test-Path "$env:USERPROFILE\.ssh")) { New-Item -ItemType Directory -Path "$env:USERPROFILE\.ssh" }

# Generate ED25519 key (recommended)
ssh-keygen -t ed25519 -C "souqjari-admin" -f "$env:USERPROFILE\.ssh\souqjari_ed25519"

# When prompted for passphrase, enter a strong passphrase or leave empty for no passphrase
```

**On WSL/Linux/Mac:**
```bash
# Create .ssh directory with correct permissions
mkdir -p ~/.ssh && chmod 700 ~/.ssh

# Generate ED25519 key (recommended)
ssh-keygen -t ed25519 -C "souqjari-admin" -f ~/.ssh/souqjari_ed25519

# Set correct permissions
chmod 600 ~/.ssh/souqjari_ed25519
chmod 644 ~/.ssh/souqjari_ed25519.pub
```

### 2.2 View Your Public Key

**Windows PowerShell:**
```powershell
Get-Content "$env:USERPROFILE\.ssh\souqjari_ed25519.pub"
```

**WSL/Linux/Mac:**
```bash
cat ~/.ssh/souqjari_ed25519.pub
```

Copy the entire output - you'll need it in the next steps.

### 2.3 Add SSH Key to Hetzner

**Via Web Console:**
1. Go to Hetzner Console → **Security** → **SSH Keys**
2. Click **Add SSH Key**
3. Name: `souqjari-admin`
4. Paste your public key from step 2.2
5. Click **Add SSH Key**

**Via CLI:**
```bash
hcloud ssh-key create --name souqjari-admin --public-key-from-file ~/.ssh/souqjari_ed25519.pub
```

---

## Step 3: Create Private Network

Create a private network for secure communication between servers.

### 3.1 Create Network

**Via Web Console:**
1. Go to **Networks** in left sidebar
2. Click **Create Network**
3. Configure:
   - Name: `souqjari-internal`
   - IP Range: `10.0.0.0/16`
   - Network Zone: `eu-central`
4. Click **Create Network**

**Via CLI:**
```bash
hcloud network create --name souqjari-internal --ip-range 10.0.0.0/16
```

### 3.2 Create Subnet

**Via Web Console:**
1. Click on `souqjari-internal` network
2. Go to **Subnets** tab
3. Click **Add Subnet**
4. Configure:
   - IP Range: `10.0.0.0/24`
   - Network Zone: `eu-central`
   - Type: `cloud`
5. Click **Add Subnet**

**Via CLI:**
```bash
hcloud network add-subnet souqjari-internal --type cloud --network-zone eu-central --ip-range 10.0.0.0/24
```

---

## Step 4: Create Database Server (CCX33)

The database server uses **dedicated vCPUs** for consistent PostgreSQL performance.

### 4.1 Create Server

**Via Web Console:**
1. Click **Servers** → **Add Server**
2. Configure:
   - **Location:** Falkenstein (fsn1) - *best latency to Middle East*
   - **Image:** Ubuntu 24.04
   - **Type:** CCX33 (AMD) - 8 dedicated vCPU, 32 GB RAM, 240 GB NVMe
   - **Networking:**
     - [x] Public IPv4
     - [x] Public IPv6
     - Private networks: Select `souqjari-internal`
     - IP: `10.0.0.2` (manually assign)
   - **SSH Keys:** Select `souqjari-admin`
   - **Name:** `souqjari-db`
   - **Labels:** `role=database`, `env=production`
3. Click **Create & Buy now**

**Via CLI:**
```bash
# Get network ID first
NETWORK_ID=$(hcloud network list -o noheader -o columns=id | head -1)

# Create database server
hcloud server create \
  --name souqjari-db \
  --type ccx33 \
  --image ubuntu-24.04 \
  --location fsn1 \
  --ssh-key souqjari-admin \
  --network $NETWORK_ID \
  --label role=database \
  --label env=production
```

### 4.2 Record Server Details
After creation, note down:
- **Public IPv4:** _____________ (e.g., 168.119.xxx.xxx)
- **Public IPv6:** _____________
- **Private IP:** 10.0.0.2 (we'll configure this)

---

## Step 5: Create App Server (CPX41)

The app server uses **shared vCPUs** which is sufficient for Supabase services.

### 5.1 Create Server

**Via Web Console:**
1. Click **Servers** → **Add Server**
2. Configure:
   - **Location:** Falkenstein (fsn1) - *same as database*
   - **Image:** Ubuntu 24.04
   - **Type:** CPX41 (AMD) - 4 shared vCPU, 16 GB RAM, 160 GB NVMe
   - **Networking:**
     - [x] Public IPv4
     - [x] Public IPv6
     - Private networks: Select `souqjari-internal`
     - IP: `10.0.0.3` (manually assign)
   - **SSH Keys:** Select `souqjari-admin`
   - **Name:** `souqjari-app`
   - **Labels:** `role=application`, `env=production`
3. Click **Create & Buy now**

**Via CLI:**
```bash
# Create app server
hcloud server create \
  --name souqjari-app \
  --type cpx41 \
  --image ubuntu-24.04 \
  --location fsn1 \
  --ssh-key souqjari-admin \
  --network $NETWORK_ID \
  --label role=application \
  --label env=production
```

### 5.2 Record Server Details
After creation, note down:
- **Public IPv4:** _____________ (e.g., 49.12.xxx.xxx)
- **Public IPv6:** _____________
- **Private IP:** 10.0.0.3 (we'll configure this)

---

## Step 6: Initial Server Access

### 6.1 Configure SSH Config File

Create/edit SSH config for easy access.

**Windows PowerShell:**
```powershell
# Create or edit SSH config
notepad "$env:USERPROFILE\.ssh\config"
```

**WSL/Linux/Mac:**
```bash
nano ~/.ssh/config
```

Add the following (replace IP addresses with your actual IPs):

```
# SouqJari Database Server
Host souqjari-db
    HostName YOUR_DB_PUBLIC_IP
    User root
    IdentityFile ~/.ssh/souqjari_ed25519
    IdentitiesOnly yes

# SouqJari App Server
Host souqjari-app
    HostName YOUR_APP_PUBLIC_IP
    User root
    IdentityFile ~/.ssh/souqjari_ed25519
    IdentitiesOnly yes
```

### 6.2 Test SSH Connections

```bash
# Test database server connection
ssh souqjari-db "echo 'DB Server Connected Successfully!'"

# Test app server connection
ssh souqjari-app "echo 'App Server Connected Successfully!'"
```

If both commands succeed, proceed to the next step.

---

## Step 7: Configure Private Network IPs

Hetzner automatically assigns private IPs, but we'll verify and configure static IPs.

### 7.1 Assign Static Private IPs via Hetzner Console

**Via Web Console:**
1. Go to **Servers** → `souqjari-db`
2. Click **Networking** tab
3. Under Private Networks, ensure IP is `10.0.0.2`
4. Repeat for `souqjari-app` with IP `10.0.0.3`

**Via CLI:**
```bash
# Assign specific IPs (may need to detach/reattach)
hcloud server attach-to-network souqjari-db --network souqjari-internal --ip 10.0.0.2
hcloud server attach-to-network souqjari-app --network souqjari-internal --ip 10.0.0.3
```

### 7.2 Verify Private Network on Database Server

```bash
ssh souqjari-db
```

Then run:
```bash
# Check network interfaces
ip addr show

# You should see an interface (usually ens10 or enp7s0) with 10.0.0.2

# Test if private network is working (ping app server)
# Note: App server firewall might block ping initially
ping -c 3 10.0.0.3 || echo "Ping blocked by firewall - this is OK for now"

# Exit back to local machine
exit
```

### 7.3 Verify Private Network on App Server

```bash
ssh souqjari-app
```

Then run:
```bash
# Check network interfaces
ip addr show

# You should see an interface with 10.0.0.3

# Test connectivity to database server
ping -c 3 10.0.0.2 || echo "Ping blocked by firewall - this is OK for now"

# Exit back to local machine
exit
```

---

## Step 8: Security Hardening - Database Server

SSH into the database server and run these commands.

```bash
ssh souqjari-db
```

### 8.1 System Update

```bash
# Update package lists and upgrade system
apt update && apt upgrade -y

# Install essential packages
apt install -y \
  ufw \
  fail2ban \
  unattended-upgrades \
  apt-listchanges \
  htop \
  curl \
  wget \
  net-tools
```

### 8.2 Configure Automatic Security Updates

```bash
# Enable automatic security updates
dpkg-reconfigure -plow unattended-upgrades
# Select "Yes" when prompted
```

### 8.3 Configure UFW Firewall

**CRITICAL: Database server should only be accessible via private network for PostgreSQL.**

```bash
# Reset UFW to defaults
ufw --force reset

# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH from anywhere (for management)
ufw allow ssh

# Allow PostgreSQL ONLY from private network
ufw allow from 10.0.0.0/24 to any port 5432

# Allow ping from private network (for health checks)
ufw allow from 10.0.0.0/24 proto icmp

# Enable firewall
ufw --force enable

# Verify rules
ufw status verbose
```

Expected output:
```
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)
New profiles: skip

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
5432                       ALLOW IN    10.0.0.0/24
Anywhere/icmp              ALLOW IN    10.0.0.0/24
22/tcp (v6)                ALLOW IN    Anywhere (v6)
```

### 8.4 Configure Fail2Ban

```bash
# Create jail.local configuration
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
# Ban time: 1 hour
bantime = 3600
# Find time: 10 minutes
findtime = 600
# Max retry: 5 attempts
maxretry = 5
# Ignore local and private network
ignoreip = 127.0.0.1/8 ::1 10.0.0.0/24

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
EOF

# Restart fail2ban
systemctl restart fail2ban
systemctl enable fail2ban

# Verify fail2ban is running
fail2ban-client status
fail2ban-client status sshd
```

### 8.5 Disable Password Authentication (SSH Key Only)

```bash
# Backup original config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Configure SSH for key-only authentication
cat > /etc/ssh/sshd_config.d/hardening.conf << 'EOF'
# Disable password authentication
PasswordAuthentication no
ChallengeResponseAuthentication no
UsePAM yes

# Disable root login with password (key only)
PermitRootLogin prohibit-password

# Other hardening
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
EOF

# Test SSH configuration
sshd -t

# If no errors, restart SSH
systemctl restart sshd
```

### 8.6 Set Timezone

```bash
# Set timezone to UTC (recommended for servers)
timedatectl set-timezone UTC
timedatectl
```

### 8.7 Create Non-Root Admin User (Optional but Recommended)

```bash
# Create admin user
adduser --disabled-password --gecos "SouqJari Admin" souqadmin

# Add to sudo group
usermod -aG sudo souqadmin

# Set up SSH key for admin user
mkdir -p /home/souqadmin/.ssh
cp /root/.ssh/authorized_keys /home/souqadmin/.ssh/
chown -R souqadmin:souqadmin /home/souqadmin/.ssh
chmod 700 /home/souqadmin/.ssh
chmod 600 /home/souqadmin/.ssh/authorized_keys

# Allow sudo without password (optional)
echo "souqadmin ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/souqadmin
```

### 8.8 Exit Database Server

```bash
exit
```

---

## Step 9: Security Hardening - App Server

SSH into the app server and run these commands.

```bash
ssh souqjari-app
```

### 9.1 System Update

```bash
# Update package lists and upgrade system
apt update && apt upgrade -y

# Install essential packages
apt install -y \
  ufw \
  fail2ban \
  unattended-upgrades \
  apt-listchanges \
  htop \
  curl \
  wget \
  net-tools \
  nginx \
  certbot \
  python3-certbot-nginx
```

### 9.2 Configure Automatic Security Updates

```bash
# Enable automatic security updates
dpkg-reconfigure -plow unattended-upgrades
# Select "Yes" when prompted
```

### 9.3 Configure UFW Firewall

**App server needs to be accessible from the internet (via Cloudflare).**

```bash
# Reset UFW to defaults
ufw --force reset

# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow ssh

# Allow HTTP (for Let's Encrypt and redirect)
ufw allow 80/tcp

# Allow HTTPS (main traffic)
ufw allow 443/tcp

# Allow all traffic from private network
ufw allow from 10.0.0.0/24

# Enable firewall
ufw --force enable

# Verify rules
ufw status verbose
```

Expected output:
```
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)
New profiles: skip

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
Anywhere                   ALLOW IN    10.0.0.0/24
22/tcp (v6)                ALLOW IN    Anywhere (v6)
80/tcp (v6)                ALLOW IN    Anywhere (v6)
443/tcp (v6)               ALLOW IN    Anywhere (v6)
```

### 9.4 Configure Fail2Ban

```bash
# Create jail.local configuration
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
# Ban time: 1 hour
bantime = 3600
# Find time: 10 minutes
findtime = 600
# Max retry: 5 attempts
maxretry = 5
# Ignore local and private network
ignoreip = 127.0.0.1/8 ::1 10.0.0.0/24

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600

[nginx-botsearch]
enabled = true
port = http,https
filter = nginx-botsearch
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400
EOF

# Restart fail2ban
systemctl restart fail2ban
systemctl enable fail2ban

# Verify fail2ban is running
fail2ban-client status
```

### 9.5 Disable Password Authentication (SSH Key Only)

```bash
# Backup original config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Configure SSH for key-only authentication
cat > /etc/ssh/sshd_config.d/hardening.conf << 'EOF'
# Disable password authentication
PasswordAuthentication no
ChallengeResponseAuthentication no
UsePAM yes

# Disable root login with password (key only)
PermitRootLogin prohibit-password

# Other hardening
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
EOF

# Test SSH configuration
sshd -t

# If no errors, restart SSH
systemctl restart sshd
```

### 9.6 Set Timezone

```bash
# Set timezone to UTC
timedatectl set-timezone UTC
timedatectl
```

### 9.7 Create Non-Root Admin User

```bash
# Create admin user
adduser --disabled-password --gecos "SouqJari Admin" souqadmin

# Add to sudo and docker groups (docker group will be created later)
usermod -aG sudo souqadmin

# Set up SSH key for admin user
mkdir -p /home/souqadmin/.ssh
cp /root/.ssh/authorized_keys /home/souqadmin/.ssh/
chown -R souqadmin:souqadmin /home/souqadmin/.ssh
chmod 700 /home/souqadmin/.ssh
chmod 600 /home/souqadmin/.ssh/authorized_keys

# Allow sudo without password (optional)
echo "souqadmin ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/souqadmin
```

### 9.8 Verify Private Network Connectivity

```bash
# Test connection to database server
ping -c 3 10.0.0.2
```

Expected output shows successful pings to `10.0.0.2`.

### 9.9 Exit App Server

```bash
exit
```

---

## Step 10: Cloudflare DNS Setup

### 10.1 Add Domain to Cloudflare (if not already done)

1. Log into Cloudflare Dashboard: https://dash.cloudflare.com
2. Click **Add a Site**
3. Enter your domain: `souqjari.com`
4. Select **Free** plan (sufficient for our needs)
5. Update nameservers at your domain registrar to Cloudflare's nameservers

### 10.2 Configure DNS Records

In Cloudflare Dashboard → DNS → Records, add the following:

| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| A | `api` | `YOUR_APP_SERVER_IP` | Proxied (orange cloud) | Auto |
| A | `studio` | `YOUR_APP_SERVER_IP` | Proxied (orange cloud) | Auto |
| A | `@` | `YOUR_APP_SERVER_IP` | Proxied (orange cloud) | Auto |

**Replace `YOUR_APP_SERVER_IP` with the public IPv4 of souqjari-app server.**

### 10.3 Configure Cloudflare SSL/TLS Settings

1. Go to **SSL/TLS** → **Overview**
2. Set SSL mode to: **Full (strict)**

3. Go to **SSL/TLS** → **Edge Certificates**
4. Enable:
   - [x] Always Use HTTPS
   - [x] Automatic HTTPS Rewrites
   - Minimum TLS Version: **TLS 1.2**

### 10.4 Configure Security Settings

1. Go to **Security** → **Settings**
2. Set Security Level: **Medium**
3. Challenge Passage: **30 minutes**
4. Browser Integrity Check: **On**

### 10.5 Configure Cloudflare Firewall Rules (Optional)

To restrict Studio access to specific IPs:

1. Go to **Security** → **WAF** → **Custom Rules**
2. Create rule:
   - Name: `Restrict Studio Access`
   - Expression: `(http.host eq "studio.souqjari.com" and not ip.src in {YOUR_IP/32})`
   - Action: **Block**

### 10.6 Verify DNS Propagation

```bash
# Check DNS resolution (may take a few minutes to propagate)
nslookup api.souqjari.com
nslookup studio.souqjari.com

# Or using dig
dig api.souqjari.com +short
dig studio.souqjari.com +short
```

Both should resolve to Cloudflare IPs (not your server IP directly - that's correct, Cloudflare proxies the traffic).

---

## Step 11: Verification Checklist

Run these commands to verify Phase 1 is complete.

### 11.1 Server Accessibility

```bash
# Test SSH to both servers
ssh souqjari-db "hostname && uname -a"
ssh souqjari-app "hostname && uname -a"
```

### 11.2 Private Network Connectivity

```bash
# From app server, test database server connectivity
ssh souqjari-app "ping -c 3 10.0.0.2"

# From database server, test app server connectivity
ssh souqjari-db "ping -c 3 10.0.0.3"
```

### 11.3 Firewall Status

```bash
# Check firewall on both servers
ssh souqjari-db "ufw status verbose"
ssh souqjari-app "ufw status verbose"
```

### 11.4 Fail2Ban Status

```bash
# Check fail2ban on both servers
ssh souqjari-db "fail2ban-client status"
ssh souqjari-app "fail2ban-client status"
```

### 11.5 DNS Resolution

```bash
# Verify DNS is pointing to Cloudflare
dig api.souqjari.com +short
dig studio.souqjari.com +short
```

### 11.6 HTTP Connectivity (Basic Test)

```bash
# From app server, verify nginx is running
ssh souqjari-app "systemctl status nginx"

# Test from internet (should return nginx default page or 502)
curl -I https://api.souqjari.com
```

---

## Server Information Summary

Fill in after completing setup:

| Resource | Value |
|----------|-------|
| **App Server (souqjari-app)** | |
| Public IPv4 | |
| Public IPv6 | |
| Private IP | 10.0.0.3 |
| **Database Server (souqjari-db)** | |
| Public IPv4 | |
| Public IPv6 | |
| Private IP | 10.0.0.2 |
| **Domains** | |
| API | api.souqjari.com |
| Studio | studio.souqjari.com |
| **SSH Access** | |
| Command (App) | `ssh souqjari-app` |
| Command (DB) | `ssh souqjari-db` |

---

## Troubleshooting

### SSH Connection Refused

```bash
# Check if server is running in Hetzner Console
# Try connecting with verbose output
ssh -v souqjari-app
```

### Private Network Not Working

```bash
# SSH into server and check interfaces
ip addr show

# Look for interface with 10.0.0.x IP
# If missing, check Hetzner Console → Server → Networking
```

### Firewall Blocking Legitimate Traffic

```bash
# Temporarily disable firewall for testing
ssh souqjari-app "ufw disable"

# Re-enable after testing
ssh souqjari-app "ufw enable"
```

### DNS Not Resolving

1. Check Cloudflare DNS records are correct
2. Wait 5-10 minutes for propagation
3. Try different DNS resolver: `dig @8.8.8.8 api.souqjari.com`

---

## Cost Summary

| Resource | Specification | Monthly Cost |
|----------|--------------|--------------|
| App Server (CPX41) | 4 vCPU, 16GB RAM, 160GB SSD | ~€15 |
| Database Server (CCX33) | 8 dedicated vCPU, 32GB RAM, 240GB SSD | ~€65 |
| Private Network | Included | €0 |
| **Total Infrastructure** | | **~€80/month** |

---

## Next Steps

After completing Phase 1, proceed to:
- **Phase 2:** PostgreSQL Installation and Configuration on Database Server
- **Phase 3:** Docker and Supabase Setup on App Server
- **Phase 4:** Cloudflare R2 Storage Configuration
- **Phase 5:** SMS OTP Integration with Syriatel

---

## Security Notes

1. **Never share your SSH private key** (`souqjari_ed25519`)
2. **Store API tokens securely** - use a password manager
3. **Regularly update servers** - automatic updates are configured but monitor for issues
4. **Monitor fail2ban logs** for brute force attempts
5. **Keep Hetzner Console credentials secure** - enable 2FA if available

---

*Document Version: 1.0*
*Last Updated: December 2024*
*Author: SouqJari DevOps*
