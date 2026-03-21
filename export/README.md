# 🏰 Spiš Castle - Ultimate Audio Guide App

## Complete Self-Hosting Package

This package contains everything you need to run the Spiš Castle Audio Guide application on your own server.

---

## 📦 Package Contents

```
spis-castle-export/
├── README.md                    # This file
├── backend/                     # FastAPI backend server
│   ├── server.py               # Main API server (all endpoints)
│   ├── requirements.txt        # Python dependencies
│   ├── import_data.py          # Initial data import script
│   ├── tour_stops_import.json  # Tour stop data
│   ├── audio_index.json        # Audio file index
│   ├── app_config.json         # App configuration
│   └── .env.example            # Environment variables template
├── frontend/                    # Expo React Native mobile app
│   ├── app/                    # Screen routes (Expo Router)
│   ├── components/             # Reusable components
│   ├── constants/              # API URLs, colors
│   ├── context/                # App state (offline, caching)
│   ├── app.json                # Expo configuration
│   ├── package.json            # Node dependencies
│   └── tsconfig.json           # TypeScript config
├── database/                    # MongoDB JSON dumps
│   ├── tour_stops.json         # 17 stops (13 tour + 4 legends)
│   ├── site_settings.json      # Site configuration
│   ├── shop_products.json      # 21 souvenir items
│   ├── languages.json          # 9 supported languages
│   ├── videos.json             # 3 video entries
│   ├── site_info.json          # Site information per language
│   ├── shop_settings.json      # Shop configuration
│   └── admins.json             # Admin users
├── assets/
│   └── uploads/                # Media files
│       ├── audio/              # 153 MP3 files (9 languages × 17 stops)
│       ├── videos/             # 3 compressed MP4 videos
│       ├── images/             # Castle images and map
│       ├── ambient/            # Ambient sounds
│       └── vr/                 # VR content
└── docker/                      # Docker deployment files
    ├── docker-compose.yml      # Full stack orchestration
    ├── Dockerfile.backend      # Backend container build
    ├── nginx.conf              # Reverse proxy configuration
    └── init-db/                # Auto DB import on first run
        ├── 01-restore.sh       # Import script
        └── data/               # JSON dumps for auto-import
```

---

## 🐳 Option 1: Docker Deployment (Recommended)

### Prerequisites
- Docker Engine 20.10+
- Docker Compose v2.0+

### Quick Start

```bash
# 1. Clone/extract the export
cd spis-castle-export

# 2. Start all services
cd docker
docker compose up -d

# 3. Check services are running
docker compose ps

# 4. Access the app
# API:     http://localhost:8001/api/health
# Web:     http://localhost
# Admin:   Login via mobile app → Admin section
```

### First-time Setup

On first launch, MongoDB will automatically import all data from `docker/init-db/data/`.

The audio, video, and image files are mounted from `assets/uploads/` into the backend container.

### Admin Credentials
- **Username:** `admin`
- **Password:** `admin123`

### Environment Variables

Edit `docker/docker-compose.yml` to change:
| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URL` | `mongodb://mongodb:27017` | MongoDB connection |
| `DB_NAME` | `spis_castle` | Database name |
| `JWT_SECRET` | `change-this-...` | JWT signing secret ⚠️ Change this! |

### Stopping Services
```bash
cd docker
docker compose down          # Stop containers
docker compose down -v       # Stop + remove data volumes
```

---

## 🔧 Option 2: Manual Deployment

### Prerequisites
- Python 3.11+
- Node.js 18+ & Yarn
- MongoDB 7.0+

### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your MongoDB connection string

# Create uploads directory and copy assets
mkdir -p uploads
cp -r ../assets/uploads/* uploads/

# Import database
# (Ensure MongoDB is running first)
mongoimport --db spis_castle --collection tour_stops --file ../database/tour_stops.json --jsonArray --drop
mongoimport --db spis_castle --collection site_settings --file ../database/site_settings.json --jsonArray --drop
mongoimport --db spis_castle --collection shop_products --file ../database/shop_products.json --jsonArray --drop
mongoimport --db spis_castle --collection site_info --file ../database/site_info.json --jsonArray --drop
mongoimport --db spis_castle --collection shop_settings --file ../database/shop_settings.json --jsonArray --drop
mongoimport --db spis_castle --collection admins --file ../database/admins.json --jsonArray --drop
mongoimport --db spis_castle --collection languages --file ../database/languages.json --jsonArray --drop
mongoimport --db spis_castle --collection videos --file ../database/videos.json --jsonArray --drop

# Start the server
uvicorn server:app --host 0.0.0.0 --port 8001
```

### Frontend Setup (Expo Mobile App)

```bash
cd frontend

# Install dependencies
yarn install

# Update API URL in constants/api.ts or .env
# Set EXPO_PUBLIC_BACKEND_URL to your server address
# Example: EXPO_PUBLIC_BACKEND_URL=https://your-domain.com

# Start development server
npx expo start

# Build for production
npx eas build --platform android
npx eas build --platform ios
```

---

## 🌐 Production Deployment Notes

### Domain Setup
1. Point your domain to your server
2. Update `nginx.conf` with your domain name
3. Add SSL (Let's Encrypt recommended):
   ```bash
   # Install certbot
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Frontend API URL
Before building the mobile app for production, update the API base URL:
- Edit `frontend/constants/api.ts` — change the fallback URL
- Or set `EXPO_PUBLIC_BACKEND_URL=https://your-domain.com` in `frontend/.env`

### Backup
```bash
# Backup database
mongodump --db spis_castle --out /path/to/backup/

# Backup uploads
tar -czf uploads-backup.tar.gz assets/uploads/
```

---

## 📱 App Features

- **3 Tour Types**: Express (30min), Family, Complete
- **9 Languages**: English, Slovak, German, French, Spanish, Polish, Hungarian, Russian, Chinese
- **17 Tour Stops**: 13 main stops + 4 legends with audio guides
- **Offline Mode**: Full content caching for use without internet
- **Souvenir Shop**: 21 items catalog
- **Video Showcase**: 3 castle videos
- **Admin Dashboard**: Full CRUD for all content
- **Dark Theme UI** with yellowish-orange accent colors

---

## 🔑 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/tour-stops` | All tour stops |
| GET | `/api/languages` | Available languages |
| GET | `/api/site-settings` | Site configuration |
| GET | `/api/site-info?language=en` | Site info by language |
| GET | `/api/videos` | Video list |
| GET | `/api/shop/products` | Shop products |
| POST | `/api/admin/login` | Admin authentication |
| PUT | `/api/admin/tour-stops/{id}` | Update tour stop |
| PUT | `/api/admin/site-settings` | Update site settings |

---

## 📝 License

This application was built for Spiš Castle tourism. All audio content, images, and videos are the property of their respective owners.
