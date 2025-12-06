# SouqShamy Self-Hosted Supabase Documentation

This documentation guides you through setting up a self-hosted Supabase instance accessible from Syria.

## Why Self-Host?

- **Supabase Cloud** (US-hosted) blocks Syrian IP addresses due to OFAC sanctions
- **SMS providers** like Twilio/Vonage don't service Syria
- **Docker Hub** blocks Syrian IPs, requiring air-gapped deployment

## Solution

Deploy Supabase on a European VPS (Hetzner/Contabo) with:
- Cloudflare for DDoS protection and SSL
- Air-gapped Docker image deployment
- Syriatel SMS integration for OTP

---

## Documentation Index

### Phase 1: Infrastructure Setup *(Current)*

| Document | Description |
|----------|-------------|
| [PHASE1-INFRASTRUCTURE.md](./PHASE1-INFRASTRUCTURE.md) | Main setup guide for VPS and Docker |
| [QUICKSTART-WINDOWS.md](./QUICKSTART-WINDOWS.md) | Quick reference for Windows 11 users |
| [PHASE1-CHECKLIST.md](./PHASE1-CHECKLIST.md) | Completion checklist |
| [config/cloudflare-setup.md](./config/cloudflare-setup.md) | Cloudflare DNS & security setup |

### Scripts

| Script | Description |
|--------|-------------|
| [scripts/server-setup.sh](./scripts/server-setup.sh) | Ubuntu 24.04 hardening script |
| [scripts/install-docker.sh](./scripts/install-docker.sh) | Docker installation script |

### Upcoming Phases

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 2 | Supabase Deployment (air-gapped) | Planned |
| Phase 3 | Database Migration | Planned |
| Phase 4 | App Integration | Planned |
| Phase 5 | SMS OTP Integration (Syriatel) | Planned |

---

## Quick Start

### For Windows 11 Users

See [QUICKSTART-WINDOWS.md](./QUICKSTART-WINDOWS.md) for copy-paste commands.

### TL;DR Setup Flow

```bash
# 1. Generate SSH key and create VPS at Hetzner

# 2. Copy and run server setup script
scp scripts/server-setup.sh root@YOUR_IP:/root/
ssh root@YOUR_IP "chmod +x /root/server-setup.sh && /root/server-setup.sh"

# 3. Test deploy user login
ssh deploy@YOUR_IP

# 4. Install Docker
scp scripts/install-docker.sh deploy@YOUR_IP:/home/deploy/
ssh deploy@YOUR_IP "chmod +x install-docker.sh && ./install-docker.sh"

# 5. Configure Cloudflare DNS
# Follow config/cloudflare-setup.md
```

---

## Server Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 4 GB | 8 GB |
| vCPUs | 2 | 4 |
| Storage | 40 GB SSD | 80 GB SSD |
| OS | Ubuntu 22.04 | Ubuntu 24.04 LTS |
| Location | EU (non-US) | Hetzner Helsinki/Nuremberg |

---

## Architecture Overview

```
[Syrian Users]
      ↓
[Cloudflare] ← DDoS Protection, SSL, CDN
      ↓
[European VPS] ← Hetzner/Contabo
      │
      ├── [Nginx] ← Reverse Proxy
      │
      ├── [Kong] ← API Gateway
      │
      ├── [GoTrue] ← Authentication
      │     └── [Syriatel SMS] ← OTP
      │
      ├── [PostgREST] ← REST API
      │
      ├── [Realtime] ← WebSocket
      │
      ├── [Storage] ← File Storage
      │
      └── [PostgreSQL] ← Database
```

---

## Cost Estimate

| Service | Monthly Cost |
|---------|-------------|
| Hetzner CX31 | ~€10.59 |
| Cloudflare | Free |
| Domain | ~€10/year |
| **Total** | **~€12/month** |

---

## Support

If you encounter issues:
1. Check the relevant troubleshooting section
2. Review server logs: `journalctl -xe`
3. Check Docker logs: `docker logs <container>`
4. File an issue in the repository
