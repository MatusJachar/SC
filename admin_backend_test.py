#!/usr/bin/env python3
"""
Spiš Castle Audio Guide Admin Panel Backend API Test Suite
Tests all admin endpoints for the Spiš Castle Audio Guide Admin Panel API
"""

import asyncio
import aiohttp
import json
from datetime import datetime
from typing import Dict, List, Any, Optional

# Get backend URL from environment
BASE_URL = "https://spis-audio-explore.preview.emergentagent.com/api"

class AdminPanelTests:
    def __init__(self):
        self.session = None
        self.results = {}
        self.failed_tests = []
        self.admin_token = None
        
    async def setup(self):
        """Setup test session"""
        self.session = aiohttp.ClientSession()
        
    async def teardown(self):
        """Cleanup test session"""
        if self.session:
            await self.session.close()
    
    async def make_request(self, method: str, endpoint: str, headers: Optional[Dict] = None, **kwargs) -> Dict[str, Any]:
        """Make HTTP request and return response data"""
        url = f"{BASE_URL}{endpoint}"
        try:
            request_headers = headers or {}
            if self.admin_token:
                request_headers["Authorization"] = f"Bearer {self.admin_token}"
            
            async with self.session.request(method, url, headers=request_headers, **kwargs) as response:
                response_text = await response.text()
                try:
                    response_json = json.loads(response_text) if response_text else {}
                except json.JSONDecodeError:
                    response_json = {"raw_response": response_text}
                
                return {
                    "status": response.status,
                    "data": response_json,
                    "headers": dict(response.headers),
                    "success": 200 <= response.status < 300
                }
        except Exception as e:
            return {
                "status": 0,
                "data": {"error": str(e)},
                "headers": {},
                "success": False
            }
    
    def log_test_result(self, test_name: str, success: bool, details: str = "", data: Any = None):
        """Log test result"""
        result = {
            "success": success,
            "details": details,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        self.results[test_name] = result
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success:
            self.failed_tests.append(test_name)
        print()
    
    async def test_admin_login(self):
        """Test POST /api/admin/login with {"username":"admin","password":"admin123"} - Should return JWT token"""
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        response = await self.make_request("POST", "/admin/login", json=login_data)
        
        if not response["success"]:
            self.log_test_result("Admin Login", False, f"Request failed with status {response['status']}: {response['data']}")
            return False
            
        data = response["data"]
        
        # Check if we got a token
        if "access_token" in data and data["access_token"]:
            self.admin_token = data["access_token"]
            token_type = data.get("token_type", "")
            expires_in = data.get("expires_in", 0)
            self.log_test_result("Admin Login", True, f"Successfully logged in - Token type: {token_type}, Expires in: {expires_in}s", data)
            return True
        else:
            self.log_test_result("Admin Login", False, f"No access token in response: {data}")
            return False
    
    async def test_admin_get_tour_stops(self):
        """Test GET /api/admin/tour-stops - Should return 16 tour stops"""
        if not self.admin_token:
            self.log_test_result("Admin Get Tour Stops", False, "No admin token available")
            return
            
        response = await self.make_request("GET", "/admin/tour-stops")
        
        if not response["success"]:
            self.log_test_result("Admin Get Tour Stops", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        stops = response["data"]
        
        if not isinstance(stops, list):
            self.log_test_result("Admin Get Tour Stops", False, f"Expected list, got {type(stops)}: {stops}")
            return
        
        # Check if we have 16 tour stops (12 tour + 4 legends)
        total_stops = len(stops)
        if total_stops == 16:
            self.log_test_result("Admin Get Tour Stops Count", True, f"Correct number of stops: {total_stops} (should be 16)")
        else:
            self.log_test_result("Admin Get Tour Stops Count", False, f"Expected 16 tour stops, got {total_stops}")
        
        # Count tour vs legend stops
        tour_stops = [s for s in stops if s.get("stop_type") == "tour"]
        legend_stops = [s for s in stops if s.get("stop_type") == "legend"]
        
        self.log_test_result("Tour Stops Breakdown", True, f"Tour stops: {len(tour_stops)}, Legend stops: {len(legend_stops)}")
        
        # Store first stop for update test
        if stops:
            self.first_stop_id = stops[0].get("id")
            self.first_stop_number = stops[0].get("stop_number")
        else:
            self.first_stop_id = None
            self.first_stop_number = None
    
    async def test_admin_update_tour_stop(self):
        """Test PUT /api/admin/tour-stops/{id} - Test updating a tour stop's duration"""
        if not self.admin_token:
            self.log_test_result("Admin Update Tour Stop", False, "No admin token available")
            return
            
        if not hasattr(self, 'first_stop_id') or not self.first_stop_id:
            self.log_test_result("Admin Update Tour Stop", False, "No tour stop ID available for testing")
            return
        
        # Update duration to 300 seconds
        update_data = {
            "duration_seconds": 300
        }
        
        response = await self.make_request("PUT", f"/admin/tour-stops/{self.first_stop_id}", json=update_data)
        
        if not response["success"]:
            self.log_test_result("Admin Update Tour Stop", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        updated_stop = response["data"]
        
        # Verify duration was updated
        if updated_stop.get("duration_seconds") == 300:
            self.log_test_result("Admin Update Tour Stop", True, f"Successfully updated stop {self.first_stop_number} duration to 300 seconds")
        else:
            self.log_test_result("Admin Update Tour Stop", False, f"Duration not updated correctly. Expected 300, got {updated_stop.get('duration_seconds')}")
    
    async def test_admin_get_site_settings(self):
        """Test GET /api/admin/site-settings - Get current settings"""
        if not self.admin_token:
            self.log_test_result("Admin Get Site Settings", False, "No admin token available")
            return
            
        response = await self.make_request("GET", "/admin/site-settings")
        
        if not response["success"]:
            self.log_test_result("Admin Get Site Settings", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        settings = response["data"]
        
        # Check required fields
        required_fields = ["site_name", "site_subtitle", "welcome_description", "primary_color", "secondary_color"]
        missing_fields = [field for field in required_fields if field not in settings]
        
        if missing_fields:
            self.log_test_result("Admin Get Site Settings Structure", False, f"Missing fields: {missing_fields}")
        else:
            site_name = settings.get("site_name", "")
            self.log_test_result("Admin Get Site Settings", True, f"Retrieved settings successfully - Site name: {site_name}")
    
    async def test_admin_update_site_settings(self):
        """Test PUT /api/admin/site-settings - Update site name to "Spiš Castle" """
        if not self.admin_token:
            self.log_test_result("Admin Update Site Settings", False, "No admin token available")
            return
        
        # Update site name
        update_data = {
            "site_name": "Spiš Castle"
        }
        
        response = await self.make_request("PUT", "/admin/site-settings", json=update_data)
        
        if not response["success"]:
            self.log_test_result("Admin Update Site Settings", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        updated_settings = response["data"]
        
        # Verify site name was updated
        if updated_settings.get("site_name") == "Spiš Castle":
            self.log_test_result("Admin Update Site Settings", True, "Successfully updated site name to 'Spiš Castle'")
        else:
            self.log_test_result("Admin Update Site Settings", False, f"Site name not updated correctly. Expected 'Spiš Castle', got '{updated_settings.get('site_name')}'")
    
    async def test_admin_get_site_info(self):
        """Test GET /api/admin/site-info - Get all site info (should have 9 languages)"""
        if not self.admin_token:
            self.log_test_result("Admin Get Site Info", False, "No admin token available")
            return
            
        response = await self.make_request("GET", "/admin/site-info")
        
        if not response["success"]:
            self.log_test_result("Admin Get Site Info", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        site_info_list = response["data"]
        
        if not isinstance(site_info_list, list):
            self.log_test_result("Admin Get Site Info", False, f"Expected list, got {type(site_info_list)}: {site_info_list}")
            return
        
        # Check if we have 9 languages
        total_languages = len(site_info_list)
        if total_languages == 9:
            self.log_test_result("Admin Get Site Info Languages", True, f"Correct number of language entries: {total_languages}")
        else:
            self.log_test_result("Admin Get Site Info Languages", False, f"Expected 9 languages, got {total_languages}")
        
        # Check language codes
        language_codes = [info.get("language_code") for info in site_info_list]
        expected_codes = {"sk", "en", "de", "pl", "hu", "fr", "es", "ru", "zh"}
        actual_codes = set(language_codes)
        
        if actual_codes == expected_codes:
            self.log_test_result("Admin Site Info Language Codes", True, "All 9 expected language codes present")
        else:
            missing = expected_codes - actual_codes
            extra = actual_codes - expected_codes
            self.log_test_result("Admin Site Info Language Codes", False, f"Missing: {missing}, Extra: {extra}")
    
    async def test_admin_update_site_info(self):
        """Test PUT /api/admin/site-info/en - Update English site info"""
        if not self.admin_token:
            self.log_test_result("Admin Update Site Info English", False, "No admin token available")
            return
        
        # Update English site info
        update_data = {
            "title": "Spiš Castle",
            "subtitle": "UNESCO World Heritage Site",
            "description": "Welcome to Spiš Castle, one of the largest castle complexes in Europe. This magnificent castle will take you through centuries of history."
        }
        
        response = await self.make_request("PUT", "/admin/site-info/en", json=update_data)
        
        if not response["success"]:
            self.log_test_result("Admin Update Site Info English", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        updated_info = response["data"]
        
        # Verify title was updated
        if updated_info.get("title") == "Spiš Castle":
            self.log_test_result("Admin Update Site Info English", True, "Successfully updated English site info title to 'Spiš Castle'")
        else:
            self.log_test_result("Admin Update Site Info English", False, f"Title not updated correctly. Expected 'Spiš Castle', got '{updated_info.get('title')}'")
    
    async def test_admin_get_languages(self):
        """Test GET /api/admin/languages - Get all 9 languages"""
        if not self.admin_token:
            self.log_test_result("Admin Get Languages", False, "No admin token available")
            return
            
        response = await self.make_request("GET", "/admin/languages")
        
        if not response["success"]:
            self.log_test_result("Admin Get Languages", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        languages = response["data"]
        
        if not isinstance(languages, list):
            self.log_test_result("Admin Get Languages", False, f"Expected list, got {type(languages)}: {languages}")
            return
        
        # Check if we have 9 languages
        total_languages = len(languages)
        if total_languages == 9:
            self.log_test_result("Admin Get Languages Count", True, f"Correct number of languages: {total_languages}")
        else:
            self.log_test_result("Admin Get Languages Count", False, f"Expected 9 languages, got {total_languages}")
        
        # Check for expected languages with flag emojis
        expected_codes = {"sk", "en", "de", "pl", "hu", "fr", "es", "ru", "zh"}
        actual_codes = {lang.get("code") for lang in languages}
        
        if actual_codes == expected_codes:
            self.log_test_result("Admin Languages Codes", True, "All 9 expected language codes present")
        else:
            missing = expected_codes - actual_codes
            extra = actual_codes - expected_codes
            self.log_test_result("Admin Languages Codes", False, f"Missing: {missing}, Extra: {extra}")
        
        # Check flag emojis
        flag_emojis = [lang.get("flag_emoji") for lang in languages if lang.get("flag_emoji")]
        expected_flags = ["🇸🇰", "🇬🇧", "🇩🇪", "🇵🇱", "🇭🇺", "🇫🇷", "🇪🇸", "🇷🇺", "🇨🇳"]
        
        if len(flag_emojis) == 9:
            self.log_test_result("Admin Languages Flag Emojis", True, f"All languages have flag emojis: {', '.join(flag_emojis)}")
        else:
            self.log_test_result("Admin Languages Flag Emojis", False, f"Expected 9 flag emojis, got {len(flag_emojis)}")
    
    async def test_admin_update_language(self):
        """Test PUT /api/admin/languages/en - Update English language settings"""
        if not self.admin_token:
            self.log_test_result("Admin Update Language English", False, "No admin token available")
            return
        
        # Update English language settings
        update_data = {
            "code": "en",
            "name": "English",
            "native_name": "English",
            "flag_emoji": "🇬🇧",
            "is_active": True,
            "order": 2
        }
        
        response = await self.make_request("PUT", "/admin/languages/en", json=update_data)
        
        if not response["success"]:
            self.log_test_result("Admin Update Language English", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        updated_language = response["data"]
        
        # Verify language was updated
        if updated_language.get("flag_emoji") == "🇬🇧":
            self.log_test_result("Admin Update Language English", True, "Successfully updated English language with flag 🇬🇧")
        else:
            self.log_test_result("Admin Update Language English", False, f"Flag not updated correctly. Expected '🇬🇧', got '{updated_language.get('flag_emoji')}'")
    
    async def test_admin_get_qr_codes(self):
        """Test GET /api/admin/qr-codes - Get all QR codes for tour stops"""
        if not self.admin_token:
            self.log_test_result("Admin Get QR Codes", False, "No admin token available")
            return
            
        response = await self.make_request("GET", "/admin/qr-codes")
        
        if not response["success"]:
            self.log_test_result("Admin Get QR Codes", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        qr_codes = response["data"]
        
        if not isinstance(qr_codes, list):
            self.log_test_result("Admin Get QR Codes", False, f"Expected list, got {type(qr_codes)}: {qr_codes}")
            return
        
        # Check if we have QR codes for all stops
        total_qr_codes = len(qr_codes)
        if total_qr_codes >= 16:  # Should have QR codes for all 16 stops
            self.log_test_result("Admin Get QR Codes Count", True, f"Retrieved {total_qr_codes} QR codes")
        else:
            self.log_test_result("Admin Get QR Codes Count", False, f"Expected at least 16 QR codes, got {total_qr_codes}")
        
        # Check structure of QR code entries
        if qr_codes:
            first_qr = qr_codes[0]
            required_fields = ["stop_id", "qr_code_id", "stop_number", "title", "qr_url", "target_url"]
            missing_fields = [field for field in required_fields if field not in first_qr]
            
            if missing_fields:
                self.log_test_result("Admin QR Codes Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test_result("Admin QR Codes Structure", True, "QR codes have correct structure with all required fields")
    
    async def test_public_languages_after_update(self):
        """Test GET /api/languages - Should return 9 languages with flags (public endpoint)"""
        response = await self.make_request("GET", "/languages")
        
        if not response["success"]:
            self.log_test_result("Public Languages After Update", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        languages = response["data"]
        
        if not isinstance(languages, list):
            self.log_test_result("Public Languages After Update", False, f"Expected list, got {type(languages)}: {languages}")
            return
        
        # Check if we have 9 languages
        total_languages = len(languages)
        if total_languages == 9:
            self.log_test_result("Public Languages Count", True, f"Public endpoint returns {total_languages} languages")
        else:
            self.log_test_result("Public Languages Count", False, f"Expected 9 languages, got {total_languages}")
    
    async def test_public_tour_stops_after_update(self):
        """Test GET /api/tour-stops - Should return 16 stops (12 tour + 4 legends)"""
        response = await self.make_request("GET", "/tour-stops")
        
        if not response["success"]:
            self.log_test_result("Public Tour Stops After Update", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        stops = response["data"]
        
        if not isinstance(stops, list):
            self.log_test_result("Public Tour Stops After Update", False, f"Expected list, got {type(stops)}: {stops}")
            return
        
        # Check if we have 16 tour stops
        total_stops = len(stops)
        if total_stops == 16:
            self.log_test_result("Public Tour Stops Count", True, f"Public endpoint returns {total_stops} stops (12 tour + 4 legends)")
        else:
            self.log_test_result("Public Tour Stops Count", False, f"Expected 16 tour stops, got {total_stops}")
    
    async def test_public_site_settings_after_update(self):
        """Test GET /api/site-settings - site_name should be "Spiš Castle" """
        response = await self.make_request("GET", "/site-settings")
        
        if not response["success"]:
            self.log_test_result("Public Site Settings After Update", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        settings = response["data"]
        
        # Check if site_name was updated
        site_name = settings.get("site_name", "")
        if site_name == "Spiš Castle":
            self.log_test_result("Public Site Settings Update Verification", True, f"Site name correctly updated to 'Spiš Castle'")
        else:
            self.log_test_result("Public Site Settings Update Verification", False, f"Site name not updated. Expected 'Spiš Castle', got '{site_name}'")
    
    async def test_public_site_info_after_update(self):
        """Test GET /api/site-info?language=en - Should show "Spiš Castle" title"""
        response = await self.make_request("GET", "/site-info", params={"language": "en"})
        
        if not response["success"]:
            self.log_test_result("Public Site Info After Update", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        info = response["data"]
        
        # Check if title was updated
        title = info.get("title", "")
        if title == "Spiš Castle":
            self.log_test_result("Public Site Info Update Verification", True, f"English site info title correctly updated to 'Spiš Castle'")
        else:
            self.log_test_result("Public Site Info Update Verification", False, f"English title not updated. Expected 'Spiš Castle', got '{title}'")
    
    async def run_all_tests(self):
        """Run all admin panel tests"""
        print("🏰 Starting Spiš Castle Audio Guide Admin Panel API Tests")
        print(f"📡 Backend URL: {BASE_URL}")
        print("🔐 Testing Admin Panel CRUD Operations")
        print("=" * 70)
        print()
        
        await self.setup()
        
        try:
            # 1. Admin Authentication
            print("🔐 ADMIN AUTHENTICATION")
            print("-" * 30)
            login_success = await self.test_admin_login()
            print()
            
            if not login_success:
                print("❌ Cannot proceed with admin tests - login failed")
                return False
            
            # 2. Admin CRUD Operations
            print("📝 ADMIN CRUD OPERATIONS")
            print("-" * 30)
            await self.test_admin_get_tour_stops()
            await self.test_admin_update_tour_stop()
            await self.test_admin_get_site_settings()
            await self.test_admin_update_site_settings()
            await self.test_admin_get_site_info()
            await self.test_admin_update_site_info()
            await self.test_admin_get_languages()
            await self.test_admin_update_language()
            await self.test_admin_get_qr_codes()
            print()
            
            # 3. Public API Verification
            print("🌍 PUBLIC API VERIFICATION")
            print("-" * 30)
            await self.test_public_languages_after_update()
            await self.test_public_tour_stops_after_update()
            await self.test_public_site_settings_after_update()
            await self.test_public_site_info_after_update()
            
        finally:
            await self.teardown()
        
        # Summary
        print("=" * 70)
        print("📊 ADMIN PANEL TEST SUMMARY")
        print("=" * 70)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results.values() if r["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        
        if self.failed_tests:
            print("\n🚨 FAILED TESTS:")
            for test_name in self.failed_tests:
                result = self.results[test_name]
                print(f"   • {test_name}: {result['details']}")
        
        print()
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        if failed_tests == 0:
            print("🎉 ALL ADMIN PANEL TESTS PASSED!")
            print("✅ Admin authentication working")
            print("✅ All CRUD operations functional")
            print("✅ Mobile content management ready")
        elif failed_tests <= 3:
            print("⚠️  Some minor issues found")
        else:
            print("🚫 Multiple critical admin issues found")
        
        return failed_tests == 0

if __name__ == "__main__":
    async def main():
        tester = AdminPanelTests()
        await tester.run_all_tests()
    
    asyncio.run(main())