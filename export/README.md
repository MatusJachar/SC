# Spiš Castle — Ultimate Audio Guide App
### Complete Self-Hosting Package for Hetzner

---

## Quick Deploy on Hetzner (5 minutes)

```bash
# 1. Upload this folder to your Hetzner server
scp -r spis-castle-export/ root@YOUR_SERVER_IP:/root/

# 2. SSH into server
ssh root@YOUR_SERVER_IP

# 3. Run the deploy script
cd /root/spis-castle-export/scripts
chmod +x *.sh
./deploy-hetzner.sh

# 4. (Optional) Setup SSL
./setup-ssl.sh your-domain.com

# Done! API is at http://YOUR_IP/api/health
```

---

## Package Structure

```
spis-castle-export/
├── README.md
├── backend/                     # FastAPI API server
│   ├── server.py               # All endpoints (~1600 lines)
│   ├── requirements.txt
│   └── .env.example
├── frontend/                    # Expo React Native app
│   ├── app/                    # 15+ screens (Expo Router)
│   ├── components/
│   ├── constants/
│   ├── context/
│   ├── app.json
│   └── package.json
├── database/                    # MongoDB dumps (14 collections)
│   ├── tour_stops.json         # 17 stops (13 + 4 legends)
│   ├── vr_content.json         # VR experiences
│   ├── premium_settings.json   # Pricing
│   ├── partners.json           # Business partners
│   ├── restore_db.sh           # Manual restore script
│   └── ...
├── assets/uploads/              # Media (555MB)
│   ├── audio/ (153 MP3s)
│   ├── videos/ (3 MP4s)
│   ├── images/
│   └── vr/
├── docker/
│   ├── docker-compose.yml      # Production-ready
│   ├── Dockerfile.backend
│   ├── nginx.conf              # With SSL support
│   └── init-db/                # Auto DB import
└── scripts/
    ├── deploy-hetzner.sh       # One-click server setup
    ├── setup-ssl.sh            # SSL certificate setup
    └── backup.sh               # Daily backup (add to cron)
```

---

## Hetzner Recommended Setup

### Server
- **CX22** (2 vCPU, 4GB RAM) — 4.35€/month — perfect for this app
- **OS**: Ubuntu 22.04
- **Location**: Falkenstein (DE) or Helsinki — closest to Slovakia

### Domain
- Point A record to your Hetzner server IP
- Run `./setup-ssl.sh your-domain.com` for free HTTPS

### Automated Backups
```bash
# Add to crontab (daily 3 AM backup)
crontab -e
# Add this line:
0 3 * * * /root/spis-castle-export/scripts/backup.sh
```

---

## Admin Panel

**Login:** admin / admin123 (CHANGE THIS!)

| Tab | What you can manage |
|-----|-------------------|
| Stops | Tour stops, translations, audio URLs |
| Settings | Site name, hero image, castle map, social links |
| QR | QR code management |
| Shop | Souvenir products |
| Videos | Video showcase |
| VR | VR content (premium flag, price) |
| Premium | Prices, generate access codes, view usage |
| Partners | Business listings with logos |

---

## Monetization Summary

| Product | Price | How to sell |
|---------|-------|-------------|
| App download | 0.99€ | Google Play Store |
| Complete Tour | 0.99€ | Access code at ticket booth |
| VR Experience | 1.99€ | Access code at ticket booth |
| Bundle (Tour+VR) | 2.99€ | Access code at ticket booth |
| Partner listing | 50-100€/season | Sell to local businesses |
| Tips | Voluntary | In-app tip jar |

### How access codes work:
1. Admin → Premium tab → Generate codes (e.g., 50 codes)
2. Print codes on cards, sell at castle ticket booth
3. Visitor enters code in app → content unlocked

---

## Publishing the Mobile App

### Google Play Store
```bash
cd frontend

# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login to Expo
eas login

# 3. Configure
eas build:configure

# 4. Update API URL in .env
# EXPO_PUBLIC_BACKEND_URL=https://your-domain.com

# 5. Build APK/AAB
eas build --platform android

# 6. Submit to Play Store
eas submit --platform android
```

**Play Store setup:**
- Developer account: 25€ one-time fee
- Set price: 0.99€
- Category: Travel & Local
- Target: Slovakia, Europe

### Apple App Store (if needed later)
- Developer account: 99€/year
- `eas build --platform ios`
- `eas submit --platform ios`

---

## Common Operations

### Restart services
```bash
cd /root/spis-castle-export/docker
docker compose restart
```

### View logs
```bash
docker logs spis-backend -f
docker logs spis-mongo -f
docker logs spis-nginx -f
```

### Update backend code
```bash
# Edit server.py, then:
docker compose up -d --build backend
```

### Manual DB backup/restore
```bash
# Backup
docker exec spis-mongo mongodump --db spis_castle --out /tmp/backup
docker cp spis-mongo:/tmp/backup ./backup

# Restore
docker cp ./backup spis-mongo:/tmp/restore
docker exec spis-mongo mongorestore --db spis_castle /tmp/restore/spis_castle --drop
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Health check |
| GET | `/api/tour-stops` | No | All tour stops |
| GET | `/api/languages` | No | Available languages |
| GET | `/api/site-settings` | No | Site config |
| GET | `/api/vr-content` | No | VR experiences |
| GET | `/api/partners` | No | Business partners |
| GET | `/api/premium/settings` | No | Pricing |
| POST | `/api/premium/redeem` | No | Redeem access code |
| GET | `/api/premium/status/{id}` | No | Check device unlocks |
| POST | `/api/tips` | No | Record tip |
| POST | `/api/admin/login` | No | Get admin token |
| PUT | `/api/admin/tour-stops/{id}` | JWT | Edit tour stop |
| PUT | `/api/admin/site-settings` | JWT | Edit settings |
| POST | `/api/admin/vr-content` | JWT | Create VR item |
| POST | `/api/admin/partners` | JWT | Create partner |
| POST | `/api/admin/premium/generate-codes` | JWT | Generate codes |
| POST | `/api/admin/premium/generate-bulk` | JWT | Bulk codes |

---

## Costs Summary

| Item | Cost |
|------|------|
| Hetzner CX22 server | 4.35€/month |
| Domain (optional) | ~10€/year |
| Google Play account | 25€ one-time |
| **Total monthly** | **~5€/month** |

With even 50 paid downloads/month (0.99€) you cover server costs.
With access code sales at the castle, you're profitable from day one.

---

**Built with FastAPI + Expo React Native + MongoDB**
