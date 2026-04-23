"""
Run this script to update all tour stop descriptions from update_stops.py
"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'spis_castle_paid')

client = MongoClient(MONGO_URL)
db = client[DB_NAME]
col = db.tour_stops

# Import translations from update_stops.py
from update_stops import TRANSLATIONS

updated = 0
for stop_number, langs in TRANSLATIONS.items():
    stop = col.find_one({'stop_number': stop_number})
    if not stop:
        print(f"  WARNING: Stop {stop_number} not found")
        continue
    
    existing = {t['language_code']: t for t in stop.get('translations', [])}
    
    for lang_code, content in langs.items():
        if lang_code in existing:
            existing[lang_code]['title'] = content['title']
            existing[lang_code]['short_description'] = content['short_description']
            existing[lang_code]['description'] = content['description']
        else:
            existing[lang_code] = {
                'language_code': lang_code,
                'title': content['title'],
                'short_description': content['short_description'],
                'description': content['description'],
                'audio_url': existing.get('sk', {}).get('audio_url', '').replace('_sk.', f'_{lang_code}.'),
                'video_url': None,
                'vr_url': None,
            }
    
    col.update_one(
        {'stop_number': stop_number},
        {'$set': {'translations': list(existing.values())}}
    )
    print(f"  OK: Stop {stop_number} updated ({len(langs)} languages)")
    updated += 1

print(f"\nDone! Updated {updated} stops")
client.close()
