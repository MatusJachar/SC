"""
ULTIMATE SPIŠSKÝ HRAD AUDIO GUIDE - BACKEND API
Features:
- 12 Tour Stops + 4 Legends in 9 Languages
- Full Admin Panel with Mobile-Friendly Management
- QR Code Generation for Physical Location Markers
- Offline Package Download
- Sound Therapy / Ambient Sound Support
- Video & VR File Support
- Complete Content Management
"""

from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Depends, status, Request, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
import base64
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
import aiofiles
import qrcode
from qrcode.image.pure import PyPNGImage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# Create uploads directories
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
(UPLOAD_DIR / "audio").mkdir(exist_ok=True)
(UPLOAD_DIR / "images").mkdir(exist_ok=True)
(UPLOAD_DIR / "videos").mkdir(exist_ok=True)
(UPLOAD_DIR / "vr").mkdir(exist_ok=True)
(UPLOAD_DIR / "ambient").mkdir(exist_ok=True)

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'spissky-hrad-ultimate-secret-2024-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days for mobile convenience

# Create the main app
app = FastAPI(title="Spišský Hrad Ultimate Audio Guide API", version="2.0.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ==================== MODELS ====================

class AdminUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    role: str = "admin"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminRegister(BaseModel):
    username: str
    password: str
    admin_code: str  # Secret code to register as admin

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = JWT_EXPIRATION_HOURS * 3600

class Language(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    name: str
    native_name: str
    flag_emoji: str
    flag_image_url: Optional[str] = None
    is_active: bool = True
    order: int = 0

class LanguageCreate(BaseModel):
    code: str
    name: str
    native_name: str
    flag_emoji: str
    flag_image_url: Optional[str] = None
    is_active: bool = True
    order: int = 0

class TourStopTranslation(BaseModel):
    language_code: str
    title: str = ""
    short_description: str = ""
    description: str = ""
    audio_url: Optional[str] = None
    video_url: Optional[str] = None
    vr_url: Optional[str] = None

class TourStop(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stop_number: int
    stop_type: Literal["tour", "legend"] = "tour"  # tour = numbered stop, legend = story with book icon
    image_url: Optional[str] = None
    gallery_images: List[str] = []
    translations: List[TourStopTranslation] = []
    duration_seconds: int = 0
    ambient_sound_url: Optional[str] = None  # Sound therapy / background ambiance
    qr_code_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8].upper())
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TourStopCreate(BaseModel):
    stop_number: int
    stop_type: Literal["tour", "legend"] = "tour"
    image_url: Optional[str] = None
    gallery_images: List[str] = []
    translations: List[TourStopTranslation] = []
    duration_seconds: int = 0
    ambient_sound_url: Optional[str] = None
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    is_active: bool = True

class TourStopUpdate(BaseModel):
    stop_number: Optional[int] = None
    stop_type: Optional[Literal["tour", "legend"]] = None
    image_url: Optional[str] = None
    gallery_images: Optional[List[str]] = None
    translations: Optional[List[TourStopTranslation]] = None
    duration_seconds: Optional[int] = None
    ambient_sound_url: Optional[str] = None
    qr_code_id: Optional[str] = None
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    is_active: Optional[bool] = None

class SiteInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    language_code: str
    title: str
    subtitle: str = ""
    description: str
    short_description: str = ""
    hero_image_url: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SiteInfoUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    hero_image_url: Optional[str] = None

class SiteSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default="main")
    site_name: str = "Spišský Hrad"
    site_subtitle: str = "Ultimate Audio Guide"
    welcome_description: str = "Discover the largest castle complex in Central Europe"
    logo_url: Optional[str] = None
    default_hero_image: str = "https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=1200&q=80"
    primary_color: str = "#5D4037"
    secondary_color: str = "#D4AF37"
    background_ambient_url: Optional[str] = None  # Global ambient sound
    enable_offline_mode: bool = True
    enable_sound_therapy: bool = True
    enable_vr_mode: bool = True
    castle_map_url: Optional[str] = None  # Castle map image URL
    social_links: Optional[dict] = None  # Social media links
    admin_password: str = "spissky2024"  # Default admin password for setup
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SiteSettingsUpdate(BaseModel):
    site_name: Optional[str] = None
    site_subtitle: Optional[str] = None
    welcome_description: Optional[str] = None
    logo_url: Optional[str] = None
    default_hero_image: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    background_ambient_url: Optional[str] = None
    enable_offline_mode: Optional[bool] = None
    enable_sound_therapy: Optional[bool] = None
    enable_vr_mode: Optional[bool] = None
    castle_map_url: Optional[str] = None
    social_links: Optional[dict] = None
    admin_password: Optional[str] = None

# Souvenir Shop Models
class ShopProduct(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    price: float = 0.0
    currency: str = "EUR"
    icon: str = "gift"
    image_url: Optional[str] = None
    is_active: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShopProductCreate(BaseModel):
    name: str
    description: str = ""
    price: float = 0.0
    currency: str = "EUR"
    icon: str = "gift"
    image_url: Optional[str] = None
    is_active: bool = True
    order: int = 0

class ShopProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    icon: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None

class ShopSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default="shop")
    shop_name: str = "Castle Gift Shop"
    shop_description: str = "Visit the shop located at the castle entrance. Take home a piece of medieval history!"
    opening_hours: str = "Daily 9:00 - 17:00 (May - October)\nDaily 10:00 - 15:00 (November - April)"
    location: str = "At the castle entrance"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShopSettingsUpdate(BaseModel):
    shop_name: Optional[str] = None
    shop_description: Optional[str] = None
    opening_hours: Optional[str] = None
    location: Optional[str] = None


# ==================== VIDEO MODELS ====================

class VideoItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    video_url: str
    thumbnail_url: Optional[str] = None
    order: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VideoItemCreate(BaseModel):
    name: str
    description: str = ""
    video_url: str
    thumbnail_url: Optional[str] = None
    order: int = 0

class VideoItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

# ==================== VR CONTENT MODELS ====================

class VRContent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str = ""
    video_url: str
    thumbnail_url: Optional[str] = None
    is_premium: bool = False
    price: float = 0.0
    currency: str = "EUR"
    order: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VRContentCreate(BaseModel):
    title: str
    description: str = ""
    video_url: str
    thumbnail_url: Optional[str] = None
    is_premium: bool = False
    price: float = 0.0
    order: int = 0

class VRContentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_premium: Optional[bool] = None
    price: Optional[float] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

# ==================== PURCHASE / PREMIUM MODELS ====================

class PurchaseCode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    product_type: str  # "complete_tour", "vr_experience", "bundle"
    price: float = 0.0
    currency: str = "EUR"
    is_used: bool = False
    used_by_device: Optional[str] = None
    used_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PremiumSettings(BaseModel):
    complete_tour_price: float = 0.99
    vr_experience_price: float = 1.99
    bundle_price: float = 2.99
    currency: str = "EUR"

class PurchaseVerify(BaseModel):
    code: str
    product_type: str
    device_id: str

# ==================== PARTNER BUSINESS MODELS ====================

class PartnerBusiness(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    logo_url: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    category: str = "restaurant"  # restaurant, hotel, shop, transport, attraction, other
    is_active: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PartnerBusinessCreate(BaseModel):
    name: str
    description: str = ""
    logo_url: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    category: str = "restaurant"
    order: int = 0

class PartnerBusinessUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None

# ==================== TIP / DONATION MODEL ====================

class TipRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    amount: float
    currency: str = "EUR"
    device_id: str
    message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, username: str) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== QR CODE GENERATION ====================

def generate_qr_code(data: str, size: int = 300) -> bytes:
    """Generate QR code as PNG bytes with castle icon in center"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    # Try styled QR with logo
    try:
        from PIL import Image, ImageDraw, ImageFont
        import io as _io
        
        # Create base QR image
        img = qr.make_image(fill_color="#1A1A2E", back_color="white").convert('RGB')
        img = img.resize((300, 300), Image.LANCZOS)
        
        # Load real castle logo if available
        logo_path = ROOT_DIR / 'uploads' / 'images' / 'castle_logo.png'
        if logo_path.exists():
            logo = Image.open(str(logo_path)).convert('RGBA')
        else:
            # Fallback: draw simple castle
            logo = Image.new('RGBA', (logo_size, logo_size), '#D4A017')
            draw = ImageDraw.Draw(logo)
            draw.rectangle([5, 30, 55, 55], fill='#1A1A2E')
            draw.rectangle([5, 15, 18, 32], fill='#1A1A2E')
            draw.rectangle([41, 15, 55, 32], fill='#1A1A2E')
            draw.rectangle([23, 20, 37, 32], fill='#1A1A2E')
        logo = logo.resize((logo_size, logo_size), Image.LANCZOS)
        
        # Paste logo in center
        pos = ((img.width - logo_size) // 2, (img.height - logo_size) // 2)
        img.paste(logo, pos, logo)
        
        buffer = _io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        return buffer.getvalue()
    except Exception:
        # Fallback to plain QR
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        return buffer.getvalue()

# ==================== PUBLIC ROUTES ====================

@api_router.get("/")
async def root():
    return {
        "message": "Spišský Hrad Ultimate Audio Guide API",
        "version": "2.0.0",
        "features": [
            "12 Tour Stops + 4 Legends",
            "9 Languages",
            "QR Code Integration",
            "Offline Mode",
            "Sound Therapy",
            "Video & VR Support",
            "Full Admin Panel"
        ]
    }

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Languages - Public
@api_router.get("/languages", response_model=List[Language])
async def get_languages():
    languages = await db.languages.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    return languages

# Tour Stops - Public
@api_router.get("/tour-stops", response_model=List[TourStop])
async def get_tour_stops(stop_type: Optional[str] = None):
    query = {"is_active": True}
    if stop_type:
        query["stop_type"] = stop_type
    
    tour_stops = await db.tour_stops.find(query, {"_id": 0}).sort([("stop_type", 1), ("stop_number", 1)]).to_list(100)
    
    for stop in tour_stops:
        if isinstance(stop.get('created_at'), str):
            stop['created_at'] = datetime.fromisoformat(stop['created_at'].replace('Z', '+00:00'))
        if isinstance(stop.get('updated_at'), str):
            stop['updated_at'] = datetime.fromisoformat(stop['updated_at'].replace('Z', '+00:00'))
    
    return tour_stops

@api_router.get("/tour-stops/{stop_id}", response_model=TourStop)
async def get_tour_stop(stop_id: str):
    stop = await db.tour_stops.find_one({"id": stop_id}, {"_id": 0})
    if not stop:
        raise HTTPException(status_code=404, detail="Tour stop not found")
    return stop

# Get tour stop by QR code
@api_router.get("/tour-stops/qr/{qr_code_id}")
async def get_tour_stop_by_qr(qr_code_id: str):
    stop = await db.tour_stops.find_one({"qr_code_id": qr_code_id.upper()}, {"_id": 0})
    if not stop:
        raise HTTPException(status_code=404, detail="Tour stop not found for this QR code")
    return stop

# Site Info
@api_router.get("/site-info")
async def get_site_info(language: str = "sk"):
    info = await db.site_info.find_one({"language_code": language}, {"_id": 0})
    if not info:
        info = await db.site_info.find_one({"language_code": "en"}, {"_id": 0})
    if not info:
        # Return default
        return {
            "id": "default",
            "language_code": language,
            "title": "Vitajte na Spišskom hrade",
            "subtitle": "UNESCO World Heritage Site",
            "description": "Objavte najväčší hradný komplex v strednej Európe.",
            "short_description": "Najväčší hrad v strednej Európe"
        }
    return info

# Site Settings - Public
@api_router.get("/site-settings")
async def get_site_settings():
    settings = await db.site_settings.find_one({"id": "main"}, {"_id": 0})
    if not settings:
        return SiteSettings().model_dump()
    # Don't expose admin password to public
    settings.pop('admin_password', None)
    return settings

# Offline Package - Complete data for offline use
@api_router.get("/offline-package")
async def get_offline_package():
    languages = await db.languages.find({"is_active": True}, {"_id": 0}).to_list(100)
    tour_stops = await db.tour_stops.find({"is_active": True}, {"_id": 0}).to_list(100)
    site_info = await db.site_info.find({}, {"_id": 0}).to_list(100)
    settings = await db.site_settings.find_one({"id": "main"}, {"_id": 0})
    
    if settings:
        settings.pop('admin_password', None)
    
    return {
        "languages": languages,
        "tour_stops": tour_stops,
        "site_info": site_info,
        "settings": settings or SiteSettings().model_dump(),
        "version": datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

# QR Code endpoints
@api_router.get("/qr/{stop_id}")
async def get_qr_code_for_stop(stop_id: str, base_url: str = "https://spissky-hrad.app"):
    """Generate QR code image for a tour stop"""
    stop = await db.tour_stops.find_one({"id": stop_id}, {"_id": 0})
    if not stop:
        raise HTTPException(status_code=404, detail="Tour stop not found")
    
    qr_url = f"{base_url}/tour/{stop['qr_code_id']}"
    qr_bytes = generate_qr_code(qr_url)
    
    return Response(content=qr_bytes, media_type="image/png")

@api_router.get("/qr/code/{qr_code_id}")
async def get_qr_code_image(qr_code_id: str, base_url: str = "https://spissky-hrad.app"):
    """Generate QR code image by QR code ID"""
    qr_url = f"{base_url}/tour/{qr_code_id.upper()}"
    qr_bytes = generate_qr_code(qr_url)
    
    return Response(content=qr_bytes, media_type="image/png")

# ==================== ADMIN AUTH ====================

@api_router.post("/admin/register", response_model=TokenResponse)
async def admin_register(data: AdminRegister):
    # Check admin code from site settings
    settings = await db.site_settings.find_one({"id": "main"})
    admin_code = settings.get('admin_password', 'spissky2024') if settings else 'spissky2024'
    
    if data.admin_code != admin_code:
        raise HTTPException(status_code=403, detail="Invalid admin registration code")
    
    existing = await db.admins.find_one({"username": data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    admin = AdminUser(
        username=data.username,
        password_hash=hash_password(data.password)
    )
    
    doc = admin.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.admins.insert_one(doc)
    
    token = create_token(admin.id, admin.username)
    return TokenResponse(access_token=token)

@api_router.post("/admin/login", response_model=TokenResponse)
async def admin_login(data: AdminLogin):
    admin = await db.admins.find_one({"username": data.username}, {"_id": 0})
    if not admin or not verify_password(data.password, admin['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(admin['id'], admin['username'])
    return TokenResponse(access_token=token)

@api_router.get("/admin/me")
async def get_current_admin_info(current_admin: dict = Depends(get_current_admin)):
    return {"username": current_admin['username'], "user_id": current_admin['sub']}

# ==================== ADMIN - LANGUAGES ====================

@api_router.get("/admin/languages", response_model=List[Language])
async def admin_get_all_languages(current_admin: dict = Depends(get_current_admin)):
    languages = await db.languages.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return languages

@api_router.post("/admin/languages", response_model=Language)
async def admin_create_language(data: LanguageCreate, current_admin: dict = Depends(get_current_admin)):
    existing = await db.languages.find_one({"code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Language code already exists")
    
    language = Language(**data.model_dump())
    await db.languages.insert_one(language.model_dump())
    return language

@api_router.put("/admin/languages/{lang_code}", response_model=Language)
async def admin_update_language(lang_code: str, data: LanguageCreate, current_admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    result = await db.languages.update_one({"code": lang_code}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Language not found")
    
    updated = await db.languages.find_one({"code": lang_code}, {"_id": 0})
    return updated

@api_router.delete("/admin/languages/{lang_code}")
async def admin_delete_language(lang_code: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.languages.delete_one({"code": lang_code})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Language not found")
    return {"message": "Language deleted"}

# ==================== ADMIN - TOUR STOPS ====================

@api_router.get("/admin/tour-stops", response_model=List[TourStop])
async def admin_get_tour_stops(current_admin: dict = Depends(get_current_admin)):
    tour_stops = await db.tour_stops.find({}, {"_id": 0}).sort([("stop_type", 1), ("stop_number", 1)]).to_list(100)
    return tour_stops

@api_router.post("/admin/tour-stops", response_model=TourStop)
async def admin_create_tour_stop(data: TourStopCreate, current_admin: dict = Depends(get_current_admin)):
    tour_stop = TourStop(**data.model_dump())
    
    doc = tour_stop.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.tour_stops.insert_one(doc)
    return tour_stop

@api_router.put("/admin/tour-stops/{stop_id}", response_model=TourStop)
async def admin_update_tour_stop(stop_id: str, data: TourStopUpdate, current_admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if 'translations' in update_data:
        update_data['translations'] = [t.model_dump() if hasattr(t, 'model_dump') else t for t in update_data['translations']]
    
    result = await db.tour_stops.update_one({"id": stop_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tour stop not found")
    
    updated = await db.tour_stops.find_one({"id": stop_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/tour-stops/{stop_id}")
async def admin_delete_tour_stop(stop_id: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.tour_stops.delete_one({"id": stop_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tour stop not found")
    return {"message": "Tour stop deleted"}

# ==================== ADMIN - SITE INFO ====================

@api_router.get("/admin/site-info")
async def admin_get_all_site_info(current_admin: dict = Depends(get_current_admin)):
    info_list = await db.site_info.find({}, {"_id": 0}).to_list(100)
    return info_list

@api_router.put("/admin/site-info/{language_code}")
async def admin_update_site_info(language_code: str, data: SiteInfoUpdate, current_admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.site_info.update_one(
        {"language_code": language_code},
        {"$set": update_data},
        upsert=True
    )
    
    updated = await db.site_info.find_one({"language_code": language_code}, {"_id": 0})
    return updated

# ==================== ADMIN - SITE SETTINGS ====================

@api_router.get("/admin/site-settings")
async def admin_get_site_settings(current_admin: dict = Depends(get_current_admin)):
    settings = await db.site_settings.find_one({"id": "main"}, {"_id": 0})
    return settings or SiteSettings().model_dump()

@api_router.put("/admin/site-settings")
async def admin_update_site_settings(data: SiteSettingsUpdate, current_admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.site_settings.update_one(
        {"id": "main"},
        {"$set": update_data},
        upsert=True
    )
    
    settings = await db.site_settings.find_one({"id": "main"}, {"_id": 0})
    return settings

# ==================== ADMIN - QR CODES ====================

@api_router.get("/admin/qr-codes")
async def admin_get_all_qr_codes(current_admin: dict = Depends(get_current_admin), base_url: str = "https://spissky-hrad.app"):
    """Get all QR codes for printing"""
    tour_stops = await db.tour_stops.find({"is_active": True}, {"_id": 0}).sort([("stop_type", 1), ("stop_number", 1)]).to_list(100)
    
    qr_codes = []
    for stop in tour_stops:
        # Get title in Slovak as primary
        title = f"Stop {stop['stop_number']}"
        for trans in stop.get('translations', []):
            if trans['language_code'] == 'sk':
                title = trans['title']
                break
        
        qr_codes.append({
            "stop_id": stop['id'],
            "qr_code_id": stop['qr_code_id'],
            "stop_number": stop['stop_number'],
            "stop_type": stop['stop_type'],
            "title": title,
            "qr_url": f"/api/qr/code/{stop['qr_code_id']}?base_url={base_url}",
            "target_url": f"{base_url}/tour/{stop['qr_code_id']}"
        })
    
    return qr_codes

@api_router.post("/admin/tour-stops/{stop_id}/regenerate-qr")
async def admin_regenerate_qr_code(stop_id: str, current_admin: dict = Depends(get_current_admin)):
    """Regenerate QR code for a tour stop"""
    new_qr_id = str(uuid.uuid4())[:8].upper()
    
    result = await db.tour_stops.update_one(
        {"id": stop_id},
        {"$set": {"qr_code_id": new_qr_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tour stop not found")
    
    return {"qr_code_id": new_qr_id, "message": "QR code regenerated"}

# ==================== FILE UPLOADS ====================

@api_router.post("/admin/upload/audio")
async def upload_audio(file: UploadFile = File(...), current_admin: dict = Depends(get_current_admin)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    ext = file.filename.lower().split('.')[-1] if '.' in file.filename else 'mp3'
    allowed = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac']
    
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid audio type. Allowed: {allowed}")
    
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{ext}"
    file_path = UPLOAD_DIR / "audio" / filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    return {"url": f"/api/uploads/audio/{filename}", "filename": filename}

@api_router.post("/admin/upload/image")
async def upload_image(file: UploadFile = File(...), current_admin: dict = Depends(get_current_admin)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    ext = file.filename.lower().split('.')[-1] if '.' in file.filename else 'jpg'
    allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
    
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid image type. Allowed: {allowed}")
    
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{ext}"
    file_path = UPLOAD_DIR / "images" / filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    return {"url": f"/api/uploads/images/{filename}", "filename": filename}

@api_router.post("/admin/upload/video")
async def upload_video(file: UploadFile = File(...), current_admin: dict = Depends(get_current_admin)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    ext = file.filename.lower().split('.')[-1] if '.' in file.filename else 'mp4'
    allowed = ['mp4', 'mov', 'avi', 'webm', 'mkv']
    
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid video type. Allowed: {allowed}")
    
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{ext}"
    file_path = UPLOAD_DIR / "videos" / filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    return {"url": f"/api/uploads/videos/{filename}", "filename": filename}

@api_router.post("/admin/upload/vr")
async def upload_vr(file: UploadFile = File(...), current_admin: dict = Depends(get_current_admin)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    ext = file.filename.lower().split('.')[-1] if '.' in file.filename else 'glb'
    allowed = ['glb', 'gltf', 'obj', 'fbx', '360jpg', '360mp4']
    
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid VR type. Allowed: {allowed}")
    
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{ext}"
    file_path = UPLOAD_DIR / "vr" / filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    return {"url": f"/api/uploads/vr/{filename}", "filename": filename}

@api_router.post("/admin/upload/ambient")
async def upload_ambient_sound(file: UploadFile = File(...), current_admin: dict = Depends(get_current_admin)):
    """Upload ambient/sound therapy audio"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    ext = file.filename.lower().split('.')[-1] if '.' in file.filename else 'mp3'
    allowed = ['mp3', 'wav', 'ogg', 'm4a']
    
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid audio type. Allowed: {allowed}")
    
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{ext}"
    file_path = UPLOAD_DIR / "ambient" / filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    return {"url": f"/api/uploads/ambient/{filename}", "filename": filename}

