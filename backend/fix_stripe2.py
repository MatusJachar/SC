content = open("server.py", "r", encoding="utf-8", errors="ignore").read()
# Find the broken section and replace
idx = content.find('return FileResponse(None) if False else Response(content=f"""')
if idx == -1:
    print("NOT FOUND")
else:
    end_idx = content.find('# Include the router', idx)
    broken = content[idx:end_idx]
    fixed = '''return Response(content=f"<html><body><h1>Code: {code}</h1></body></html>", media_type="text/html")
    return {"error": "Payment not completed"}

@api_router.get("/payment/cancel")
async def payment_cancel():
    return Response(content="<html><body><h1>Cancelled</h1></body></html>", media_type="text/html")

'''
    content = content[:idx] + fixed + content[end_idx:]
    open("server.py", "w", encoding="utf-8").write(content)
    print("DONE!")
