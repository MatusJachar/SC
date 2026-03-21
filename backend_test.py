#!/usr/bin/env python3
"""
COMPREHENSIVE BACKEND TEST FOR SPIŠ CASTLE AUDIO GUIDE
Testing all critical endpoints and audio file accessibility as specified.
"""

import asyncio
import aiohttp
import json
import os
import sys
from typing import Dict, List, Tuple
import time

# Backend URL from frontend .env
BACKEND_URL = "https://heritage-audio-guide.preview.emergentagent.com/api"

# Admin credentials
ADMIN_CREDENTIALS = {"username": "admin", "password": "admin123"}

# Expected counts from review request
EXPECTED_LANGUAGES = 9
EXPECTED_TOUR_STOPS = 17  # 13 tour + 4 legends
EXPECTED_SHOP_PRODUCTS = 21
EXPECTED_AUDIO_FILES = 153  # 17 stops × 9 languages

class BackendTester:
    def __init__(self):
        self.session = None
        self.auth_token = None
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
        self.audio_files_verified = 0
        self.audio_files_missing = []

    async def start_session(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            connector=aiohttp.TCPConnector(ssl=False)
        )

    async def close_session(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()

    async def test_endpoint(self, method: str, endpoint: str, expected_status: int = 200, 
                           data: dict = None, headers: dict = None, description: str = "") -> Tuple[bool, dict]:
        """Test a single endpoint"""
        url = f"{BACKEND_URL}{endpoint}"
        try:
            if method.upper() == "GET":
                async with self.session.get(url, headers=headers) as response:
                    result = await response.json() if response.content_type == 'application/json' else {}
                    success = response.status == expected_status
            elif method.upper() == "POST":
                async with self.session.post(url, json=data, headers=headers) as response:
                    result = await response.json() if response.content_type == 'application/json' else {}
                    success = response.status == expected_status
            elif method.upper() == "PUT":
                async with self.session.put(url, json=data, headers=headers) as response:
                    result = await response.json() if response.content_type == 'application/json' else {}
                    success = response.status == expected_status
            elif method.upper() == "HEAD":
                async with self.session.head(url, headers=headers) as response:
                    result = {"status": response.status, "headers": dict(response.headers)}
                    success = response.status == expected_status
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            if success:
                self.test_results["passed"] += 1
                print(f"✅ {description}: PASS")
            else:
                self.test_results["failed"] += 1
                error_msg = f"{description}: Expected {expected_status}, got {response.status}"
                self.test_results["errors"].append(error_msg)
                print(f"❌ {error_msg}")
            
            return success, result
            
        except Exception as e:
            self.test_results["failed"] += 1
            error_msg = f"{description}: Exception - {str(e)}"
            self.test_results["errors"].append(error_msg)
            print(f"❌ {error_msg}")
            return False, {"error": str(e)}

    async def test_health(self):
        """Test 1: Health endpoint"""
        print("\n🔍 Testing Health Endpoint...")
        success, result = await self.test_endpoint(
            "GET", "/health", 200, 
            description="Health Check"
        )
        if success and result.get("status") == "healthy":
            print(f"   Status: {result.get('status')}")
            print(f"   Timestamp: {result.get('timestamp')}")
        return success

    async def test_languages(self):
        """Test 2: Languages endpoint - must return exactly 9 languages"""
        print("\n🌍 Testing Languages Endpoint...")
        success, result = await self.test_endpoint(
            "GET", "/languages", 200,
            description="Get Languages"
        )
        
        if success and isinstance(result, list):
            count = len(result)
            print(f"   Languages found: {count}")
            
            if count == EXPECTED_LANGUAGES:
                print("✅ Correct number of languages (9)")
                # Check language codes and flags
                codes = [lang.get("code") for lang in result]
                expected_codes = ["sk", "en", "de", "pl", "hu", "fr", "es", "ru", "zh"]
                for code in expected_codes:
                    if code in codes:
                        lang_data = next(l for l in result if l.get("code") == code)
                        flag = lang_data.get("flag_emoji", "")
                        print(f"   {code}: {lang_data.get('name')} {flag}")
                    else:
                        print(f"❌ Missing language: {code}")
                        self.test_results["errors"].append(f"Missing language code: {code}")
            else:
                error_msg = f"Languages count mismatch: Expected {EXPECTED_LANGUAGES}, got {count}"
                self.test_results["errors"].append(error_msg)
                print(f"❌ {error_msg}")
        
        return success

    async def test_tour_stops(self):
        """Test 3: Tour stops endpoint - must return exactly 17 stops"""
        print("\n🏰 Testing Tour Stops Endpoint...")
        success, result = await self.test_endpoint(
            "GET", "/tour-stops", 200,
            description="Get Tour Stops"
        )
        
        if success and isinstance(result, list):
            count = len(result)
            print(f"   Tour stops found: {count}")
            
            if count == EXPECTED_TOUR_STOPS:
                print("✅ Correct number of tour stops (17)")
                
                # Categorize by type
                tour_stops = [s for s in result if s.get("stop_type") == "tour"]
                legends = [s for s in result if s.get("stop_type") == "legend"]
                
                print(f"   Tour stops: {len(tour_stops)}")
                print(f"   Legends: {len(legends)}")
                
                # Store for audio testing
                self.tour_stops_data = result
                
                # Show stop details
                for stop in sorted(result, key=lambda x: (x.get("stop_type", ""), x.get("stop_number", 0))):
                    stop_type = stop.get("stop_type", "unknown")
                    stop_number = stop.get("stop_number", 0)
                    translations = stop.get("translations", [])
                    title = next((t.get("title") for t in translations if t.get("language_code") == "en"), "No title")
                    print(f"   {stop_type.title()} {stop_number}: {title}")
            else:
                error_msg = f"Tour stops count mismatch: Expected {EXPECTED_TOUR_STOPS}, got {count}"
                self.test_results["errors"].append(error_msg)
                print(f"❌ {error_msg}")
        
        return success

    async def test_site_settings(self):
        """Test 4: Site settings endpoint"""
        print("\n⚙️ Testing Site Settings Endpoint...")
        success, result = await self.test_endpoint(
            "GET", "/site-settings", 200,
            description="Get Site Settings"
        )
        
        if success and isinstance(result, dict):
            site_name = result.get("site_name", "")
            print(f"   Site name: {site_name}")
            print(f"   Site subtitle: {result.get('site_subtitle', '')}")
            print(f"   Welcome description: {result.get('welcome_description', '')[:50]}...")
            if "Spišský" in site_name or "Spiš" in site_name:
                print("✅ Site name contains expected castle name")
        
        return success

    async def test_offline_package(self):
        """Test 5: Offline package endpoint"""
        print("\n📦 Testing Offline Package Endpoint...")
        success, result = await self.test_endpoint(
            "GET", "/offline-package", 200,
            description="Get Offline Package"
        )
        
        if success and isinstance(result, dict):
            languages = result.get("languages", [])
            tour_stops = result.get("tour_stops", [])
            site_info = result.get("site_info", [])
            settings = result.get("settings", {})
            
            print(f"   Package contains:")
            print(f"   - Languages: {len(languages)}")
            print(f"   - Tour stops: {len(tour_stops)}")
            print(f"   - Site info: {len(site_info)}")
            print(f"   - Settings: {'Yes' if settings else 'No'}")
            print(f"   - Version: {result.get('version', 'N/A')}")
            print(f"   - Generated at: {result.get('generated_at', 'N/A')}")
        
        return success

    async def test_shop_products(self):
        """Test 6: Shop products endpoint - must return exactly 21 products"""
        print("\n🛍️ Testing Shop Products Endpoint...")
        success, result = await self.test_endpoint(
            "GET", "/shop/products", 200,
            description="Get Shop Products"
        )
        
        if success and isinstance(result, list):
            count = len(result)
            print(f"   Shop products found: {count}")
            
            if count == EXPECTED_SHOP_PRODUCTS:
                print("✅ Correct number of shop products (21)")
                # Show first few products
                for i, product in enumerate(result[:5]):
                    name = product.get("name", "Unknown")
                    price = product.get("price", 0)
                    currency = product.get("currency", "EUR")
                    print(f"   {i+1}. {name}: {price} {currency}")
                if count > 5:
                    print(f"   ... and {count - 5} more products")
            else:
                error_msg = f"Shop products count mismatch: Expected {EXPECTED_SHOP_PRODUCTS}, got {count}"
                self.test_results["errors"].append(error_msg)
                print(f"❌ {error_msg}")
        
        return success

    async def test_shop_settings(self):
        """Test 7: Shop settings endpoint"""
        print("\n🏪 Testing Shop Settings Endpoint...")
        success, result = await self.test_endpoint(
            "GET", "/shop/settings", 200,
            description="Get Shop Settings"
        )
        
        if success and isinstance(result, dict):
            shop_name = result.get("shop_name", "")
            print(f"   Shop name: {shop_name}")
            print(f"   Description: {result.get('shop_description', '')[:50]}...")
            print(f"   Opening hours: {result.get('opening_hours', '')}")
            print(f"   Location: {result.get('location', '')}")
        
        return success

    async def test_audio_files(self):
        """Test 8: CRITICAL - Test audio files for ALL stops in ALL languages"""
        print("\n🎵 TESTING AUDIO FILES (MOST IMPORTANT)...")
        print(f"Expected total audio files: {EXPECTED_AUDIO_FILES} (17 stops × 9 languages)")
        
        if not hasattr(self, 'tour_stops_data'):
            print("❌ No tour stops data available for audio testing")
            return False

        # Language codes to test
        language_codes = ["sk", "en", "de", "pl", "hu", "fr", "es", "ru", "zh"]
        
        total_audio_tests = 0
        successful_audio_tests = 0
        
        for stop in self.tour_stops_data:
            stop_number = stop.get("stop_number", 0)
            stop_type = stop.get("stop_type", "tour")
            translations = stop.get("translations", [])
            
            print(f"\n   Testing {stop_type} {stop_number}:")
            
            for lang_code in language_codes:
                # Find translation for this language
                translation = next((t for t in translations if t.get("language_code") == lang_code), None)
                
                if translation:
                    audio_url = translation.get("audio_url")
                    if audio_url:
                        # Test if audio file exists
                        total_audio_tests += 1
                        success, _ = await self.test_endpoint(
                            "HEAD", audio_url, 200,
                            description=f"Audio file {stop_type}{stop_number}_{lang_code}"
                        )
                        if success:
                            successful_audio_tests += 1
                            self.audio_files_verified += 1
                            print(f"     ✅ {lang_code}: {audio_url}")
                        else:
                            self.audio_files_missing.append(f"{stop_type}{stop_number}_{lang_code}: {audio_url}")
                            print(f"     ❌ {lang_code}: {audio_url} - FILE NOT FOUND")
                    else:
                        print(f"     ⚠️ {lang_code}: No audio URL in translation")
                else:
                    print(f"     ⚠️ {lang_code}: No translation found")
        
        print(f"\n🎵 AUDIO FILES SUMMARY:")
        print(f"   Total audio files tested: {total_audio_tests}")
        print(f"   Successfully verified: {successful_audio_tests}")
        print(f"   Missing/Failed: {total_audio_tests - successful_audio_tests}")
        print(f"   Success rate: {(successful_audio_tests/total_audio_tests*100):.1f}%" if total_audio_tests > 0 else "   Success rate: N/A")
        
        # Test specific files from review request
        print(f"\n   Testing specific files from review request:")
        specific_files = [
            "/uploads/audio/stop1_sk.mp3",
            "/uploads/audio/stop1_en.mp3", 
            "/uploads/audio/stop6_sk.mp3",
            "/uploads/audio/stop13_zh.mp3",
            "/uploads/audio/legend_1_sk.mp3",
            "/uploads/audio/legend_4_hu.mp3"
        ]
        
        for audio_file in specific_files:
            success, _ = await self.test_endpoint(
                "HEAD", audio_file, 200,
                description=f"Specific audio file test"
            )
            if success:
                print(f"     ✅ {audio_file}")
            else:
                print(f"     ❌ {audio_file} - NOT ACCESSIBLE")
        
        return successful_audio_tests > 0

    async def authenticate_admin(self):
        """Authenticate as admin for protected endpoints"""
        print("\n🔐 Admin Authentication...")
        success, result = await self.test_endpoint(
            "POST", "/admin/login", 200,
            data=ADMIN_CREDENTIALS,
            description="Admin Login"
        )
        
        if success and "access_token" in result:
            self.auth_token = result["access_token"]
            print(f"✅ Admin authenticated successfully")
            print(f"   Token expires in: {result.get('expires_in', 'unknown')} seconds")
            return True
        else:
            print("❌ Admin authentication failed")
            return False

    async def test_admin_endpoints(self):
        """Test admin-protected endpoints"""
        if not self.auth_token:
            print("❌ Cannot test admin endpoints - not authenticated")
            return False

        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        print("\n👤 Testing Admin Endpoints...")
        
        # Test admin me
        await self.test_endpoint(
            "GET", "/admin/me", 200, headers=headers,
            description="Admin User Info"
        )
        
        # Test admin tour stops
        success, result = await self.test_endpoint(
            "GET", "/admin/tour-stops", 200, headers=headers,
            description="Admin Tour Stops"
        )
        if success:
            count = len(result) if isinstance(result, list) else 0
            print(f"   Admin can see {count} tour stops")
        
        # Test admin QR codes
        success, result = await self.test_endpoint(
            "GET", "/admin/qr-codes", 200, headers=headers,
            description="Admin QR Codes"
        )
        if success:
            count = len(result) if isinstance(result, list) else 0
            print(f"   QR codes available: {count}")
        
        # Test admin site settings
        await self.test_endpoint(
            "GET", "/admin/site-settings", 200, headers=headers,
            description="Admin Site Settings"
        )
        
        # Test admin shop products
        success, result = await self.test_endpoint(
            "GET", "/admin/shop/products", 200, headers=headers,
            description="Admin Shop Products"
        )
        if success:
            count = len(result) if isinstance(result, list) else 0
            print(f"   Admin can manage {count} shop products")
        
        return True

    async def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 STARTING COMPREHENSIVE BACKEND TESTING")
        print(f"Backend URL: {BACKEND_URL}")
        print("="*70)
        
        await self.start_session()
        
        try:
            # Core public endpoints
            await self.test_health()
            await self.test_languages()
            await self.test_tour_stops()
            await self.test_site_settings()
            await self.test_offline_package()
            await self.test_shop_products()
            await self.test_shop_settings()
            
            # Critical audio file testing
            await self.test_audio_files()
            
            # Admin authentication and protected endpoints
            if await self.authenticate_admin():
                await self.test_admin_endpoints()
            
            # Final summary
            self.print_final_summary()
            
        finally:
            await self.close_session()

    def print_final_summary(self):
        """Print comprehensive test results"""
        print("\n" + "="*70)
        print("📊 FINAL TEST RESULTS SUMMARY")
        print("="*70)
        
        total_tests = self.test_results["passed"] + self.test_results["failed"]
        success_rate = (self.test_results["passed"] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total tests run: {total_tests}")
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        print(f"📈 Success rate: {success_rate:.1f}%")
        
        print(f"\n🎵 AUDIO FILES VERIFICATION:")
        print(f"Audio files verified as accessible: {self.audio_files_verified}")
        print(f"Expected total audio files: {EXPECTED_AUDIO_FILES}")
        print(f"Audio verification rate: {(self.audio_files_verified/EXPECTED_AUDIO_FILES*100):.1f}%" if EXPECTED_AUDIO_FILES > 0 else "N/A")
        
        if self.audio_files_missing:
            print(f"\n❌ MISSING AUDIO FILES ({len(self.audio_files_missing)}):")
            for missing in self.audio_files_missing[:10]:  # Show first 10
                print(f"   {missing}")
            if len(self.audio_files_missing) > 10:
                print(f"   ... and {len(self.audio_files_missing) - 10} more")
        
        if self.test_results["errors"]:
            print(f"\n❌ DETAILED ERRORS ({len(self.test_results['errors'])}):")
            for error in self.test_results["errors"][:10]:  # Show first 10
                print(f"   {error}")
            if len(self.test_results["errors"]) > 10:
                print(f"   ... and {len(self.test_results['errors']) - 10} more errors")
        
        print("\n" + "="*70)
        if success_rate >= 80 and self.audio_files_verified >= 100:
            print("🎉 BACKEND TESTING SUCCESSFUL - System appears to be working well!")
        elif success_rate >= 60:
            print("⚠️ BACKEND TESTING PARTIAL SUCCESS - Some issues found but core functionality works")
        else:
            print("❌ BACKEND TESTING FAILED - Significant issues found that need attention")
        print("="*70)


async def main():
    """Main test runner"""
    tester = BackendTester()
    await tester.run_all_tests()
    
    # Return exit code based on results
    success_rate = (tester.test_results["passed"] / (tester.test_results["passed"] + tester.test_results["failed"]) * 100) if (tester.test_results["passed"] + tester.test_results["failed"]) > 0 else 0
    
    if success_rate >= 80 and tester.audio_files_verified >= 100:
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Failure


if __name__ == "__main__":
    asyncio.run(main())