"""
Import real tour data from tour_stops_import.json into MongoDB.
Maps existing audio files to tour stops.
"""
import json
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# Available audio files mapping: stop{N}_{lang}.mp3
AUDIO_DIR = ROOT_DIR / "uploads" / "audio"

def get_available_audio():
    """Scan available audio files and create mapping"""
    audio_map = {}
    if AUDIO_DIR.exists():
        for f in AUDIO_DIR.iterdir():
            if f.name.startswith('stop') and f.name.endswith('.mp3'):
                # Parse stop{N}_{lang}.mp3
                parts = f.stem.split('_')
                if len(parts) == 2:
                    stop_num = int(parts[0].replace('stop', ''))
                    lang = parts[1]
                    if stop_num not in audio_map:
                        audio_map[stop_num] = {}
                    audio_map[stop_num][lang] = f"/api/uploads/audio/{f.name}"
    return audio_map

async def import_data():
    print("=" * 60)
    print("IMPORTING REAL TOUR DATA")
    print("=" * 60)
    
    # Load tour stops data
    with open(ROOT_DIR / 'tour_stops_import.json', 'r') as f:
        raw_stops = json.load(f)
    
    print(f"Found {len(raw_stops)} stops in import file")
    
    # Get available audio
    audio_map = get_available_audio()
    print(f"Found audio for stops: {sorted(audio_map.keys())}")
    for stop_num, langs in sorted(audio_map.items()):
        print(f"  Stop {stop_num}: {sorted(langs.keys())}")
    
    # Clear existing tour stops
    result = await db.tour_stops.delete_many({})
    print(f"\nCleared {result.deleted_count} existing tour stops")
    
    # Process and insert stops
    legend_number = 1
    inserted = 0
    
    for raw_stop in raw_stops:
        stop_number = raw_stop.get('stop_number')
        is_legend = stop_number is None
        
        if is_legend:
            stop_type = "legend"
            stop_number = legend_number
            legend_number += 1
        else:
            stop_type = "tour"
        
        # Build translations from content dict
        translations = []
        content = raw_stop.get('content', {})
        
        for lang_code, lang_content in content.items():
            if isinstance(lang_content, dict):
                title = lang_content.get('title', '')
                description = lang_content.get('description', '')
                
                # Get audio URL if available
                audio_url = None
                if not is_legend and stop_number in audio_map:
                    audio_url = audio_map[stop_number].get(lang_code)
                
                translations.append({
                    "language_code": lang_code,
                    "title": title,
                    "short_description": description[:100] + "..." if len(description) > 100 else description,
                    "description": description,
                    "audio_url": audio_url,
                    "video_url": None,
                    "vr_url": None,
                })
        
        # Create tour stop document
        stop_doc = {
            "id": str(uuid.uuid4()),
            "stop_number": stop_number,
            "stop_type": stop_type,
            "image_url": None,
            "gallery_images": [],
            "translations": translations,
            "duration_seconds": 180 if stop_type == "tour" else 120,
            "ambient_sound_url": None,
            "qr_code_id": str(uuid.uuid4())[:8].upper(),
            "gps_latitude": None,
            "gps_longitude": None,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        await db.tour_stops.insert_one(stop_doc)
        inserted += 1
        
        audio_count = sum(1 for t in translations if t['audio_url'])
        type_label = "LEGEND" if is_legend else "TOUR"
        en_title = next((t['title'] for t in translations if t['language_code'] == 'en'), '?')
        print(f"  [{type_label}] #{stop_number}: {en_title} ({len(translations)} langs, {audio_count} audio)")
    
    print(f"\nInserted {inserted} tour stops total")
    
    # Verify languages exist
    lang_count = await db.languages.count_documents({})
    if lang_count == 0:
        print("\nSeeding languages...")
        languages_data = [
            {"id": str(uuid.uuid4()), "code": "sk", "name": "Slovak", "native_name": "Slovensky", "flag_emoji": "🇸🇰", "is_active": True, "order": 1},
            {"id": str(uuid.uuid4()), "code": "en", "name": "English", "native_name": "English", "flag_emoji": "🇬🇧", "is_active": True, "order": 2},
            {"id": str(uuid.uuid4()), "code": "de", "name": "German", "native_name": "Deutsch", "flag_emoji": "🇩🇪", "is_active": True, "order": 3},
            {"id": str(uuid.uuid4()), "code": "pl", "name": "Polish", "native_name": "Polski", "flag_emoji": "🇵🇱", "is_active": True, "order": 4},
            {"id": str(uuid.uuid4()), "code": "hu", "name": "Hungarian", "native_name": "Magyar", "flag_emoji": "🇭🇺", "is_active": True, "order": 5},
            {"id": str(uuid.uuid4()), "code": "fr", "name": "French", "native_name": "Français", "flag_emoji": "🇫🇷", "is_active": True, "order": 6},
            {"id": str(uuid.uuid4()), "code": "es", "name": "Spanish", "native_name": "Español", "flag_emoji": "🇪🇸", "is_active": True, "order": 7},
            {"id": str(uuid.uuid4()), "code": "ru", "name": "Russian", "native_name": "Русский", "flag_emoji": "🇷🇺", "is_active": True, "order": 8},
            {"id": str(uuid.uuid4()), "code": "zh", "name": "Chinese", "native_name": "中文", "flag_emoji": "🇨🇳", "is_active": True, "order": 9},
        ]
        for lang in languages_data:
            await db.languages.insert_one(lang)
        print(f"  Inserted {len(languages_data)} languages")
    else:
        print(f"\nLanguages already exist: {lang_count}")
    
    # Ensure site settings exist
    settings = await db.site_settings.find_one({"id": "main"})
    if not settings:
        print("\nSeeding site settings...")
        await db.site_settings.insert_one({
            "id": "main",
            "site_name": "Spiš Castle",
            "site_subtitle": "Audio Tour Guide",
            "welcome_description": "Explore, Discover and Immerse yourself in the largest U.N.E.S.C.O castle complexes in Europe.",
            "logo_url": None,
            "default_hero_image": "https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=1200&q=80",
            "primary_color": "#1A1A2E",
            "secondary_color": "#FFD700",
            "background_ambient_url": None,
            "enable_offline_mode": True,
            "enable_sound_therapy": True,
            "enable_vr_mode": True,
            "admin_password": "castle2025",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        print("  Site settings created")
    
    # Ensure site info exists for all languages
    site_info_data = [
        {"language_code": "sk", "title": "Spišský Hrad", "subtitle": "Audio Sprievodca", "description": "Objavte, preskúmajte a ponorte sa do najväčšieho hradného komplexu UNESCO v Európe. Náš audio sprievodca vás prevedie storočiami histórie, architektúry a legiend.", "short_description": "Najväčší hradný komplex v strednej Európe"},
        {"language_code": "en", "title": "Spiš Castle", "subtitle": "Audio Tour Guide", "description": "Explore, Discover and Immerse yourself in the largest U.N.E.S.C.O castle complexes in Europe. Our audio guide will take you through centuries of history, architecture and legends.", "short_description": "The largest castle complex in Central Europe"},
        {"language_code": "de", "title": "Zipser Burg", "subtitle": "Audio-Reiseführer", "description": "Entdecken und erkunden Sie den größten UNESCO-Burgkomplex Europas. Unser Audio-Guide führt Sie durch Jahrhunderte der Geschichte, Architektur und Legenden.", "short_description": "Der größte Burgkomplex in Mitteleuropa"},
        {"language_code": "pl", "title": "Zamek Spiski", "subtitle": "Audioprzewodnik", "description": "Odkryj i zanurz się w największym kompleksie zamkowym UNESCO w Europie. Nasz audioprzewodnik zabierze Cię przez wieki historii, architektury i legend.", "short_description": "Największy kompleks zamkowy w Europie Środkowej"},
        {"language_code": "hu", "title": "Szepesi Vár", "subtitle": "Audio Útikalauz", "description": "Fedezze fel és merüljön el Európa legnagyobb UNESCO várkomplexumában. Audio útikalauzunk évszázadokon át vezeti a történelem, az építészet és a legendák világába.", "short_description": "Közép-Európa legnagyobb várkomplexuma"},
        {"language_code": "fr", "title": "Château de Spiš", "subtitle": "Guide Audio", "description": "Explorez et plongez dans le plus grand complexe de châteaux UNESCO d'Europe. Notre guide audio vous emmène à travers des siècles d'histoire, d'architecture et de légendes.", "short_description": "Le plus grand complexe de châteaux d'Europe centrale"},
        {"language_code": "es", "title": "Castillo de Spiš", "subtitle": "Guía de Audio", "description": "Explore y sumérjase en el mayor complejo de castillos UNESCO de Europa. Nuestra guía de audio le llevará a través de siglos de historia, arquitectura y leyendas.", "short_description": "El mayor complejo de castillos de Europa Central"},
        {"language_code": "ru", "title": "Спишский Град", "subtitle": "Аудиогид", "description": "Откройте для себя крупнейший замковый комплекс ЮНЕСКО в Европе. Наш аудиогид проведёт вас через века истории, архитектуры и легенд.", "short_description": "Крупнейший замковый комплекс в Центральной Европе"},
        {"language_code": "zh", "title": "斯皮什城堡", "subtitle": "语音导览", "description": "探索欧洲最大的联合国教科文组织城堡群。我们的语音导览将带您穿越几个世纪的历史、建筑和传说。", "short_description": "中欧最大的城堡群"},
    ]
    
    for info in site_info_data:
        existing = await db.site_info.find_one({"language_code": info["language_code"]})
        if not existing:
            info["id"] = str(uuid.uuid4())
            info["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.site_info.insert_one(info)
    print("Site info verified for all languages")
    
    # Create default admin if none exists
    admin = await db.admins.find_one({})
    if not admin:
        import bcrypt
        print("\nCreating default admin user...")
        await db.admins.insert_one({
            "id": str(uuid.uuid4()),
            "username": "admin",
            "password_hash": bcrypt.hashpw("castle2025".encode(), bcrypt.gensalt()).decode(),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        print("  Admin user created (admin / castle2025)")
    
    # Final verification
    tour_count = await db.tour_stops.count_documents({"stop_type": "tour"})
    legend_count = await db.tour_stops.count_documents({"stop_type": "legend"})
    lang_count = await db.languages.count_documents({})
    
    print(f"\n{'=' * 60}")
    print(f"IMPORT COMPLETE!")
    print(f"  Tour stops: {tour_count}")
    print(f"  Legends: {legend_count}")
    print(f"  Languages: {lang_count}")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    asyncio.run(import_data())
