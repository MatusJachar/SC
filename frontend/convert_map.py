from pdf2image import convert_from_path
pages = convert_from_path(r"C:\Users\User1\Desktop\SC\backend\uploads\images\castle_map.pdf")
pages[0].save(r"C:\Users\User1\Desktop\SC\backend\uploads\images\map.png", "PNG")
print("DONE!")
