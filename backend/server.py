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
JWT_SECRET = os.environ.get('JWT_SECRET', 'spissky-hrad-ultimate-secret-2024')
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
    title: str
    short_description: str = ""
    description: str
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
    """Generate QR code as PNG bytes"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
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
