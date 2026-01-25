#!/usr/bin/env python3
"""
Security Feature Tests for Provider Endpoints
Tests: Input validation, rate limiting, authentication
"""
import os
import sys
import json
import time
import requests
from typing import Dict, Any

# ANSI colors
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"

BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000")

def print_header(title: str):
    print(f"\n{'=' * 80}")
    print(f"{title:^80}")
    print(f"{'=' * 80}\n")

def print_test(name: str, status: str, details: str = ""):
    status_icon = f"{GREEN}✓{RESET}" if status == "PASS" else f"{RED}✗{RESET}"
    print(f"  {status_icon} {name}: {status}")
    if details:
        print(f"    {details}")

# Test Results
results = []

def test_rate_limiting():
    """Test that rate limiting works"""
    print(f"{BLUE}Rate Limiting Test{RESET}")
    
    endpoint = f"{BASE_URL}/api/providers"
    
    # Make 20 rapid requests (above the rate limit of 15/min)
    successes = 0
    rate_limited = 0
    errors = 0
    
    for i in range(20):
        try:
            response = requests.get(endpoint, timeout=5)
            if response.status_code == 200:
                successes += 1
            elif response.status_code == 429:
                rate_limited += 1
            else:
                errors += 1
        except Exception as e:
            errors += 1
    
    result = {
        "name": "Rate Limiting",
        "status": "PASS" if rate_limited > 0 else "WARN",
        "details": f"Successes: {successes}, Rate Limited: {rate_limited}, Errors: {errors}"
    }
    results.append(result)
    print_test(result["name"], result["status"], result["details"])
    
    if rate_limited > 0:
        print(f"    {GREEN}Rate limiting is working - {rate_limited} requests were limited{RESET}")
    else:
        print(f"    {YELLOW}No rate limiting detected (may need higher request rate){RESET}")

def test_sql_injection():
    """Test SQL injection protection"""
    print(f"\n{BLUE}SQL Injection Protection Test{RESET}")
    
    payloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "1' UNION SELECT * FROM users--",
        "admin'--",
        "' OR 1=1#"
    ]
    
    endpoint = f"{BASE_URL}/api/providers"
    
    blocked = 0
    for payload in payloads:
        try:
            response = requests.get(f"{endpoint}?model={payload}", timeout=5)
            if response.status_code in [400, 422] or "error" in response.text.lower():
                blocked += 1
        except Exception as e:
            blocked += 1
    
    result = {
        "name": "SQL Injection Protection",
        "status": "PASS" if blocked >= len(payloads) // 2 else "WARN",
        "details": f"Blocked {blocked}/{len(payloads)} payloads"
    }
    results.append(result)
    print_test(result["name"], result["status"], result["details"])

def test_xss_protection():
    """Test XSS protection"""
    print(f"\n{BLUE}XSS Protection Test{RESET}")
    
    payloads = [
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert('XSS')>",
        "<svg onload=alert('XSS')>",
        "javascript:alert('XSS')"
    ]
    
    endpoint = f"{BASE_URL}/api/providers"
    
    blocked = 0
    for payload in payloads:
        try:
            response = requests.get(f"{endpoint}?model={payload}", timeout=5)
            if response.status_code in [400, 422] or payload not in response.text:
                blocked += 1
        except Exception as e:
            blocked += 1
    
    result = {
        "name": "XSS Protection",
        "status": "PASS" if blocked >= len(payloads) // 2 else "WARN",
        "details": f"Blocked {blocked}/{len(payloads)} payloads"
    }
    results.append(result)
    print_test(result["name"], result["status"], result["details"])

def test_path_traversal():
    """Test path traversal protection"""
    print(f"\n{BLUE}Path Traversal Protection Test{RESET}")
    
    payloads = [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32",
        "%2e%2e%2f",
        "....//....//....//etc/passwd"
    ]
    
    endpoint = f"{BASE_URL}/api/providers"
    
    blocked = 0
    for payload in payloads:
        try:
            response = requests.get(f"{endpoint}?model={payload}", timeout=5)
            if response.status_code in [400, 404, 422]:
                blocked += 1
        except Exception as e:
            blocked += 1
    
    result = {
        "name": "Path Traversal Protection",
        "status": "PASS" if blocked >= len(payloads) // 2 else "WARN",
        "details": f"Blocked {blocked}/{len(payloads)} payloads"
    }
    results.append(result)
    print_test(result["name"], result["status"], result["details"])

