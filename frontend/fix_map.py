import re
content = open("app/index.tsx", "r", encoding="utf-8").read()
old_pattern = r"<ScrollView[^>]*style=\{\{ flex: 1.*?</ScrollView>"
new_code = "<Animated.Image source={{ uri: displayMapUrl }} style={[styles.mapModalImage, { transform: [{ rotate: `${mapRotation}deg` }, { scale: mapScaleAnim }] }]} resizeMode=\"contain\" />"
content = re.sub(old_pattern, new_code, content, flags=re.DOTALL)
open("app/index.tsx", "w", encoding="utf-8").write(content)
print("DONE!")
