#!/usr/bin/env python3
"""
Backend API Tests for AutiGaze JWT Authentication
Tests all auth endpoints and protected routes
"""

import requests
import time
import sys
from typing import Dict, Any

# Base URL from frontend/.env
BASE_URL = "https://exact-course-web.preview.emergentagent.com/api"

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "total": 0
}

def log_test(name: str, passed: bool, details: str = ""):
    """Log test result"""
    test_results["total"] += 1
    if passed:
        test_results["passed"].append(name)
        print(f"✅ PASS: {name}")
        if details:
            print(f"   {details}")
    else:
        test_results["failed"].append(name)
        print(f"❌ FAIL: {name}")
        if details:
            print(f"   {details}")
    print()

def generate_unique_email() -> str:
    """Generate unique email using timestamp"""
    timestamp = int(time.time() * 1000)
    return f"test_{timestamp}@example.com"

def test_register_success():
    """Test 1: POST /api/auth/register - Success case"""
    email = generate_unique_email()
    payload = {
        "name": "Test User",
        "email": email,
        "password": "SecurePass123!"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=10)
        
        if response.status_code != 200:
            log_test("Register - Success", False, f"Expected 200, got {response.status_code}. Response: {response.text}")
            return None, None
        
        data = response.json()
        
        # Check response structure
        if "token" not in data or "user" not in data:
            log_test("Register - Success", False, f"Missing 'token' or 'user' in response: {data}")
            return None, None
        
        # Check user object doesn't contain password
        if "password" in data["user"]:
            log_test("Register - Success", False, "User object contains password field (security issue)")
            return None, None
        
        # Check user has expected fields
        user = data["user"]
        if user.get("email") != email.lower() or user.get("name") != payload["name"]:
            log_test("Register - Success", False, f"User data mismatch: {user}")
            return None, None
        
        log_test("Register - Success", True, f"User registered with email: {email}")
        return data["token"], email
        
    except Exception as e:
        log_test("Register - Success", False, f"Exception: {str(e)}")
        return None, None

def test_register_duplicate(email: str):
    """Test 2: POST /api/auth/register - Duplicate email returns 400"""
    payload = {
        "name": "Duplicate User",
        "email": email,
        "password": "AnotherPass123!"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=10)
        
        if response.status_code != 400:
            log_test("Register - Duplicate Email", False, f"Expected 400, got {response.status_code}. Response: {response.text}")
            return
        
        data = response.json()
        detail = data.get("detail", "")
        
        # Check for Indonesian error message
        if "sudah terdaftar" not in detail.lower() and "already registered" not in detail.lower():
            log_test("Register - Duplicate Email", False, f"Expected 'sudah terdaftar' or 'already registered' in error, got: {detail}")
            return
        
        log_test("Register - Duplicate Email", True, f"Correctly rejected duplicate email with 400")
        
    except Exception as e:
        log_test("Register - Duplicate Email", False, f"Exception: {str(e)}")

