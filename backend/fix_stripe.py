content = open("server.py", "r", encoding="utf-8", errors="ignore").read()
old = "  <p>Thank you for purchasing {'Full VR Experience' if type == 'vr' else 'Full Audio Tour'}</p>\n# Include the router"
new = "  <p>Thank you for purchasing {'Full VR Experience' if type == 'vr' else 'Full Audio Tour'}</p>\n  <div class=\"code\"><div class=\"code-value\">{code}</div></div>\n</div></body></html>\n\"\"\", media_type=\"text/html\")\n    return {\"error\": \"Payment not completed\"}\n\n@api_router.get(\"/payment/cancel\")\nasync def payment_cancel():\n    return Response(content=\"<html><body><h1>Cancelled</h1></body></html>\", media_type=\"text/html\")\n\n# Include the router"
content = content.replace(old, new)
open("server.py", "w", encoding="utf-8").write(content)
print("DONE!")
