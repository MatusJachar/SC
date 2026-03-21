# Spiš Castle — Ultimate Audio Guide App

## Complete Self-Hosting Package

---

## Package Contents

```
spis-castle-export/
├── README.md
├── backend/                     # FastAPI server
│   ├── server.py               # Main API (all endpoints)
│   ├── requirements.txt        # Python dependencies
│   ├── import_data.py          # Data import utility
│   ├── .env.example            # Environment template
│   └── *.json                  # Config & data files
├── frontend/                    # Expo React Native app
│   ├── app/                    # Routes (15+ screens)
│   ├── components/             # Reusable UI components
│   ├── constants/              # API URLs, colors
│   ├── context/                # App state, offline caching
│   ├── app.json                # Expo config
│   └── package.json            # Node dependencies
├── database/                    # MongoDB JSON dumps (14 collections)
│   ├── tour_stops.json         # 17 stops (13 + 4 legends)
│   ├── site_settings.json      # Site configuration
│   ├── shop_products.json      # 21 souvenir items
│   ├── vr_content.json         # VR experiences
│   ├── premium_settings.json   # Pricing (0.99€, 1.99€, 2.99€)
│   ├── partners.json           # Business partners
│   ├── purchase_codes.json     # Access codes
│   ├── restore_db.sh           # One-click DB restore script
│   └── ...
├── assets/
│   └── uploads/                # Media files (555MB)
│       ├── audio/ (153 MP3s)   # 9 languages × 17 stops
│       ├── videos/ (3 MP4s)    # Castle videos
│       ├── images/             # Castle images, map, partner logos
│       └── vr/                 # VR video files
└── docker/                      # Docker deployment
    ├── docker-compose.yml      # Full stack orchestration
    ├── Dockerfile.backend
    ├── nginx.conf
    └── init-db/                # Auto DB import
```

---

## Option 1: Docker Deployment (Recommended)

### Prerequisites
- Docker Engine 20.10+
- Docker Compose v2.0+

### Quick Start

```bash
cd spis-castle-export/docker
docker compose up -d

# Check:
docker compose ps
# API: http://localhost/api/health
```

### Configuration
Edit `docker-compose.yml`:

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `change-this-...` | **Change this!** JWT signing key |
| `MONGO_URL` | `mongodb://mongodb:27017` | MongoDB connection |
| `DB_NAME` | `spis_castle` | Database name |

---

## Option 2: Manual Deployment

### Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your MongoDB URL
mkdir -p uploads && cp -r ../assets/uploads/* uploads/
cd ../database && ./restore_db.sh
cd ../backend && uvicorn server:app --host 0.0.0.0 --port 8001
```

### Frontend (Expo Mobile App)
```bash
cd frontend
yarn install
# Update EXPO_PUBLIC_BACKEND_URL in .env to your server
npx expo start
# Build: npx eas build --platform android
```

---

## App Features

### Free (Express Tour)
- 30-minute guided tour (9 languages)
- Castle legends
- Information section
- Souvenir shop catalog
- Partner businesses

### Premium (0.99€ — Complete Tour)
- Family Tour + Complete Tour (all 17 stops)
- Full audio guide in 9 languages

### Premium (1.99€ — VR Experience)
- Virtual reality castle tours
- 360° panoramic views

### Premium (2.99€ — Bundle)
- Complete Tour + VR Experience

### Monetization Features
- **Access code system** — generate codes via Admin, sell at ticket booth
- **Group bulk codes** — discounted codes for schools/tour groups
- **Partner listings** — local businesses pay for featured placement with logos
- **Support Developer** — voluntary tip jar (0.99€ - 9.99€)
- **Google AdMob ready** — banner ads on free content (needs AdMob account)

---

## Admin Panel

**Login:** admin / admin123

**Tabs:**
- **Stops** — Edit tour stops, translations, audio URLs
- **Settings** — Site name, hero image, castle map, social links
- **QR** — QR code management
- **Shop** — Souvenir products
- **Videos** — Video showcase
- **VR** — VR content (add/edit/delete, set premium flag, price)
- **Premium** — Set prices, generate access codes, view usage
- **Partners** — Business listings (name, logo, phone, website, category)

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/tour-stops` | All tour stops |
| GET | `/api/vr-content` | VR experiences |
| GET | `/api/partners` | Business partners |
| GET | `/api/premium/settings` | Pricing |
| POST | `/api/premium/redeem` | Redeem access code |
| GET | `/api/premium/status/{device_id}` | Check unlocks |
| POST | `/api/tips` | Record donation |
| POST | `/api/admin/login` | Admin auth |
| POST | `/api/admin/premium/generate-codes` | Generate codes |
| POST | `/api/admin/premium/generate-bulk` | Bulk codes for groups |

---

## Revenue Strategy

| Source | Estimated Monthly (Peak) |
|--------|--------------------------|
| Complete Tour (0.99€) | ~100-150€ |
| VR Experience (1.99€) | ~50-100€ |
| Bundle (2.99€) | ~30-50€ |
| Partner listings (50€/season) | ~50-100€ |
| Tips / donations | ~20-40€ |
| AdMob (if enabled) | ~30-50€ |
| **Total** | **~280-490€/month** |

---

## SSL Setup (Production)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```
