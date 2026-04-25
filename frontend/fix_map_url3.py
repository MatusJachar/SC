content = open("app/index.tsx", "r", encoding="utf-8").read()
content = content.replace(
    "const displayMapUrl = mapUrl ? getFullUrl(mapUrl) : FALLBACK_CASTLE_IMAGE;",
    "const displayMapUrl = mapUrl ? mapUrl : FALLBACK_CASTLE_IMAGE;"
)
open("app/index.tsx", "w", encoding="utf-8").write(content)
print("DONE!")
