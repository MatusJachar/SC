"""
Fetch ALL 150 original Spiš Castle audio files from the live API.
Replace Basilika audio with REAL castle audio.
"""
import json
import os
import base64
import requests
from pathlib import Path
import time

BASE_URL = "https://heritage-audio-guide.preview.emergentagent.com"
AUDIO_DIR = Path("/app/backend/uploads/audio")

def fetch_all_audio():
    print("=" * 60)
    print("FETCHING ALL ORIGINAL SPIŠ CASTLE AUDIO")
    print("=" * 60)
    
    # Get audio index
    print("Getting audio index...")
    resp = requests.get(f"{BASE_URL}/api/export/audio-index", timeout=30)
    if resp.status_code != 200:
        print(f"ERROR: audio-index returned {resp.status_code}")
        return False
    
    index = resp.json()
    total = index['total']
    audio_files = index['audio_files']
    print(f"Found {total} audio files to download")
    
    # Delete old Basilika audio files
    print("\nRemoving old Basilika audio...")
    for f in AUDIO_DIR.glob("stop*.mp3"):
        f.unlink()
        print(f"  Deleted: {f.name}")
    
    # Download each audio file
    downloaded = 0
    failed = 0
    
    for i, af in enumerate(audio_files):
        stop_id = af.get('stop_id')
        language = af.get('language')
        stop_number = af.get('stop_number')
        stop_name = af.get('stop_name', '')
        
        if not stop_id or not language:
            continue
        
        # Determine filename
        if stop_number is not None:
            filename = f"stop{stop_number}_{language}.mp3"
        else:
            # Legend
            legend_name = stop_name.lower().replace(' ', '_') if stop_name else f"legend_{stop_id[:8]}"
            filename = f"{legend_name}_{language}.mp3"
        
        filepath = AUDIO_DIR / filename
        
        try:
            url = f"{BASE_URL}/api/export/audio/{stop_id}/{language}"
            r = requests.get(url, timeout=60)
            
            if r.status_code == 200:
                data = r.json()
                if 'audio_base64' in data and data['audio_base64']:
                    audio_bytes = base64.b64decode(data['audio_base64'])
                    with open(filepath, 'wb') as f:
                        f.write(audio_bytes)
                    size_mb = len(audio_bytes) / (1024 * 1024)
                    downloaded += 1
                    print(f"  [{downloaded}/{total}] {filename} ({size_mb:.1f} MB)")
                else:
                    print(f"  [{i+1}/{total}] {filename} - no audio data in response")
                    failed += 1
            else:
                print(f"  [{i+1}/{total}] {filename} - HTTP {r.status_code}")
                failed += 1
        except Exception as e:
            print(f"  [{i+1}/{total}] {filename} - ERROR: {e}")
            failed += 1
        
        # Small delay to not overwhelm the API
        if downloaded % 10 == 0 and downloaded > 0:
            time.sleep(0.5)
    
    print(f"\n{'=' * 60}")
    print(f"DOWNLOAD COMPLETE!")
    print(f"  Downloaded: {downloaded}")
    print(f"  Failed: {failed}")
    print(f"  Total files: {len(list(AUDIO_DIR.glob('*.mp3')))}")
    print(f"{'=' * 60}")
    
    return downloaded > 0

if __name__ == "__main__":
    fetch_all_audio()
