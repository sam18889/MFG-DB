#!/usr/bin/env python3
"""
Comprehensive backend API testing for Manufacturing CRM
Tests all CRUD operations and authentication flows
"""

import requests
import json
import sys
from datetime import datetime
import uuid

class ManufacturingCRMTester:
    def __init__(self, base_url="https://mfg-crm-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = "test_session_1773714499272"  # From MongoDB setup
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data holders
        self.test_plant_id = None
        self.test_product_id = None
        self.test_incharge_id = None
        self.test_note_id = None
        self.test_record_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            result = {
                "test": name,
                "method": method,
                "endpoint": endpoint,
                "expected": expected_status,
                "actual": response.status_code,
                "success": success
            }
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    result["response"] = response.json()
                except:
                    result["response"] = response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    result["error"] = response.json()
                except:
                    result["error"] = response.text

            self.test_results.append(result)
            return success, result.get("response", {})

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            result = {
                "test": name,
                "method": method,
                "endpoint": endpoint,
                "expected": expected_status,
                "actual": "Exception",
                "success": False,
                "error": str(e)
            }
            self.test_results.append(result)
            return False, {}

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION ENDPOINTS")
        print("="*50)
        
        # Test /auth/me
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        if not success:
            print("❌ Authentication failed - cannot proceed with other tests")
            return False
            
        print(f"✅ Authenticated as: {response.get('name', 'Unknown')}")
        return True

    def test_plant_endpoints(self):
        """Test plant CRUD operations"""
        print("\n" + "="*50)
        print("TESTING PLANT ENDPOINTS")
        print("="*50)
        
        # Get plants (initially empty)
        self.run_test("Get All Plants", "GET", "plants", 200)
        
        # Create a plant
        plant_data = {"plant_name": f"Test Plant {datetime.now().strftime('%H%M%S')}"}
        success, response = self.run_test(
            "Create Plant",
            "POST",
            "plants",
            200,
            data=plant_data
        )
        
        if success and response:
            self.test_plant_id = response.get("plant_id")
            print(f"✅ Created plant with ID: {self.test_plant_id}")
        
        # Get plants after creation
        self.run_test("Get Plants After Creation", "GET", "plants", 200)
        
        # Update plant
        if self.test_plant_id:
            update_data = {"plant_name": "Updated Test Plant"}
            self.run_test(
                "Update Plant",
                "PUT",
                f"plants/{self.test_plant_id}",
                200,
                data=update_data
            )

    def test_product_endpoints(self):
        """Test product CRUD operations"""
        print("\n" + "="*50)
        print("TESTING PRODUCT ENDPOINTS")
        print("="*50)
        
        if not self.test_plant_id:
            print("❌ No plant available for product testing")
            return
        
        # Get products (initially empty)
        self.run_test("Get All Products", "GET", "products", 200)
        
        # Create a product
        product_data = {
            "product_name": "Paracetamol",
            "plant_id": self.test_plant_id,
            "quality_status": "onspec"
        }
        success, response = self.run_test(
            "Create Product",
            "POST",
            "products",
            200,
            data=product_data
        )
        
        if success and response:
            self.test_product_id = response.get("product_id")
            print(f"✅ Created product with ID: {self.test_product_id}")
        
        # Get products by plant
        self.run_test(
            "Get Products by Plant",
            "GET",
            "products",
            200,
            params={"plant_id": self.test_plant_id}
        )
        
        # Update product
        if self.test_product_id:
            update_data = {"quality_status": "offspec"}
            self.run_test(
                "Update Product Quality",
                "PUT",
                f"products/{self.test_product_id}",
                200,
                data=update_data
            )

    def test_shift_incharge_endpoints(self):
        """Test shift incharge CRUD operations"""
        print("\n" + "="*50)
        print("TESTING SHIFT INCHARGE ENDPOINTS")
        print("="*50)
        
        if not self.test_plant_id:
            print("❌ No plant available for shift incharge testing")
            return
        
        # Get shift incharges
        self.run_test("Get All Shift Incharges", "GET", "shift-incharges", 200)
        
        # Create shift incharge
        incharge_data = {
            "name": "John Doe",
            "email": f"john.doe.{datetime.now().strftime('%H%M%S')}@test.com",
            "plant_id": self.test_plant_id,
            "shift_type": "A",
            "crew_members": ["Alice", "Bob", "Charlie"],
            "follow_up_date": "2024-12-31"
        }
        success, response = self.run_test(
            "Create Shift Incharge",
            "POST",
            "shift-incharges",
            200,
            data=incharge_data
        )
        
        if success and response:
            self.test_incharge_id = response.get("incharge_id")
            print(f"✅ Created shift incharge with ID: {self.test_incharge_id}")
        
        # Update shift incharge
        if self.test_incharge_id:
            update_data = {"shift_type": "B", "follow_up_date": "2025-01-15"}
            self.run_test(
                "Update Shift Incharge",
                "PUT",
                f"shift-incharges/{self.test_incharge_id}",
                200,
                data=update_data
            )

    def test_notes_endpoints(self):
        """Test notes CRUD operations"""
        print("\n" + "="*50)
        print("TESTING NOTES ENDPOINTS")
        print("="*50)
        
        if not self.test_incharge_id:
            print("❌ No shift incharge available for notes testing")
            return
        
        # Get notes for shift incharge
        self.run_test(
            "Get Notes for Shift Incharge",
            "GET",
            f"notes/{self.test_incharge_id}",
            200
        )
        
        # Create note
        note_data = {
            "shift_incharge_id": self.test_incharge_id,
            "note_text": f"Test note created at {datetime.now().isoformat()}"
        }
        success, response = self.run_test(
            "Create Note",
            "POST",
            "notes",
            200,
            data=note_data
        )
        
        if success and response:
            self.test_note_id = response.get("note_id")
            print(f"✅ Created note with ID: {self.test_note_id}")
        
        # Get notes after creation
        self.run_test(
            "Get Notes After Creation",
            "GET",
            f"notes/{self.test_incharge_id}",
            200
        )

    def test_production_endpoints(self):
        """Test production record endpoints"""
        print("\n" + "="*50)
        print("TESTING PRODUCTION ENDPOINTS")
        print("="*50)
        
        if not (self.test_plant_id and self.test_product_id and self.test_incharge_id):
            print("❌ Missing required data for production testing")
            return
        
        # Get production records
        self.run_test("Get All Production Records", "GET", "production-records", 200)
        
        # Create production record
        today = datetime.now().date().isoformat()
        production_data = {
            "plant_id": self.test_plant_id,
            "product_id": self.test_product_id,
            "shift_incharge_id": self.test_incharge_id,
            "shift_type": "A",
            "shift_production_value": 150.5,
            "shift_status": "completed",
            "day_production_value": 300.0,
            "weekly_target": 2100.0,
            "monthly_target": 9000.0,
            "date": today
        }
        success, response = self.run_test(
            "Create Production Record",
            "POST",
            "production-records",
            200,
            data=production_data
        )
        
        if success and response:
            self.test_record_id = response.get("record_id")
            print(f"✅ Created production record with ID: {self.test_record_id}")
        
        # Get production records with filters
        self.run_test(
            "Get Production Records by Plant",
            "GET",
            "production-records",
            200,
            params={"plant_id": self.test_plant_id}
        )
        
        self.run_test(
            "Get Production Records by Date",
            "GET",
            "production-records",
            200,
            params={"date": today}
        )

    def test_dashboard_metrics(self):
        """Test dashboard metrics endpoint"""
        print("\n" + "="*50)
        print("TESTING DASHBOARD METRICS")
        print("="*50)
        
        success, response = self.run_test(
            "Get Dashboard Metrics",
            "GET",
            "dashboard/metrics",
            200
        )
        
        if success and response:
            print("📊 Dashboard metrics:")
            print(f"  • Plants: {response.get('total_plants', 0)}")
            print(f"  • Products: {response.get('total_products', 0)}")
            print(f"  • Shift Incharges: {response.get('total_shift_incharges', 0)}")
            print(f"  • Today's Production: {response.get('today_production', 0)}")
            print(f"  • On Spec Products: {response.get('onspec_count', 0)}")
            print(f"  • Off Spec Products: {response.get('offspec_count', 0)}")
            print(f"  • Overdue Follow-ups: {response.get('overdue_followups', 0)}")

    def test_logout(self):
        """Test logout endpoint"""
        print("\n" + "="*50)
        print("TESTING LOGOUT")
        print("="*50)
        
        self.run_test("Logout", "POST", "auth/logout", 200)

    def cleanup_test_data(self):
        """Clean up test data in reverse order of dependencies"""
        print("\n" + "="*50)
        print("CLEANING UP TEST DATA")
        print("="*50)
        
        # Delete note
        if self.test_note_id:
            self.run_test(
                "Delete Test Note",
                "DELETE",
                f"notes/{self.test_note_id}",
                200
            )
        
        # Delete production record (no API endpoint, but that's okay)
        
        # Delete shift incharge
        if self.test_incharge_id:
            self.run_test(
                "Delete Test Shift Incharge",
                "DELETE",
                f"shift-incharges/{self.test_incharge_id}",
                200
            )
        
        # Delete product
        if self.test_product_id:
            self.run_test(
                "Delete Test Product",
                "DELETE",
                f"products/{self.test_product_id}",
                200
            )
        
        # Delete plant
        if self.test_plant_id:
            self.run_test(
                "Delete Test Plant",
                "DELETE",
                f"plants/{self.test_plant_id}",
                200
            )

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r["success"]]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                error_msg = test.get('error', f'Expected {test["expected"]}, got {test["actual"]}')
                print(f"  • {test['test']}: {error_msg}")
        
        return success_rate >= 80  # Consider 80%+ success rate as passing

def main():
    """Main test execution"""
    print("🧪 Starting Manufacturing CRM Backend API Tests")
    print("="*60)
    
    tester = ManufacturingCRMTester()
    
    try:
        # Test authentication first
        if not tester.test_auth_endpoints():
            print("❌ Authentication failed, stopping tests")
            return 1
        
        # Test all API endpoints in logical order
        tester.test_plant_endpoints()
        tester.test_product_endpoints()
        tester.test_shift_incharge_endpoints()
        tester.test_notes_endpoints()
        tester.test_production_endpoints()
        tester.test_dashboard_metrics()
        
        # Test logout
        tester.test_logout()
        
        # Cleanup test data
        tester.cleanup_test_data()
        
        # Print final summary
        success = tester.print_summary()
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())