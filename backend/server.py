from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
import aiofiles

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'castle_audio_guide')]

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
(UPLOAD_DIR / "audio").mkdir(exist_ok=True)
(UPLOAD_DIR / "images").mkdir(exist_ok=True)

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'castle-audio-guide-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Castle Audio Guide API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ==================== MODELS ====================

class AdminUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminRegister(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class Language(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    name: str
    native_name: str
    flag_emoji: str
    is_active: bool = True
    order: int = 0

class LanguageCreate(BaseModel):
    code: str
    name: str
    native_name: str
    flag_emoji: str
    is_active: bool = True
    order: int = 0

class TourStopTranslation(BaseModel):
    language_code: str
    title: str
    description: str
    audio_url: Optional[str] = None

class TourStop(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stop_number: int
    image_url: Optional[str] = None
    translations: List[TourStopTranslation] = []
    duration_seconds: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TourStopCreate(BaseModel):
    stop_number: int
    image_url: Optional[str] = None
    translations: List[TourStopTranslation] = []
    duration_seconds: int = 0
    is_active: bool = True

class TourStopUpdate(BaseModel):
    stop_number: Optional[int] = None
    image_url: Optional[str] = None
    translations: Optional[List[TourStopTranslation]] = None
    duration_seconds: Optional[int] = None
    is_active: Optional[bool] = None

class SiteInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    language_code: str
    title: str
    description: str
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SiteInfoCreate(BaseModel):
    language_code: str
    title: str
    description: str

class SiteSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default="main")
    site_name: str = "Spišský Hrad"
    site_subtitle: str = "Audio Guide"
    welcome_description: str = "Discover the largest castle complex in Central Europe through our immersive audio experience"
    logo_url: Optional[str] = None
    default_hero_image: str = "https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=1200&q=80"
    primary_color: str = "#8B4513"
    secondary_color: str = "#D4AF37"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SiteSettingsUpdate(BaseModel):
    site_name: Optional[str] = None
    site_subtitle: Optional[str] = None
    welcome_description: Optional[str] = None
    logo_url: Optional[str] = None
    default_hero_image: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None

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

# ==================== PUBLIC ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Castle Audio Guide API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Languages
@api_router.get("/languages", response_model=List[Language])
async def get_languages():
    languages = await db.languages.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    return languages

# Tour Stops - Public
@api_router.get("/tour-stops", response_model=List[TourStop])
async def get_tour_stops():
    tour_stops = await db.tour_stops.find({"is_active": True}, {"_id": 0}).sort("stop_number", 1).to_list(100)
    
    for stop in tour_stops:
        if isinstance(stop.get('created_at'), str):
            stop['created_at'] = datetime.fromisoformat(stop['created_at'])
        if isinstance(stop.get('updated_at'), str):
            stop['updated_at'] = datetime.fromisoformat(stop['updated_at'])
    
    return tour_stops

@api_router.get("/tour-stops/{stop_id}", response_model=TourStop)
async def get_tour_stop(stop_id: str):
    stop = await db.tour_stops.find_one({"id": stop_id}, {"_id": 0})
    if not stop:
        raise HTTPException(status_code=404, detail="Tour stop not found")
    
    if isinstance(stop.get('created_at'), str):
        stop['created_at'] = datetime.fromisoformat(stop['created_at'])
    if isinstance(stop.get('updated_at'), str):
        stop['updated_at'] = datetime.fromisoformat(stop['updated_at'])
    
    return stop

# Site Info
@api_router.get("/site-info")
async def get_site_info(language: str = "sk"):
    info = await db.site_info.find_one({"language_code": language}, {"_id": 0})
    if not info:
        info = await db.site_info.find_one({"language_code": "sk"}, {"_id": 0})
    if not info:
        return {
            "id": "default",
            "language_code": language,
            "title": "Vitajte na Spišskom hrade",
            "description": "Objavte najväčší hradný komplex v strednej Európe prostredníctvom nášho pútavého audio sprievodcu."
        }
    return info

# Site Settings - Public
@api_router.get("/site-settings")
async def get_site_settings():
    settings = await db.site_settings.find_one({"id": "main"}, {"_id": 0})
    if not settings:
        return SiteSettings().model_dump()
    return settings

# Offline Package
@api_router.get("/offline-package")
async def get_offline_package():
    languages = await db.languages.find({"is_active": True}, {"_id": 0}).to_list(100)
    tour_stops = await db.tour_stops.find({"is_active": True}, {"_id": 0}).to_list(100)
    site_info = await db.site_info.find({}, {"_id": 0}).to_list(100)
    
    for stop in tour_stops:
        if isinstance(stop.get('created_at'), str):
            stop['created_at'] = datetime.fromisoformat(stop['created_at'])
        if isinstance(stop.get('updated_at'), str):
            stop['updated_at'] = datetime.fromisoformat(stop['updated_at'])
    
    return {
        "languages": languages,
        "tour_stops": tour_stops,
        "site_info": site_info,
        "version": datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
        "generated_at": datetime.now(timezone.utc)
    }

# ==================== ADMIN AUTH ====================

@api_router.post("/admin/register", response_model=TokenResponse)
async def admin_register(data: AdminRegister):
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

# ==================== ADMIN - TOUR STOPS ====================

@api_router.get("/admin/tour-stops", response_model=List[TourStop])
async def admin_get_tour_stops(current_admin: dict = Depends(get_current_admin)):
    tour_stops = await db.tour_stops.find({}, {"_id": 0}).sort("stop_number", 1).to_list(100)
    
    for stop in tour_stops:
        if isinstance(stop.get('created_at'), str):
            stop['created_at'] = datetime.fromisoformat(stop['created_at'])
        if isinstance(stop.get('updated_at'), str):
            stop['updated_at'] = datetime.fromisoformat(stop['updated_at'])
    
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
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return updated

@api_router.delete("/admin/tour-stops/{stop_id}")
async def admin_delete_tour_stop(stop_id: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.tour_stops.delete_one({"id": stop_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tour stop not found")
    return {"message": "Tour stop deleted"}

# ==================== FILE UPLOADS ====================

@api_router.post("/admin/upload/audio")
async def upload_audio(file: UploadFile = File(...), current_admin: dict = Depends(get_current_admin)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    ext = file.filename.lower().split('.')[-1] if '.' in file.filename else 'mp3'
    allowed_extensions = ['mp3', 'wav', 'ogg', 'm4a']
    
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid audio file type")
    
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{ext}"
    file_path = UPLOAD_DIR / "audio" / filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    file_url = f"/api/uploads/audio/{filename}"
    return {"url": file_url, "filename": filename}

@api_router.post("/admin/upload/image")
async def upload_image(file: UploadFile = File(...), current_admin: dict = Depends(get_current_admin)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    ext = file.filename.lower().split('.')[-1] if '.' in file.filename else 'jpg'
    allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid image file type")
    
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{ext}"
    file_path = UPLOAD_DIR / "images" / filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    file_url = f"/api/uploads/images/{filename}"
    return {"url": file_url, "filename": filename}

# Serve uploaded files
@api_router.get("/uploads/audio/{filename}")
@api_router.head("/uploads/audio/{filename}")
async def serve_audio(filename: str, request: Request):
    file_path = UPLOAD_DIR / "audio" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    file_size = file_path.stat().st_size
    ext = filename.lower().split('.')[-1]
    content_type = {'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'ogg': 'audio/ogg', 'm4a': 'audio/mp4'}.get(ext, 'audio/mpeg')
    
    range_header = request.headers.get('range')
    
    if range_header:
        range_match = range_header.replace('bytes=', '').split('-')
        start = int(range_match[0]) if range_match[0] else 0
        end = int(range_match[1]) if range_match[1] else file_size - 1
        
        if start >= file_size:
            from fastapi.responses import Response
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
    media_types = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp'}
    return FileResponse(file_path, media_type=media_types.get(ext, 'image/jpeg'))

# ==================== SEED DATA ====================

@api_router.post("/seed-data")
async def seed_initial_data():
    """Seed initial castle tour data"""
    
    # Seed languages
    languages_data = [
        {"code": "sk", "name": "Slovak", "native_name": "Slovensky", "flag_emoji": "🇸🇰", "order": 1},
        {"code": "en", "name": "English", "native_name": "English", "flag_emoji": "🇬🇧", "order": 2},
        {"code": "de", "name": "German", "native_name": "Deutsch", "flag_emoji": "🇩🇪", "order": 3},
        {"code": "pl", "name": "Polish", "native_name": "Polski", "flag_emoji": "🇵🇱", "order": 4},
        {"code": "hu", "name": "Hungarian", "native_name": "Magyar", "flag_emoji": "🇭🇺", "order": 5},
    ]
    
    for lang_data in languages_data:
        existing = await db.languages.find_one({"code": lang_data["code"]})
        if not existing:
            lang = Language(**lang_data)
            await db.languages.insert_one(lang.model_dump())
    
    # Seed site info
    site_info_data = [
        {"language_code": "sk", "title": "Vitajte na Spišskom hrade", "description": "Objavte najväčší hradný komplex v strednej Európe. Spišský hrad je zapísaný na zozname svetového dedičstva UNESCO a ponúka úchvatný pohľad do stredovekej histórie."},
        {"language_code": "en", "title": "Welcome to Spiš Castle", "description": "Discover the largest castle complex in Central Europe. Spiš Castle is a UNESCO World Heritage Site offering a breathtaking glimpse into medieval history."},
        {"language_code": "de", "title": "Willkommen auf der Zipser Burg", "description": "Entdecken Sie den größten Burgkomplex Mitteleuropas. Die Zipser Burg ist UNESCO-Weltkulturerbe und bietet einen atemberaubenden Einblick in die mittelalterliche Geschichte."},
        {"language_code": "pl", "title": "Witamy na Zamku Spiskim", "description": "Odkryj największy kompleks zamkowy w Europie Środkowej. Zamek Spiski jest wpisany na Listę Światowego Dziedzictwa UNESCO."},
        {"language_code": "hu", "title": "Üdvözöljük a Szepesi várban", "description": "Fedezze fel Közép-Európa legnagyobb várát. A Szepesi vár UNESCO Világörökségi helyszín."},
    ]
    
    for info_data in site_info_data:
        existing = await db.site_info.find_one({"language_code": info_data["language_code"]})
        if not existing:
            info = SiteInfo(**info_data)
            doc = info.model_dump()
            doc['updated_at'] = doc['updated_at'].isoformat()
            await db.site_info.insert_one(doc)
    
    # Seed site settings
    existing_settings = await db.site_settings.find_one({"id": "main"})
    if not existing_settings:
        settings = SiteSettings()
        doc = settings.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.site_settings.insert_one(doc)
    
    # Seed tour stops for Spiš Castle
    tour_stops_data = [
        {
            "stop_number": 1,
            "image_url": "https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=800&q=80",
            "duration_seconds": 180,
            "translations": [
                {"language_code": "sk", "title": "Vstupná brána", "description": "Hlavná vstupná brána do hradného komplexu. Táto mohutná brána bola postavená v 13. storočí a slúžila ako hlavný obranný prvok hradu. Z tohto miesta máte prvý pohľad na rozľahlosť Spišského hradu."},
                {"language_code": "en", "title": "Main Gate", "description": "The main entrance gate to the castle complex. This massive gate was built in the 13th century and served as the primary defensive feature. From here you get your first glimpse of the vastness of Spiš Castle."},
                {"language_code": "de", "title": "Haupttor", "description": "Das Haupteingangstor zum Burgkomplex. Dieses massive Tor wurde im 13. Jahrhundert erbaut und diente als wichtigstes Verteidigungselement."},
                {"language_code": "pl", "title": "Brama Główna", "description": "Główna brama wjazdowa do kompleksu zamkowego. Ta masywna brama została zbudowana w XIII wieku."},
                {"language_code": "hu", "title": "Főkapu", "description": "A várkomplexum fő bejárati kapuja. Ezt a hatalmas kaput a 13. században építették."},
            ]
        },
        {
            "stop_number": 2,
            "image_url": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80",
            "duration_seconds": 200,
            "translations": [
                {"language_code": "sk", "title": "Dolný hrad", "description": "Dolný hrad bol vybudovaný v 15. storočí a slúžil ako hospodárske centrum. Nachádza sa tu viacero budov vrátane kováčskej dielne, stajní a skladov. Táto časť hradu bola domovom služobníctva a remeselníkov."},
                {"language_code": "en", "title": "Lower Castle", "description": "The Lower Castle was built in the 15th century and served as the economic center. It contains several buildings including a blacksmith workshop, stables, and storage facilities."},
                {"language_code": "de", "title": "Untere Burg", "description": "Die untere Burg wurde im 15. Jahrhundert erbaut und diente als wirtschaftliches Zentrum."},
                {"language_code": "pl", "title": "Zamek Dolny", "description": "Zamek Dolny został zbudowany w XV wieku i służył jako centrum gospodarcze."},
                {"language_code": "hu", "title": "Alsó vár", "description": "Az alsó várat a 15. században építették, és gazdasági központként szolgált."},
            ]
        },
        {
            "stop_number": 3,
            "image_url": "https://images.unsplash.com/photo-1551524559-8af4e6624178?w=800&q=80",
            "duration_seconds": 220,
            "translations": [
                {"language_code": "sk", "title": "Stredný hrad", "description": "Stredný hrad je jednou z najstarších častí komplexu, pochádzajúcou z 12. storočia. Tu sa nachádzal románsky palác a kaplnka. Mohutné múry svedčia o strategickom význame tohto miesta."},
                {"language_code": "en", "title": "Middle Castle", "description": "The Middle Castle is one of the oldest parts of the complex, dating back to the 12th century. Here stood the Romanesque palace and chapel. The massive walls testify to the strategic importance of this location."},
                {"language_code": "de", "title": "Mittlere Burg", "description": "Die mittlere Burg ist einer der ältesten Teile des Komplexes aus dem 12. Jahrhundert."},
                {"language_code": "pl", "title": "Zamek Środkowy", "description": "Zamek Środkowy to jedna z najstarszych części kompleksu, pochodząca z XII wieku."},
                {"language_code": "hu", "title": "Középső vár", "description": "A középső vár a komplexum egyik legrégebbi része, a 12. századból származik."},
            ]
        },
        {
            "stop_number": 4,
            "image_url": "https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?w=800&q=80",
            "duration_seconds": 250,
            "translations": [
                {"language_code": "sk", "title": "Horný hrad - Donjon", "description": "Donjon je najstaršia a najvyššia časť hradu. Táto obranná veža bola postavená v 12. storočí a slúžila ako posledné útočisko v prípade útoku. Z vrcholu máte výhľad na celé Spiš a Tatry."},
                {"language_code": "en", "title": "Upper Castle - Keep", "description": "The Keep is the oldest and highest part of the castle. This defensive tower was built in the 12th century and served as the last refuge in case of attack. From the top you have a view of the entire Spiš region and the Tatras."},
                {"language_code": "de", "title": "Obere Burg - Bergfried", "description": "Der Bergfried ist der älteste und höchste Teil der Burg aus dem 12. Jahrhundert."},
                {"language_code": "pl", "title": "Zamek Górny - Donżon", "description": "Donżon to najstarsza i najwyższa część zamku, zbudowana w XII wieku."},
                {"language_code": "hu", "title": "Felső vár - Öregtorony", "description": "Az öregtorony a vár legrégebbi és legmagasabb része a 12. századból."},
            ]
        },
        {
            "stop_number": 5,
            "image_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
            "duration_seconds": 190,
            "translations": [
                {"language_code": "sk", "title": "Hradná kaplnka", "description": "Románska kaplnka z 13. storočia je jedným z najzachovalejších priestorov hradu. Zachovali sa tu originálne fresky a gotické prvky. Kaplnka slúžila hradnej posádke a šľachte."},
                {"language_code": "en", "title": "Castle Chapel", "description": "The Romanesque chapel from the 13th century is one of the best-preserved spaces in the castle. Original frescoes and Gothic elements have been preserved here."},
                {"language_code": "de", "title": "Burgkapelle", "description": "Die romanische Kapelle aus dem 13. Jahrhundert ist einer der am besten erhaltenen Räume der Burg."},
                {"language_code": "pl", "title": "Kaplica Zamkowa", "description": "Romańska kaplica z XIII wieku to jedna z najlepiej zachowanych przestrzeni zamku."},
                {"language_code": "hu", "title": "Várkápolna", "description": "A 13. századi román stílusú kápolna a vár egyik legjobban megőrzött tere."},
            ]
        },
        {
            "stop_number": 6,
            "image_url": "https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=800&q=80",
            "duration_seconds": 170,
            "translations": [
                {"language_code": "sk", "title": "Múzeum mučenia", "description": "Expozícia stredovekých mučiacich nástrojov dokumentuje temnú stránku stredovekej justície. Nachádza sa tu zbierka originálnych nástrojov z obdobia 14.-17. storočia."},
                {"language_code": "en", "title": "Torture Museum", "description": "The exhibition of medieval torture instruments documents the dark side of medieval justice. It contains a collection of original instruments from the 14th-17th centuries."},
                {"language_code": "de", "title": "Foltermuseum", "description": "Die Ausstellung mittelalterlicher Folterinstrumente dokumentiert die dunkle Seite der mittelalterlichen Justiz."},
                {"language_code": "pl", "title": "Muzeum Tortur", "description": "Wystawa średniowiecznych narzędzi tortur dokumentuje mroczną stronę średniowiecznego wymiaru sprawiedliwości."},
                {"language_code": "hu", "title": "Kínzómúzeum", "description": "A középkori kínzóeszközök kiállítása a középkori igazságszolgáltatás sötét oldalát dokumentálja."},
            ]
        },
        {
            "stop_number": 7,
            "image_url": "https://images.unsplash.com/photo-1564429238718-84cb8b4c7f1a?w=800&q=80",
            "duration_seconds": 200,
            "translations": [
                {"language_code": "sk", "title": "Vyhliadková terasa", "description": "Z tejto terasy sa vám naskytne panoramatický výhľad na Spišskú Kapitulu, Levoču a za jasného počasia aj na Vysoké Tatry. Spišský hrad s rozlohou 4 hektáre patrí medzi najväčšie hrady v Európe."},
                {"language_code": "en", "title": "Observation Terrace", "description": "From this terrace you have a panoramic view of Spiš Chapter, Levoča, and on clear days even the High Tatras. Spiš Castle, covering 4 hectares, is one of the largest castles in Europe."},
                {"language_code": "de", "title": "Aussichtsterrasse", "description": "Von dieser Terrasse haben Sie einen Panoramablick auf das Zipser Kapitel, Leutschau und bei klarem Wetter sogar die Hohe Tatra."},
                {"language_code": "pl", "title": "Taras Widokowy", "description": "Z tego tarasu roztacza się panoramiczny widok na Spiską Kapitułę, Lewoczę, a przy dobrej pogodzie nawet na Wysokie Tatry."},
                {"language_code": "hu", "title": "Kilátóterasz", "description": "Erről a teraszról panorámás kilátás nyílik a Szepesi Káptalanra, Lőcsére, és tiszta időben még a Magas-Tátrára is."},
            ]
        },
    ]
    
    for stop_data in tour_stops_data:
        existing = await db.tour_stops.find_one({"stop_number": stop_data["stop_number"]})
        if not existing:
            stop = TourStop(**stop_data)
            doc = stop.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            await db.tour_stops.insert_one(doc)
    
    return {"message": "Castle audio guide data seeded successfully"}

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
