#!/usr/bin/env python3
"""
Castle Audio Guide Backend API Test Suite
Tests all public endpoints for the Castle Audio Guide backend API
"""

import asyncio
import aiohttp
import json
from datetime import datetime
from typing import Dict, List, Any

# Get backend URL from environment
BASE_URL = "https://audio-sprievodca.preview.emergentagent.com/api"

class CastleAudioGuideTests:
    def __init__(self):
        self.session = None
        self.results = {}
        self.failed_tests = []
        
    async def setup(self):
        """Setup test session"""
        self.session = aiohttp.ClientSession()
        
    async def teardown(self):
        """Cleanup test session"""
        if self.session:
            await self.session.close()
    
    async def make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make HTTP request and return response data"""
        url = f"{BASE_URL}{endpoint}"
        try:
            async with self.session.request(method, url, **kwargs) as response:
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
    
    async def test_health_check(self):
        """Test GET /api/health - Should return healthy status"""
        response = await self.make_request("GET", "/health")
        
        if not response["success"]:
            self.log_test_result("Health Check", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        data = response["data"]
        if "status" in data and data["status"] == "healthy":
            self.log_test_result("Health Check", True, "API is healthy", data)
        else:
            self.log_test_result("Health Check", False, f"Unexpected response: {data}")
    
    async def test_languages(self):
        """Test GET /api/languages - Should return list of 5 languages"""
        response = await self.make_request("GET", "/languages")
        
        if not response["success"]:
            self.log_test_result("Languages Endpoint", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        languages = response["data"]
        
        if not isinstance(languages, list):
            self.log_test_result("Languages Endpoint", False, f"Expected list, got {type(languages)}: {languages}")
            return
        
        # Check if we have exactly 5 languages
        if len(languages) != 5:
            self.log_test_result("Languages Count", False, f"Expected 5 languages, got {len(languages)}")
        else:
            self.log_test_result("Languages Count", True, "Correct number of languages (5)")
        
        # Check for expected languages
        expected_codes = {"sk", "en", "de", "pl", "hu"}
        expected_names = {"Slovak", "English", "German", "Polish", "Hungarian"}
        
        actual_codes = {lang.get("code") for lang in languages}
        actual_names = {lang.get("name") for lang in languages}
        
        if actual_codes == expected_codes:
            self.log_test_result("Language Codes", True, "All expected language codes present")
        else:
            missing = expected_codes - actual_codes
            extra = actual_codes - expected_codes
            self.log_test_result("Language Codes", False, f"Missing: {missing}, Extra: {extra}")
        
        if actual_names == expected_names:
            self.log_test_result("Language Names", True, "All expected language names present")
        else:
            missing = expected_names - actual_names
            extra = actual_names - expected_names
            self.log_test_result("Language Names", False, f"Missing: {missing}, Extra: {extra}")
        
        # Check structure of each language
        for lang in languages:
            required_fields = ["id", "code", "name", "native_name", "flag_emoji", "is_active", "order"]
            missing_fields = [field for field in required_fields if field not in lang]
            if missing_fields:
                self.log_test_result("Language Structure", False, f"Missing fields in language {lang.get('code', 'unknown')}: {missing_fields}")
            else:
                self.log_test_result(f"Language Structure ({lang.get('code')})", True, "All required fields present")
    
    async def test_tour_stops(self):
        """Test GET /api/tour-stops - Should return list of 7 tour stops"""
        response = await self.make_request("GET", "/tour-stops")
        
        if not response["success"]:
            self.log_test_result("Tour Stops Endpoint", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        stops = response["data"]
        
        if not isinstance(stops, list):
            self.log_test_result("Tour Stops Endpoint", False, f"Expected list, got {type(stops)}: {stops}")
            return
        
        # Check if we have exactly 7 tour stops
        if len(stops) != 7:
            self.log_test_result("Tour Stops Count", False, f"Expected 7 tour stops, got {len(stops)}")
        else:
            self.log_test_result("Tour Stops Count", True, "Correct number of tour stops (7)")
        
        # Check tour stops are numbered 1-7
        stop_numbers = {stop.get("stop_number") for stop in stops}
        expected_numbers = {1, 2, 3, 4, 5, 6, 7}
        
        if stop_numbers == expected_numbers:
            self.log_test_result("Tour Stop Numbers", True, "Tour stops numbered 1-7 correctly")
        else:
            missing = expected_numbers - stop_numbers
            extra = stop_numbers - expected_numbers
            self.log_test_result("Tour Stop Numbers", False, f"Missing numbers: {missing}, Extra numbers: {extra}")
        
        # Check each tour stop has translations in 5 languages
        all_translations_correct = True
        for stop in stops:
            translations = stop.get("translations", [])
            if len(translations) != 5:
                self.log_test_result(f"Stop {stop.get('stop_number')} Translations", False, f"Expected 5 translations, got {len(translations)}")
                all_translations_correct = False
            else:
                translation_codes = {t.get("language_code") for t in translations}
                expected_codes = {"sk", "en", "de", "pl", "hu"}
                if translation_codes == expected_codes:
                    self.log_test_result(f"Stop {stop.get('stop_number')} Translation Languages", True, "All 5 languages present")
                else:
                    missing = expected_codes - translation_codes
                    extra = translation_codes - expected_codes
                    self.log_test_result(f"Stop {stop.get('stop_number')} Translation Languages", False, f"Missing: {missing}, Extra: {extra}")
                    all_translations_correct = False
            
            # Check duration_seconds is set
            if "duration_seconds" not in stop or stop["duration_seconds"] <= 0:
                self.log_test_result(f"Stop {stop.get('stop_number')} Duration", False, f"Duration not set or invalid: {stop.get('duration_seconds')}")
            else:
                self.log_test_result(f"Stop {stop.get('stop_number')} Duration", True, f"Duration set: {stop['duration_seconds']} seconds")
        
        if all_translations_correct:
            self.log_test_result("All Tour Stop Translations", True, "All tour stops have correct translations")
        
        # Store first stop ID for individual stop test
        if stops:
            self.first_stop_id = stops[0].get("id")
        else:
            self.first_stop_id = None
    
    async def test_individual_tour_stop(self):
        """Test GET /api/tour-stops/{id} - Test getting a specific tour stop by ID"""
        if not hasattr(self, 'first_stop_id') or not self.first_stop_id:
            self.log_test_result("Individual Tour Stop", False, "No tour stop ID available for testing")
            return
            
        response = await self.make_request("GET", f"/tour-stops/{self.first_stop_id}")
        
        if not response["success"]:
            self.log_test_result("Individual Tour Stop", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        stop = response["data"]
        
        # Verify it's the correct stop structure
        required_fields = ["id", "stop_number", "translations", "duration_seconds", "is_active"]
        missing_fields = [field for field in required_fields if field not in stop]
        
        if missing_fields:
            self.log_test_result("Individual Tour Stop Structure", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test_result("Individual Tour Stop", True, f"Successfully retrieved tour stop {stop.get('stop_number')}")
    
    async def test_site_settings(self):
        """Test GET /api/site-settings - Should return site settings for "Spišský Hrad" """
        response = await self.make_request("GET", "/site-settings")
        
        if not response["success"]:
            self.log_test_result("Site Settings", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        settings = response["data"]
        
        # Check if site_name contains "Spišský Hrad"
        site_name = settings.get("site_name", "")
        if "Spišský Hrad" in site_name:
            self.log_test_result("Site Settings Name", True, f"Site name contains 'Spišský Hrad': {site_name}")
        else:
            self.log_test_result("Site Settings Name", False, f"Site name doesn't contain 'Spišský Hrad', got: {site_name}")
        
        # Check required fields
        required_fields = ["site_name", "site_subtitle", "welcome_description", "primary_color", "secondary_color"]
        missing_fields = [field for field in required_fields if field not in settings]
        
        if missing_fields:
            self.log_test_result("Site Settings Structure", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test_result("Site Settings Structure", True, "All required fields present")
    
    async def test_site_info_slovak(self):
        """Test GET /api/site-info?language=sk - Should return Slovak site info"""
        response = await self.make_request("GET", "/site-info", params={"language": "sk"})
        
        if not response["success"]:
            self.log_test_result("Site Info (Slovak)", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        info = response["data"]
        
        # Check language code
        if info.get("language_code") == "sk":
            self.log_test_result("Site Info Slovak Language", True, "Correct language code returned")
        else:
            self.log_test_result("Site Info Slovak Language", False, f"Expected 'sk', got: {info.get('language_code')}")
        
        # Check required fields
        required_fields = ["title", "description", "language_code"]
        missing_fields = [field for field in required_fields if field not in info]
        
        if missing_fields:
            self.log_test_result("Site Info Slovak Structure", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test_result("Site Info Slovak Structure", True, "All required fields present")
    
    async def test_site_info_english(self):
        """Test GET /api/site-info?language=en - Should return English site info"""
        response = await self.make_request("GET", "/site-info", params={"language": "en"})
        
        if not response["success"]:
            self.log_test_result("Site Info (English)", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        info = response["data"]
        
        # Check language code
        if info.get("language_code") == "en":
            self.log_test_result("Site Info English Language", True, "Correct language code returned")
        else:
            self.log_test_result("Site Info English Language", False, f"Expected 'en', got: {info.get('language_code')}")
        
        # Check required fields
        required_fields = ["title", "description", "language_code"]
        missing_fields = [field for field in required_fields if field not in info]
        
        if missing_fields:
            self.log_test_result("Site Info English Structure", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test_result("Site Info English Structure", True, "All required fields present")
    
    async def test_offline_package(self):
        """Test GET /api/offline-package - Should return complete offline package with all data"""
        response = await self.make_request("GET", "/offline-package")
        
        if not response["success"]:
            self.log_test_result("Offline Package", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        package = response["data"]
        
        # Check required top-level fields
        required_fields = ["languages", "tour_stops", "site_info", "version", "generated_at"]
        missing_fields = [field for field in required_fields if field not in package]
        
        if missing_fields:
            self.log_test_result("Offline Package Structure", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test_result("Offline Package Structure", True, "All required fields present")
        
        # Check languages data
        languages = package.get("languages", [])
        if len(languages) == 5:
            self.log_test_result("Offline Package Languages", True, "5 languages included in package")
        else:
            self.log_test_result("Offline Package Languages", False, f"Expected 5 languages, got {len(languages)}")
        
        # Check tour stops data
        tour_stops = package.get("tour_stops", [])
        if len(tour_stops) == 7:
            self.log_test_result("Offline Package Tour Stops", True, "7 tour stops included in package")
        else:
            self.log_test_result("Offline Package Tour Stops", False, f"Expected 7 tour stops, got {len(tour_stops)}")
        
        # Check site info data
        site_info = package.get("site_info", [])
        if len(site_info) >= 5:  # Should have info for all 5 languages
            self.log_test_result("Offline Package Site Info", True, f"Site info for {len(site_info)} languages included")
        else:
            self.log_test_result("Offline Package Site Info", False, f"Expected site info for 5 languages, got {len(site_info)}")
    
    async def run_all_tests(self):
        """Run all tests"""
        print("🏰 Starting Castle Audio Guide Backend API Tests")
        print(f"📡 Backend URL: {BASE_URL}")
        print("=" * 60)
        print()
        
        await self.setup()
        
        try:
            # Run all tests
            await self.test_health_check()
            await self.test_languages()
            await self.test_tour_stops()
            await self.test_individual_tour_stop()
            await self.test_site_settings()
            await self.test_site_info_slovak()
            await self.test_site_info_english()
            await self.test_offline_package()
            
        finally:
            await self.teardown()
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
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
            print("🎉 ALL TESTS PASSED!")
        elif failed_tests <= 3:
            print("⚠️  Some minor issues found")
        else:
            print("🚫 Multiple critical issues found")
        
        return failed_tests == 0

if __name__ == "__main__":
    async def main():
        tester = CastleAudioGuideTests()
        await tester.run_all_tests()
    
    asyncio.run(main())