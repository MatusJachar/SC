"""
Attempt to fetch original Spiš Castle audio from external API.
If the API is down, report what's missing.
"""
import json
import os
import asyncio
import requests
from pathlib import Path

ROOT_DIR = Path(__file__).parent
AUDIO_DIR = ROOT_DIR / "uploads" / "audio"
BASE_URL = "https://heritage-audio-guide.preview.emergentagent.com"

def try_fetch_audio():
    print("=" * 60)
    print("ATTEMPTING TO FETCH ORIGINAL AUDIO FROM EXTERNAL API")
    print(f"API: {BASE_URL}")
    print("=" * 60)
    
    # Load audio index
    with open(ROOT_DIR / 'audio_index.json', 'r') as f:
        audio_data = json.load(f)
    
    print(f"Audio index has {audio_data['total']} audio files to fetch")
    
    # Try the API
    test_urls = [
        f"{BASE_URL}/api/export/config",
        f"{BASE_URL}/api/export/audio-index",
        f"{BASE_URL}/api/export/tour-stops",
        f"{BASE_URL}/api/health",
    ]
    
    api_alive = False
    for url in test_urls:
        try:
            r = requests.get(url, timeout=10)
            print(f"  {url} -> {r.status_code}")
            if r.status_code == 200:
                api_alive = True
                break
        except Exception as e:
            print(f"  {url} -> ERROR: {e}")
    
    if not api_alive:
        print("\n" + "!" * 60)
        print("EXTERNAL API IS DOWN / NOT ACCESSIBLE!")
        print("The audio-tour-cache environment is no longer running.")
        print("!" * 60)
        print("\nCurrent audio files available locally:")
        
        existing = list(AUDIO_DIR.glob("stop*_*.mp3"))
        print(f"  Found {len(existing)} audio files:")
        for f in sorted(existing):
            size_mb = f.stat().st_size / (1024 * 1024)
            print(f"    {f.name} ({size_mb:.1f} MB)")
        
        print(f"\nMissing audio for stops 8-13 and all legend audio.")
        print("Audio for stops 1-7 (5 languages each) is available locally.")
        print("\nTo get the missing audio:")
        print("1. Start the other agent/project again")
        print("2. Or upload audio through the admin panel")
        return False
    
    # If API is alive, fetch all audio
    fetched = 0
    for audio_file in audio_data['audio_files']:
        stop_id = audio_file.get('stop_id')
        language = audio_file.get('language')
        stop_number = audio_file.get('stop_number')
        
        if not stop_id or not language:
            continue
        
        try:
            url = f"{BASE_URL}/api/export/audio/{stop_id}/{language}"
            r = requests.get(url, timeout=30)
            if r.status_code == 200:
                data = r.json()
                if 'audio_base64' in data:
                    import base64
                    audio_bytes = base64.b64decode(data['audio_base64'])
                    
                    # Save with appropriate filename
                    if stop_number:
                        filename = f"stop{stop_number}_{language}.mp3"
                    else:
                        stop_name = audio_file.get('stop_name', 'legend')
                        filename = f"{stop_name.lower().replace(' ', '_')}_{language}.mp3"
                    
                    filepath = AUDIO_DIR / filename
                    with open(filepath, 'wb') as f:
                        f.write(audio_bytes)
                    
                    size_mb = len(audio_bytes) / (1024 * 1024)
                    print(f"  Downloaded: {filename} ({size_mb:.1f} MB)")
                    fetched += 1
        except Exception as e:
            print(f"  Error fetching {stop_id}/{language}: {e}")
    
    print(f"\nFetched {fetched} audio files")
    return fetched > 0

if __name__ == "__main__":
    try_fetch_audio()
