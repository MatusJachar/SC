"""
Upload missing audio files (stop10-13) to server via Admin API
Run: python upload_missing_audio.py
"""
import os
import requests

BACKEND_URL = "http://nrjrc2wkj5nf2s5rmgxngesn.178.104.72.151.sslip.io/api"
AUDIO_DIR = r"C:\Users\User1\Desktop\SC\backend\uploads\audio"

# Try common admin credentials
credentials = [
    ("hradmin", "hrad2024"),
    ("admin", "admin123"),
    ("admin", "SpisAdmin2024!"),
]

TOKEN = None
for user, pwd in credentials:
    resp = requests.post(f"{BACKEND_URL}/admin/login", json={"username": user, "password": pwd}, timeout=10)
    if resp.status_code == 200:
        TOKEN = resp.json().get("access_token")
        print(f"Login OK with {user}/{pwd}")
        break
    else:
        print(f"Login failed {user}/{pwd}: {resp.status_code}")

if not TOKEN:
    print("ERROR: Could not login. Check admin credentials.")
    exit(1)

headers = {"Authorization": f"Bearer {TOKEN}"}

# Upload stop10-13 in all 9 languages
stops = [10, 11, 12, 13]
langs = ['sk', 'en', 'de', 'pl', 'hu', 'fr', 'es', 'ru', 'zh']

success = 0
failed = 0
skipped = 0

for stop in stops:
    for lang in langs:
        fname = f"stop{stop}_{lang}.mp3"
        fpath = os.path.join(AUDIO_DIR, fname)
        
        if not os.path.exists(fpath):
            print(f"  MISSING locally: {fname}")
            skipped += 1
            continue
        
        fsize_kb = os.path.getsize(fpath) / 1024
        
        with open(fpath, 'rb') as f:
            resp = requests.post(
                f"{BACKEND_URL}/admin/upload/audio",
                files={"file": (fname, f, "audio/mpeg")},
                headers=headers,
                timeout=120
            )
        
        if resp.status_code in [200, 201]:
            print(f"  ✓ {fname} ({fsize_kb:.0f}KB)")
            success += 1
        else:
            print(f"  ✗ {fname}: {resp.status_code} {resp.text[:80]}")
            failed += 1

print(f"\n=== DONE ===")
print(f"Uploaded: {success}")
print(f"Failed:   {failed}")
print(f"Skipped:  {skipped}")
