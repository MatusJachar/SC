"""
Helper script - encodes update_stops.py to base64 and prints paste command for Coolify terminal
"""
import base64

with open("update_stops.py", "rb") as f:
    data = f.read()

b64 = base64.b64encode(data).decode("ascii")

print("Copy and paste this into Coolify terminal:\n")
print(f'echo "{b64}" | base64 -d > /tmp/us.py && python3 /tmp/us.py')
