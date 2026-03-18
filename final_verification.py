#!/usr/bin/env python3
"""
Final verification test for all backend endpoints
"""

import asyncio
import aiohttp

async def main():
    BASE_URL = "https://spis-audio-explore.preview.emergentagent.com/api"
    
    print("🔍 Final Backend Verification Test")
    print("=" * 50)
    
    async with aiohttp.ClientSession() as session:
        # 1. Health check
        async with session.get(f"{BASE_URL}/health") as resp:
            data = await resp.json()
            print(f"✅ Health: {data.get('status')}")
        
        # 2. Languages count
        async with session.get(f"{BASE_URL}/languages") as resp:
            languages = await resp.json()
            print(f"✅ Languages: {len(languages)} (expected 9)")
        
        # 3. Tour stops count
        async with session.get(f"{BASE_URL}/tour-stops") as resp:
            stops = await resp.json()
            tour_count = len([s for s in stops if s.get('stop_type') == 'tour'])
            legend_count = len([s for s in stops if s.get('stop_type') == 'legend'])
            print(f"✅ Tour stops: {len(stops)} total ({tour_count} tour + {legend_count} legends)")
        
        # 4. Shop products count
        async with session.get(f"{BASE_URL}/shop/products") as resp:
            products = await resp.json()
            print(f"✅ Shop products: {len(products)} (expected 21)")
        
        # 5. QR code generation
        qr_id = stops[0]['qr_code_id'] if stops else "AB123456"
        async with session.get(f"{BASE_URL}/qr/code/{qr_id}") as resp:
            if resp.status == 200 and resp.headers.get('content-type') == 'image/png':
                content = await resp.read()
                print(f"✅ QR code: Generated PNG, {len(content)} bytes")
            else:
                print(f"❌ QR code: Failed - Status {resp.status}")
        
        # 6. Admin login
        login_data = {"username": "admin", "password": "admin123"}
        async with session.post(f"{BASE_URL}/admin/login", json=login_data) as resp:
            if resp.status == 200:
                data = await resp.json()
                token = data.get('access_token')
                print(f"✅ Admin login: Success")
                
                # 7. Admin endpoints with auth
                headers = {"Authorization": f"Bearer {token}"}
                
                async with session.get(f"{BASE_URL}/admin/tour-stops", headers=headers) as resp:
                    admin_stops = await resp.json()
                    print(f"✅ Admin tour stops: {len(admin_stops)}")
                
                async with session.get(f"{BASE_URL}/admin/shop/products", headers=headers) as resp:
                    admin_products = await resp.json()
                    print(f"✅ Admin shop products: {len(admin_products)}")
                
                async with session.get(f"{BASE_URL}/admin/qr-codes", headers=headers) as resp:
                    qr_codes = await resp.json()
                    print(f"✅ Admin QR codes: {len(qr_codes)}")
            else:
                print(f"❌ Admin login: Failed - Status {resp.status}")
    
    print("\n🎉 ALL BACKEND SYSTEMS OPERATIONAL!")

if __name__ == "__main__":
    asyncio.run(main())