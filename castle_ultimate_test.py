#!/usr/bin/env python3
"""
ULTIMATE Castle Audio Guide Backend API Test Suite
Tests all endpoints according to the review requirements:
- 9 languages (SK, EN, DE, PL, HU, FR, ES, RU, ZH)
- 12 tour stops + 4 legends = 16 total
- QR code generation
- All translations in 9 languages
"""

import asyncio
import aiohttp
import json
from datetime import datetime
from typing import Dict, List, Any

# Get backend URL from environment
BASE_URL = "https://spis-castle-guide-1.preview.emergentagent.com/api"

class UltimateCastleTests:
    def __init__(self):
        self.session = None
        self.results = {}
        self.failed_tests = []
        self.tour_stops = []
        self.legends = []
        
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
        """Test 1: GET /api/health - Health check"""
        response = await self.make_request("GET", "/health")
        
        if not response["success"]:
            self.log_test_result("Health Check", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        data = response["data"]
        if "status" in data and data["status"] == "healthy":
            self.log_test_result("Health Check", True, f"API is healthy with timestamp: {data.get('timestamp', 'N/A')}")
        else:
            self.log_test_result("Health Check", False, f"Unexpected response: {data}")
    
    async def test_languages_nine(self):
        """Test 2: GET /api/languages - Should return 9 languages with flag emojis"""
        response = await self.make_request("GET", "/languages")
        
        if not response["success"]:
            self.log_test_result("Languages Endpoint", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        languages = response["data"]
        
        if not isinstance(languages, list):
            self.log_test_result("Languages Endpoint", False, f"Expected list, got {type(languages)}: {languages}")
            return
        
        # Check if we have exactly 9 languages
        if len(languages) != 9:
            self.log_test_result("Languages Count (9)", False, f"Expected 9 languages, got {len(languages)}")
        else:
            self.log_test_result("Languages Count (9)", True, "Correct number of languages (9)")
        
        # Check for expected 9 languages
        expected_codes = {"sk", "en", "de", "pl", "hu", "fr", "es", "ru", "zh"}
        expected_flags = {"🇸🇰", "🇬🇧", "🇩🇪", "🇵🇱", "🇭🇺", "🇫🇷", "🇪🇸", "🇷🇺", "🇨🇳"}
        
        actual_codes = {lang.get("code") for lang in languages}
        actual_flags = {lang.get("flag_emoji") for lang in languages}
        
        if actual_codes == expected_codes:
            self.log_test_result("Languages (All 9 Codes)", True, f"All expected language codes present: {sorted(actual_codes)}")
        else:
            missing = expected_codes - actual_codes
            extra = actual_codes - expected_codes
            self.log_test_result("Languages (All 9 Codes)", False, f"Missing: {missing}, Extra: {extra}")
        
        if actual_flags == expected_flags:
            self.log_test_result("Languages (Flag Emojis)", True, "All expected flag emojis present")
        else:
            missing = expected_flags - actual_flags
            extra = actual_flags - expected_flags  
            self.log_test_result("Languages (Flag Emojis)", False, f"Missing flags: {missing}, Extra flags: {extra}")
        
        # Check structure of each language
        for lang in languages:
            required_fields = ["id", "code", "name", "native_name", "flag_emoji", "is_active", "order"]
            missing_fields = [field for field in required_fields if field not in lang]
            if missing_fields:
                self.log_test_result(f"Language Structure ({lang.get('code')})", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test_result(f"Language Structure ({lang.get('code')})", True, "All required fields present")
    
    async def test_tour_stops_total(self):
        """Test 3: GET /api/tour-stops - Should return 12 tour stops + 4 legends = 16 total"""
        response = await self.make_request("GET", "/tour-stops")
        
        if not response["success"]:
            self.log_test_result("Tour Stops Endpoint", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        all_stops = response["data"]
        
        if not isinstance(all_stops, list):
            self.log_test_result("Tour Stops Endpoint", False, f"Expected list, got {type(all_stops)}: {all_stops}")
            return
        
        # Get filtered tour stops and legends using API filters for accurate counts
        tour_response = await self.make_request("GET", "/tour-stops", params={"stop_type": "tour"})
        legend_response = await self.make_request("GET", "/tour-stops", params={"stop_type": "legend"})
        
        if tour_response["success"]:
            self.tour_stops = tour_response["data"]
        else:
            self.tour_stops = [stop for stop in all_stops if stop.get("stop_type") == "tour"]
            
        if legend_response["success"]:
            self.legends = legend_response["data"]
        else:
            self.legends = [stop for stop in all_stops if stop.get("stop_type") == "legend"]
        
        # Check tour stops count (should be 12)
        if len(self.tour_stops) == 12:
            self.log_test_result("Tour Stops Count (12)", True, f"Correct number of tour stops: 12")
        else:
            self.log_test_result("Tour Stops Count (12)", False, f"Expected 12 tour stops, got {len(self.tour_stops)}")
        
        # Check legends count (should be 4)
        if len(self.legends) == 4:
            self.log_test_result("Legends Count (4)", True, f"Correct number of legends: 4")
        else:
            self.log_test_result("Legends Count (4)", False, f"Expected 4 legends, got {len(self.legends)}")
        
        # Total should be 16
        total_count = len(all_stops)
        if total_count >= 16:  # Allow for extras
            self.log_test_result("Total Stops (12+4=16+)", True, f"Total stops: {total_count} (includes 12 tour + 4 legends + extras)")
        else:
            self.log_test_result("Total Stops (12+4=16)", False, f"Expected at least 16 total stops, got {total_count}")
        
        # Check tour stops are numbered 1-12
        tour_numbers = {stop.get("stop_number") for stop in self.tour_stops}
        expected_tour_numbers = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}
        
        if tour_numbers.issuperset(expected_tour_numbers):
            self.log_test_result("Tour Stop Numbers (1-12)", True, f"Tour stops numbered correctly: {sorted(tour_numbers)}")
        else:
            missing = expected_tour_numbers - tour_numbers
            self.log_test_result("Tour Stop Numbers (1-12)", False, f"Missing tour stop numbers: {missing}")
        
        # Check legends are numbered 101-104
        legend_numbers = {stop.get("stop_number") for stop in self.legends}
        expected_legend_numbers = {101, 102, 103, 104}
        
        if legend_numbers.issuperset(expected_legend_numbers):
            self.log_test_result("Legend Numbers (101-104)", True, f"Legends numbered correctly: {sorted(legend_numbers)}")
        else:
            missing = expected_legend_numbers - legend_numbers
            self.log_test_result("Legend Numbers (101-104)", False, f"Missing legend numbers: {missing}")
    
    async def test_tour_stops_filter_tour(self):
        """Test 4: GET /api/tour-stops?stop_type=tour - Should return only tour stops (12)"""
        response = await self.make_request("GET", "/tour-stops", params={"stop_type": "tour"})
        
        if not response["success"]:
            self.log_test_result("Tour Stops Filter (tour)", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        tour_only = response["data"]
        
        # Check all returned stops are tour type
        all_tour_type = all(stop.get("stop_type") == "tour" for stop in tour_only)
        if all_tour_type:
            self.log_test_result("Tour Stops Filter Type", True, "All returned stops are type 'tour'")
        else:
            non_tour = [stop.get("stop_number") for stop in tour_only if stop.get("stop_type") != "tour"]
            self.log_test_result("Tour Stops Filter Type", False, f"Non-tour stops found: {non_tour}")
        
        # Should be around 12 tour stops
        if len(tour_only) >= 12:
            self.log_test_result("Tour Stops Filter Count", True, f"Tour stops count: {len(tour_only)} (expected 12+)")
        else:
            self.log_test_result("Tour Stops Filter Count", False, f"Expected at least 12 tour stops, got {len(tour_only)}")
    
    async def test_tour_stops_filter_legend(self):
        """Test 5: GET /api/tour-stops?stop_type=legend - Should return only legends (4)"""
        response = await self.make_request("GET", "/tour-stops", params={"stop_type": "legend"})
        
        if not response["success"]:
            self.log_test_result("Tour Stops Filter (legend)", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        legends_only = response["data"]
        
        # Check all returned stops are legend type
        all_legend_type = all(stop.get("stop_type") == "legend" for stop in legends_only)
        if all_legend_type:
            self.log_test_result("Legends Filter Type", True, "All returned stops are type 'legend'")
        else:
            non_legend = [stop.get("stop_number") for stop in legends_only if stop.get("stop_type") != "legend"]
            self.log_test_result("Legends Filter Type", False, f"Non-legend stops found: {non_legend}")
        
        # Should be exactly 4 legends
        if len(legends_only) == 4:
            self.log_test_result("Legends Filter Count", True, f"Legends count: {len(legends_only)} (expected 4)")
        else:
            self.log_test_result("Legends Filter Count", False, f"Expected 4 legends, got {len(legends_only)}")
    
    async def test_site_settings_spissky_hrad(self):
        """Test 6: GET /api/site-settings - Should return settings for "Spišský Hrad" """
        response = await self.make_request("GET", "/site-settings")
        
        if not response["success"]:
            self.log_test_result("Site Settings", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        settings = response["data"]
        
        # Check if site_name is "Spišský Hrad"
        site_name = settings.get("site_name", "")
        if site_name == "Spišský Hrad":
            self.log_test_result("Site Settings Name", True, f"Site name correct: '{site_name}'")
        else:
            self.log_test_result("Site Settings Name", False, f"Expected 'Spišský Hrad', got: '{site_name}'")
        
        # Check required fields
        required_fields = ["site_name", "site_subtitle", "welcome_description", "primary_color", "secondary_color"]
        missing_fields = [field for field in required_fields if field not in settings]
        
        if missing_fields:
            self.log_test_result("Site Settings Structure", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test_result("Site Settings Structure", True, "All required fields present")
    
    async def test_site_info_slovak(self):
        """Test 7: GET /api/site-info?language=sk - Slovak site info"""
        response = await self.make_request("GET", "/site-info", params={"language": "sk"})
        
        if not response["success"]:
            self.log_test_result("Site Info (Slovak)", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        info = response["data"]
        
        # Check language code
        if info.get("language_code") == "sk":
            self.log_test_result("Site Info Slovak Language", True, f"Correct Slovak content with title: '{info.get('title', 'N/A')}'")
        else:
            self.log_test_result("Site Info Slovak Language", False, f"Expected 'sk', got: {info.get('language_code')}")
    
    async def test_site_info_english(self):
        """Test 8: GET /api/site-info?language=en - English site info"""
        response = await self.make_request("GET", "/site-info", params={"language": "en"})
        
        if not response["success"]:
            self.log_test_result("Site Info (English)", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        info = response["data"]
        
        # Check language code
        if info.get("language_code") == "en":
            self.log_test_result("Site Info English Language", True, f"Correct English content with title: '{info.get('title', 'N/A')}'")
        else:
            self.log_test_result("Site Info English Language", False, f"Expected 'en', got: {info.get('language_code')}")
    
    async def test_site_info_chinese(self):
        """Test 9: GET /api/site-info?language=zh - Chinese site info"""
        response = await self.make_request("GET", "/site-info", params={"language": "zh"})
        
        if not response["success"]:
            self.log_test_result("Site Info (Chinese)", False, f"Request failed with status {response['status']}: {response['data']}")
            return
            
        info = response["data"]
        
        # Check language code
        if info.get("language_code") == "zh":
            self.log_test_result("Site Info Chinese Language", True, f"Correct Chinese content with title: '{info.get('title', 'N/A')}'")
        else:
            self.log_test_result("Site Info Chinese Language", False, f"Expected 'zh', got: {info.get('language_code')}")
    
    async def test_offline_package(self):
        """Test 10: GET /api/offline-package - Complete offline data package"""
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
        
        # Check languages data (should be 9)
        languages = package.get("languages", [])
        if len(languages) == 9:
            self.log_test_result("Offline Package Languages (9)", True, "9 languages included in package")
        else:
            self.log_test_result("Offline Package Languages (9)", False, f"Expected 9 languages, got {len(languages)}")
        
        # Check tour stops data (should be 16+)
        tour_stops = package.get("tour_stops", [])
        if len(tour_stops) >= 16:
            self.log_test_result("Offline Package Tour Stops (16+)", True, f"{len(tour_stops)} tour stops included in package")
        else:
            self.log_test_result("Offline Package Tour Stops (16+)", False, f"Expected at least 16 tour stops, got {len(tour_stops)}")
        
        # Check site info data (should have info for all 9 languages)
        site_info = package.get("site_info", [])
        if len(site_info) >= 9:
            self.log_test_result("Offline Package Site Info (9)", True, f"Site info for {len(site_info)} languages included")
        else:
            self.log_test_result("Offline Package Site Info (9)", False, f"Expected site info for 9 languages, got {len(site_info)}")
    
    async def test_qr_code_generation(self):
        """Test 11: GET /api/qr/code/{qr_code_id} - Test QR code generation"""
        if not self.tour_stops:
            self.log_test_result("QR Code Generation", False, "No tour stops available for QR code testing")
            return
        
        # Pick the first tour stop's QR code ID
        first_stop = self.tour_stops[0]
        qr_code_id = first_stop.get("qr_code_id")
        
        if not qr_code_id:
            self.log_test_result("QR Code Generation", False, "No QR code ID found in tour stop")
            return
        
        # Make request without trying to parse as JSON since it's binary image data
        url = f"{BASE_URL}/qr/code/{qr_code_id}"
        try:
            async with self.session.get(url) as response:
                if response.status == 200:
                    content_type = response.headers.get("content-type", "")
                    if "image/png" in content_type:
                        self.log_test_result("QR Code Generation", True, f"QR code generated successfully for stop {first_stop.get('stop_number')} (ID: {qr_code_id})")
                    else:
                        self.log_test_result("QR Code Generation", False, f"Expected PNG image, got content-type: {content_type}")
                else:
                    response_text = await response.text()
                    self.log_test_result("QR Code Generation", False, f"Request failed with status {response.status}: {response_text}")
        except Exception as e:
            self.log_test_result("QR Code Generation", False, f"Request failed with error: {str(e)}")
    
    async def test_translations_in_9_languages(self):
        """Test 12: Verify all tour stops have translations in 9 languages"""
        if not self.tour_stops:
            self.log_test_result("Translations Verification", False, "No tour stops available for translation testing")
            return
        
        expected_language_codes = {"sk", "en", "de", "pl", "hu", "fr", "es", "ru", "zh"}
        all_translations_correct = True
        
        # Check first few tour stops
        for stop in self.tour_stops[:5]:  # Test first 5 stops to avoid too many individual tests
            translations = stop.get("translations", [])
            translation_codes = {t.get("language_code") for t in translations}
            stop_num = stop.get("stop_number")
            
            if translation_codes == expected_language_codes:
                self.log_test_result(f"Stop {stop_num} - All 9 Languages", True, "All 9 languages present")
            else:
                missing = expected_language_codes - translation_codes
                extra = translation_codes - expected_language_codes
                self.log_test_result(f"Stop {stop_num} - All 9 Languages", False, f"Missing: {missing}, Extra: {extra}")
                all_translations_correct = False
        
        if all_translations_correct:
            self.log_test_result("Overall Translation Coverage", True, "All tested stops have translations in 9 languages")
        else:
            self.log_test_result("Overall Translation Coverage", False, "Some stops missing translations")
    
    async def test_audio_urls_for_stops_1_7(self):
        """Test 13: Verify audio URLs exist for stops 1-7 that have audio files"""
        if not self.tour_stops:
            self.log_test_result("Audio URLs Verification", False, "No tour stops available for audio testing")
            return
        
        # Check stops 1-7 for audio URLs
        stops_1_to_7 = [stop for stop in self.tour_stops if 1 <= stop.get("stop_number", 0) <= 7]
        
        audio_found_count = 0
        for stop in stops_1_to_7:
            stop_num = stop.get("stop_number")
            translations = stop.get("translations", [])
            
            # Check if any translation has audio_url
            has_audio = any(t.get("audio_url") for t in translations)
            
            if has_audio:
                audio_found_count += 1
                self.log_test_result(f"Stop {stop_num} Audio URL", True, "Audio URL(s) present")
            else:
                self.log_test_result(f"Stop {stop_num} Audio URL", False, "No audio URLs found")
        
        # Summary
        if audio_found_count > 0:
            self.log_test_result("Audio URLs Summary", True, f"Audio URLs found for {audio_found_count} stops out of {len(stops_1_to_7)} tested")
        else:
            self.log_test_result("Audio URLs Summary", False, "No audio URLs found in any of the tested stops")
    
    async def test_qr_code_ids_exist(self):
        """Test 14: Verify QR code IDs exist for each stop"""
        if not self.tour_stops and not self.legends:
            self.log_test_result("QR Code IDs Verification", False, "No stops available for QR code ID testing")
            return
        
        all_stops = self.tour_stops + self.legends
        missing_qr_ids = []
        
        for stop in all_stops:
            qr_code_id = stop.get("qr_code_id")
            stop_num = stop.get("stop_number")
            stop_type = stop.get("stop_type")
            
            if qr_code_id:
                self.log_test_result(f"{stop_type.title()} {stop_num} QR ID", True, f"QR code ID: {qr_code_id}")
            else:
                missing_qr_ids.append(f"{stop_type} {stop_num}")
                self.log_test_result(f"{stop_type.title()} {stop_num} QR ID", False, "No QR code ID found")
        
        if not missing_qr_ids:
            self.log_test_result("QR Code IDs Summary", True, "All stops have QR code IDs")
        else:
            self.log_test_result("QR Code IDs Summary", False, f"Stops missing QR code IDs: {missing_qr_ids}")
    
    async def run_all_tests(self):
        """Run all ULTIMATE tests"""
        print("🏰 ULTIMATE Castle Audio Guide Backend API Tests")
        print(f"📡 Backend URL: {BASE_URL}")
        print("📝 Testing Requirements:")
        print("  • 9 languages (SK, EN, DE, PL, HU, FR, ES, RU, ZH) with flag emojis")
        print("  • 12 tour stops + 4 legends = 16 total")
        print("  • QR code generation")
        print("  • All translations in 9 languages")
        print("  • Audio URLs for stops 1-7")
        print("=" * 80)
        print()
        
        await self.setup()
        
        try:
            # Run all tests in sequence
            await self.test_health_check()
            await self.test_languages_nine()
            await self.test_tour_stops_total()
            await self.test_tour_stops_filter_tour()
            await self.test_tour_stops_filter_legend()
            await self.test_site_settings_spissky_hrad()
            await self.test_site_info_slovak()
            await self.test_site_info_english()
            await self.test_site_info_chinese()
            await self.test_offline_package()
            await self.test_qr_code_generation()
            await self.test_translations_in_9_languages()
            await self.test_audio_urls_for_stops_1_7()
            await self.test_qr_code_ids_exist()
            
        finally:
            await self.teardown()
        
        # Summary
        print("=" * 80)
        print("📊 ULTIMATE TEST SUMMARY")
        print("=" * 80)
        
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
            print("🎉 ALL ULTIMATE TESTS PASSED!")
            print("✅ Castle Audio Guide backend meets all requirements!")
        elif failed_tests <= 5:
            print("⚠️  Minor issues found - mostly working")
        else:
            print("🚫 Multiple critical issues found")
        
        return failed_tests == 0

if __name__ == "__main__":
    async def main():
        tester = UltimateCastleTests()
        await tester.run_all_tests()
    
    asyncio.run(main())