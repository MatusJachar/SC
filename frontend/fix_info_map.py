content = open("app/features/info.tsx", "r", encoding="utf-8").read()
content = content.replace(
    "const res = await axios.get(`${API_BASE_URL}/site-settings`);",
    "const res = {data: {castle_map_url: 'https://raw.githubusercontent.com/MatusJachar/SC/main/frontend/assets/images/castle_map.png'}};"
)
content = content.replace(
    "if (res.data?.castle_map_url) setCastleMapUrl(res.data.castle_map_url);",
    "if (res.data?.castle_map_url) setCastleMapUrl(res.data.castle_map_url);"
)
open("app/features/info.tsx", "w", encoding="utf-8").write(content)
print("DONE!")