# Serve uploaded files
@api_router.get("/uploads/audio/{filename}")
@api_router.head("/uploads/audio/{filename}")
async def serve_audio(filename: str, request: Request):
    file_path = UPLOAD_DIR / "audio" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    file_size = file_path.stat().st_size
    ext = filename.lower().split('.')[-1]
    content_types = {'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'ogg': 'audio/ogg', 'm4a': 'audio/mp4', 'aac': 'audio/aac', 'flac': 'audio/flac'}
    content_type = content_types.get(ext, 'audio/mpeg')
    
    range_header = request.headers.get('range')
    
    if range_header:
        range_match = range_header.replace('bytes=', '').split('-')
        start = int(range_match[0]) if range_match[0] else 0
        end = int(range_match[1]) if len(range_match) > 1 and range_match[1] else file_size - 1
        
        if start >= file_size:
            return Response(status_code=416)
        
        end = min(end, file_size - 1)
        content_length = end - start + 1
        
        def iter_file():
            with open(file_path, 'rb') as f:
                f.seek(start)
                remaining = content_length
                while remaining > 0:
                    chunk_size = min(8192, remaining)
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk
        
        return StreamingResponse(
            iter_file(),
            status_code=206,
            media_type=content_type,
            headers={
                'Content-Range': f'bytes {start}-{end}/{file_size}',
                'Accept-Ranges': 'bytes',
                'Content-Length': str(content_length),
            }
        )
    
    return FileResponse(file_path, media_type=content_type, headers={'Accept-Ranges': 'bytes', 'Content-Length': str(file_size)})

@api_router.get("/uploads/images/{filename}")
async def serve_image(filename: str):
    file_path = UPLOAD_DIR / "images" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    ext = filename.split('.')[-1].lower()
    media_types = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml'}
    return FileResponse(file_path, media_type=media_types.get(ext, 'image/jpeg'))

@api_router.get("/uploads/videos/{filename}")
async def serve_video(filename: str, request: Request):
    file_path = UPLOAD_DIR / "videos" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    file_size = file_path.stat().st_size
    ext = filename.lower().split('.')[-1]
    content_types = {'mp4': 'video/mp4', 'mov': 'video/quicktime', 'avi': 'video/x-msvideo', 'webm': 'video/webm', 'mkv': 'video/x-matroska'}
    content_type = content_types.get(ext, 'video/mp4')
    
    range_header = request.headers.get('range')
    
    if range_header:
        range_match = range_header.replace('bytes=', '').split('-')
        start = int(range_match[0]) if range_match[0] else 0
        end = int(range_match[1]) if len(range_match) > 1 and range_match[1] else file_size - 1
        
        end = min(end, file_size - 1)
        content_length = end - start + 1
        
        def iter_file():
            with open(file_path, 'rb') as f:
                f.seek(start)
                remaining = content_length
                while remaining > 0:
                    chunk_size = min(8192, remaining)
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk
        
        return StreamingResponse(
            iter_file(),
            status_code=206,
            media_type=content_type,
            headers={
                'Content-Range': f'bytes {start}-{end}/{file_size}',
                'Accept-Ranges': 'bytes',
                'Content-Length': str(content_length),
            }
        )
    
    return FileResponse(file_path, media_type=content_type)

@api_router.get("/uploads/vr/{filename}")
async def serve_vr(filename: str):
    file_path = UPLOAD_DIR / "vr" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

@api_router.get("/uploads/ambient/{filename}")
async def serve_ambient(filename: str, request: Request):
    file_path = UPLOAD_DIR / "ambient" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="audio/mpeg")

# ==================== SOUVENIR SHOP API ====================

@api_router.get("/shop/products")
async def get_shop_products():
    """Get all active shop products"""
    products = await db.shop_products.find({"is_active": True}).sort("order", 1).to_list(100)
    for p in products:
        p.pop('_id', None)
    return products

@api_router.get("/shop/settings")
async def get_shop_settings():
    """Get shop settings"""
    settings = await db.shop_settings.find_one({"id": "shop"})
    if not settings:
        return {"id": "shop", "shop_name": "Castle Gift Shop", "shop_description": "Visit the shop located at the castle entrance.", "opening_hours": "Daily 9:00 - 17:00", "location": "At the castle entrance"}
    settings.pop('_id', None)
    return settings

@api_router.get("/admin/shop/products")
async def admin_get_shop_products(current_admin: dict = Depends(get_current_admin)):
    products = await db.shop_products.find({}).sort("order", 1).to_list(100)
    for p in products:
        p.pop('_id', None)
    return products

@api_router.post("/admin/shop/products")
async def admin_create_shop_product(data: ShopProductCreate, current_admin: dict = Depends(get_current_admin)):
    product = ShopProduct(**data.model_dump())
    await db.shop_products.insert_one(product.model_dump())
    return product.model_dump()

