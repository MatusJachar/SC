content = open("app/index.tsx", "r", encoding="utf-8").read()
old = 'resizeMode="contain" />\n  );\n}'
new = 'resizeMode="contain" />\n          </View>\n        </Modal>\n    </ScrollView>\n  );\n}'
content = content.replace(old, new)
open("app/index.tsx", "w", encoding="utf-8").write(content)
print("DONE!" if "</Modal>" in content else "NOT FOUND!")
