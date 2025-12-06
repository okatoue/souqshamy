# Phase 1 Completion Checklist

Use this checklist to verify all Phase 1 steps are completed correctly.

---

## 1. VPS Setup

### Provider & Server
- [ ] VPS provider account created (Hetzner/Contabo)
- [ ] Payment method added
- [ ] Server created with:
  - [ ] Ubuntu 24.04 LTS
  - [ ] Minimum 8GB RAM
  - [ ] Minimum 2 vCPUs
  - [ ] Minimum 80GB SSD
  - [ ] European location (Helsinki/Nuremberg/Frankfurt)

### Server Details (Fill In)
```
Provider: ________________
Plan: ________________
Location: ________________
Server Name: ________________
IPv4 Address: ________________
IPv6 Address: ________________
```

---

## 2. SSH Access

### Local Machine
- [ ] SSH key pair generated
- [ ] Public key copied to VPS provider

### Server Access
- [ ] Root login works: `ssh root@YOUR_IP`
- [ ] Deploy user created
- [ ] Deploy user has sudo access
- [ ] Deploy user SSH login works: `ssh deploy@YOUR_IP`
- [ ] Root login disabled
- [ ] Password authentication disabled

### Verification Commands
```bash
# Test deploy user login (should work)
ssh deploy@YOUR_IP

# Test root login (should fail)
ssh root@YOUR_IP

# Test password login (should fail)
ssh -o PreferredAuthentications=password deploy@YOUR_IP
```

---

## 3. Server Hardening

### System Updates
- [ ] `apt update && apt upgrade` completed
- [ ] Essential packages installed

### Security Configuration
- [ ] UFW firewall enabled
- [ ] Only ports 22, 80, 443 open
- [ ] Fail2Ban installed and running
- [ ] SSH hardening applied

### Performance Tuning
- [ ] Swap space created (4GB)
- [ ] System limits configured
- [ ] Sysctl parameters optimized

### Verification Commands
```bash
# Check firewall
sudo ufw status

# Expected output:
# Status: active
# 22/tcp  ALLOW  Anywhere
# 80/tcp  ALLOW  Anywhere
# 443/tcp ALLOW  Anywhere

# Check Fail2Ban
sudo fail2ban-client status sshd

# Check swap
free -h

# Check system limits
ulimit -n
```

---

## 4. Docker Installation

### Installation
- [ ] Docker Engine installed
- [ ] Docker Compose installed
- [ ] Deploy user added to docker group
- [ ] Docker service running

### Configuration
- [ ] Docker daemon.json configured
- [ ] Supabase directory created at /opt/supabase
- [ ] Docker network 'supabase-network' created

### Verification Commands
```bash
# Docker version
docker --version
# Expected: Docker version 24.x or later

# Docker Compose version
docker compose version
# Expected: Docker Compose version v2.x

# Test Docker
docker run --rm hello-world
# Should print "Hello from Docker!"

# Check Docker service
sudo systemctl status docker
# Should show "active (running)"

# Check network
docker network ls | grep supabase
# Should show "supabase-network"
```

---

## 5. Domain & DNS

### Cloudflare Setup
- [ ] Domain added to Cloudflare
- [ ] Nameservers updated at registrar
- [ ] DNS propagation completed (check with `dig`)

### DNS Records Created
- [ ] `api` → Server IP (Proxied)
- [ ] `studio` → Server IP (Proxied)
- [ ] `storage` → Server IP (Proxied)
- [ ] `realtime` → Server IP (DNS Only)

### SSL/TLS
- [ ] SSL mode set to Full (strict)
- [ ] Origin certificate created
- [ ] Certificate installed on server at `/etc/ssl/cloudflare/`
- [ ] Always Use HTTPS enabled

### Domain Details (Fill In)
```
Domain: ________________
API URL: https://api.________________
Studio URL: https://studio.________________
Storage URL: https://storage.________________
Realtime URL: wss://realtime.________________
```

### Verification Commands
```bash
# Check DNS resolution (from any machine)
dig api.yourdomain.com +short
dig studio.yourdomain.com +short

# Check SSL certificate on server
ls -la /etc/ssl/cloudflare/

# Test HTTP response (after Supabase deployment)
curl -I https://api.yourdomain.com
```

---

## 6. Final Verification

### Server Health
```bash
# System info
hostnamectl

# Resources
free -h
df -h
nproc

# Network
ip addr show
ss -tlnp
```

### Security Status
```bash
# All services running
sudo systemctl status sshd
sudo systemctl status ufw
sudo systemctl status fail2ban
sudo systemctl status docker

# No failed services
sudo systemctl list-units --state=failed
```

### Expected Output Summary
| Component | Status |
|-----------|--------|
| SSH Service | Running |
| UFW Firewall | Active |
| Fail2Ban | Running |
| Docker | Running |
| Swap | Enabled (4GB) |

---

## Credentials & Secrets (Store Securely)

**IMPORTANT:** Store these in a password manager, not in plain text.

### Server Access
```
SSH Command: ssh deploy@________________
SSH Key Location: ~/.ssh/id_ed25519
Server IP: ________________
```

### Cloudflare (for later phases)
```
API Token: ________________
Zone ID: ________________
```

### Domain
```
Registrar: ________________
Registrar Login: ________________
Domain: ________________
```

---

## Troubleshooting Checklist

If something isn't working:

### Can't SSH to Server
- [ ] Verify IP address is correct
- [ ] Check SSH key is added to server
- [ ] Try: `ssh -v deploy@YOUR_IP` for debug output

### Firewall Blocking Traffic
- [ ] Check UFW status: `sudo ufw status`
- [ ] Ensure port 22 is allowed
- [ ] Use Hetzner Console for emergency access

### Docker Permission Denied
- [ ] Verify user is in docker group: `groups`
- [ ] Run: `newgrp docker`
- [ ] Or log out and log back in

### DNS Not Resolving
- [ ] Wait for propagation (up to 24 hours)
- [ ] Verify nameservers at registrar
- [ ] Check with: https://www.whatsmydns.net/

---

## Ready for Phase 2?

All checkboxes should be complete before proceeding to Phase 2.

**Phase 2 Preview:**
- Pull Supabase Docker images (on unrestricted machine)
- Transfer images to VPS
- Configure and deploy Supabase
- Test all services

---

## Support Resources

- Hetzner Console: https://console.hetzner.cloud/
- Cloudflare Dashboard: https://dash.cloudflare.com/
- Supabase Self-Hosting Docs: https://supabase.com/docs/guides/self-hosting