@api_router.put("/admin/shop/products/{product_id}")
async def admin_update_shop_product(product_id: str, data: ShopProductUpdate, current_admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.shop_products.update_one({"id": product_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    product = await db.shop_products.find_one({"id": product_id})
    product.pop('_id', None)
    return product

@api_router.delete("/admin/shop/products/{product_id}")
async def admin_delete_shop_product(product_id: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.shop_products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"status": "deleted"}

@api_router.get("/admin/shop/settings")
async def admin_get_shop_settings(current_admin: dict = Depends(get_current_admin)):
    settings = await db.shop_settings.find_one({"id": "shop"})
    if not settings:
        return ShopSettings().model_dump()
    settings.pop('_id', None)
    return settings

@api_router.put("/admin/shop/settings")
async def admin_update_shop_settings(data: ShopSettingsUpdate, current_admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.shop_settings.update_one({"id": "shop"}, {"$set": update_data}, upsert=True)
    settings = await db.shop_settings.find_one({"id": "shop"})
    settings.pop('_id', None)
    return settings

# ==================== VIDEO ENDPOINTS ====================

# Public: list videos
@api_router.get("/videos")
async def get_videos():
    videos = await db.videos.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(50)
    return videos

# Admin: list videos
@api_router.get("/admin/videos")
async def admin_get_videos(current_admin: dict = Depends(get_current_admin)):
    videos = await db.videos.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    return videos

# Admin: create video
@api_router.post("/admin/videos")
async def admin_create_video(data: VideoItemCreate, current_admin: dict = Depends(get_current_admin)):
    video = VideoItem(**data.model_dump())
    await db.videos.insert_one(video.model_dump())
    return video.model_dump()

# Admin: update video
@api_router.put("/admin/videos/{video_id}")
async def admin_update_video(video_id: str, data: VideoItemUpdate, current_admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        result = await db.videos.update_one({"id": video_id}, {"$set": update_data})
    video = await db.videos.find_one({"id": video_id}, {"_id": 0})
    return video

# Admin: delete video
@api_router.delete("/admin/videos/{video_id}")
async def admin_delete_video(video_id: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.videos.delete_one({"id": video_id})
    return {"deleted": result.deleted_count > 0}

# ==================== VR CONTENT ENDPOINTS ====================

# Public: list VR content
@api_router.get("/vr-content")
async def get_vr_content():
    items = await db.vr_content.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(50)
    return items

# Admin: list all VR content
@api_router.get("/admin/vr-content")
async def admin_get_vr_content(current_admin: dict = Depends(get_current_admin)):
    items = await db.vr_content.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    return items

# Admin: create VR content
@api_router.post("/admin/vr-content")
async def admin_create_vr_content(data: VRContentCreate, current_admin: dict = Depends(get_current_admin)):
    item = VRContent(**data.model_dump())
    await db.vr_content.insert_one(item.model_dump())
    return item.model_dump()

# Admin: update VR content
@api_router.put("/admin/vr-content/{item_id}")
async def admin_update_vr_content(item_id: str, data: VRContentUpdate, current_admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.vr_content.update_one({"id": item_id}, {"$set": update_data})
    item = await db.vr_content.find_one({"id": item_id}, {"_id": 0})
    return item

# Admin: delete VR content
@api_router.delete("/admin/vr-content/{item_id}")
async def admin_delete_vr_content(item_id: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.vr_content.delete_one({"id": item_id})
    return {"deleted": result.deleted_count > 0}

# Admin: upload VR video file
@api_router.post("/admin/upload/vr")
async def upload_vr_file(file: UploadFile = File(...), current_admin: dict = Depends(get_current_admin)):
    allowed = {'mp4', 'mov', 'webm', 'mkv', 'avi'}
    ext = file.filename.split('.')[-1].lower() if file.filename else 'mp4'
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid VR file type. Allowed: {allowed}")
    filename = f"vr_{uuid.uuid4().hex[:8]}_{file.filename}"
    vr_dir = UPLOAD_DIR / "vr"
    vr_dir.mkdir(exist_ok=True)
    file_path = vr_dir / filename
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    return {"url": f"/api/uploads/vr/{filename}", "filename": filename, "size": len(content)}

# Serve VR files
@api_router.get("/uploads/vr/{filename}")
async def serve_vr_file(filename: str, request: Request):
    file_path = UPLOAD_DIR / "vr" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="VR file not found")
    ext = filename.rsplit('.', 1)[-1].lower()
    content_types = {'mp4': 'video/mp4', 'mov': 'video/quicktime', 'webm': 'video/webm', 'mkv': 'video/x-matroska'}
    content_type = content_types.get(ext, 'video/mp4')
    file_size = file_path.stat().st_size
    return FileResponse(file_path, media_type=content_type, headers={'Accept-Ranges': 'bytes', 'Content-Length': str(file_size)})

# ==================== PREMIUM / PURCHASE ENDPOINTS ====================

# Get premium settings/prices
@api_router.get("/premium/settings")
async def get_premium_settings():
    settings = await db.premium_settings.find_one({"id": "main"}, {"_id": 0})
    if not settings:
        default = PremiumSettings()
        return default.model_dump()
    return settings

# Admin: update premium prices
@api_router.put("/admin/premium/settings")
async def admin_update_premium_settings(data: dict, current_admin: dict = Depends(get_current_admin)):
    data['id'] = 'main'
    await db.premium_settings.update_one({"id": "main"}, {"$set": data}, upsert=True)
    settings = await db.premium_settings.find_one({"id": "main"}, {"_id": 0})
    return settings

# Admin: generate purchase codes
@api_router.post("/admin/premium/generate-codes")
async def admin_generate_codes(product_type: str = "complete_tour", count: int = 10, current_admin: dict = Depends(get_current_admin)):
    import random, string
    codes = []
    for _ in range(count):
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        code = f"SPIS-{code[:4]}-{code[4:]}"
        purchase_code = PurchaseCode(
            code=code,
            product_type=product_type,
            price=0.0,
        )
        await db.purchase_codes.insert_one(purchase_code.model_dump())
        codes.append(code)
    return {"codes": codes, "product_type": product_type, "count": len(codes)}

# Admin: list purchase codes
@api_router.get("/admin/premium/codes")
async def admin_list_codes(product_type: Optional[str] = None, current_admin: dict = Depends(get_current_admin)):
    query = {}
    if product_type:
        query["product_type"] = product_type
    codes = await db.purchase_codes.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return codes

# Public: verify/redeem purchase code
@api_router.post("/premium/redeem")
async def redeem_purchase_code(data: PurchaseVerify):
    code_doc = await db.purchase_codes.find_one({"code": data.code.upper().strip()})
    if not code_doc:
        raise HTTPException(status_code=404, detail="Invalid code")
    if code_doc.get("is_used"):
        raise HTTPException(status_code=400, detail="Code already used")
    if code_doc.get("product_type") != data.product_type:
        raise HTTPException(status_code=400, detail=f"This code is for {code_doc['product_type']}, not {data.product_type}")
    
    await db.purchase_codes.update_one(
        {"code": data.code.upper().strip()},
        {"$set": {"is_used": True, "used_by_device": data.device_id, "used_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Record the unlock for this device
    await db.device_unlocks.update_one(
        {"device_id": data.device_id},
        {"$addToSet": {"unlocked": data.product_type}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"success": True, "product_type": data.product_type, "message": f"{data.product_type} unlocked successfully!"}

# Public: check what's unlocked for a device
@api_router.get("/premium/status/{device_id}")
async def get_premium_status(device_id: str):
    doc = await db.device_unlocks.find_one({"device_id": device_id}, {"_id": 0})
    if not doc:
        return {"device_id": device_id, "unlocked": []}
    return doc

# ==================== PARTNER BUSINESS ENDPOINTS ====================

# Public: list active partner businesses
@api_router.get("/partners")
async def get_partners():
    items = await db.partners.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(50)
    return items

# Admin: list all partner businesses
@api_router.get("/admin/partners")
async def admin_get_partners(current_admin: dict = Depends(get_current_admin)):
    items = await db.partners.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    return items

# Admin: create partner business
@api_router.post("/admin/partners")
async def admin_create_partner(data: PartnerBusinessCreate, current_admin: dict = Depends(get_current_admin)):
    item = PartnerBusiness(**data.model_dump())
    await db.partners.insert_one(item.model_dump())
    return item.model_dump()

# Admin: update partner business
@api_router.put("/admin/partners/{item_id}")
async def admin_update_partner(item_id: str, data: PartnerBusinessUpdate, current_admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.partners.update_one({"id": item_id}, {"$set": update_data})
    item = await db.partners.find_one({"id": item_id}, {"_id": 0})
    return item

# Admin: delete partner business
@api_router.delete("/admin/partners/{item_id}")
async def admin_delete_partner(item_id: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.partners.delete_one({"id": item_id})
    return {"deleted": result.deleted_count > 0}

# Admin: upload partner logo
@api_router.post("/admin/upload/partner-logo")
async def upload_partner_logo(file: UploadFile = File(...), current_admin: dict = Depends(get_current_admin)):
    allowed = {'png', 'jpg', 'jpeg', 'webp', 'svg'}
    ext = file.filename.split('.')[-1].lower() if file.filename else 'png'
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid image type. Allowed: {allowed}")
    filename = f"partner_{uuid.uuid4().hex[:8]}.{ext}"
    img_dir = UPLOAD_DIR / "images" / "partners"
    img_dir.mkdir(parents=True, exist_ok=True)
    file_path = img_dir / filename
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    return {"url": f"/api/uploads/images/partners/{filename}", "filename": filename}

# Serve partner logos
@api_router.get("/uploads/images/partners/{filename}")
async def serve_partner_logo(filename: str):
    file_path = UPLOAD_DIR / "images" / "partners" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

# ==================== TIP / SUPPORT DEVELOPER ENDPOINTS ====================

# Record a tip/donation
@api_router.post("/tips")
async def record_tip(amount: float, device_id: str, message: Optional[str] = None):
    tip = TipRecord(amount=amount, device_id=device_id, message=message)
    await db.tips.insert_one(tip.model_dump())
    return {"success": True, "message": "Thank you for your support!", "tip_id": tip.id}

# Admin: view tips
@api_router.get("/admin/tips")
async def admin_get_tips(current_admin: dict = Depends(get_current_admin)):
    tips = await db.tips.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    total = sum(t.get("amount", 0) for t in tips)
    return {"tips": tips, "total": total, "count": len(tips)}

# Admin: bulk code generation with custom naming
@api_router.post("/admin/premium/generate-bulk")
async def admin_generate_bulk_codes(
    product_type: str = "complete_tour",
    count: int = 20,
    group_name: str = "bulk",
    discount_price: float = 0.0,
    current_admin: dict = Depends(get_current_admin)
):
    import random, string
    codes = []
    for i in range(count):
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        code = f"SPIS-{code[:4]}-{code[4:]}"
        purchase_code = PurchaseCode(
            code=code,
            product_type=product_type,
            price=discount_price,
        )
        doc = purchase_code.model_dump()
        doc["group_name"] = group_name
        await db.purchase_codes.insert_one(doc)
        codes.append(code)
    return {"codes": codes, "product_type": product_type, "group_name": group_name, "count": len(codes)}

# ==================== SEED DATA ====================

@api_router.post("/seed-data")
async def seed_initial_data():
    """Seed ULTIMATE Spišský Hrad data - 12 stops + 4 legends in 9 languages"""
    
    # 9 Languages with beautiful flag emojis
    languages_data = [
        {"code": "sk", "name": "Slovak", "native_name": "Slovensky", "flag_emoji": "🇸🇰", "order": 1},
        {"code": "en", "name": "English", "native_name": "English", "flag_emoji": "🇬🇧", "order": 2},
        {"code": "de", "name": "German", "native_name": "Deutsch", "flag_emoji": "🇩🇪", "order": 3},
        {"code": "pl", "name": "Polish", "native_name": "Polski", "flag_emoji": "🇵🇱", "order": 4},
        {"code": "hu", "name": "Hungarian", "native_name": "Magyar", "flag_emoji": "🇭🇺", "order": 5},
        {"code": "fr", "name": "French", "native_name": "Français", "flag_emoji": "🇫🇷", "order": 6},
        {"code": "es", "name": "Spanish", "native_name": "Español", "flag_emoji": "🇪🇸", "order": 7},
        {"code": "ru", "name": "Russian", "native_name": "Русский", "flag_emoji": "🇷🇺", "order": 8},
        {"code": "zh", "name": "Chinese", "native_name": "中文", "flag_emoji": "🇨🇳", "order": 9},
    ]
    
    for lang_data in languages_data:
        existing = await db.languages.find_one({"code": lang_data["code"]})
        if not existing:
            lang = Language(**lang_data)
            await db.languages.insert_one(lang.model_dump())
    
    # Site info for all 9 languages
    site_info_data = [
        {"language_code": "sk", "title": "Spišský Hrad", "subtitle": "Najväčší hradný komplex v strednej Európe", "description": "Vitajte na Spišskom hrade, jednom z najväčších hradných komplexov v Európe. Tento malebný hrad, zapísaný na zozname UNESCO, vás prevedie fascinujúcou históriou od 12. storočia až po súčasnosť. Pripravte sa na nezabudnuteľný zážitok.", "short_description": "UNESCO pamiatka, 4 hektáre histórie"},
        {"language_code": "en", "title": "Spiš Castle", "subtitle": "The largest castle complex in Central Europe", "description": "Welcome to Spiš Castle, one of the largest castle complexes in Europe. This picturesque UNESCO World Heritage Site will guide you through fascinating history from the 12th century to the present day. Prepare for an unforgettable experience.", "short_description": "UNESCO site, 4 hectares of history"},
        {"language_code": "de", "title": "Zipser Burg", "subtitle": "Der größte Burgkomplex in Mitteleuropa", "description": "Willkommen auf der Zipser Burg, einem der größten Burgkomplexe Europas. Diese malerische UNESCO-Welterbestätte führt Sie durch faszinierende Geschichte vom 12. Jahrhundert bis heute.", "short_description": "UNESCO-Welterbe, 4 Hektar Geschichte"},
        {"language_code": "pl", "title": "Zamek Spiski", "subtitle": "Największy kompleks zamkowy w Europie Środkowej", "description": "Witamy na Zamku Spiskim, jednym z największych kompleksów zamkowych w Europie. Ten malowniczy obiekt UNESCO przeprowadzi Was przez fascynującą historię od XII wieku do czasów współczesnych.", "short_description": "Obiekt UNESCO, 4 hektary historii"},
        {"language_code": "hu", "title": "Szepesi Vár", "subtitle": "Közép-Európa legnagyobb várkomplexuma", "description": "Üdvözöljük a Szepesi várban, Európa egyik legnagyobb várkomplexumában. Ez a festői UNESCO Világörökségi helyszín végigvezeti Önt a 12. századtól napjainkig tartó lenyűgöző történelmen.", "short_description": "UNESCO helyszín, 4 hektár történelem"},
        {"language_code": "fr", "title": "Château de Spiš", "subtitle": "Le plus grand complexe de châteaux d'Europe centrale", "description": "Bienvenue au château de Spiš, l'un des plus grands complexes de châteaux d'Europe. Ce site pittoresque du patrimoine mondial de l'UNESCO vous guidera à travers une histoire fascinante du XIIe siècle à nos jours.", "short_description": "Site UNESCO, 4 hectares d'histoire"},
        {"language_code": "es", "title": "Castillo de Spiš", "subtitle": "El complejo de castillos más grande de Europa Central", "description": "Bienvenido al Castillo de Spiš, uno de los complejos de castillos más grandes de Europa. Este pintoresco Patrimonio de la Humanidad de la UNESCO le guiará a través de una fascinante historia desde el siglo XII hasta nuestros días.", "short_description": "Patrimonio UNESCO, 4 hectáreas de historia"},
        {"language_code": "ru", "title": "Спишский Град", "subtitle": "Крупнейший замковый комплекс в Центральной Европе", "description": "Добро пожаловать в Спишский Град, один из крупнейших замковых комплексов Европы. Этот живописный объект Всемирного наследия ЮНЕСКО проведёт вас через увлекательную историю с XII века до наших дней.", "short_description": "Объект ЮНЕСКО, 4 гектара истории"},
        {"language_code": "zh", "title": "斯皮什城堡", "subtitle": "中欧最大的城堡群", "description": "欢迎来到斯皮什城堡，欧洲最大的城堡群之一。这座风景如画的联合国教科文组织世界遗产将带您领略从12世纪至今的迷人历史。准备好迎接难忘的体验吧。", "short_description": "联合国教科文组织遗产，4公顷历史"},
    ]
    
    for info_data in site_info_data:
        existing = await db.site_info.find_one({"language_code": info_data["language_code"]})
        if not existing:
            info = SiteInfo(**info_data)
            doc = info.model_dump()
            doc['updated_at'] = doc['updated_at'].isoformat()
            await db.site_info.insert_one(doc)
    
    # Site settings
    existing_settings = await db.site_settings.find_one({"id": "main"})
    if not existing_settings:
        settings = SiteSettings()
        doc = settings.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.site_settings.insert_one(doc)
    
    # 12 Tour Stops
    tour_stops_data = [
        {
            "stop_number": 1,
            "stop_type": "tour",
            "image_url": "https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=800&q=80",
            "duration_seconds": 180,
            "translations": [
                {"language_code": "sk", "title": "Vstupná brána a Barbakan", "short_description": "Hlavný vstup do hradu", "description": "Stojíte pred majestátnou vstupnou bránou Spišského hradu. Barbakan, mohutná obranná veža pred hlavnou bránou, bol postavený v 15. storočí ako dodatočná ochrana. Všimnite si hrúbku múrov - až 3 metre! Táto brána bola svedkom nespočetných príchodov a odchodov - od kráľov po obyčajných poddaných.", "audio_url": "/api/uploads/audio/stop1_sk.mp3"},
                {"language_code": "en", "title": "Main Gate and Barbican", "short_description": "The main entrance to the castle", "description": "You stand before the majestic entrance gate of Spiš Castle. The barbican, a massive defensive tower before the main gate, was built in the 15th century as additional protection. Notice the thickness of the walls - up to 3 meters! This gate has witnessed countless arrivals and departures - from kings to common subjects.", "audio_url": "/api/uploads/audio/stop1_en.mp3"},
                {"language_code": "de", "title": "Haupttor und Barbakane", "short_description": "Der Haupteingang zur Burg", "description": "Sie stehen vor dem majestätischen Eingangstor der Zipser Burg. Die Barbakane, ein massiver Verteidigungsturm vor dem Haupttor, wurde im 15. Jahrhundert als zusätzlicher Schutz errichtet.", "audio_url": "/api/uploads/audio/stop1_de.mp3"},
                {"language_code": "pl", "title": "Brama Główna i Barbakan", "short_description": "Główne wejście do zamku", "description": "Stoicie przed majestatyczną bramą wjazdową Zamku Spiskiego. Barbakan, masywna wieża obronna przed główną bramą, został zbudowany w XV wieku jako dodatkowa ochrona.", "audio_url": "/api/uploads/audio/stop1_pl.mp3"},
                {"language_code": "hu", "title": "Főkapu és Barbakán", "short_description": "A vár fő bejárata", "description": "A Szepesi vár fenséges bejárati kapuja előtt állnak. A barbakán, a főkapu előtti hatalmas védőtorony, a 15. században épült további védelemként.", "audio_url": "/api/uploads/audio/stop1_hu.mp3"},
                {"language_code": "fr", "title": "Porte Principale et Barbacane", "short_description": "L'entrée principale du château", "description": "Vous vous trouvez devant la majestueuse porte d'entrée du château de Spiš. La barbacane, une tour défensive massive devant la porte principale, a été construite au XVe siècle."},
                {"language_code": "es", "title": "Puerta Principal y Barbacana", "short_description": "La entrada principal al castillo", "description": "Se encuentra ante la majestuosa puerta de entrada del Castillo de Spiš. La barbacana, una torre defensiva masiva frente a la puerta principal, fue construida en el siglo XV."},
                {"language_code": "ru", "title": "Главные Ворота и Барбакан", "short_description": "Главный вход в замок", "description": "Вы стоите перед величественными входными воротами Спишского Града. Барбакан, массивная оборонительная башня перед главными воротами, был построен в XV веке."},
                {"language_code": "zh", "title": "主门和瓮城", "short_description": "城堡主入口", "description": "您站在斯皮什城堡雄伟的入口大门前。瓮城是主门前的大型防御塔楼，建于15世纪，作为额外保护。"},
            ]
        },
        {
            "stop_number": 2,
            "stop_type": "tour",
            "image_url": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80",
            "duration_seconds": 200,
            "translations": [
                {"language_code": "sk", "title": "Dolný hrad - Hospodárske centrum", "short_description": "Ekonomické srdce hradu", "description": "Dolný hrad vznikol v 15. storočí a predstavoval hospodárske centrum celého komplexu. Nachádzali sa tu dielne remeselníkov, stajne pre kone, sklady potravín a zbrojnice. V dobách mieru tu pracovali kováči, sedlári a ďalší remeselníci. V čase ohrozenia sa sem uchýlilo obyvateľstvo z okolia.", "audio_url": "/api/uploads/audio/stop2_sk.mp3"},
                {"language_code": "en", "title": "Lower Castle - Economic Center", "short_description": "The economic heart of the castle", "description": "The Lower Castle was built in the 15th century and served as the economic center of the entire complex. Here you would find craftsmen's workshops, horse stables, food storage, and armories. In peacetime, blacksmiths, saddlers, and other craftsmen worked here. During threats, the local population sought refuge here.", "audio_url": "/api/uploads/audio/stop2_en.mp3"},
                {"language_code": "de", "title": "Untere Burg - Wirtschaftszentrum", "short_description": "Das wirtschaftliche Herz der Burg", "description": "Die Untere Burg entstand im 15. Jahrhundert und war das wirtschaftliche Zentrum des gesamten Komplexes.", "audio_url": "/api/uploads/audio/stop2_de.mp3"},
                {"language_code": "pl", "title": "Zamek Dolny - Centrum Gospodarcze", "short_description": "Ekonomiczne serce zamku", "description": "Zamek Dolny powstał w XV wieku i stanowił centrum gospodarcze całego kompleksu.", "audio_url": "/api/uploads/audio/stop2_pl.mp3"},
                {"language_code": "hu", "title": "Alsó Vár - Gazdasági Központ", "short_description": "A vár gazdasági szíve", "description": "Az Alsó vár a 15. században épült és az egész komplexum gazdasági központjaként szolgált.", "audio_url": "/api/uploads/audio/stop2_hu.mp3"},
                {"language_code": "fr", "title": "Château Bas - Centre Économique", "short_description": "Le cœur économique du château", "description": "Le Château Bas a été construit au XVe siècle et servait de centre économique pour l'ensemble du complexe."},
                {"language_code": "es", "title": "Castillo Bajo - Centro Económico", "short_description": "El corazón económico del castillo", "description": "El Castillo Bajo fue construido en el siglo XV y servía como centro económico de todo el complejo."},
                {"language_code": "ru", "title": "Нижний Замок - Экономический Центр", "short_description": "Экономическое сердце замка", "description": "Нижний замок был построен в XV веке и служил экономическим центром всего комплекса."},
                {"language_code": "zh", "title": "下城堡 - 经济中心", "short_description": "城堡的经济中心", "description": "下城堡建于15世纪，是整个建筑群的经济中心。"},
            ]
        },
        {
            "stop_number": 3,
            "stop_type": "tour",
            "image_url": "https://images.unsplash.com/photo-1551524559-8af4e6624178?w=800&q=80",
            "duration_seconds": 220,
            "translations": [
                {"language_code": "sk", "title": "Stredný hrad - Románsky palác", "short_description": "Najstaršia časť hradu", "description": "Stojíte v najstaršej časti Spišského hradu, ktorá pochádza z 12. storočia. Románsky palác bol sídlom spišských županov a neskôr kráľovských kapitánov. Zachované múry svedčia o pôvodnej architektúre s charakteristickými polkruhovými oknami a masívnymi piliermi.", "audio_url": "/api/uploads/audio/stop3_sk.mp3"},
                {"language_code": "en", "title": "Middle Castle - Romanesque Palace", "short_description": "The oldest part of the castle", "description": "You stand in the oldest part of Spiš Castle, dating back to the 12th century. The Romanesque palace was the residence of Spiš counts and later royal captains. The preserved walls bear witness to the original architecture with characteristic semicircular windows and massive pillars.", "audio_url": "/api/uploads/audio/stop3_en.mp3"},
                {"language_code": "de", "title": "Mittlere Burg - Romanischer Palast", "short_description": "Der älteste Teil der Burg", "description": "Sie stehen im ältesten Teil der Zipser Burg aus dem 12. Jahrhundert.", "audio_url": "/api/uploads/audio/stop3_de.mp3"},
                {"language_code": "pl", "title": "Zamek Środkowy - Pałac Romański", "short_description": "Najstarsza część zamku", "description": "Stoicie w najstarszej części Zamku Spiskiego, pochodzącej z XII wieku.", "audio_url": "/api/uploads/audio/stop3_pl.mp3"},
                {"language_code": "hu", "title": "Középső Vár - Román Palota", "short_description": "A vár legrégebbi része", "description": "A Szepesi vár legrégebbi részében állnak, amely a 12. századból származik.", "audio_url": "/api/uploads/audio/stop3_hu.mp3"},
                {"language_code": "fr", "title": "Château Central - Palais Roman", "short_description": "La partie la plus ancienne du château", "description": "Vous vous trouvez dans la partie la plus ancienne du château de Spiš, datant du XIIe siècle."},
                {"language_code": "es", "title": "Castillo Medio - Palacio Románico", "short_description": "La parte más antigua del castillo", "description": "Se encuentra en la parte más antigua del Castillo de Spiš, que data del siglo XII."},
                {"language_code": "ru", "title": "Средний Замок - Романский Дворец", "short_description": "Старейшая часть замка", "description": "Вы находитесь в старейшей части Спишского Града, датируемой XII веком."},
                {"language_code": "zh", "title": "中城堡 - 罗马式宫殿", "short_description": "城堡最古老的部分", "description": "您正站在斯皮什城堡最古老的部分，可追溯到12世纪。"},
            ]
        },
        {
            "stop_number": 4,
            "stop_type": "tour",
            "image_url": "https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?w=800&q=80",
            "duration_seconds": 250,
            "translations": [
                {"language_code": "sk", "title": "Horný hrad - Donjon", "short_description": "Najvyšší bod hradu", "description": "Donjon - hlavná obranná veža - je najvyšším bodom Spišského hradu. Z výšky 634 metrov nad morom máte výhľad na celé Spiš, Tatry a v jasných dňoch až po hranice s Poľskom. Veža bola postavená v 12. storočí a slúžila ako posledné útočisko v prípade dobytia ostatných častí hradu.", "audio_url": "/api/uploads/audio/stop4_sk.mp3"},
                {"language_code": "en", "title": "Upper Castle - Keep", "short_description": "The highest point of the castle", "description": "The Keep - the main defensive tower - is the highest point of Spiš Castle. From 634 meters above sea level, you have a view of the entire Spiš region, the Tatras, and on clear days even to the Polish border. The tower was built in the 12th century and served as the last refuge if other parts of the castle were captured.", "audio_url": "/api/uploads/audio/stop4_en.mp3"},
                {"language_code": "de", "title": "Obere Burg - Bergfried", "short_description": "Der höchste Punkt der Burg", "description": "Der Bergfried ist der höchste Punkt der Zipser Burg.", "audio_url": "/api/uploads/audio/stop4_de.mp3"},
                {"language_code": "pl", "title": "Zamek Górny - Donżon", "short_description": "Najwyższy punkt zamku", "description": "Donżon to najwyższy punkt Zamku Spiskiego.", "audio_url": "/api/uploads/audio/stop4_pl.mp3"},
                {"language_code": "hu", "title": "Felső Vár - Öregtorony", "short_description": "A vár legmagasabb pontja", "description": "Az öregtorony a Szepesi vár legmagasabb pontja.", "audio_url": "/api/uploads/audio/stop4_hu.mp3"},
                {"language_code": "fr", "title": "Château Supérieur - Donjon", "short_description": "Le point culminant du château", "description": "Le Donjon est le point le plus haut du château de Spiš."},
                {"language_code": "es", "title": "Castillo Superior - Torre del Homenaje", "short_description": "El punto más alto del castillo", "description": "La Torre del Homenaje es el punto más alto del Castillo de Spiš."},
                {"language_code": "ru", "title": "Верхний Замок - Донжон", "short_description": "Самая высокая точка замка", "description": "Донжон - самая высокая точка Спишского Града."},
                {"language_code": "zh", "title": "上城堡 - 主塔楼", "short_description": "城堡最高点", "description": "主塔楼是斯皮什城堡的最高点。"},
            ]
        },
        {
            "stop_number": 5,
            "stop_type": "tour",
            "image_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
            "duration_seconds": 190,
            "translations": [
                {"language_code": "sk", "title": "Hradná kaplnka", "short_description": "Duchovné centrum hradu", "description": "Románska kaplnka z 13. storočia bola duchovným centrom hradného života. Zachovali sa tu fragmenty pôvodných fresiek a gotická klenba. Kaplnka slúžila nielen pre hradnú posádku, ale aj pre významné cirkevné obrady regiónu.", "audio_url": "/api/uploads/audio/stop5_sk.mp3"},
                {"language_code": "en", "title": "Castle Chapel", "short_description": "The spiritual center of the castle", "description": "The Romanesque chapel from the 13th century was the spiritual center of castle life. Fragments of original frescoes and Gothic vaulting have been preserved here. The chapel served not only the castle garrison but also for important religious ceremonies of the region.", "audio_url": "/api/uploads/audio/stop5_en.mp3"},
                {"language_code": "de", "title": "Burgkapelle", "short_description": "Das spirituelle Zentrum der Burg", "description": "Die romanische Kapelle aus dem 13. Jahrhundert war das spirituelle Zentrum des Burglebens.", "audio_url": "/api/uploads/audio/stop5_de.mp3"},
                {"language_code": "pl", "title": "Kaplica Zamkowa", "short_description": "Duchowe centrum zamku", "description": "Romańska kaplica z XIII wieku była duchowym centrum życia zamkowego.", "audio_url": "/api/uploads/audio/stop5_pl.mp3"},
                {"language_code": "hu", "title": "Várkápolna", "short_description": "A vár lelki központja", "description": "A 13. századi román stílusú kápolna a vári élet lelki központja volt.", "audio_url": "/api/uploads/audio/stop5_hu.mp3"},
                {"language_code": "fr", "title": "Chapelle du Château", "short_description": "Le centre spirituel du château", "description": "La chapelle romane du XIIIe siècle était le centre spirituel de la vie du château."},
                {"language_code": "es", "title": "Capilla del Castillo", "short_description": "El centro espiritual del castillo", "description": "La capilla románica del siglo XIII era el centro espiritual de la vida del castillo."},
                {"language_code": "ru", "title": "Замковая Часовня", "short_description": "Духовный центр замка", "description": "Романская часовня XIII века была духовным центром замковой жизни."},
                {"language_code": "zh", "title": "城堡教堂", "short_description": "城堡的精神中心", "description": "这座13世纪的罗马式教堂是城堡生活的精神中心。"},
            ]
        },
        {
            "stop_number": 6,
            "stop_type": "tour",
            "image_url": "https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=800&q=80",
            "duration_seconds": 170,
            "translations": [
                {"language_code": "sk", "title": "Múzeum mučenia", "short_description": "Temná história stredoveku", "description": "Expozícia stredovekých mučiacich nástrojov dokumentuje temnú stránku stredovekej justície. Uvidíte originálne nástroje používané na výsluchy a tresty - od mučidiel po popravčie nástroje. Tieto predmety sú svedkami krutých praktík, ktoré boli v stredoveku bežné.", "audio_url": "/api/uploads/audio/stop6_sk.mp3"},
                {"language_code": "en", "title": "Torture Museum", "short_description": "The dark history of the Middle Ages", "description": "The exhibition of medieval torture instruments documents the dark side of medieval justice. You will see original instruments used for interrogations and punishments - from torture devices to execution tools. These objects witness the cruel practices that were common in the Middle Ages.", "audio_url": "/api/uploads/audio/stop6_en.mp3"},
                {"language_code": "de", "title": "Foltermuseum", "short_description": "Die dunkle Geschichte des Mittelalters", "description": "Die Ausstellung mittelalterlicher Folterinstrumente dokumentiert die dunkle Seite der mittelalterlichen Justiz.", "audio_url": "/api/uploads/audio/stop6_de.mp3"},
                {"language_code": "pl", "title": "Muzeum Tortur", "short_description": "Mroczna historia średniowiecza", "description": "Wystawa średniowiecznych narzędzi tortur dokumentuje mroczną stronę średniowiecznego wymiaru sprawiedliwości.", "audio_url": "/api/uploads/audio/stop6_pl.mp3"},
                {"language_code": "hu", "title": "Kínzómúzeum", "short_description": "A középkor sötét története", "description": "A középkori kínzóeszközök kiállítása a középkori igazságszolgáltatás sötét oldalát dokumentálja.", "audio_url": "/api/uploads/audio/stop6_hu.mp3"},
                {"language_code": "fr", "title": "Musée de la Torture", "short_description": "L'histoire sombre du Moyen Âge", "description": "L'exposition d'instruments de torture médiévaux documente le côté sombre de la justice médiévale."},
                {"language_code": "es", "title": "Museo de la Tortura", "short_description": "La oscura historia de la Edad Media", "description": "La exhibición de instrumentos de tortura medievales documenta el lado oscuro de la justicia medieval."},
                {"language_code": "ru", "title": "Музей Пыток", "short_description": "Темная история Средневековья", "description": "Выставка средневековых орудий пыток документирует темную сторону средневекового правосудия."},
                {"language_code": "zh", "title": "酷刑博物馆", "short_description": "中世纪的黑暗历史", "description": "中世纪刑具展览记录了中世纪司法的黑暗面。"},
            ]
        },
        {
            "stop_number": 7,
            "stop_type": "tour",
            "image_url": "https://images.unsplash.com/photo-1564429238718-84cb8b4c7f1a?w=800&q=80",
            "duration_seconds": 200,
            "translations": [
                {"language_code": "sk", "title": "Rytierska sieň", "short_description": "Sála stredovekých rytierov", "description": "Veľká rytierska sieň bola centrom spoločenského života hradu. Tu sa konali hostiny, prijatia diplomatov a významné zhromaždenia. Steny zdobili zástavy a erby šľachtických rodov. Predstavte si, ako tu rytieri hodovali pri svetle fakieľ za dlhými drevenými stolmi.", "audio_url": "/api/uploads/audio/stop7_sk.mp3"},
                {"language_code": "en", "title": "Knights' Hall", "short_description": "Hall of medieval knights", "description": "The great Knights' Hall was the center of social life in the castle. Feasts, diplomatic receptions, and important assemblies were held here. The walls were decorated with flags and coats of arms of noble families. Imagine knights feasting here by torchlight at long wooden tables.", "audio_url": "/api/uploads/audio/stop7_en.mp3"},
                {"language_code": "de", "title": "Rittersaal", "short_description": "Saal der mittelalterlichen Ritter", "description": "Der große Rittersaal war das Zentrum des gesellschaftlichen Lebens auf der Burg.", "audio_url": "/api/uploads/audio/stop7_de.mp3"},
                {"language_code": "pl", "title": "Sala Rycerska", "short_description": "Sala średniowiecznych rycerzy", "description": "Wielka Sala Rycerska była centrum życia społecznego zamku.", "audio_url": "/api/uploads/audio/stop7_pl.mp3"},
                {"language_code": "hu", "title": "Lovagterem", "short_description": "A középkori lovagok terme", "description": "A nagy Lovagterem a vár társadalmi életének központja volt.", "audio_url": "/api/uploads/audio/stop7_hu.mp3"},
                {"language_code": "fr", "title": "Salle des Chevaliers", "short_description": "Salle des chevaliers médiévaux", "description": "La grande Salle des Chevaliers était le centre de la vie sociale du château."},
                {"language_code": "es", "title": "Sala de los Caballeros", "short_description": "Sala de los caballeros medievales", "description": "La gran Sala de los Caballeros era el centro de la vida social del castillo."},
                {"language_code": "ru", "title": "Рыцарский Зал", "short_description": "Зал средневековых рыцарей", "description": "Большой Рыцарский зал был центром общественной жизни замка."},
                {"language_code": "zh", "title": "骑士大厅", "short_description": "中世纪骑士大厅", "description": "宏伟的骑士大厅是城堡社交生活的中心。"},
            ]
        },
        {
            "stop_number": 8,
            "stop_type": "tour",
            "image_url": "https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=800&q=80",
            "duration_seconds": 180,
            "translations": [
                {"language_code": "sk", "title": "Obranné hradby a bašty", "short_description": "Fortifikačný systém hradu", "description": "Obranný systém Spišského hradu patril k najdokonalejším v strednej Európe. Dvojité hradby s baštami umožňovali účinnú obranu. Strieľne boli navrhnuté pre luky, kuše aj neskôr pre palné zbrane. Hrad nikdy nebol dobytý vojenskou silou.", "audio_url": None},
                {"language_code": "en", "title": "Defensive Walls and Bastions", "short_description": "The castle's fortification system", "description": "The defensive system of Spiš Castle was among the most sophisticated in Central Europe. Double walls with bastions enabled effective defense. The loopholes were designed for bows, crossbows, and later firearms. The castle was never captured by military force.", "audio_url": None},
                {"language_code": "de", "title": "Verteidigungsmauern und Bastionen", "short_description": "Das Befestigungssystem der Burg", "description": "Das Verteidigungssystem der Zipser Burg gehörte zu den ausgereiftesten in Mitteleuropa."},
                {"language_code": "pl", "title": "Mury Obronne i Bastiony", "short_description": "System fortyfikacji zamku", "description": "System obronny Zamku Spiskiego należał do najbardziej zaawansowanych w Europie Środkowej."},
                {"language_code": "hu", "title": "Védőfalak és Bástyák", "short_description": "A vár erődítési rendszere", "description": "A Szepesi vár védelmi rendszere Közép-Európa legkifinomultabbjai közé tartozott."},
                {"language_code": "fr", "title": "Murs Défensifs et Bastions", "short_description": "Le système de fortification du château", "description": "Le système défensif du château de Spiš était parmi les plus sophistiqués d'Europe centrale."},
                {"language_code": "es", "title": "Murallas Defensivas y Bastiones", "short_description": "El sistema de fortificación del castillo", "description": "El sistema defensivo del Castillo de Spiš estaba entre los más sofisticados de Europa Central."},
                {"language_code": "ru", "title": "Оборонительные Стены и Бастионы", "short_description": "Фортификационная система замка", "description": "Оборонительная система Спишского Града была одной из самых совершенных в Центральной Европе."},
                {"language_code": "zh", "title": "防御城墙和堡垒", "short_description": "城堡的防御系统", "description": "斯皮什城堡的防御系统是中欧最先进的防御系统之一。"},
            ]
        },
        {
            "stop_number": 9,
            "stop_type": "tour",
            "image_url": "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80",
            "duration_seconds": 160,
            "translations": [
                {"language_code": "sk", "title": "Cisterna - Zásobáreň vody", "short_description": "Životne dôležitý zdroj vody", "description": "Cisterna na zachytávanie dažďovej vody bola životne dôležitá pre prežitie hradu počas obliehania. Kapacita tejto cisterny vystačila na niekoľkomesačné obliehanie. Dômyselný systém odvodňovacích kanálov zvádzal vodu zo striech do tejto nádrže.", "audio_url": None},
                {"language_code": "en", "title": "Cistern - Water Reservoir", "short_description": "A vital water source", "description": "The cistern for collecting rainwater was vital for the castle's survival during sieges. This cistern's capacity was sufficient for several months of siege. An ingenious system of drainage channels directed water from the roofs into this tank.", "audio_url": None},
                {"language_code": "de", "title": "Zisterne - Wasserreservoir", "short_description": "Eine lebenswichtige Wasserquelle", "description": "Die Zisterne zum Sammeln von Regenwasser war lebenswichtig für das Überleben der Burg während Belagerungen."},
                {"language_code": "pl", "title": "Cysterna - Zbiornik Wody", "short_description": "Kluczowe źródło wody", "description": "Cysterna do zbierania wody deszczowej była niezbędna dla przetrwania zamku podczas oblężeń."},
                {"language_code": "hu", "title": "Ciszterna - Víztározó", "short_description": "Létfontosságú vízforrás", "description": "Az esővíz gyűjtésére szolgáló ciszterna létfontosságú volt a vár túléléséhez ostromok idején."},
                {"language_code": "fr", "title": "Citerne - Réservoir d'Eau", "short_description": "Une source d'eau vitale", "description": "La citerne pour collecter l'eau de pluie était vitale pour la survie du château pendant les sièges."},
                {"language_code": "es", "title": "Cisterna - Depósito de Agua", "short_description": "Una fuente de agua vital", "description": "La cisterna para recoger agua de lluvia era vital para la supervivencia del castillo durante los asedios."},
                {"language_code": "ru", "title": "Цистерна - Водохранилище", "short_description": "Жизненно важный источник воды", "description": "Цистерна для сбора дождевой воды была жизненно важна для выживания замка во время осад."},
                {"language_code": "zh", "title": "蓄水池 - 水库", "short_description": "重要的水源", "description": "收集雨水的蓄水池对城堡在围困期间的生存至关重要。"},
            ]
        },
        {
            "stop_number": 10,
            "stop_type": "tour",
            "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
            "duration_seconds": 200,
            "translations": [
                {"language_code": "sk", "title": "Vyhliadková terasa", "short_description": "Panoramatický výhľad na Spiš", "description": "Z tejto vyhliadkovej terasy máte jedinečný panoramatický výhľad. Na východe vidíte Spišskú Kapitulu s jej gotickou katedrálou. Na severe sa týčia Tatry. Okolie hradu bolo strategicky dôležité - kontrolovalo obchodné cesty spájajúce Poľsko s Uhorskom.", "audio_url": None},
                {"language_code": "en", "title": "Observation Terrace", "short_description": "Panoramic view of Spiš", "description": "From this observation terrace, you have a unique panoramic view. To the east, you can see Spiš Chapter with its Gothic cathedral. To the north rise the Tatras. The castle's surroundings were strategically important - controlling trade routes connecting Poland with Hungary.", "audio_url": None},
                {"language_code": "de", "title": "Aussichtsterrasse", "short_description": "Panoramablick auf Zips", "description": "Von dieser Aussichtsterrasse haben Sie einen einzigartigen Panoramablick."},
                {"language_code": "pl", "title": "Taras Widokowy", "short_description": "Panoramiczny widok na Spisz", "description": "Z tego tarasu widokowego roztacza się unikalny widok panoramiczny."},
                {"language_code": "hu", "title": "Kilátóterasz", "short_description": "Panorámás kilátás Szepességre", "description": "Erről a kilátóteraszról egyedülálló panorámás kilátás nyílik."},
                {"language_code": "fr", "title": "Terrasse d'Observation", "short_description": "Vue panoramique sur Spiš", "description": "Depuis cette terrasse d'observation, vous avez une vue panoramique unique."},
                {"language_code": "es", "title": "Terraza de Observación", "short_description": "Vista panorámica de Spiš", "description": "Desde esta terraza de observación, tiene una vista panorámica única."},
                {"language_code": "ru", "title": "Смотровая Терраса", "short_description": "Панорамный вид на Спиш", "description": "С этой смотровой террасы открывается уникальный панорамный вид."},
                {"language_code": "zh", "title": "观景台", "short_description": "斯皮什全景", "description": "从这个观景台，您可以欣赏独特的全景。"},
            ]
        },
        {
            "stop_number": 11,
            "stop_type": "tour",
            "image_url": "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=800&q=80",
            "duration_seconds": 180,
            "translations": [
                {"language_code": "sk", "title": "Zbrojnica a Zbraňová expozícia", "short_description": "Stredoveké zbrane a brnenia", "description": "V zbrojnici sú vystavené stredoveké zbrane a brnenia používané na hrade. Uvidíte meče, kopije, kuše a plátové brnenia. Každý kus výzbroje bol remeselnícky majstrovský výtvor a často stál viac ako celý majetok obyčajného človeka.", "audio_url": None},
                {"language_code": "en", "title": "Armory and Weapons Exhibition", "short_description": "Medieval weapons and armor", "description": "The armory displays medieval weapons and armor used at the castle. You will see swords, spears, crossbows, and plate armor. Each piece of equipment was a craftsman's masterpiece and often cost more than an ordinary person's entire property.", "audio_url": None},
                {"language_code": "de", "title": "Waffenkammer und Waffenausstellung", "short_description": "Mittelalterliche Waffen und Rüstungen", "description": "In der Waffenkammer sind mittelalterliche Waffen und Rüstungen ausgestellt."},
                {"language_code": "pl", "title": "Zbrojownia i Wystawa Broni", "short_description": "Średniowieczna broń i zbroje", "description": "W zbrojowni wystawione są średniowieczne bronie i zbroje używane na zamku."},
                {"language_code": "hu", "title": "Fegyvertár és Fegyveriállítás", "short_description": "Középkori fegyverek és páncélok", "description": "A fegyvertárban a várban használt középkori fegyverek és páncélok láthatók."},
                {"language_code": "fr", "title": "Armurerie et Exposition d'Armes", "short_description": "Armes et armures médiévales", "description": "L'armurerie expose des armes et armures médiévales utilisées au château."},
                {"language_code": "es", "title": "Armería y Exposición de Armas", "short_description": "Armas y armaduras medievales", "description": "La armería exhibe armas y armaduras medievales utilizadas en el castillo."},
                {"language_code": "ru", "title": "Оружейная и Выставка Оружия", "short_description": "Средневековое оружие и доспехи", "description": "В оружейной выставлено средневековое оружие и доспехи, использовавшиеся в замке."},
                {"language_code": "zh", "title": "军械库和武器展览", "short_description": "中世纪武器和盔甲", "description": "军械库展示了城堡使用的中世纪武器和盔甲。"},
            ]
        },
        {
            "stop_number": 12,
            "stop_type": "tour",
            "image_url": "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=800&q=80",
            "duration_seconds": 220,
            "translations": [
                {"language_code": "sk", "title": "Múzeum histórie hradu", "short_description": "800 rokov dejín v obrazoch", "description": "Záverečná expozícia zhŕňa 800-ročnú históriu Spišského hradu. Od založenia v 12. storočí, cez zlatý vek za panovania Zápoľskovcov, až po veľký požiar v roku 1780 a súčasnú rekonštrukciu. Uvidíte historické mapy, dokumenty a artefakty objavené počas archeologických výskumov.", "audio_url": None},
                {"language_code": "en", "title": "Castle History Museum", "short_description": "800 years of history in pictures", "description": "The final exhibition summarizes the 800-year history of Spiš Castle. From its founding in the 12th century, through the golden age under the Zápoľský family, to the great fire of 1780 and current reconstruction. You will see historical maps, documents, and artifacts discovered during archaeological research.", "audio_url": None},
                {"language_code": "de", "title": "Burggeschichtsmuseum", "short_description": "800 Jahre Geschichte in Bildern", "description": "Die abschließende Ausstellung fasst die 800-jährige Geschichte der Zipser Burg zusammen."},
                {"language_code": "pl", "title": "Muzeum Historii Zamku", "short_description": "800 lat historii w obrazach", "description": "Ostatnia ekspozycja podsumowuje 800-letnią historię Zamku Spiskiego."},
                {"language_code": "hu", "title": "Vártörténeti Múzeum", "short_description": "800 év történelem képekben", "description": "A záró kiállítás összefoglalja a Szepesi vár 800 éves történetét."},
                {"language_code": "fr", "title": "Musée de l'Histoire du Château", "short_description": "800 ans d'histoire en images", "description": "L'exposition finale résume les 800 ans d'histoire du château de Spiš."},
                {"language_code": "es", "title": "Museo de Historia del Castillo", "short_description": "800 años de historia en imágenes", "description": "La exposición final resume los 800 años de historia del Castillo de Spiš."},
                {"language_code": "ru", "title": "Музей Истории Замка", "short_description": "800 лет истории в картинках", "description": "Заключительная экспозиция подводит итог 800-летней истории Спишского Града."},
                {"language_code": "zh", "title": "城堡历史博物馆", "short_description": "800年历史图片展", "description": "最后的展览总结了斯皮什城堡800年的历史。"},
            ]
        },
    ]
    
    # 4 Legends (stories without numbers, with book icon)
    legends_data = [
        {
            "stop_number": 101,  # High number for sorting after tour stops
            "stop_type": "legend",
            "image_url": "https://images.unsplash.com/photo-1533679687607-85b38e66c0f3?w=800&q=80",
            "duration_seconds": 300,
            "translations": [
                {"language_code": "sk", "title": "Legenda o Bielej pani", "short_description": "Najslávnejší hradný prízrak", "description": "Podľa legendy na hrade straší Biela pani - duch mladej šľachtičnej, ktorá sa zamilovala do chudobného rytiera. Jej otec zakázal tento vzťah a uväznil ju v hradnej veži. Zúfalá dievčina sa vrhla z hradieb. Odvtedy ju vraj vídať za mesačných nocí, ako sa prechádza po hradných múroch a hľadá svojho milovaného.", "audio_url": None},
                {"language_code": "en", "title": "Legend of the White Lady", "short_description": "The most famous castle ghost", "description": "According to legend, the castle is haunted by the White Lady - the ghost of a young noblewoman who fell in love with a poor knight. Her father forbade this relationship and imprisoned her in the castle tower. The desperate girl threw herself from the walls. Since then, she is said to be seen on moonlit nights, walking along the castle walls, searching for her beloved.", "audio_url": None},
                {"language_code": "de", "title": "Die Legende der Weißen Dame", "short_description": "Der berühmteste Burggeist", "description": "Der Legende nach spukt auf der Burg die Weiße Dame - der Geist einer jungen Adeligen, die sich in einen armen Ritter verliebte."},
                {"language_code": "pl", "title": "Legenda o Białej Damie", "short_description": "Najsłynniejszy duch zamkowy", "description": "Według legendy zamek nawiedza Biała Dama - duch młodej szlachcianki, która zakochała się w biednym rycerzu."},
                {"language_code": "hu", "title": "A Fehér Asszony Legendája", "short_description": "A leghíresebb várkísértet", "description": "A legenda szerint a várban a Fehér Asszony kísért - egy fiatal nemeshölgy szelleme, aki beleszeretett egy szegény lovagba."},
                {"language_code": "fr", "title": "La Légende de la Dame Blanche", "short_description": "Le fantôme le plus célèbre du château", "description": "Selon la légende, le château est hanté par la Dame Blanche - le fantôme d'une jeune noble qui tomba amoureuse d'un pauvre chevalier."},
                {"language_code": "es", "title": "La Leyenda de la Dama Blanca", "short_description": "El fantasma más famoso del castillo", "description": "Según la leyenda, el castillo está embrujado por la Dama Blanca - el fantasma de una joven noble que se enamoró de un pobre caballero."},
                {"language_code": "ru", "title": "Легенда о Белой Даме", "short_description": "Самый известный замковый призрак", "description": "Согласно легенде, в замке обитает Белая Дама - призрак молодой дворянки, влюбившейся в бедного рыцаря."},
                {"language_code": "zh", "title": "白衣女士传说", "short_description": "最著名的城堡幽灵", "description": "根据传说，城堡里出没着白衣女士——一位爱上穷骑士的年轻贵族女子的鬼魂。"},
            ]
        },
        {
            "stop_number": 102,
            "stop_type": "legend",
            "image_url": "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800&q=80",
            "duration_seconds": 280,
            "translations": [
                {"language_code": "sk", "title": "Legenda o Tatárskom vpáde", "short_description": "Hrad, ktorý odolal Tatárom", "description": "V roku 1241 vtrhli do Uhorska tatárske hordy. Spišský hrad bol jedným z mála, ktoré odolali. Legenda hovorí, že keď Tatári obliehali hrad, na oblohe sa zjavil obrovský orol, ktorý im zaslepil oči. Považovali to za zlé znamenie a odtiahli. Odvtedy je orol symbolom Spiša.", "audio_url": None},
                {"language_code": "en", "title": "Legend of the Tatar Invasion", "short_description": "The castle that resisted the Tatars", "description": "In 1241, Tatar hordes invaded Hungary. Spiš Castle was one of the few that resisted. Legend says that when the Tatars besieged the castle, a giant eagle appeared in the sky, blinding their eyes. They considered it a bad omen and retreated. Since then, the eagle has been the symbol of Spiš.", "audio_url": None},
                {"language_code": "de", "title": "Die Legende der Tatareninvasion", "short_description": "Die Burg, die den Tataren widerstand", "description": "Im Jahr 1241 fielen tatarische Horden in Ungarn ein. Die Zipser Burg war eine der wenigen, die Widerstand leistete."},
                {"language_code": "pl", "title": "Legenda o Najeździe Tatarskim", "short_description": "Zamek, który oparł się Tatarom", "description": "W 1241 roku hordy tatarskie najechały Węgry. Zamek Spiski był jednym z niewielu, które stawiły opór."},
                {"language_code": "hu", "title": "A Tatárjárás Legendája", "short_description": "A vár, amely ellenállt a tatároknak", "description": "1241-ben tatár hordák törtek be Magyarországra. A Szepesi vár volt az egyik kevés, amely ellenállt."},
                {"language_code": "fr", "title": "La Légende de l'Invasion Tatare", "short_description": "Le château qui a résisté aux Tatars", "description": "En 1241, les hordes tatares envahirent la Hongrie. Le château de Spiš fut l'un des rares à résister."},
                {"language_code": "es", "title": "La Leyenda de la Invasión Tártara", "short_description": "El castillo que resistió a los tártaros", "description": "En 1241, las hordas tártaras invadieron Hungría. El Castillo de Spiš fue uno de los pocos que resistió."},
                {"language_code": "ru", "title": "Легенда о Татарском Нашествии", "short_description": "Замок, устоявший перед татарами", "description": "В 1241 году татарские орды вторглись в Венгрию. Спишский Град был одним из немногих, который выстоял."},
                {"language_code": "zh", "title": "鞑靼入侵传说", "short_description": "抵抗鞑靼人的城堡", "description": "1241年，鞑靼部落入侵匈牙利。斯皮什城堡是少数抵抗住的城堡之一。"},
            ]
        },
        {
            "stop_number": 103,
            "stop_type": "legend",
            "image_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
            "duration_seconds": 260,
            "translations": [
                {"language_code": "sk", "title": "Legenda o ukrytom poklade", "short_description": "Zlato Zápoľskovcov", "description": "Keď v roku 1780 vypukol požiar, ktorý zničil hrad, Zápoľskovci údajne nestihli zachrániť svoj obrovský poklad. Podľa legendy je niekde v podzemí hradu ukrytá truhlica plná zlata a drahokamov. Mnohí hľadači pokladov ju hľadali, ale nikto ju dodnes nenašiel.", "audio_url": None},
                {"language_code": "en", "title": "Legend of the Hidden Treasure", "short_description": "The Zápoľský gold", "description": "When the fire broke out in 1780 that destroyed the castle, the Zápoľský family allegedly didn't have time to save their enormous treasure. According to legend, somewhere in the castle's underground is hidden a chest full of gold and jewels. Many treasure hunters have searched for it, but no one has found it to this day.", "audio_url": None},
                {"language_code": "de", "title": "Die Legende des Verborgenen Schatzes", "short_description": "Das Zápoľský-Gold", "description": "Als 1780 das Feuer ausbrach, das die Burg zerstörte, soll die Familie Zápoľský keine Zeit gehabt haben, ihren enormen Schatz zu retten."},
                {"language_code": "pl", "title": "Legenda o Ukrytym Skarbie", "short_description": "Złoto Zápoľskich", "description": "Kiedy w 1780 roku wybuchł pożar, który zniszczył zamek, rodzina Zápoľskich podobno nie zdążyła uratować swojego ogromnego skarbu."},
                {"language_code": "hu", "title": "Az Elrejtett Kincs Legendája", "short_description": "A Zápolyaiak aranya", "description": "Amikor 1780-ban kitört a tűz, amely elpusztította a várat, a Zápolya család állítólag nem tudta megmenteni hatalmas kincsét."},
                {"language_code": "fr", "title": "La Légende du Trésor Caché", "short_description": "L'or des Zápoľský", "description": "Lorsque l'incendie éclata en 1780 qui détruisit le château, la famille Zápoľský n'aurait pas eu le temps de sauver son énorme trésor."},
                {"language_code": "es", "title": "La Leyenda del Tesoro Escondido", "short_description": "El oro de los Zápoľský", "description": "Cuando estalló el incendio en 1780 que destruyó el castillo, la familia Zápoľský supuestamente no tuvo tiempo de salvar su enorme tesoro."},
                {"language_code": "ru", "title": "Легенда о Скрытом Сокровище", "short_description": "Золото Запольских", "description": "Когда в 1780 году вспыхнул пожар, уничтоживший замок, семья Запольских якобы не успела спасти свои огромные сокровища."},
                {"language_code": "zh", "title": "隐藏宝藏传说", "short_description": "扎波尔斯基家族的黄金", "description": "当1780年大火烧毁城堡时，扎波尔斯基家族据说没有时间抢救他们巨大的宝藏。"},
            ]
        },
        {
            "stop_number": 104,
            "stop_type": "legend",
            "image_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
            "duration_seconds": 240,
            "translations": [
                {"language_code": "sk", "title": "Legenda o Čiernom rytierovi", "short_description": "Strážca hradných brán", "description": "Čierny rytier bol podľa legendy kapitánom hradnej stráže, ktorý prisahal, že bude chrániť hrad aj po smrti. Keď padol v boji, jeho duch zostal viazaný k hradu. Dodnes ho vraj počuť, ako v noci obchádza hradby - jeho kroky dunia po kamenných múroch a zvuk jeho meča naráža o kamene.", "audio_url": None},
                {"language_code": "en", "title": "Legend of the Black Knight", "short_description": "Guardian of the castle gates", "description": "The Black Knight was, according to legend, the captain of the castle guard who swore to protect the castle even after death. When he fell in battle, his spirit remained bound to the castle. To this day, he is said to be heard patrolling the walls at night - his footsteps echoing on the stone walls and the sound of his sword clanging against stone.", "audio_url": None},
                {"language_code": "de", "title": "Die Legende des Schwarzen Ritters", "short_description": "Wächter der Burgtore", "description": "Der Schwarze Ritter war der Legende nach der Hauptmann der Burgwache, der schwor, die Burg auch nach dem Tod zu schützen."},
                {"language_code": "pl", "title": "Legenda o Czarnym Rycerzu", "short_description": "Strażnik bram zamkowych", "description": "Czarny Rycerz był według legendy kapitanem straży zamkowej, który przysiągł chronić zamek nawet po śmierci."},
                {"language_code": "hu", "title": "A Fekete Lovag Legendája", "short_description": "A várkapuk őrzője", "description": "A Fekete Lovag a legenda szerint a várőrség kapitánya volt, aki megesküdött, hogy halála után is védeni fogja a várat."},
                {"language_code": "fr", "title": "La Légende du Chevalier Noir", "short_description": "Gardien des portes du château", "description": "Le Chevalier Noir était, selon la légende, le capitaine de la garde du château qui jura de protéger le château même après sa mort."},
                {"language_code": "es", "title": "La Leyenda del Caballero Negro", "short_description": "Guardián de las puertas del castillo", "description": "El Caballero Negro era, según la leyenda, el capitán de la guardia del castillo que juró proteger el castillo incluso después de la muerte."},
                {"language_code": "ru", "title": "Легенда о Черном Рыцаре", "short_description": "Страж замковых врат", "description": "Черный Рыцарь был, согласно легенде, капитаном замковой стражи, который поклялся защищать замок даже после смерти."},
                {"language_code": "zh", "title": "黑骑士传说", "short_description": "城堡大门的守护者", "description": "根据传说，黑骑士是城堡卫队队长，他发誓即使死后也要保护城堡。"},
            ]
        },
    ]
    
    # Insert all tour stops
    for stop_data in tour_stops_data:
        existing = await db.tour_stops.find_one({"stop_number": stop_data["stop_number"], "stop_type": "tour"})
        if not existing:
            stop = TourStop(**stop_data)
            doc = stop.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            await db.tour_stops.insert_one(doc)
    
    # Insert all legends
    for legend_data in legends_data:
        existing = await db.tour_stops.find_one({"stop_number": legend_data["stop_number"], "stop_type": "legend"})
        if not existing:
            legend = TourStop(**legend_data)
            doc = legend.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            await db.tour_stops.insert_one(doc)
    
    return {
        "message": "ULTIMATE Spišský Hrad data seeded successfully!",
        "data": {
            "languages": 9,
            "tour_stops": 12,
            "legends": 4,
            "total_content": "16 stops in 9 languages = 144 content pieces"
        }
    }

# ==================== ADMIN UPDATE TEXTS ====================
@api_router.get("/admin/update-texts")
async def update_texts():
    """One-time admin endpoint to update all tour stop texts to new content"""
    TRANSLATIONS = {
        1: {"sk": ("Vitajte na Spišskom hrade", "Hlavný vstup a úvod do hradného komplexu", "Vitajte v jednom z najväčších hradných komplexov v Európe. Vitajte v najväčšej pamiatke s výnimočnou architektúrou, ktorá je príkladom stavebného vývoja hradu v rôznych slohových obdobiach. Vitajte na Spišskom hrade, ktorý prešiel postupnou premenou z kráľovského hradu cez šľachtické sídlo až na vojenskú pevnosť. Prosím, posuňte sa ďalej do stredu tohto nádvoria k stanom, kde vpravo pod múrom je fotografia celého hradného komplexu z výšky. Prosím, dávajte pozor pod nohami, pretože vystupujú kamene a na chodníku je klzko, rovnako ako vo vnútri veže."), "en": ("Welcome to Spiš Castle", "Main entrance and introduction to the castle complex", "Welcome to one of the largest castle complexes in Europe. Welcome to the largest monument with its exceptional architecture, which is an example of the construction development of the castle in different stylistic periods. Welcome to Spiš Castle, which has undergone a gradual transformation from a royal castle, through a noble residence, to a military fortress. Please move further into the middle of this courtyard to the tents, where on the right, under the wall, there is a photograph of the entire castle complex from a height. Please be careful under your feet because there are stones sticking out and it is slippery on the sidewalk as well as inside the tower."), "de": ("Willkommen auf Burg Spiš", "Haupteingang und Einführung in den Burgkomplex", "Willkommen in einem der größten Burgkomplexe Europas. Die Zipser Burg hat eine schrittweise Verwandlung von einer königlichen Burg über eine Adelsresidenz zu einer Militärfestung durchlaufen. Bitte bewegen Sie sich weiter in die Mitte dieses Hofes zu den Zelten, wo sich rechts unter der Mauer eine Fotografie des gesamten Burgkomplexes aus der Höhe befindet."), "pl": ("Witamy na Zamku Spiskim", "Główne wejście i wprowadzenie do kompleksu zamkowego", "Witamy w jednym z największych kompleksów zamkowych w Europie. Zamek Spiski przeszedł stopniową przemianę z zamku królewskiego, przez szlachecką rezydencję, do wojskowej twierdzy. Proszę przejść dalej na środek tego dziedzińca do namiotów, gdzie po prawej stronie, pod murem, znajduje się fotografia całego kompleksu zamkowego z wysokości."), "hu": ("Üdvözöljük a Szepesi várban", "Főbejárat és bevezetés a várkomplexumba", "Üdvözöljük Európa egyik legnagyobb várkomplexumában. A Szepesi vár fokozatosan alakult át királyi várból nemesi rezidencián át katonai erőddé. Kérem, menjenek tovább az udvar közepére a sátrakhoz, ahol jobbra, a fal alatt, egy fénykép látható az egész várkomplexumról magasból."), "fr": ("Bienvenue au Château de Spiš", "Entrée principale et introduction au complexe du château", "Bienvenue dans l'un des plus grands complexes de châteaux d'Europe. Le Château de Spiš a subi une transformation progressive d'un château royal, en passant par une résidence noble, pour devenir une forteresse militaire. Veuillez vous déplacer au milieu de cette cour vers les tentes."), "es": ("Bienvenido al Castillo de Spiš", "Entrada principal e introducción al complejo del castillo", "Bienvenido a uno de los complejos de castillos más grandes de Europa. El Castillo de Spiš ha experimentado una transformación gradual desde un castillo real, a través de una residencia noble, hasta una fortaleza militar."), "ru": ("Добро пожаловать в Спишский Град", "Главный вход и знакомство с замковым комплексом", "Добро пожаловать в один из крупнейших замковых комплексов Европы. Спишский Град претерпел постепенное преобразование от королевского замка через дворянскую резиденцию до военной крепости."), "zh": ("欢迎来到斯皮什城堡", "主入口及城堡建筑群介绍", "欢迎来到欧洲最大的城堡建筑群之一。斯皮什城堡经历了从皇家城堡、贵族府邸到军事要塞的逐步转变。请走到这个庭院中间的帐篷处，在右侧墙壁下有一张整个城堡建筑群的高空照片。")},
        2: {"sk": ("Pred fotografiou hradu", "Prehistorické osídlenie a počiatky hradu", "Hradný kopec bol obývaný už v prehistorických dobách a neolite. Nálezy potvrdzujú bohaté osídlenie keltskými kmeňmi obchodujúcimi so sopečným sklom a obsidiánom. Príbeh kráľovského hradu sa začal za vlády kráľa Bela III. na konci 12. storočia výstavbou veľkej obytnej pozorovacej veže Donžon na vrchole skalného výbežku. V roku 1221 sa hrad stal sídlom Kolomana Haličského z kráľovskej dynastie Arpádovcov."), "en": ("In Front of the Castle Photograph", "Prehistoric settlement and the beginnings of the castle", "The castle hill was already inhabited in prehistoric times and the Neolithic period. The finds confirm the rich settlement by the Celtic tribes trading in volcanic glass and obsidian. The story of the royal castle began during the reign of King Bela III at the end of the 12th century with the construction of a large residential observation tower Donžon on top of a rocky outcrop. In 1221, the castle became the seat of Koloman of Galicia from the royal Árpád dynasty."), "de": ("Vor der Burgfotografie", "Prähistorische Besiedlung und die Anfänge der Burg", "Der Burghügel war bereits in der Vorgeschichte bewohnt. Die Geschichte der königlichen Burg begann während der Herrschaft von König Béla III. am Ende des 12. Jahrhunderts mit dem Bau eines Beobachtungsturms Donžon. Im Jahr 1221 wurde die Burg Sitz von Koloman von Galizien aus der Árpáden-Dynastie."), "pl": ("Przed fotografią zamku", "Prehistoryczne osadnictwo i początki zamku", "Wzgórze zamkowe było zamieszkane już w czasach prehistorycznych. Historia zamku królewskiego rozpoczęła się za panowania króla Béli III pod koniec XII wieku budową wieży obserwacyjnej Donžon. W 1221 roku zamek stał się siedzibą Kolomana Halickiego z dynastii Arpadów."), "hu": ("A várkép előtt", "Őskori település és a vár kezdetei", "A várdomb már az őskorban is lakott volt. A királyi vár története III. Béla király uralma idején kezdődött a 12. század végén egy Donžon torony építésével egy sziklakiugrón. 1221-ben a vár Galíciai Kálmán székhelye lett az Árpád-dinasztiából."), "fr": ("Devant la photographie du château", "Peuplement préhistorique et débuts du château", "La colline du château était déjà habitée à l'époque préhistorique. L'histoire du château royal a commencé sous le règne du roi Béla III à la fin du XIIe siècle avec la construction d'une tour Donžon. En 1221, le château est devenu le siège de Koloman de Galice de la dynastie Árpád."), "es": ("Frente a la fotografía del castillo", "Asentamiento prehistórico y los comienzos del castillo", "La colina del castillo ya estaba habitada en tiempos prehistóricos. La historia del castillo real comenzó durante el reinado del rey Béla III a finales del siglo XII con la construcción de la torre Donžon. En 1221, el castillo se convirtió en la sede de Koloman de Galicia de la dinastía Árpád."), "ru": ("Перед фотографией замка", "Доисторическое поселение и истоки замка", "Замковая гора была заселена ещё в доисторические времена. История королевского замка началась в правление короля Белы III в конце XII века со строительства башни Донжон. В 1221 году замок стал резиденцией Коломана Галицкого из династии Арпадов."), "zh": ("城堡照片前", "史前定居点和城堡的起源", "城堡山在史前时代就已有人居住。城堡历史始于贝拉三世国王统治时期，12世纪末在岩石露头顶部建造了观察塔东荣。1221年，城堡成为阿尔帕德王朝加利西亚科洛曼的驻地。")},
        3: {"sk": ("Pri modeli hradu", "História hradného komplexu a rodiny Csákyovcov", "V tejto miestnosti môžete vidieť náčrty kresieb, ktoré ukazujú, že príbeh Spišského hradu začal výstavbou jednej obrannej veže a skončil tak, ako je znázornené na modeli Spišského hradu. Model so 132 izbami vytvoril Adolph Stephanie. Na začiatku 18. storočia hrad prestal byť pohodlným sídlom. Štefan Csáky mal 26 detí s 2 ženami a rodina hrad opustila. Veľký požiar vypukol v roku 1870. Po 2. svetovej vojne bol hrad zoštátnený a v roku 1961 vyhlásený za národnú kultúrnu pamiatku."), "en": ("At the Castle Model", "History of the castle complex and the Csáky family", "In this room you can see sketches showing that the story of Spiš Castle began with the construction of a single defensive tower and ended as shown in the Model of Spiš Castle. The model of 132 rooms was created by Adolph Stephanie. At the beginning of the 18th century the castle ceased to be a comfortable manor house. Štefan Csáky had 26 children with 2 women and the family left the castle. The great fire broke out in 1870. After World War II the castle was nationalized and in 1961 declared a national cultural monument."), "de": ("Am Burgmodell", "Geschichte des Burgkomplexes und der Familie Csáky", "In diesem Raum sehen Sie Skizzen der Geschichte der Zipser Burg — von einem einzelnen Turm bis zum Modell mit 132 Zimmern von Adolph Stephanie. Štefan Csáky hatte 26 Kinder und die Familie verließ die Burg. Der Brand von 1870 bleibt ungeklärt. Nach dem Zweiten Weltkrieg wurde die Burg 1961 zum nationalen Kulturdenkmal erklärt."), "pl": ("Przy modelu zamku", "Historia kompleksu zamkowego i rodziny Csáky", "W tym pokoju można zobaczyć szkice historii Zamku Spiskiego — od pojedynczej wieży do modelu ze 132 pokojami autorstwa Adolpha Stephanie. Štefan Csáky miał 26 dzieci i rodzina opuściła zamek. Wielki pożar w 1870 roku. Po II wojnie światowej zamek uznany za narodowy zabytek kultury w 1961 roku."), "hu": ("A vármodellnél", "A várkomplexum és a Csáky család története", "Ebben a szobában a Szepesi vár történetének vázlatrajzait láthatja — egyetlen toronytól az Adolph Stephanie által készített 132 szobás modelig. Štefan Csákynak 26 gyermeke volt és a család elhagyta a várat. Az 1870-es tűz. A II. világháború után a várat 1961-ben nemzeti kulturális emlékké nyilvánították."), "fr": ("Au modèle du château", "Histoire du complexe du château et de la famille Csáky", "Dans cette salle, vous voyez des esquisses de l'histoire du château — d'une seule tour au modèle de 132 pièces créé par Adolph Stephanie. Štefan Csáky avait 26 enfants et la famille a quitté le château. L'incendie de 1870. Après la Seconde Guerre mondiale, le château a été déclaré monument en 1961."), "es": ("En el modelo del castillo", "Historia del complejo del castillo y la familia Csáky", "En esta sala puede ver bocetos de la historia del castillo — desde una sola torre hasta el modelo de 132 habitaciones de Adolph Stephanie. Štefan Csáky tuvo 26 hijos y la familia abandonó el castillo. El incendio de 1870. Después de la Segunda Guerra Mundial el castillo fue declarado monumento en 1961."), "ru": ("У модели замка", "История замкового комплекса и семьи Чаки", "В этом зале можно увидеть эскизы истории замка — от единственной башни до модели с 132 комнатами Адольфа Штефани. У Штефана Чаки было 26 детей и семья покинула замок. Пожар 1870 года. После Второй мировой войны замок в 1961 году объявлен национальным памятником."), "zh": ("在城堡模型前", "城堡建筑群历史和查基家族", "在这个房间里，您可以看到城堡历史的素描——从单一塔楼到阿道夫·斯蒂芬尼创建的132个房间的模型。什特凡·查基与两名女性育有26个孩子，家族离开了城堡。1870年大火。二战后城堡1961年被宣布为国家文化古迹。")},
        4: {"sk": ("V kuchyni", "Stredoveká kuchyňa a život na hrade", "Základnou zložkou stravy bolo mäso — hydina, hovädzie, bravčové alebo zverina. Šľachta si vždy mohla dovoliť čerstvé mäso, kým ľudia z nižších vrstiev preferovali bravčové. Najčastejším spôsobom konzervovania bolo údenie, solenie a sušenie. Medzi obľúbené pochúťky patrili obilné kaše pripravované desiatkymi spôsobmi. Recept zo 16. storočia na štvorfarebnú kašu sa zachoval dodnes. V čase pandémií pili všetci víno a pivo namiesto vody."), "en": ("In the Kitchen", "Medieval cuisine and life in the castle", "The basic component of the diet was meat — poultry, beef, pork or game. The nobility could always afford fresh meat, while commoners preferred pork. The most common preservation methods were smoking, salting and drying. Among popular delicacies were cereal porridges prepared in dozens of ways. A recipe from the 16th century for the four-colored porridge has survived to this day. At certain times during pandemics, all adults and children drank wine and beer instead of water."), "de": ("In der Küche", "Mittelalterliche Küche und das Leben auf der Burg", "Der Grundbestandteil der Ernährung war Fleisch — Geflügel, Rind, Schwein oder Wild. Die häufigsten Konservierungsmethoden waren Räuchern, Salzen und Trocknen. Beliebt waren Getreidebrei auf Dutzende Arten. In Zeiten von Pandemien tranken alle Wein und Bier statt Wasser."), "pl": ("W kuchni", "Średniowieczna kuchnia i życie na zamku", "Podstawowym składnikiem diety było mięso — drób, wołowina, wieprzowina lub dziczyzna. Najpopularniejsze metody konserwowania to wędzenie, solenie i suszenie. Popularne były kasze zbożowe na dziesiątki sposobów. W czasie pandemii wszyscy pili wino i piwo zamiast wody."), "hu": ("A konyhában", "Középkori konyha és élet a várban", "Az étrend alapvető összetevője a hús volt — baromfi, marha, sertés vagy vad. A legnépszerűbb tartósítási módok a füstölés, sózás és szárítás. Járványok idején mindenki bort és sört ivott víz helyett."), "fr": ("Dans la cuisine", "Cuisine médiévale et vie au château", "La composante de base de l'alimentation était la viande — volaille, bœuf, porc ou gibier. Les méthodes de conservation les plus courantes étaient le fumage, le salage et le séchage. Les bouillies de céréales préparées de dizaines de façons étaient populaires. En temps de pandémies, tous buvaient du vin et de la bière au lieu de l'eau."), "es": ("En la cocina", "Cocina medieval y vida en el castillo", "El componente básico de la dieta era la carne — aves, ternera, cerdo o caza. Los métodos de conservación más comunes eran el ahumado, la salazón y el secado. Eran populares las papillas de cereales de docenas de maneras. En tiempo de pandemias todos bebían vino y cerveza en lugar de agua."), "ru": ("На кухне", "Средневековая кухня и жизнь в замке", "Основным компонентом питания было мясо — птица, говядина, свинина или дичь. Наиболее распространёнными способами сохранения были копчение, соление и сушка. Популярными были зерновые каши десятками способов. Во время пандемий все пили вино и пиво вместо воды."), "zh": ("在厨房", "中世纪烹饪和城堡生活", "饮食的基本成分是肉类——家禽、牛肉、猪肉或野味。最常见的保存方式是熏制、腌制和干燥。各种方式制作的谷物粥非常受欢迎。在瘟疫期间，所有人都喝葡萄酒和啤酒而不是水。")},
        5: {"sk": ("Na dolnej terase", "Lokalita svetového dedičstva UNESCO a okolie", "Na stenách môžeme vidieť fotografie vyjadrujúce dôvody, prečo bola celá táto oblasť zapísaná na Zoznam svetového kultúrneho a prírodného dedičstva UNESCO v roku 1993, spolu s ranostredovekou gotickou Kostolíkom sv. Ducha v Žehre. Spišský hrad tvorí centrum tejto jedinečnej oblasti. V roku 2009 bola do zoznamu pridaná aj Levoča, kde možno obdivovať nádherný oltár Majstra Pavla a krásne sochy v Kostole sv. Jakuba."), "en": ("On the Lower Terrace", "UNESCO World Heritage Site and surroundings", "On the walls we can see photographs expressing why this entire area was inscribed on the UNESCO World Cultural and Natural Heritage List in 1993, along with the early Gothic church of the Holy Spirit in Žehra. Spiš Castle forms the center of this unique area. In 2009, Levoča was also added to the list, where you can admire the magnificent altar by Master Pavol and the beautiful sculptures in the church of St. James."), "de": ("Auf der unteren Terrasse", "UNESCO-Weltkulturerbe und Umgebung", "An den Wänden sehen wir Fotografien, die zeigen, warum dieses Gebiet 1993 in die UNESCO-Liste aufgenommen wurde, zusammen mit der frühgotischen Kirche des Heiligen Geistes in Žehra. Im Jahr 2009 wurde auch Levoča zur Liste hinzugefügt, wo man den prächtigen Altar von Meister Pavol bewundern kann."), "pl": ("Na dolnym tarasie", "Obiekt Światowego Dziedzictwa UNESCO i okolice", "Na ścianach możemy zobaczyć fotografie pokazujące, dlaczego cały ten obszar został wpisany na Listę UNESCO w 1993 roku, wraz z wczesnogotyckim kościołem Ducha Świętego w Žehrze. W 2009 roku do listy dodano również Lewoczę, gdzie można podziwiać ołtarz Mistrza Pawła."), "hu": ("Az alsó teraszon", "UNESCO Világörökség és környéke", "A falakon fényképeket láthatunk, amelyek kifejezik, miért vette fel az UNESCO 1993-ban ezt az egész területet a listájára, a Žehrai Szentlélek-templommal együtt. 2009-ben Lőcsét is felvették a listára, ahol megcsodálhatja Pavol mester oltárát."), "fr": ("Sur la terrasse inférieure", "Site du patrimoine mondial de l'UNESCO et environs", "Sur les murs, nous voyons des photographies expliquant pourquoi cette zone a été inscrite sur la liste de l'UNESCO en 1993, avec l'église gothique primitive du Saint-Esprit à Žehra. En 2009, Levoča a également été ajoutée, où vous pouvez admirer l'autel du Maître Pavol."), "es": ("En la terraza inferior", "Patrimonio Mundial de la UNESCO y alrededores", "En las paredes vemos fotografías que explican por qué esta área fue inscrita en la lista de la UNESCO en 1993, junto con la iglesia gótica del Espíritu Santo en Žehra. En 2009, Levoča también fue añadida, donde puede admirar el altar del Maestro Pavol."), "ru": ("На нижней террасе", "Объект Всемирного наследия ЮНЕСКО и окрестности", "На стенах мы видим фотографии, объясняющие, почему вся эта территория была внесена в список ЮНЕСКО в 1993 году, вместе с раннеготической церковью Святого Духа в Жехре. В 2009 году в список была добавлена также Левоча, где можно полюбоваться алтарём Мастера Павла."), "zh": ("在下层露台", "联合国教科文组织世界遗产地及周边环境", "在墙壁上，我们可以看到照片，说明为什么整个地区在1993年被列入联合国教科文组织世界遗产名录，连同热赫拉的早期哥特式圣灵教堂。2009年，莱沃恰也被加入名单，在那里您可以欣赏帕沃尔大师的祭坛。")},
        6: {"sk": ("Na románskom predhradí", "Najstaršia časť hradu a legenda o tatárskom vpáde", "Vstúpili ste cez najstaršiu románsku bránu a stojíte na mieste spojenom s vpádom Tatárov a prvou písomnou zmienkou o hrade z roku 1249. Táto časť hradu bola postavená po roku 1241, keď Mongoli vtrhli do Uhorska. Nepriatelia Spišský hrad nedobyli, pravdepodobne preto, že bol postavený z kameňa. Situácia sa zmenila, keď Matej Korvín daroval hrad rodine Zápoľskovcov. Vypočujte si legendu o tatárskej princeznej Šad."), "en": ("On the Romanesque Forecourt", "The oldest part of the castle and the Tatar invasion legend", "You have entered through the oldest Romanesque gate, standing at a place associated with the invasion of the Tatars and the first written record of the castle from 1249. This part of the castle was built after 1241 when the Mongols invaded Hungary. The enemies did not conquer Spiš Castle, probably because it was made of stone. Listen to the legend of the Tatar princess Šad — a story of love between a castle defender and a Tatar princess during the siege of 1241."), "de": ("Auf dem romanischen Vorhof", "Der älteste Teil der Burg und die Legende vom Tatarensturm", "Sie haben das älteste romanische Tor betreten, verbunden mit dem Tatarensturm und der ersten schriftlichen Erwähnung der Burg von 1249. Dieser Teil wurde nach 1241 erbaut, als die Mongolen Ungarn überfielen. Die Feinde haben die Burg nicht erobert. Hören Sie sich die Legende der tatarischen Prinzessin Šad an."), "pl": ("Na romańskim przedzamczu", "Najstarsza część zamku i legenda o najeździe tatarskim", "Weszliście przez najstarszą romańską bramę, w miejscu związanym z najazdem Tatarów i pierwszą pisemną wzmianką o zamku z 1249 roku. Ta część powstała po 1241 roku, gdy Mongołowie najechali Węgry. Wrogom nie udało się zdobyć zamku. Posłuchajcie legendy o tatarskiej księżniczce Šad."), "hu": ("A román előudvaron", "A vár legrégebbi része és a tatár betörés legendája", "A legrégebbi román kapun lépett be, egy helyen, amely a tatárok betöréséhez és a vár 1249-es első írásos emlékéhez kapcsolódik. Ez a rész 1241 után épült, amikor a mongolok megtámadták Magyarországot. Az ellenségeknek nem sikerült elfoglalni a várat. Hallgassák meg Šad tatár hercegnő legendáját."), "fr": ("Sur la cour romane", "La partie la plus ancienne du château et la légende de l'invasion tatare", "Vous avez franchi la plus ancienne porte romane, associée à l'invasion tatare et à la première mention écrite du château de 1249. Cette partie fut construite après 1241, quand les Mongols envahirent la Hongrie. Les ennemis n'ont pas conquis le château. Écoutez la légende de la princesse tatare Šad."), "es": ("En el patio románico", "La parte más antigua del castillo y la leyenda de la invasión tártara", "Ha entrado por la puerta románica más antigua, asociada con la invasión tártara y la primera mención escrita del castillo de 1249. Esta parte fue construida después de 1241, cuando los mongoles invadieron Hungría. Los enemigos no pudieron conquistar el castillo. Escuche la leyenda de la princesa tártara Šad."), "ru": ("На романском предворье", "Старейшая часть замка и легенда о татарском нашествии", "Вы вошли через старейшие романские ворота, место, связанное с татарским нашествием и первым письменным упоминанием о замке 1249 года. Эта часть была построена после 1241 года, когда монголы вторглись в Венгрию. Врагам не удалось завоевать замок. Послушайте легенду о татарской принцессе Шад."), "zh": ("在罗马式前院", "城堡最古老的部分和鞑靼入侵传说", "您穿过最古老的罗马式大门，站在一个与鞑靼入侵和1249年城堡第一次书面记录相关的地方。这部分建于1241年之后，当时蒙古人入侵匈牙利。敌人没能攻占城堡。聆听鞑靼公主沙德的传说。")},
        7: {"sk": ("Na hornej terase", "Panoramatický výhľad na región Spiš a Tatry", "Spišský hrad stojí na vrchole travertínovej skaly v nadmorskej výške 634 m nad morom. Takmer kolmé steny kopca robili z tohto miesta jeden z najlepšie chránených hradov v krajine. V minulosti pod hradným kopcom viedli dve dôležité obchodné cesty. Z tejto vyhliadky môžete vidieť takmer polovicu slovenských hôr: Branisko, Nízke Tatry, Kriváň, Vysoké Tatry a Levočské vrchy. Vidíte tiež dvojvežovú Katedrálu sv. Martina na Spišskej Kapitule a Dreveník naľavo."), "en": ("On the Upper Terrace", "Panoramic view of Spiš region and the Tatras", "Spiš Castle stands on top of a travertine rock at an altitude of 634 m above sea level. The almost perpendicular walls of the hill made this place one of the best protected castles in the country. From this lookout you can see almost half of the Slovak mountains: the Branisko Mountains, the Low Tatras, Kriváň Peak, the High Tatras and the Levoča Mountains. You can also see the twin-towered Cathedral of St. Martin in Spišská Kapitula and the Dreveník hill to the left."), "de": ("Auf der oberen Terrasse", "Panoramablick auf die Zips-Region und die Tatra", "Die Zipser Burg steht auf einem Travertinfelsen in 634 m Höhe. Von diesem Aussichtspunkt sehen Sie fast die Hälfte der slowakischen Berge: Branisko, Niedere Tatra, Kriváň, Hohe Tatra und Levoča-Gebirge. Sie sehen auch die zweitürmige Kathedrale St. Martin in Spišská Kapitula."), "pl": ("Na górnym tarasie", "Panoramiczny widok na region Spiszu i Tatry", "Zamek Spiski stoi na szczycie trawertynowej skały na wysokości 634 m n.p.m. Z tego punktu widokowego widać prawie połowę słowackich gór: Branisko, Niżne Tatry, Krywań, Tatry Wysokie i Góry Lewockie. Widać również dwuwieżową katedrę św. Marcina w Spišskiej Kapitule."), "hu": ("A felső teraszon", "Panorámás kilátás a Szepességre és a Tátrára", "A Szepesi vár egy travertinszikla tetején áll 634 méter magasságban. Erről a kilátóról a szlovák hegység majdnem felét láthatja: Branisko, Alacsony-Tátra, Kriváň, Magas-Tátra és Lőcsei-hegység. Látható a kéttornyú Szent Márton székesegyház a Szepeshelyen is."), "fr": ("Sur la terrasse supérieure", "Vue panoramique sur la région de Spiš et les Tatras", "Le château de Spiš se dresse sur une roche de travertin à 634 m d'altitude. De ce belvédère, vous voyez presque la moitié des montagnes slovaques: Branisko, Basses Tatras, Kriváň, Hautes Tatras et monts Levoča. On voit aussi la cathédrale à deux tours de Spišská Kapitula."), "es": ("En la terraza superior", "Vista panorámica de la región de Spiš y los Tatras", "El Castillo de Spiš se alza sobre una roca de travertino a 634 m. Desde este mirador ve casi la mitad de las montañas eslovacas: Branisko, Bajos Tatras, Kriváň, Altos Tatras y montes Levoča. También se ve la catedral de dos torres de Spišská Kapitula."), "ru": ("На верхней террасе", "Панорамный вид на регион Спиш и Татры", "Спишский Град стоит на травертиновой скале на высоте 634 м. С этой смотровой площадки видно почти половину словацких гор: Браниско, Низкие Татры, Кривань, Высокие Татры и горы Левоча. Виден также двухбашенный собор Святого Мартина в Спишской Капитуле."), "zh": ("在上层露台", "斯皮什地区和塔特拉山的全景", "斯皮什城堡矗立在海拔634米的石灰华岩石顶部。从这个瞭望台可以看到几乎一半的斯洛伐克山脉：布拉尼斯科山、低塔特拉山、克里旺峰、高塔特拉山和莱沃恰山。还可以看到斯皮什卡皮图拉双塔圣马丁大教堂。")},
        8: {"sk": ("Dolné nádvorie", "Najmladšia časť hradu postavená Jánom Jiskrom", "Odtiaľto je krásny výhľad na celé dolné nádvorie postavené v polovici 15. storočia. V ľavom rohu nádvoria možno vidieť kamenné základy pozostatkov keltskej svätyne. Vznik dolného nádvoria sa spája s menom českého šľachtica Jána Jiskru z Brandýsa. Po získaní hradu dal Jiskra pre svojich vojakov postaviť vojenský tábor obohnaný múrmi vysokými 7 až 9 m a hrubými až tri metre. Vo veži vpravo sa nachádza expozícia mučiarne. V ľavej veži sú informácie o divých zvieratách a o susednom kopci Dreveník."), "en": ("Lower Courtyard", "The youngest part of the castle built by Jan Jiskra", "From here there is a beautiful view of the entire lower courtyard built in the mid-15th century. In the left corner you can see the stone foundations of a Celtic sanctuary. The creation of the lower courtyard is connected with the Czech nobleman Ján Jiskra of Brandýs. After acquiring the castle, Jiskra had a military camp built for his soldiers, surrounded by large walls 7 to 9 m high and up to three meters thick. In the right tower there is an exhibition of the torture chamber. In the left tower there is information about wild animals and the neighboring Dreveník hill."), "de": ("Unterer Burghof", "Der jüngste Teil der Burg, erbaut von Jan Jiskra", "Von hier aus hat man einen schönen Blick auf den gesamten unteren Burghof aus der Mitte des 15. Jahrhunderts. In der linken Ecke sieht man Steinfundamente eines keltischen Heiligtums. Der Hof ist mit Ján Jiskra von Brandýs verbunden. Jiskra ließ einen Militärlager mit Mauern 7-9 m hoch bauen. Im rechten Turm gibt es die Folterkammerausstellung, im linken Informationen über Wildtiere und den Dreveník-Hügel."), "pl": ("Dolny dziedziniec", "Najmłodsza część zamku zbudowana przez Jana Jiskrę", "Stąd roztacza się piękny widok na cały dolny dziedziniec z połowy XV wieku. W lewym rogu widać kamienne fundamenty celtyckiej świątyni. Dziedziniec wiąże się z Jánem Jiskrą z Brandýs. Jiskra zbudował obóz wojskowy z murami 7-9 m wysokimi. W prawej wieży jest ekspozycja izby tortur, w lewej informacje o dzikich zwierzętach i wzgórzu Dreveník."), "hu": ("Alsó udvar", "A vár legfiatalabb része, amelyet Jan Jiskra épített", "Innen gyönyörű kilátás nyílik a 15. század közepén épült alsó udvarra. A bal sarokban kelta szentély kőalapjai láthatók. Az udvart Ján Jiskra cseh nemes nevéhez fűzik. Jiskra 7-9 méter magas falakkal övezett katonai tábort épített. A jobb toronyban kínzókamra-kiállítás, a balban vadállat- és Dreveník-domb információk láthatók."), "fr": ("Cour inférieure", "La partie la plus récente du château construite par Jan Jiskra", "De là, belle vue sur la cour inférieure du milieu du XVe siècle. Dans le coin gauche, des fondations d'un sanctuaire celte. La cour est liée à Ján Jiskra de Brandýs. Jiskra fit construire un camp militaire avec des murs de 7-9 m de haut. Dans la tour droite, l'exposition de la chambre de torture; dans la gauche, informations sur la faune et la colline Dreveník."), "es": ("Patio inferior", "La parte más reciente del castillo construida por Jan Jiskra", "Desde aquí, bella vista del patio inferior de mediados del siglo XV. En la esquina izquierda, cimientos de un santuario celta. El patio está ligado a Ján Jiskra de Brandýs. Jiskra construyó un campamento militar con muros de 7-9 m de alto. En la torre derecha, la exposición de la cámara de tortura; en la izquierda, información sobre fauna y la colina Dreveník."), "ru": ("Нижний двор", "Самая молодая часть замка, построенная Яном Йискрой", "Отсюда красивый вид на нижний двор середины XV века. В левом углу видны каменные фундаменты кельтского святилища. Двор связан с чешским дворянином Яном Йискрой из Брандиса. Йискра построил военный лагерь со стенами высотой 7-9 м. В правой башне экспозиция пыточной камеры, в левой — информация о дикой природе и холме Древеник."), "zh": ("下院", "由扬·伊斯克拉建造的城堡最新部分", "从这里可以看到15世纪中期建造的整个下院的美丽景色。左角可以看到凯尔特圣所的石制基础。下院与捷克贵族扬·伊斯克拉相连。伊斯克拉建造了高7至9米的军营围墙。右塔中有酷刑室展览，左塔中有关于野生动物和德列夫尼克山的信息。")},
        9: {"sk": ("Mučiareň", "Stredoveká justícia a metódy vypočúvania", "Mučiareň bola v minulosti neoddeliteľnou súčasťou súdneho systému — úplne normálny a legálny spôsob získavania svedectva alebo priznania. Bežne sa stávalo, že väzeň sa tak vyľakal už len pri pohľade na nástroje, že sa radšej priznal dobrovoľne. Mučenie mohlo trvať rôzne dlho a bolo veľmi účinnou metódou, ktorá takmer vždy vyústila do priznania. Mučiace nástroje: paldy, husle, španielska čižma, skúška ohňom, kladka, dereš, vodný test, strapado a zlomenie kolesá."), "en": ("Torture Chamber", "Medieval justice and interrogation methods", "The torture chamber was an integral part of the judicial system in the past — a completely normal and legal way to obtain testimony or confession. It was common for a prisoner to be so frightened that they would confess voluntarily just from seeing the instruments. Torture could last for varying lengths and was very effective, almost always resulting in a confession. Torture instruments included: the stocks, the violin, the Spanish boot, trial by fire, the pulley, the Dereš bench, the water test, Strapado, and breaking on the wheel."), "de": ("Folterkammer", "Mittelalterliche Justiz und Verhörmethoden", "Die Folterkammer war ein integraler Bestandteil des Justizsystems. Oft gestand ein Gefangener schon beim Anblick der Instrumente freiwillig. Die Folter war sehr effektiv. Folterinstrumente: Pfahl, Violine, Spanische Stiefel, Feuerprobe, Rolle, Dereš, Wasserprobe, Strapado und das Rad."), "pl": ("Sala tortur", "Średniowieczne sądownictwo i metody przesłuchań", "Sala tortur była integralną częścią systemu sądowniczego. Często więzień, widząc tylko instrumenty, przyznawał się dobrowolnie. Tortury były bardzo skuteczne. Narzędzia: paldy, skrzypce, but hiszpański, próba ognia, bloczek, dereš, próba wodna, strapado i koło."), "hu": ("Kínzókamra", "Középkori igazságszolgáltatás és kihallgatási módszerek", "A kínzókamra az igazságszolgáltatás szerves része volt. A fogoly már az eszközök láttán is önként vallott. A kínzás szinte mindig vallomással végződött. Kínzóeszközök: palda, hegedű, spanyolcsizma, tűzpróba, csiga, dereš, vízpróba, strapado és a kerék."), "fr": ("Chambre de torture", "Justice médiévale et méthodes d'interrogatoire", "La chambre de torture faisait partie intégrante du système judiciaire. Un prisonnier confessait souvent volontairement rien qu'à la vue des instruments. La torture aboutissait presque toujours à un aveu. Instruments: stocks, violon, botte espagnole, épreuve du feu, poulie, dereš, épreuve de l'eau, strapado et la roue."), "es": ("Cámara de tortura", "Justicia medieval y métodos de interrogatorio", "La cámara de tortura era parte integral del sistema judicial. Un prisionero a menudo confesaba voluntariamente solo al ver los instrumentos. La tortura casi siempre resultaba en confesión. Instrumentos: el paladín, violín, bota española, prueba del fuego, polea, dereš, prueba del agua, strapado y la rueda."), "ru": ("Пыточная камера", "Средневековое правосудие и методы допроса", "Пыточная камера была неотъемлемой частью судебной системы. Заключённый часто признавался добровольно уже при виде инструментов. Пытки почти всегда приводили к признанию. Орудия: колодки, скрипка, испанский сапог, испытание огнём, блок, дереш, водное испытание, стрападо и колесо."), "zh": ("酷刑室", "中世纪司法和审讯方法", "酷刑室是司法体系不可分割的一部分。囚犯仅见到刑具就常常自愿认罪。酷刑几乎总是以认罪告终。酷刑工具：枷锁、小提琴、西班牙靴、火刑、滑轮、德雷什、水刑、绞刑架和轮刑。")},
        10: {"sk": ("V Zápoľskom paláci", "Kuchyňa neskorogotických Zápoľských palácov", "Prešli ste druhou románskou bránou a ocitli ste sa pred Turzovskou bránou. S najväčšou pravdepodobnosťou stojíte v kuchyni pôvodných západných zápoľských palácov — jediná miestnosť bez okien, ktorá slúžila ako priechod medzi miestnosťami. Ak sa pred vstupom do veže pozriete dole, uvidíte zvyšky prvej stavby z 12. storočia — rozsiahla kruhová kamenná veža postavená dynastiou Árpádovcov, s priemerom 4 metre a výškou 23 metrov. Kvôli tektonickým posunom veža padla."), "en": ("In the Zápoľský Palace", "The kitchen of the late Gothic Zápoľský palaces", "You passed through the second Romanesque gate and found yourself in front of the Turzovo gate. You are most likely standing in the kitchen of the original western Zápoľský palaces — the only room without windows, which served as a passage between rooms. If you look below before entering the tower, you will see the remains of the first building from the 12th century — a large circular stone tower built by the Árpád dynasty, 4 meters in diameter and 23 meters high. Due to tectonic shifts, the tower collapsed."), "de": ("Im Zápoľský-Palast", "Die Küche der spätgotischen Zápoľský-Paläste", "Sie sind durch das zweite romanische Tor gegangen und stehen vor dem Turzovo-Tor. Sie befinden sich höchstwahrscheinlich in der Küche der Zápoľský-Paläste — der einzige Raum ohne Fenster. Wenn Sie vor dem Turm nach unten schauen, sehen Sie Reste des ersten Gebäudes aus dem 12. Jahrhundert — ein runder Steinturm der Árpáden, 4 Meter Durchmesser, 23 Meter hoch. Er fiel durch tektonische Verschiebungen."), "pl": ("W Pałacu Zápoľskich", "Kuchnia późnogotyckich pałaców Zápoľskich", "Przeszliście przez drugą romańską bramę i znaleźliście się przed bramą Turzową. Najprawdopodobniej stoicie w kuchni pałaców Zápoľskich — jedyne pomieszczenie bez okien. Jeśli spojrzycie w dół przed wieżą, zobaczycie pozostałości pierwszego budynku z XII wieku — okrągła kamienna wieża Arpadów, 4 metry średnicy, 23 metry wysoka. Upadła przez przesunięcia tektoniczne."), "hu": ("A Zápoľský-palotában", "A késő gótikus Zápoľský-paloták konyhája", "A második román kapun át jutott a Turzó-kapuhoz. Valószínűleg a Zápoľský-paloták konyhájában áll — az egyetlen ablaktalan helyiség. Ha a torony előtt lenéz, láthatja a 12. századi első épület maradványait — az Árpádok kerek kőtornya, 4 méter átmérővel, 23 méter magasságban. Tektonikus eltolódások miatt összeomlott."), "fr": ("Dans le palais Zápoľský", "La cuisine des palais gothiques tardifs des Zápoľský", "Vous êtes passé par la deuxième porte romane et vous vous trouvez devant la porte Turzovo. Vous êtes très probablement dans la cuisine des palais Zápoľský — la seule pièce sans fenêtre. Si vous regardez en bas avant la tour, vous verrez les restes du premier bâtiment du XIIe siècle — une tour ronde en pierre des Árpád, 4 mètres de diamètre, 23 mètres de haut. Elle est tombée par mouvements tectoniques."), "es": ("En el Palacio Zápoľský", "La cocina de los palacios góticos tardíos de los Zápoľský", "Pasó por la segunda puerta románica y se encontró ante la puerta Turzovo. Probablemente está en la cocina de los palacios Zápoľský — la única habitación sin ventanas. Si mira abajo antes de la torre, verá los restos del primer edificio del siglo XII — una torre redonda de piedra de los Árpád, 4 metros de diámetro, 23 metros de alto. Cayó por movimientos tectónicos."), "ru": ("Во дворце Запольских", "Кухня позднеготических дворцов Запольских", "Вы прошли через вторые романские ворота и оказались перед Турзовскими воротами. Скорее всего, вы находитесь на кухне дворцов Запольских — единственная комната без окон. Если посмотреть вниз перед башней, видны остатки первого здания XII века — круглая каменная башня Арпадов, 4 метра в диаметре, 23 метра высотой. Рухнула из-за тектонических сдвигов."), "zh": ("在扎波尔斯基宫殿", "晚期哥特式扎波尔斯基宫殿的厨房", "您穿过第二道罗马式大门，来到图尔佐沃大门前。您很可能站在扎波尔斯基宫殿的厨房里——唯一没有窗户的房间。如果在进入塔楼前向下看，您会看到12世纪第一座建筑的遗迹——阿尔帕德王朝的圆形石塔，直径4米，高23米。因地面构造运动而倒塌。")},
        11: {"sk": ("Veža — Nebojsa", "Posledné útočisko obrancov hradu", "Súčasná 19-metrová hradná veža bola postavená uprostred už opevnenej akropoly namiesto starej, spolu s palácom. Slúžila len ako miesto poslednej obrany a nazývala sa Nebojsa. Postavil ju vojvoda Koloman, syn kráľa Ondreja II. Veža mala 5 poschodí vrátane suterénu na skladovanie zbraní a potravín. Prístup len po drevenom rebríku na prvé poschodie. Úzke schodisko v smere hodinových ručičiek sa na konci mení na protismerné — to bránilo nepriateľom držať meč v pravej ruke. Vo veži sa zachovala stredoveká toaleta z 13. storočia. Cisterna vysekaná do skaly zbierala dažďovú vodu — jediný zdroj vody na hrade."), "en": ("The Tower — Nebojsa", "The last refuge of the castle defenders", "The current 19-meter castle tower was built in the middle of the already fortified acropolis instead of the old one. It served only as a place of last defense and was called Nebojsa. Built by Duke Koloman, son of King Andrew II. The tower had 5 floors including the basement for storing weapons and food. Access was only by wooden ladder to the first floor. The narrow clockwise staircase turns counter-clockwise at the end — this prevented enemies from holding a sword in their right hand. A medieval toilet from the 13th century is preserved in the tower. A cistern carved into the rock collected rainwater — the only source of water in the castle."), "de": ("Der Turm — Nebojsa", "Die letzte Zuflucht der Burgverteidiger", "Der heutige 19-Meter-Turm wurde in der Mitte der befestigten Akropolis errichtet. Er diente als letzter Verteidigungsort und wurde Nebojsa genannt. Gebaut von Herzog Koloman, Sohn von König Andreas II. Der Turm hatte 5 Stockwerke. Das schmale Treppenhaus dreht sich am Ende gegen den Uhrzeigersinn. Im Turm ein mittelalterliches WC aus dem 13. Jahrhundert. Eine Felsenzisterne sammelte Regenwasser."), "pl": ("Wieża — Nebojsa", "Ostatnie schronienie obrońców zamku", "Obecna 19-metrowa wieża służyła jako ostatnie miejsce obrony i nazywała się Nebojsa. Zbudował ją książę Koloman, syn króla Andrzeja II. Wieża miała 5 kondygnacji. Wąskie schody zmieniają kierunek na końcu. W wieży zachowała się toaleta z XIII wieku. Cysterna w skale zbierała deszczówkę."), "hu": ("A torony — Nebojsa", "A vár védőinek utolsó menedéke", "A jelenlegi 19 méteres torony csak az utolsó védelmi helyként szolgált és Nebojsának hívták. II. András király fia, Kálmán herceg építtette. A szűk lépcső iránya az óramutató járásával ellentétesen változik a végén. A toronyban 13. századi toalett. A sziklaciszterna esővizet gyűjtött."), "fr": ("La tour — Nebojsa", "Le dernier refuge des défenseurs", "La tour actuelle de 19 mètres servait de dernier lieu de défense et s'appelait Nebojsa. Construite par le duc Koloman, fils du roi André II. L'escalier étroit tourne dans le sens antihoraire à la fin. Dans la tour, toilettes médiévales du XIIIe siècle. Une citerne dans le roc recueillait l'eau de pluie."), "es": ("La torre — Nebojsa", "El último refugio de los defensores", "La torre actual de 19 metros servía como último bastión de defensa y se llamaba Nebojsa. Construida por el duque Koloman, hijo del rey Andrés II. La escalera gira en sentido contrario al final. En la torre, retrete medieval del siglo XIII. Una cisterna en la roca recogía agua de lluvia."), "ru": ("Башня — Небойша", "Последнее убежище защитников замка", "Нынешняя 19-метровая башня служила последним местом обороны и называлась Небойша. Построена герцогом Коломаном, сыном короля Андраша II. Узкая лестница меняет направление в конце. В башне средневековый туалет XIII века. Высеченная в скале цистерна собирала дождевую воду."), "zh": ("塔楼——内博亚萨", "城堡守卫者的最后避难所", "现在的19米高塔楼仅作为最后防御地点，称为Nebojsa。由安德烈二世之子科洛曼公爵建造。狭窄楼梯末端变为逆时针方向。塔楼中保存着13世纪的中世纪厕所。凿入岩石的蓄水池收集雨水。")},
        12: {"sk": ("Románsky palác", "Jeden zo 4 svetských románskych palácov zachovaných na svete", "Táto arkádová chodba je jediným vstupom do neskorogotickej kaplnky sv. Alžbety Uhorskej a slúži ako múzeum zbraní a brnení. V zadnej časti skalnatej plošiny stojí mohutný trojposchodový románsky palác — jeden zo 4 zachovaných svetských románskych palácov na svete. Ďalší je v talianskom Merane. Palác bol postavený čo najďalej od hradnej brány. Spišský Špan — kráľovský správca Spiša — žil tu so svojou rodinou. Na prvom poschodí sa nachádza jedna veľká sála rozdelená dvoma radmi stĺpov, osvetlená siedmymi typickými románskymi oknami."), "en": ("Romanesque Palace", "One of only 4 secular Romanesque palaces preserved in the world", "This arcaded corridor is the only entrance to the late Gothic chapel of St. Elizabeth of Hungary and serves as a museum of weapons and armor. At the back of the rocky plateau stands a massive three-story Romanesque palace — one of only 4 preserved secular Romanesque palaces in the world. Another is in Merano, Italy. The palace was built as far as possible from the castle gate. The Spišský Špan — the royal administrator of Spiš — lived here with his family. On the first floor is one large hall divided by two rows of columns, lit by seven typical Romanesque windows."), "de": ("Romanischer Palast", "Einer von nur 4 weltlichen romanischen Palästen der Welt", "Dieser Arkadengang ist der einzige Eingang zur spätgotischen Kapelle der Hl. Elisabeth und Waffen- und Rüstungsmuseum. Am hinteren Teil des Felsplateaus steht ein massiver romanischer Palast — einer von nur 4 erhaltenen weltlichen romanischen Palästen weltweit. Ein weiterer befindet sich in Merano, Italien. Im ersten Stock ein großer Saal, durch zwei Säulenreihen geteilt, durch sieben romanische Fenster beleuchtet."), "pl": ("Pałac romański", "Jeden z zaledwie 4 świeckich pałaców romańskich zachowanych na świecie", "Ten arkadowy korytarz jest jedynym wejściem do późnogotyckiej kaplicy św. Elżbiety Węgierskiej i muzeum broni i zbroi. W tylnej części płaskowyżu stoi masywny pałac romański — jeden z zaledwie 4 zachowanych świeckich pałaców romańskich na świecie. Kolejny jest w Merano we Włoszech. Na pierwszym piętrze wielka sala podzielona dwoma rzędami kolumn, oświetlona siedmioma oknami."), "hu": ("Román stílusú palota", "A világon megőrzött mindössze 4 világi román palota egyike", "Ez az árkádos folyosó a késő gótikus Szent Erzsébet-kápolna egyetlen bejárata és fegyver- és páncélmúzeum. A sziklás fennsík hátsó részén masszív román palota áll — a világon megőrzött mindössze 4 világi román palota egyike. Egy másik az olaszországi Meranóban van. Az első emeleten nagy terem, két oszlopsorral osztva, hét román ablakkal megvilágítva."), "fr": ("Palais roman", "L'un des seulement 4 palais romans séculiers préservés dans le monde", "Ce couloir arcadé est l'unique entrée de la chapelle gothique tardive de Sainte-Élisabeth et musée d'armes et d'armures. À l'arrière du plateau rocheux, un massif palais roman — l'un des seulement 4 palais romans séculiers préservés au monde. Un autre se trouve à Merano, Italie. Au premier étage, grande salle divisée par deux rangées de colonnes, éclairée par sept fenêtres romanes."), "es": ("Palacio románico", "Uno de solo 4 palacios románicos seculares preservados en el mundo", "Este corredor de arcos es la única entrada a la capilla gótica tardía de Santa Isabel de Hungría y museo de armas y armaduras. En la parte posterior de la meseta rocosa, un macizo palacio románico — uno de solo 4 palacios románicos seculares conservados en el mundo. Otro está en Merano, Italia. En el primer piso, gran sala dividida por dos filas de columnas, iluminada por siete ventanas románicas."), "ru": ("Романский дворец", "Один из всего 4 светских романских дворцов, сохранившихся в мире", "Этот аркадный коридор — единственный вход в позднеготическую часовню Святой Елизаветы Венгерской и музей оружия и доспехов. В задней части скалистого плато стоит массивный трёхэтажный романский дворец — один из всего 4 сохранившихся в мире светских романских дворцов. Другой находится в Мерано, Италия. На первом этаже большой зал, разделённый двумя рядами колонн, освещённый семью романскими окнами."), "zh": ("罗马式宫殿", "世界上仅存4座世俗罗马式宫殿之一", "这条拱廊走廊是匈牙利圣伊丽莎白晚期哥特式礼拜堂的唯一入口，也是武器和盔甲博物馆。在岩石高原后部矗立着宏伟的三层罗马式宫殿——世界上仅存4座世俗性罗马式宫殿之一。另一座在意大利梅拉诺。一楼有一个大厅，仅由两排柱子分隔，被七个典型的罗马式窗户照亮。")},
    }
    updated = 0
    errors = []
    for stop_num, langs in TRANSLATIONS.items():
        stop = await db.tour_stops.find_one({"stop_number": stop_num})
        if not stop:
            errors.append(f"Missing stop {stop_num}")
            continue
        ex = {t["language_code"]: t for t in stop.get("translations", [])}
        for lc, (ti, sd, de) in langs.items():
            if lc in ex:
                ex[lc]["title"] = ti
                ex[lc]["short_description"] = sd
                ex[lc]["description"] = de
            else:
                ex[lc] = {"language_code": lc, "title": ti, "short_description": sd, "description": de, "audio_url": None}
        r = await db.tour_stops.update_one({"stop_number": stop_num}, {"$set": {"translations": list(ex.values()), "updated_at": datetime.now(timezone.utc).isoformat()}})
        if r.modified_count:
            updated += 1
    return {"status": "done", "updated": updated, "errors": errors, "total": len(TRANSLATIONS)}

# ==================== EXPORT DOWNLOAD ====================
@api_router.get("/export/download")
async def download_export():
    """Download the complete project export ZIP"""
    zip_path = "/app/spis-castle-export.zip"
    if os.path.exists(zip_path):
        return FileResponse(
            zip_path,
            media_type="application/zip",
            filename="spis-castle-export.zip",
            headers={"Content-Disposition": "attachment; filename=spis-castle-export.zip"}
        )
    return {"error": "Export file not found. Please generate it first."}


# ==================== STRIPE PAYMENTS ====================
import stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

PRICES = {
    "audio": "price_1TPnIyFMbg1KBMgPYEw17xf1",
    "vr": "price_1TPnK5FMbg1KBMgPwlKgv5Nz",
}

@api_router.post("/payment/create-checkout")
async def create_checkout(request: Request):
    body = await request.json()
    product_type = body.get("type", "audio")
    price_id = PRICES.get(product_type, PRICES["audio"])
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="payment",
        success_url="http://178.104.72.151:8002/api/payment/success?session_id={CHECKOUT_SESSION_ID}&type=" + product_type,
        cancel_url="http://178.104.72.151:8002/api/payment/cancel",
    )
    return {"url": session.url}

@api_router.get("/payment/success")
async def payment_success(session_id: str, type: str = "audio"):
    session = stripe.checkout.Session.retrieve(session_id)
    if session.payment_status == "paid":
        import random, string
        code = "CASTLE-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        return Response(content=f"<html><body><h1>Code: {code}</h1></body></html>", media_type="text/html")
    return {"error": "Payment not completed"}

@api_router.get("/payment/cancel")
async def payment_cancel():
    return Response(content="<html><body><h1>Cancelled</h1></body></html>", media_type="text/html")

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

