content = open("app/index.tsx", "r", encoding="utf-8").read()
content = content.replace(
    "http://178.104.72.151:8002/uploads/images/map.png",
    "https://raw.githubusercontent.com/MatusJachar/SC/main/frontend/assets/images/castle_map.png"
)
open("app/index.tsx", "w", encoding="utf-8").write(content)
print("DONE!")
