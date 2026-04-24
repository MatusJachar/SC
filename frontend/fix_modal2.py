import re
content = open("app/index.tsx", "r", encoding="utf-8").read()
content = re.sub(r'<Pressable[^>]*onPress=\{zoomIn\}.*?</Pressable>', '', content, flags=re.DOTALL)
content = re.sub(r'<Pressable[^>]*onPress=\{zoomOut\}.*?</Pressable>', '', content, flags=re.DOTALL)
content = content.replace('<Animated.Image', '<Image')
content = content.replace('{ scale: mapScaleAnim }] }]}', '] }]}')
content = content.replace(', { scale: mapScaleAnim }', '')
open("app/index.tsx", "w", encoding="utf-8").write(content)
print("DONE!")
