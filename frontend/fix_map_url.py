content = open("app/index.tsx", "r", encoding="utf-8").read()
content = content.replace(
    "const res = await axios.get(`${API_BASE_URL}/site-settings`);",
    "const res = {data: {castle_map_url: 'http://178.104.72.151:8002/uploads/images/map.png'}};"
)
open("app/index.tsx", "w", encoding="utf-8").write(content)
print("DONE!")