def test_login_success(email: str, password: str = "SecurePass123!"):
    """Test 3: POST /api/auth/login - Correct credentials"""
    payload = {
        "email": email,
        "password": password
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        
        if response.status_code != 200:
            log_test("Login - Correct Credentials", False, f"Expected 200, got {response.status_code}. Response: {response.text}")
            return None
        
        data = response.json()
        
        # Check response structure
        if "token" not in data or "user" not in data:
            log_test("Login - Correct Credentials", False, f"Missing 'token' or 'user' in response: {data}")
            return None
        
        # Check user object doesn't contain password
        if "password" in data["user"]:
            log_test("Login - Correct Credentials", False, "User object contains password field (security issue)")
            return None
        
        log_test("Login - Correct Credentials", True, f"Successfully logged in")
        return data["token"]
        
    except Exception as e:
        log_test("Login - Correct Credentials", False, f"Exception: {str(e)}")
        return None

def test_login_wrong_password(email: str):
    """Test 4: POST /api/auth/login - Wrong password returns 401"""
    payload = {
        "email": email,
        "password": "WrongPassword123!"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        
        if response.status_code != 401:
            log_test("Login - Wrong Password", False, f"Expected 401, got {response.status_code}. Response: {response.text}")
            return
        
        log_test("Login - Wrong Password", True, "Correctly rejected wrong password with 401")
        
    except Exception as e:
        log_test("Login - Wrong Password", False, f"Exception: {str(e)}")

def test_login_nonexistent_email():
    """Test 5: POST /api/auth/login - Non-existent email returns 401"""
    payload = {
        "email": "nonexistent_" + generate_unique_email(),
        "password": "SomePassword123!"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        
        if response.status_code != 401:
            log_test("Login - Non-existent Email", False, f"Expected 401, got {response.status_code}. Response: {response.text}")
            return
        
        log_test("Login - Non-existent Email", True, "Correctly rejected non-existent email with 401")
        
    except Exception as e:
        log_test("Login - Non-existent Email", False, f"Exception: {str(e)}")

def test_auth_me_valid_token(token: str):
    """Test 6: GET /api/auth/me - Valid token returns user"""
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("Auth Me - Valid Token", False, f"Expected 200, got {response.status_code}. Response: {response.text}")
            return
        
        data = response.json()
        
        # Check response structure
        if "user" not in data:
            log_test("Auth Me - Valid Token", False, f"Missing 'user' in response: {data}")
            return
        
        # Check user object doesn't contain password
        if "password" in data["user"]:
            log_test("Auth Me - Valid Token", False, "User object contains password field (security issue)")
            return
        
        log_test("Auth Me - Valid Token", True, "Successfully retrieved user data")
        
    except Exception as e:
        log_test("Auth Me - Valid Token", False, f"Exception: {str(e)}")

def test_auth_me_missing_token():
    """Test 7: GET /api/auth/me - Missing token returns 401/403"""
    try:
        response = requests.get(f"{BASE_URL}/auth/me", timeout=10)
        
        if response.status_code not in [401, 403]:
            log_test("Auth Me - Missing Token", False, f"Expected 401 or 403, got {response.status_code}. Response: {response.text}")
            return
        
        log_test("Auth Me - Missing Token", True, f"Correctly rejected missing token with {response.status_code}")
        
    except Exception as e:
        log_test("Auth Me - Missing Token", False, f"Exception: {str(e)}")

def test_auth_me_invalid_token():
    """Test 8: GET /api/auth/me - Invalid token returns 401/403"""
    headers = {
        "Authorization": "Bearer invalid_token_12345"
    }
    
    try:
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        
        if response.status_code not in [401, 403]:
            log_test("Auth Me - Invalid Token", False, f"Expected 401 or 403, got {response.status_code}. Response: {response.text}")
            return
        
        log_test("Auth Me - Invalid Token", True, f"Correctly rejected invalid token with {response.status_code}")
        
    except Exception as e:
        log_test("Auth Me - Invalid Token", False, f"Exception: {str(e)}")

def test_update_child_data_success(token: str):
    """Test 9: PUT /api/users/child-data - Success with valid token"""
    headers = {
        "Authorization": f"Bearer {token}"
    }
    payload = {
        "fullName": "Anak Test",
        "nickname": "Testy",
        "age": 8,
        "gender": "Laki-laki",
        "school": "SD Test",
        "grade": "3",
        "parentName": "Orang Tua Test",
        "parentContact": "081234567890"
    }
    
    try:
        response = requests.put(f"{BASE_URL}/users/child-data", json=payload, headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("Update Child Data - Success", False, f"Expected 200, got {response.status_code}. Response: {response.text}")
            return
        
        data = response.json()
        
        # Check response structure
        if "user" not in data:
            log_test("Update Child Data - Success", False, f"Missing 'user' in response: {data}")
            return
        
        user = data["user"]
        
        # Check user.child contains the sent fields
        if "child" not in user:
            log_test("Update Child Data - Success", False, f"Missing 'child' in user: {user}")
            return
        
        child = user["child"]
        for key, value in payload.items():
            if child.get(key) != value:
                log_test("Update Child Data - Success", False, f"Child data mismatch. Expected {key}={value}, got {child.get(key)}")
                return
        
        log_test("Update Child Data - Success", True, "Child data updated successfully")
        
    except Exception as e:
        log_test("Update Child Data - Success", False, f"Exception: {str(e)}")

def test_update_child_data_no_token():
    """Test 10: PUT /api/users/child-data - No token returns 401/403"""
    payload = {
        "fullName": "Should Fail",
        "age": 10
    }
    
    try:
        response = requests.put(f"{BASE_URL}/users/child-data", json=payload, timeout=10)
        
        if response.status_code not in [401, 403]:
            log_test("Update Child Data - No Token", False, f"Expected 401 or 403, got {response.status_code}. Response: {response.text}")
            return
        
        log_test("Update Child Data - No Token", True, f"Correctly rejected request without token with {response.status_code}")
        
    except Exception as e:
        log_test("Update Child Data - No Token", False, f"Exception: {str(e)}")

def test_update_autism_test_done_true(token: str):
    """Test 11: PUT /api/users/autism-test - done: true with diagnosis"""
    headers = {
        "Authorization": f"Bearer {token}"
    }
    payload = {
        "done": True,
        "diagnosis": "ASD Level 1",
        "method": "diagnosa"
    }
    
    try:
        response = requests.put(f"{BASE_URL}/users/autism-test", json=payload, headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("Update Autism Test - Done True", False, f"Expected 200, got {response.status_code}. Response: {response.text}")
            return
        
        data = response.json()
        
        # Check response structure
        if "user" not in data:
            log_test("Update Autism Test - Done True", False, f"Missing 'user' in response: {data}")
            return
        
        user = data["user"]
        
        # Check user.autismTest matches
        if "autismTest" not in user:
            log_test("Update Autism Test - Done True", False, f"Missing 'autismTest' in user: {user}")
            return
        
        autism_test = user["autismTest"]
        if autism_test.get("done") != True or autism_test.get("diagnosis") != "ASD Level 1" or autism_test.get("method") != "diagnosa":
            log_test("Update Autism Test - Done True", False, f"Autism test data mismatch: {autism_test}")
            return
        
        log_test("Update Autism Test - Done True", True, "Autism test updated successfully with done=true")
        
    except Exception as e:
        log_test("Update Autism Test - Done True", False, f"Exception: {str(e)}")

def test_update_autism_test_done_false(token: str):
    """Test 12: PUT /api/users/autism-test - done: false"""
    headers = {
        "Authorization": f"Bearer {token}"
    }
    payload = {
        "done": False
    }
    
    try:
        response = requests.put(f"{BASE_URL}/users/autism-test", json=payload, headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("Update Autism Test - Done False", False, f"Expected 200, got {response.status_code}. Response: {response.text}")
            return
        
        data = response.json()
        
        # Check response structure
        if "user" not in data:
            log_test("Update Autism Test - Done False", False, f"Missing 'user' in response: {data}")
            return
        
        user = data["user"]
        
        # Check user.autismTest matches
        if "autismTest" not in user:
            log_test("Update Autism Test - Done False", False, f"Missing 'autismTest' in user: {user}")
            return
        
        autism_test = user["autismTest"]
        if autism_test.get("done") != False:
            log_test("Update Autism Test - Done False", False, f"Expected done=false, got: {autism_test}")
            return
        
        log_test("Update Autism Test - Done False", True, "Autism test updated successfully with done=false")
        
    except Exception as e:
        log_test("Update Autism Test - Done False", False, f"Exception: {str(e)}")

def test_update_autism_test_no_token():
    """Test 13: PUT /api/users/autism-test - No token returns 401/403"""
    payload = {
        "done": True,
        "diagnosis": "Should Fail"
    }
    
    try:
        response = requests.put(f"{BASE_URL}/users/autism-test", json=payload, timeout=10)
        
        if response.status_code not in [401, 403]:
            log_test("Update Autism Test - No Token", False, f"Expected 401 or 403, got {response.status_code}. Response: {response.text}")
            return
        
        log_test("Update Autism Test - No Token", True, f"Correctly rejected request without token with {response.status_code}")
        
    except Exception as e:
        log_test("Update Autism Test - No Token", False, f"Exception: {str(e)}")

def print_summary():
    """Print test summary"""
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"Total Tests: {test_results['total']}")
    print(f"Passed: {len(test_results['passed'])} ✅")
    print(f"Failed: {len(test_results['failed'])} ❌")
    print()
    
    if test_results['failed']:
        print("Failed Tests:")
        for test in test_results['failed']:
            print(f"  ❌ {test}")
        print()
    
    if test_results['passed']:
        print("Passed Tests:")
        for test in test_results['passed']:
            print(f"  ✅ {test}")
    
    print("="*70)
    
    return len(test_results['failed']) == 0

def main():
    """Run all tests"""
    print("="*70)
    print("AutiGaze Backend API Tests - JWT Authentication")
    print("="*70)
    print(f"Base URL: {BASE_URL}")
    print("="*70)
    print()
    
    # Test 1: Register success
    token, email = test_register_success()
    if not token or not email:
        print("⚠️  Cannot continue tests without successful registration")
        print_summary()
        return 1
    
    # Test 2: Register duplicate
    test_register_duplicate(email)
    
    # Test 3: Login success
    login_token = test_login_success(email)
    if not login_token:
        print("⚠️  Login failed, using registration token for remaining tests")
        login_token = token
    
    # Test 4: Login wrong password
    test_login_wrong_password(email)
    
    # Test 5: Login non-existent email
    test_login_nonexistent_email()
    
    # Test 6: Auth me with valid token
    test_auth_me_valid_token(login_token)
    
    # Test 7: Auth me without token
    test_auth_me_missing_token()
    
    # Test 8: Auth me with invalid token
    test_auth_me_invalid_token()
    
    # Test 9: Update child data success
    test_update_child_data_success(login_token)
    
    # Test 10: Update child data without token
    test_update_child_data_no_token()
    
    # Test 11: Update autism test (done: true)
    test_update_autism_test_done_true(login_token)
    
    # Test 12: Update autism test (done: false)
    test_update_autism_test_done_false(login_token)
    
    # Test 13: Update autism test without token
    test_update_autism_test_no_token()
    
    # Print summary
    all_passed = print_summary()
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
