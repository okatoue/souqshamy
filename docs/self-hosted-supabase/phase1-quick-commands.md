# Phase 1: Quick Command Reference

Copy-paste ready commands for Phase 1 setup. See `phase1-infrastructure-setup.md` for detailed explanations.

---

## Local Machine Setup

### Generate SSH Key
```bash
# Linux/Mac/WSL
mkdir -p ~/.ssh && chmod 700 ~/.ssh
ssh-keygen -t ed25519 -C "souqjari-admin" -f ~/.ssh/souqjari_ed25519
chmod 600 ~/.ssh/souqjari_ed25519
cat ~/.ssh/souqjari_ed25519.pub
```

### SSH Config (~/.ssh/config)
```
Host souqjari-db
    HostName DB_PUBLIC_IP_HERE
    User root
    IdentityFile ~/.ssh/souqjari_ed25519
    IdentitiesOnly yes

Host souqjari-app
    HostName APP_PUBLIC_IP_HERE
    User root
    IdentityFile ~/.ssh/souqjari_ed25519
    IdentitiesOnly yes
```

---

## Database Server (souqjari-db) Setup

SSH in: `ssh souqjari-db`

### Full Setup Script
```bash
#!/bin/bash
# Run as root on database server

# Update system
apt update && apt upgrade -y

# Install packages
apt install -y ufw fail2ban unattended-upgrades apt-listchanges htop curl wget net-tools

# Configure auto-updates
echo 'APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";' > /etc/apt/apt.conf.d/20auto-upgrades

# Configure UFW
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow from 10.0.0.0/24 to any port 5432
ufw allow from 10.0.0.0/24 proto icmp
ufw --force enable

# Configure Fail2Ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
ignoreip = 127.0.0.1/8 ::1 10.0.0.0/24

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
EOF

systemctl restart fail2ban
systemctl enable fail2ban

# Harden SSH
cat > /etc/ssh/sshd_config.d/hardening.conf << 'EOF'
PasswordAuthentication no
ChallengeResponseAuthentication no
UsePAM yes
PermitRootLogin prohibit-password
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
EOF

sshd -t && systemctl restart sshd

# Set timezone
timedatectl set-timezone UTC

# Create admin user
adduser --disabled-password --gecos "SouqJari Admin" souqadmin
usermod -aG sudo souqadmin
mkdir -p /home/souqadmin/.ssh
cp /root/.ssh/authorized_keys /home/souqadmin/.ssh/
chown -R souqadmin:souqadmin /home/souqadmin/.ssh
chmod 700 /home/souqadmin/.ssh
chmod 600 /home/souqadmin/.ssh/authorized_keys
echo "souqadmin ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/souqadmin

echo "Database server setup complete!"
ufw status verbose
fail2ban-client status
```

---

## App Server (souqjari-app) Setup

SSH in: `ssh souqjari-app`

### Full Setup Script
```bash
#!/bin/bash
# Run as root on app server

# Update system
apt update && apt upgrade -y

# Install packages
apt install -y ufw fail2ban unattended-upgrades apt-listchanges htop curl wget net-tools nginx certbot python3-certbot-nginx

# Configure auto-updates
echo 'APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";' > /etc/apt/apt.conf.d/20auto-upgrades

# Configure UFW
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow from 10.0.0.0/24
ufw --force enable

# Configure Fail2Ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
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

systemctl restart fail2ban
systemctl enable fail2ban

# Harden SSH
cat > /etc/ssh/sshd_config.d/hardening.conf << 'EOF'
PasswordAuthentication no
ChallengeResponseAuthentication no
UsePAM yes
PermitRootLogin prohibit-password
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
EOF

sshd -t && systemctl restart sshd

# Set timezone
timedatectl set-timezone UTC

# Create admin user
adduser --disabled-password --gecos "SouqJari Admin" souqadmin
usermod -aG sudo souqadmin
mkdir -p /home/souqadmin/.ssh
cp /root/.ssh/authorized_keys /home/souqadmin/.ssh/
chown -R souqadmin:souqadmin /home/souqadmin/.ssh
chmod 700 /home/souqadmin/.ssh
chmod 600 /home/souqadmin/.ssh/authorized_keys
echo "souqadmin ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/souqadmin

echo "App server setup complete!"
ufw status verbose
fail2ban-client status
ping -c 3 10.0.0.2
```

---

## Verification Commands

Run from local machine:

```bash
# Test SSH connectivity
ssh souqjari-db "hostname && uptime"
ssh souqjari-app "hostname && uptime"

# Test private network
ssh souqjari-app "ping -c 3 10.0.0.2"
ssh souqjari-db "ping -c 3 10.0.0.3"

# Check firewall status
ssh souqjari-db "ufw status numbered"
ssh souqjari-app "ufw status numbered"

# Check fail2ban
ssh souqjari-db "fail2ban-client status sshd"
ssh souqjari-app "fail2ban-client status sshd"

# Check services
ssh souqjari-app "systemctl status nginx --no-pager"

# Test DNS (run locally)
dig api.souqjari.com +short
dig studio.souqjari.com +short
curl -I https://api.souqjari.com
```

---

## Hetzner CLI Commands

```bash
# Install CLI
curl -Lo hcloud.tar.gz https://github.com/hetznercloud/cli/releases/latest/download/hcloud-linux-amd64.tar.gz
tar -xzf hcloud.tar.gz && sudo mv hcloud /usr/local/bin/ && rm hcloud.tar.gz

# Setup context
hcloud context create souqjari

# Create network
hcloud network create --name souqjari-internal --ip-range 10.0.0.0/16
hcloud network add-subnet souqjari-internal --type cloud --network-zone eu-central --ip-range 10.0.0.0/24

# Create servers (replace SSH key name if different)
hcloud server create --name souqjari-db --type ccx33 --image ubuntu-24.04 --location fsn1 --ssh-key souqjari-admin
hcloud server create --name souqjari-app --type cpx41 --image ubuntu-24.04 --location fsn1 --ssh-key souqjari-admin

# Attach to network
hcloud server attach-to-network souqjari-db --network souqjari-internal --ip 10.0.0.2
hcloud server attach-to-network souqjari-app --network souqjari-internal --ip 10.0.0.3

# List servers
hcloud server list
```

---

## Cloudflare DNS Records

Add these A records (all Proxied/Orange Cloud):

| Type | Name | Content |
|------|------|---------|
| A | @ | APP_SERVER_PUBLIC_IP |
| A | api | APP_SERVER_PUBLIC_IP |
| A | studio | APP_SERVER_PUBLIC_IP |

SSL/TLS Settings:
- Mode: **Full (strict)**
- Always Use HTTPS: **On**
- Minimum TLS Version: **1.2**

---

## Troubleshooting

```bash
# If locked out of SSH
# Use Hetzner Console's VNC/Console feature

# Reset firewall (emergency)
ssh souqjari-app "ufw disable"
# Then fix rules and re-enable

# Check auth logs
ssh souqjari-app "tail -50 /var/log/auth.log"

# Check fail2ban bans
ssh souqjari-app "fail2ban-client status sshd"
ssh souqjari-app "fail2ban-client set sshd unbanip YOUR_IP"
```

---

## Expected Monthly Costs

| Item | Cost |
|------|------|
| CPX41 (App) | ~€15 |
| CCX33 (DB) | ~€65 |
| **Total** | **~€80** |
