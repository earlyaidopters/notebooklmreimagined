#!/usr/bin/env python3
"""
Test script for provider endpoint authentication.

This script tests the authentication behavior of provider endpoints:
- GET /api/v1/providers - List providers (public + auth)
- GET /api/v1/providers/config - Get configuration (limited for public, full for auth)
- GET /api/v1/providers/models - List OpenRouter models (preview for public, full for auth)
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Dict, Any, Optional

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from fastapi.testclient import TestClient
    from app.main import app
    from app.config import get_settings
    from app.services.auth import get_optional_user
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("⚠️  Some dependencies may be missing. Install with: pip install fastapi httpx pydantic-settings")
    sys.exit(1)


class TestResults:
    """Track test results"""
    def __init__(self):
        self.results = []
        self.passed = 0
        self.failed = 0
        self.warnings = []

    def add(self, test_name: str, passed: bool, details: str = "", response: Any = None):
        self.results.append({
            "test": test_name,
            "status": "✅ PASS" if passed else "❌ FAIL",
            "details": details,
            "response": response
        })
        if passed:
            self.passed += 1
        else:
            self.failed += 1

    def add_warning(self, warning: str):
        self.warnings.append(warning)

    def print_summary(self):
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        for result in self.results:
            print(f"\n{result['status']} - {result['test']}")
            if result['details']:
                print(f"  Details: {result['details']}")
            if result['response'] and isinstance(result['response'], dict):
                print(f"  Response: {json.dumps(result['response'], indent=2)[:300]}...")

        if self.warnings:
            print("\n⚠️  WARNINGS:")
            for warning in self.warnings:
                print(f"  - {warning}")

        print("\n" + "-"*80)
        print(f"Total: {self.passed + self.failed} | Passed: {self.passed} | Failed: {self.failed}")
        print("="*80)

        return self.failed == 0


def mock_get_optional_user_authenticated():
    """Mock that returns an authenticated user"""
    return {
        "id": "test-user-123",
        "email": "test@example.com",
        "auth_method": "jwt"
    }


def mock_get_optional_user_api_key():
    """Mock that returns an API key authenticated user"""
    return {
        "id": "api-key-user-456",
        "email": None,
        "auth_method": "api_key",
        "api_key_id": "key_123",
        "api_key_scopes": ["read", "write"]
    }


async def test_list_providers_unauthenticated(results: TestResults):
    """Test GET /providers without authentication"""
    print("\n🔍 Test 1: List Providers (Unauthenticated)")
    print("-" * 80)

    try:
        # Override the dependency to return None
        async def override_get_optional_user():
            return None

        app.dependency_overrides[get_optional_user] = override_get_optional_user
        client = TestClient(app)

        try:
            response = client.get("/api/v1/providers")
        finally:
            # Clean up override
            app.dependency_overrides = {}

        if response.status_code != 200:
            results.add(
                "List Providers (Unauthenticated) - Status Code",
                False,
                f"Expected 200, got {response.status_code}",
                {"status_code": response.status_code, "body": response.text}
            )
            print(f"  ❌ Status code: {response.status_code}")
            return

        data = response.json()

        # Verify structure
        has_providers = "providers" in data
        has_authenticated = "authenticated" in data
        is_authenticated_false = data.get("authenticated") == False
        has_no_user_id = "user_id" not in data

        # Check that default_provider is set (generic value for unauth)
        has_default_provider = "default_provider" in data
        has_default_model = "default_model" in data

        passed = (
            has_providers and
            has_authenticated and
            is_authenticated_false and
            has_no_user_id and
            has_default_provider and
            has_default_model
        )

        details = f"authenticated={data.get('authenticated')}, default_provider={data.get('default_provider')}"
        results.add(
            "List Providers (Unauthenticated)",
            passed,
            details,
            {"authenticated": data.get("authenticated"), "data": data}
        )

        print(f"  ✅ Status code: {response.status_code}")
        print(f"  ✅ Authenticated: {data.get('authenticated')}")
        print(f"  ✅ Providers count: {len(data.get('providers', []))}")
        print(f"  ✅ Default provider: {data.get('default_provider')}")

        return data
    except Exception as e:
        results.add("List Providers (Unauthenticated)", False, str(e))
        print(f"  ❌ Error: {e}")
        return None


async def test_list_providers_authenticated_jwt(results: TestResults):
    """Test GET /providers with JWT authentication"""
    print("\n🔍 Test 2: List Providers (Authenticated - JWT)")
    print("-" * 80)

    try:
        # Mock user
        mock_user = mock_get_optional_user_authenticated()

        # Override the dependency to return authenticated user
        async def override_get_optional_user():
            return mock_user

        app.dependency_overrides[get_optional_user] = override_get_optional_user
        client = TestClient(app)

        try:
            response = client.get("/api/v1/providers")
        finally:
            # Clean up override
            app.dependency_overrides = {}

        if response.status_code != 200:
            results.add(
                "List Providers (JWT Auth) - Status Code",
                False,
                f"Expected 200, got {response.status_code}",
                {"status_code": response.status_code, "body": response.text}
            )
            print(f"  ❌ Status code: {response.status_code}")
            return

        data = response.json()

        # Verify structure
        has_providers = "providers" in data
        has_authenticated = "authenticated" in data
        is_authenticated_true = data.get("authenticated") == True
        has_user_id = "user_id" in data
        correct_user_id = data.get("user_id") == "test-user-123"
        has_default_provider = "default_provider" in data

        passed = (
            has_providers and
            has_authenticated and
            is_authenticated_true and
            has_user_id and
            correct_user_id and
            has_default_provider
        )

        details = f"authenticated={data.get('authenticated')}, user_id={data.get('user_id')}"
        results.add(
            "List Providers (JWT Auth)",
            passed,
            details,
            data
        )

        print(f"  ✅ Status code: {response.status_code}")
        print(f"  ✅ Authenticated: {data.get('authenticated')}")
        print(f"  ✅ User ID: {data.get('user_id')}")
        print(f"  ✅ Default provider: {data.get('default_provider')}")

        return data
    except Exception as e:
        results.add("List Providers (JWT Auth)", False, str(e))
        print(f"  ❌ Error: {e}")
        return None


async def test_list_providers_authenticated_api_key(results: TestResults):
    """Test GET /providers with API key authentication"""
    print("\n🔍 Test 3: List Providers (Authenticated - API Key)")
    print("-" * 80)

    try:
        # Mock API key user
        mock_user = mock_get_optional_user_api_key()

        async def override_get_optional_user():
            return mock_user

        app.dependency_overrides[get_optional_user] = override_get_optional_user
        client = TestClient(app)

        try:
            response = client.get("/api/v1/providers")
        finally:
            # Clean up override
            app.dependency_overrides = {}

        if response.status_code != 200:
            results.add(
                "List Providers (API Key Auth) - Status Code",
                False,
                f"Expected 200, got {response.status_code}"
            )
            print(f"  ❌ Status code: {response.status_code}")
            return

        data = response.json()

        # Verify API key user structure
        is_authenticated = data.get("authenticated") == True
        has_user_id = data.get("user_id") == "api-key-user-456"

        passed = is_authenticated and has_user_id

        details = f"authenticated={data.get('authenticated')}, user_id={data.get('user_id')}"
        results.add(
            "List Providers (API Key Auth)",
            passed,
            details,
            data
        )

        print(f"  ✅ Status code: {response.status_code}")
        print(f"  ✅ Authenticated: {data.get('authenticated')}")
        print(f"  ✅ User ID: {data.get('user_id')}")

        return data
    except Exception as e:
        results.add("List Providers (API Key Auth)", False, str(e))
        print(f"  ❌ Error: {e}")
        return None


async def test_provider_config_unauthenticated(results: TestResults):
    """Test GET /providers/config without authentication"""
    print("\n🔍 Test 4: Provider Config (Unauthenticated)")
    print("-" * 80)

    try:
        async def override_get_optional_user():
            return None

        app.dependency_overrides[get_optional_user] = override_get_optional_user
        client = TestClient(app)

        try:
            response = client.get("/api/v1/providers/config")
        finally:
            # Clean up override
            app.dependency_overrides = {}

        if response.status_code != 200:
            results.add(
                "Provider Config (Unauthenticated) - Status Code",
                False,
                f"Expected 200, got {response.status_code}"
            )
            print(f"  ❌ Status code: {response.status_code}")
            return

        data = response.json()

        # Unauthenticated users get limited info
        has_authenticated = data.get("authenticated") == False
        has_google_configured = "google_configured" in data
        has_openrouter_configured = "openrouter_configured" in data
        has_no_user_id = "user_id" not in data

        # Default values should be generic, not actual settings
        has_default_provider = "default_provider" in data

        passed = (
            has_authenticated and
            has_google_configured and
            has_openrouter_configured and
            has_no_user_id and
            has_default_provider
        )

        details = f"authenticated={data.get('authenticated')}, providers configured shown"
        results.add(
            "Provider Config (Unauthenticated)",
            passed,
            details,
            data
        )

        print(f"  ✅ Status code: {response.status_code}")
        print(f"  ✅ Authenticated: {data.get('authenticated')}")
        print(f"  ✅ Google configured: {data.get('google_configured')}")
        print(f"  ✅ OpenRouter configured: {data.get('openrouter_configured')}")

        return data
    except Exception as e:
        results.add("Provider Config (Unauthenticated)", False, str(e))
        print(f"  ❌ Error: {e}")
        return None


async def test_provider_config_authenticated(results: TestResults):
    """Test GET /providers/config with authentication"""
    print("\n🔍 Test 5: Provider Config (Authenticated)")
    print("-" * 80)

    try:
        mock_user = mock_get_optional_user_authenticated()

        async def override_get_optional_user():
            return mock_user

        app.dependency_overrides[get_optional_user] = override_get_optional_user
        client = TestClient(app)

        try:
            response = client.get("/api/v1/providers/config")
        finally:
            # Clean up override
            app.dependency_overrides = {}

        if response.status_code != 200:
            results.add(
                "Provider Config (Authenticated) - Status Code",
                False,
                f"Expected 200, got {response.status_code}"
            )
            print(f"  ❌ Status code: {response.status_code}")
            return

        data = response.json()

        # Authenticated users get full config
        has_authenticated = data.get("authenticated") == True
        has_user_id = "user_id" in data
        has_default_provider = "default_provider" in data
        has_openrouter_default_model = "openrouter_default_model" in data
        has_openrouter_provider = "openrouter_provider" in data

        passed = (
            has_authenticated and
            has_user_id and
            has_default_provider and
            has_openrouter_default_model and
            has_openrouter_provider
        )

        details = f"authenticated={data.get('authenticated')}, full config shown"
        results.add(
            "Provider Config (Authenticated)",
            passed,
            details,
            data
        )

        print(f"  ✅ Status code: {response.status_code}")
        print(f"  ✅ Authenticated: {data.get('authenticated')}")
        print(f"  ✅ User ID: {data.get('user_id')}")
        print(f"  ✅ Default provider: {data.get('default_provider')}")
        print(f"  ✅ OpenRouter default model: {data.get('openrouter_default_model')}")

        return data
    except Exception as e:
        results.add("Provider Config (Authenticated)", False, str(e))
        print(f"  ❌ Error: {e}")
        return None


async def test_providers_models_unauthenticated(results: TestResults):
    """Test GET /providers/models without authentication (limited preview)"""
    print("\n🔍 Test 6: Providers Models (Unauthenticated - Preview)")
    print("-" * 80)

    try:
        async def override_get_optional_user():
            return None

        app.dependency_overrides[get_optional_user] = override_get_optional_user
        client = TestClient(app)

        try:
            response = client.get("/api/v1/providers/models")
        finally:
            # Clean up override
            app.dependency_overrides = {}

        # If OpenRouter not configured, skip
        if response.status_code == 503:
            results.add_warning("OpenRouter not configured - skipping models test")
            print(f"  ⚠️  OpenRouter not configured")
            return None

        if response.status_code != 200:
            results.add(
                "Providers Models (Unauthenticated) - Status Code",
                False,
                f"Expected 200, got {response.status_code}"
            )
            print(f"  ❌ Status code: {response.status_code}")
            return

        data = response.json()

        # Unauthenticated users get preview with pagination
        has_authenticated = data.get("authenticated") == False
        has_preview = data.get("preview") == True
        has_message = "message" in data
        has_items = "items" in data  # Changed from "models" to "items" for pagination
        has_total = "total" in data
        has_page = "page" in data
        has_page_size = "page_size" in data
        has_total_pages = "total_pages" in data

        # Should have limited models (10 or less)
        model_count = len(data.get("items", []))
        is_limited = model_count <= 10
        page_is_1 = data.get("page") == 1

        passed = (
            has_authenticated and
            has_preview and
            has_message and
            has_items and
            has_total and
            has_page and
            has_page_size and
            has_total_pages and
            is_limited and
            page_is_1
        )

        details = f"authenticated={data.get('authenticated')}, preview={data.get('preview')}, items={model_count}, total_pages={data.get('total_pages')}"
        results.add(
            "Providers Models (Unauthenticated)",
            passed,
            details,
            data
        )

        print(f"  ✅ Status code: {response.status_code}")
        print(f"  ✅ Authenticated: {data.get('authenticated')}")
        print(f"  ✅ Preview mode: {data.get('preview')}")
        print(f"  ✅ Items returned: {model_count} (limited preview)")
        print(f"  ✅ Total available: {data.get('total')}")
        print(f"  ✅ Page: {data.get('page')}/{data.get('total_pages')}")

        return data
    except Exception as e:
        results.add("Providers Models (Unauthenticated)", False, str(e))
        print(f"  ❌ Error: {e}")
        return None


async def test_providers_models_authenticated(results: TestResults):
    """Test GET /providers/models with authentication (paginated list)"""
    print("\n🔍 Test 7: Providers Models (Authenticated - Paginated)")
    print("-" * 80)

    try:
        mock_user = mock_get_optional_user_authenticated()

        async def override_get_optional_user():
            return mock_user

        app.dependency_overrides[get_optional_user] = override_get_optional_user
        client = TestClient(app)

        try:
            # Test default pagination (page 1)
            response = client.get("/api/v1/providers/models")
        finally:
            # Clean up override
            app.dependency_overrides = {}

        # If OpenRouter not configured, skip
        if response.status_code == 503:
            results.add_warning("OpenRouter not configured - skipping models test")
            print(f"  ⚠️  OpenRouter not configured")
            return None

        if response.status_code != 200:
            results.add(
                "Providers Models (Authenticated) - Status Code",
                False,
                f"Expected 200, got {response.status_code}"
            )
            print(f"  ❌ Status code: {response.status_code}")
            return

        data = response.json()

        # Authenticated users get paginated list
        has_authenticated = data.get("authenticated") == True
        has_user_id = "user_id" in data
        has_items = "items" in data  # Changed from "models" to "items"
        has_total = "total" in data
        has_page = "page" in data
        has_page_size = "page_size" in data
        has_total_pages = "total_pages" in data
        has_preview_false = data.get("preview") == False

        # Check pagination values
        model_count = len(data.get("items", []))
        page = data.get("page")
        page_size = data.get("page_size")
        total_pages = data.get("total_pages")
        total = data.get("total")

        # Validate pagination logic
        is_valid_pagination = (
            page == 1 and  # First page
            page_size <= 100 and  # Max page size
            total_pages >= 1 and  # At least 1 page
            model_count <= page_size  # Items don't exceed page size
        )

        passed = (
            has_authenticated and
            has_user_id and
            has_items and
            has_total and
            has_page and
            has_page_size and
            has_total_pages and
            has_preview_false and
            is_valid_pagination
        )

        details = f"authenticated={data.get('authenticated')}, items={model_count}, page={page}/{total_pages}, total={total}"
        results.add(
            "Providers Models (Authenticated)",
            passed,
            details,
            {"authenticated": data.get("authenticated"), "items_count": model_count, "page": page, "total_pages": total_pages, "total": total}
        )

        print(f"  ✅ Status code: {response.status_code}")
        print(f"  ✅ Authenticated: {data.get('authenticated')}")
        print(f"  ✅ User ID: {data.get('user_id')}")
        print(f"  ✅ Items returned: {model_count} (page {page})")
        print(f"  ✅ Page size: {page_size}")
        print(f"  ✅ Total pages: {total_pages}")
        print(f"  ✅ Total models: {total}")

        return data
    except Exception as e:
        results.add("Providers Models (Authenticated)", False, str(e))
        print(f"  ❌ Error: {e}")
        return None


async def main():
    """Run all authentication tests"""
    print("="*80)
    print("Provider Endpoint Authentication Test Suite")
    print("="*80)

    results = TestResults()

    # Test 1: List providers (unauthenticated)
    await test_list_providers_unauthenticated(results)

    # Test 2: List providers (authenticated - JWT)
    await test_list_providers_authenticated_jwt(results)

    # Test 3: List providers (authenticated - API key)
    await test_list_providers_authenticated_api_key(results)

    # Test 4: Provider config (unauthenticated)
    await test_provider_config_unauthenticated(results)

    # Test 5: Provider config (authenticated)
    await test_provider_config_authenticated(results)

    # Test 6: Models list (unauthenticated - preview)
    await test_providers_models_unauthenticated(results)

    # Test 7: Models list (authenticated - full)
    await test_providers_models_authenticated(results)

    # Print summary
    success = results.print_summary()

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