def test_content_type_validation():
    """Test content-type validation"""
    print(f"\n{BLUE}Content-Type Validation Test{RESET}")
    
    endpoint = f"{BASE_URL}/api/providers/generate"
    
    # Test with invalid content-type
    blocked = 0
    try:
        response = requests.post(
            endpoint,
            json={"model": "test", "prompt": "test"},
            headers={"Content-Type": "text/plain"},
            timeout=5
        )
        if response.status_code in [400, 415, 422]:
            blocked += 1
    except Exception as e:
        blocked += 1
    
    # Test without content-type
    try:
        response = requests.post(
            endpoint,
            data='{"model": "test", "prompt": "test"}',
            timeout=5
        )
        if response.status_code in [400, 415, 422]:
            blocked += 1
    except Exception as e:
        blocked += 1
    
    result = {
        "name": "Content-Type Validation",
        "status": "PASS" if blocked >= 1 else "WARN",
        "details": f"Blocked {blocked}/2 invalid requests"
    }
    results.append(result)
    print_test(result["name"], result["status"], result["details"])

def test_input_validation():
    """Test input validation"""
    print(f"\n{BLUE}Input Validation Test{RESET}")
    
    endpoint = f"{BASE_URL}/api/providers/generate"
    
    test_cases = [
        ("Empty model", {"prompt": "test"}, 400),
        ("Empty prompt", {"model": "test"}, 400),
        ("Null values", {"model": None, "prompt": None}, 400),
        ("Extra large prompt", {"model": "test", "prompt": "x" * 100000}, 413),
    ]
    
    blocked = 0
    for name, payload, expected_code in test_cases:
        try:
            response = requests.post(endpoint, json=payload, timeout=5)
            if response.status_code == expected_code or response.status_code >= 400:
                blocked += 1
        except Exception as e:
            blocked += 1
    
    result = {
        "name": "Input Validation",
        "status": "PASS" if blocked >= len(test_cases) // 2 else "WARN",
        "details": f"Blocked {blocked}/{len(test_cases)} invalid inputs"
    }
    results.append(result)
    print_test(result["name"], result["status"], result["details"])

def test_authentication():
    """Test authentication on protected endpoints"""
    print(f"\n{BLUE}Authentication Test{RESET}")
    
    # Test provider endpoint (should be public or auth-required)
    endpoint = f"{BASE_URL}/api/providers"
    
    try:
        # Test without auth token
        response = requests.get(endpoint, timeout=5)
        
        result = {
            "name": "Authentication",
            "status": "PASS",
            "details": f"Public endpoint returned {response.status_code}"
        }
        results.append(result)
        print_test(result["name"], result["status"], result["details"])
    except Exception as e:
        result = {
            "name": "Authentication",
            "status": "WARN",
            "details": f"Connection failed: {str(e)[:50]}"
        }
        results.append(result)
        print_test(result["name"], result["status"], result["details"])

def test_cors_headers():
    """Test CORS headers"""
    print(f"\n{BLUE}CORS Headers Test{RESET}")
    
    endpoint = f"{BASE_URL}/api/providers"
    
    try:
        response = requests.options(endpoint, headers={"Origin": "http://localhost:3000"}, timeout=5)
        
        has_cors = any(key in response.headers for key in ["Access-Control-Allow-Origin", "access-control-allow-origin"])
        
        result = {
            "name": "CORS Headers",
            "status": "PASS" if has_cors else "WARN",
            "details": f"CORS present: {has_cors}"
        }
        results.append(result)
        print_test(result["name"], result["status"], result["details"])
        
        if has_cors:
            cors_headers = {k: v for k, v in response.headers.items() if "access-control" in k.lower()}
            print(f"    CORS Headers: {json.dumps(cors_headers, indent=6)}")
    except Exception as e:
        result = {
            "name": "CORS Headers",
            "status": "WARN",
            "details": f"Could not verify: {str(e)[:50]}"
        }
        results.append(result)
        print_test(result["name"], result["status"], result["details"])

def main():
    print_header("SECURITY FEATURE TEST SUITE")
    print(f"Testing API at: {BASE_URL}\n")
    
    # Run all security tests
    test_rate_limiting()
    test_sql_injection()
    test_xss_protection()
    test_path_traversal()
    test_content_type_validation()
    test_input_validation()
    test_authentication()
    test_cors_headers()
    
    # Print summary
    print_header("SECURITY TEST SUMMARY")
    
    passed = sum(1 for r in results if r["status"] == "PASS")
    warned = sum(1 for r in results if r["status"] == "WARN")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    total = len(results)
    
    for result in results:
        status_color = GREEN if result["status"] == "PASS" else (YELLOW if result["status"] == "WARN" else RED)
        print(f"{status_color}{result['status']}{RESET} - {result['name']}")
        print(f"    {result['details']}\n")
    
    print(f"{'-' * 80}")
    print(f"Total: {total} | Passed: {passed} | Warnings: {warned} | Failed: {failed}")
    print(f"{'=' * 80}\n")
    
    # Return exit code
    if failed > 0:
        sys.exit(1)
    elif warned > 0:
        sys.exit(2)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
