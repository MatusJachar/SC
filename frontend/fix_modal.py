content = open("app/index.tsx", "r", encoding="utf-8").read()

# Remove zoom functions, keep only rotate
content = content.replace("const [mapScale, setMapScale] = useState(1);", "")
content = content.replace("const mapScaleAnim = useRef(new Animated.Value(1)).current;", "")
content = content.replace("""  const zoomIn = () => {
    const next = Math.min(mapScale + 0.5, 4);
    setMapScale(next);
    Animated.spring(mapScaleAnim, { toValue: next, useNativeDriver: true }).start();
  };
  const zoomOut = () => {
    const next = Math.max(mapScale - 0.5, 1);
    setMapScale(next);
    Animated.spring(mapScaleAnim, { toValue: next, useNativeDriver: true }).start();
  };
  const resetMap = () => {
    setMapScale(1);
    setMapRotation(0);
    Animated.spring(mapScaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };""", """  const resetMap = () => setMapRotation(0);""")

open("app/index.tsx", "w", encoding="utf-8").write(content)
print("DONE!")
