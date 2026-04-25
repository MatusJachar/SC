import requests
with open(r"C:\Users\User1\Desktop\SC\backend\uploads\images\castle_map.png", "rb") as f:
    r = requests.post("http://178.104.72.151:8002/api/images/background", files={"file": f})
    print(r.status_code, r.text[:200])
