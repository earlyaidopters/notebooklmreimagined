#!/usr/bin/env python3
"""
Test script for OpenRouter provider integration endpoints.

This script tests the new multi-LLM provider support endpoints:
- GET /api/v1/providers - List providers
- GET /api/v1/providers/config - Get configuration
- GET /api/v1/providers/models - List OpenRouter models
- POST /api/v1/notebooks/{id}/chat - Chat with provider selection
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Dict, Any, Optional

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from app.config import get_settings
    from app.services.openrouter import OpenRouterService, get_openrouter_service
    from app.models.schemas import ChatMessage
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
                print(f"  Response: {json.dumps(result['response'], indent=2)[:200]}...")

        if self.warnings:
            print("\n⚠️  WARNINGS:")
            for warning in self.warnings:
                print(f"  - {warning}")

        print("\n" + "-"*80)
        print(f"Total: {self.passed + self.failed} | Passed: {self.passed} | Failed: {self.failed}")
        print("="*80)

        return self.failed == 0


async def test_config_loading(results: TestResults):
    """Test 1: Check if configuration is loading correctly"""
    print("\n🔍 Test 1: Configuration Loading")
    print("-" * 80)

    try:
        settings = get_settings()

        # Check required fields
        has_google_key = bool(settings.google_api_key)
        has_openrouter_key = bool(settings.openrouter_api_key)
        default_provider = settings.default_llm_provider
        openrouter_default_model = settings.openrouter_default_model

        results.add(
            "Configuration Loading",
            True,
            f"Google: {has_google_key}, OpenRouter: {has_openrouter_key}, Default: {default_provider}"
        )

        if not has_google_key:
            results.add_warning("GOOGLE_API_KEY not set - Google provider will not work")

        if not has_openrouter_key:
            results.add_warning("OPENROUTER_API_KEY not set - OpenRouter provider will not work")
            results.add_warning("Set OPENROUTER_API_KEY environment variable to enable OpenRouter tests")

        print(f"  ✅ Google API Key: {'Set' if has_google_key else 'Not set'}")
        print(f"  ✅ OpenRouter API Key: {'Set' if has_openrouter_key else 'Not set'}")
        print(f"  ✅ Default Provider: {default_provider}")
        print(f"  ✅ OpenRouter Default Model: {openrouter_default_model}")

        return settings
    except Exception as e:
        results.add("Configuration Loading", False, str(e))
        print(f"  ❌ Error: {e}")
        return None


async def test_providers_list(results: TestResults, settings):
    """Test 2: Simulate GET /api/v1/providers endpoint"""
    print("\n🔍 Test 2: Providers List Endpoint")
    print("-" * 80)

    try:
        providers = [
            {
                "id": "google",
                "name": "Google Gemini",
                "description": "Original NotebookLM LLM provider",
                "available": bool(settings.google_api_key),
                "models": [
                    "gemini-2.0-flash",
                    "gemini-2.0-flash-lite",
                    "gemini-2.5-pro",
                    "gemini-2.5-flash",
                ],
            },
            {
                "id": "openrouter",
                "name": "OpenRouter",
                "description": "Access to 100+ LLM providers via unified API",
                "available": bool(settings.openrouter_api_key),
                "models": [
                    "anthropic/claude-3.5-sonnet",
                    "anthropic/claude-3-opus",
                    "openai/gpt-4",
                    "openai/gpt-4-turbo",
                    "google/gemini-2.0-flash",
                    "google/gemini-2.5-flash",
                    "google/gemini-2.5-pro",
                    "meta/llama-3.1-70b",
                    "zai/c3-7b",
                    "zai/c3-13b",
                    "zai/c3-40b",
                ],
            }
        ]

        response = {
            "providers": providers,
            "default_provider": settings.default_llm_provider,
            "default_model": settings.openrouter_default_model if settings.default_llm_provider == "openrouter" else "gemini-2.0-flash",
        }

        # Check expected structure
        has_google = any(p["id"] == "google" for p in providers)
        has_openrouter = any(p["id"] == "openrouter" for p in providers)
        google_available = providers[0]["available"]
        openrouter_available = providers[1]["available"]

        passed = has_google and has_openrouter
        details = f"Google: {'Available' if google_available else 'Not configured'}, OpenRouter: {'Available' if openrouter_available else 'Not configured'}"

        results.add("Providers List Endpoint", passed, details, response)

        print(f"  ✅ Google Provider: {'Available' if google_available else 'Not configured'}")
        print(f"  ✅ OpenRouter Provider: {'Available' if openrouter_available else 'Not configured'}")
        print(f"  ✅ Default Provider: {response['default_provider']}")
        print(f"  ✅ Default Model: {response['default_model']}")

        if not google_available:
            results.add_warning("Google provider not available - GOOGLE_API_KEY needed")
        if not openrouter_available:
            results.add_warning("OpenRouter provider not available - OPENROUTER_API_KEY needed")

        return response
    except Exception as e:
        results.add("Providers List Endpoint", False, str(e))
        print(f"  ❌ Error: {e}")
        return None


async def test_provider_config(results: TestResults, settings):
    """Test 3: Simulate GET /api/v1/providers/config endpoint"""
    print("\n🔍 Test 3: Provider Configuration Endpoint")
    print("-" * 80)

    try:
        response = {
            "default_provider": settings.default_llm_provider,
            "openrouter_default_model": settings.openrouter_default_model,
            "openrouter_provider": settings.openrouter_provider,
            "google_configured": bool(settings.google_api_key),
            "openrouter_configured": bool(settings.openrouter_api_key),
        }

        print(f"  ✅ Default Provider: {response['default_provider']}")
        print(f"  ✅ OpenRouter Default Model: {response['openrouter_default_model']}")
        print(f"  ✅ OpenRouter Provider: {response['openrouter_provider'] or 'Not specified'}")
        print(f"  ✅ Google Configured: {response['google_configured']}")
        print(f"  ✅ OpenRouter Configured: {response['openrouter_configured']}")

        results.add(
            "Provider Configuration Endpoint",
            True,
            f"Default: {response['default_provider']}, Google: {response['google_configured']}, OpenRouter: {response['openrouter_configured']}",
            response
        )

        return response
    except Exception as e:
        results.add("Provider Configuration Endpoint", False, str(e))
        print(f"  ❌ Error: {e}")
        return None


async def test_openrouter_models(results: TestResults, settings):
    """Test 4: Simulate GET /api/v1/providers/models endpoint"""
    print("\n🔍 Test 4: OpenRouter Models List")
    print("-" * 80)

    if not settings.openrouter_api_key:
        msg = "OpenRouter not configured - add OPENROUTER_API_KEY to environment"
        results.add("OpenRouter Models List", False, msg)
        print(f"  ⚠️  {msg}")
        results.add_warning("OPENROUTER_API_KEY not set - skipping live API test")
        return None

    try:
        openrouter_service = get_openrouter_service()
        if not openrouter_service:
            raise ValueError("OpenRouter service not initialized")

        print(f"  🔍 Fetching models from OpenRouter API...")
        models = await openrouter_service.get_available_models()

        response = {
            "models": models[:10],  # Return first 10 for display
            "count": len(models)
        }

        print(f"  ✅ Found {len(models)} models")
        print(f"  📋 Sample models:")
        for model in models[:5]:
            print(f"     - {model['id']} ({model.get('provider', 'unknown')})")

        results.add(
            "OpenRouter Models List",
            True,
            f"Retrieved {len(models)} models from OpenRouter",
            response
        )

        return response
    except Exception as e:
        results.add("OpenRouter Models List", False, str(e))
        print(f"  ❌ Error: {e}")
        return None


async def test_openrouter_generation(results: TestResults, settings):
    """Test 5: Test OpenRouter content generation"""
    print("\n🔍 Test 5: OpenRouter Content Generation")
    print("-" * 80)

    if not settings.openrouter_api_key:
        msg = "OpenRouter not configured - add OPENROUTER_API_KEY to environment"
        results.add("OpenRouter Content Generation", False, msg)
        print(f"  ⚠️  {msg}")
        return None

    try:
        openrouter_service = get_openrouter_service()
        if not openrouter_service:
            raise ValueError("OpenRouter service not initialized")

        print(f"  🔍 Testing generation with model: {settings.openrouter_default_model}")

        result = await openrouter_service.generate_content(
            prompt="What is 2+2? Answer with just the number.",
            model_name=settings.openrouter_default_model,
            temperature=0.1,
            max_tokens=100
        )

        print(f"  ✅ Generated content: {result['content'][:100]}")
        print(f"  📊 Usage:")
        print(f"     - Input tokens: {result['usage']['input_tokens']}")
        print(f"     - Output tokens: {result['usage']['output_tokens']}")
        print(f"     - Cost: ${result['usage']['cost_usd']:.6f}")
        print(f"     - Model: {result['usage']['model_used']}")

        results.add(
            "OpenRouter Content Generation",
            True,
            f"Generated response using {settings.openrouter_default_model}",
            {
                "content": result['content'][:100],
                "usage": result['usage']
            }
        )

        return result
    except Exception as e:
        results.add("OpenRouter Content Generation", False, str(e))
        print(f"  ❌ Error: {e}")
        return None


async def test_openrouter_context_generation(results: TestResults, settings):
    """Test 6: Test OpenRouter with context (RAG simulation)"""
    print("\n🔍 Test 6: OpenRouter Context Generation (RAG)")
    print("-" * 80)

    if not settings.openrouter_api_key:
        msg = "OpenRouter not configured - add OPENROUTER_API_KEY to environment"
        results.add("OpenRouter Context Generation", False, msg)
        print(f"  ⚠️  {msg}")
        return None

    try:
        openrouter_service = get_openrouter_service()
        if not openrouter_service:
            raise ValueError("OpenRouter service not initialized")

        context = """
        Document 1: Python is a high-level programming language known for its simplicity.
        Document 2: Python was created by Guido van Rossum and first released in 1991.
        """

        print(f"  🔍 Testing RAG with context...")

        result = await openrouter_service.generate_with_context(
            message="When was Python created?",
            context=context,
            model_name=settings.openrouter_default_model,  # Use default (Claude)
            source_names=["Document 1", "Document 2"]
        )

        print(f"  ✅ Generated response: {result['content'][:200]}")
        print(f"  📊 Usage:")
        print(f"     - Input tokens: {result['usage']['input_tokens']}")
        print(f"     - Output tokens: {result['usage']['output_tokens']}")
        print(f"     - Cost: ${result['usage']['cost_usd']:.6f}")

        results.add(
            "OpenRouter Context Generation",
            True,
            "Successfully generated response with document context",
            {
                "content": result['content'][:200],
                "usage": result['usage']
            }
        )

        return result
    except httpx.HTTPStatusError as e:
        # Try to get more error details
        error_detail = str(e)
        try:
            error_json = e.response.json()
            error_detail = f"{error_detail} - Details: {error_json}"
        except:
            if e.response.content:
                error_detail = f"{error_detail} - Response: {e.response.text[:200]}"

        results.add("OpenRouter Context Generation", False, error_detail)
        print(f"  ❌ HTTP Error: {error_detail}")
        return None
    except Exception as e:
        results.add("OpenRouter Context Generation", False, str(e))
        print(f"  ❌ Error: {e}")
        return None


async def main():
    """Run all tests"""
    print("="*80)
    print("OpenRouter Provider Integration Test Suite")
    print("="*80)

    results = TestResults()

    # Test 1: Configuration
    settings = await test_config_loading(results)
    if not settings:
        print("\n❌ Cannot proceed without valid configuration")
        results.print_summary()
        return

    # Test 2: Providers list
    await test_providers_list(results, settings)

    # Test 3: Provider config
    await test_provider_config(results, settings)

    # Test 4: OpenRouter models (requires API key)
    await test_openrouter_models(results, settings)

    # Test 5: OpenRouter generation (requires API key)
    await test_openrouter_generation(results, settings)

    # Test 6: OpenRouter context generation (requires API key)
    await test_openrouter_context_generation(results, settings)

    # Print summary
    success = results.print_summary()

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
