#!/usr/bin/env python3
"""
Security validation tests for OpenRouter provider integration.

This script tests the security fixes implemented:
1. Input validation (Pydantic schemas)
2. Model allowlist validation
3. Sanitized error messages (no variable names exposed)
4. .env file permissions (600)
"""

import asyncio
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from app.services.openrouter import OpenRouterService
    from app.models.schemas import ALLOWED_OPENROUTER_MODELS
except ImportError as e:
    print(f"Import error: {e}")
    sys.exit(1)


class SecurityTestResults:
    """Track security test results"""
    def __init__(self):
        self.results = []
        self.passed = 0
        self.failed = 0

    def add(self, test_name: str, passed: bool, details: str = ""):
        self.results.append({
            "test": test_name,
            "status": "PASS" if passed else "FAIL",
            "details": details
        })
        if passed:
            self.passed += 1
        else:
            self.failed += 1

    def print_summary(self):
        print("\n" + "="*80)
        print("SECURITY TEST SUMMARY")
        print("="*80)
        for result in self.results:
            print(f"\n{result['status']} - {result['test']}")
            if result['details']:
                print(f"  Details: {result['details']}")

        print("\n" + "-"*80)
        print(f"Total: {self.passed + self.failed} | Passed: {self.passed} | Failed: {self.failed}")
        print("="*80)
        return self.failed == 0


def test_env_permissions(results: SecurityTestResults):
    """Test 1: Verify .env file permissions are 600"""
    print("\n🔍 Test 1: .env File Permissions")
    print("-" * 80)

    env_path = Path(__file__).parent / ".env"

    if not env_path.exists():
        results.add(
            ".env File Permissions",
            False,
            ".env file not found"
        )
        print("  ❌ .env file not found")
        return

    # Get file permissions
    stat_info = os.stat(env_path)
    mode = oct(stat_info.st_mode)[-3:]

    # Check if permissions are 600 (rw-------)
    if mode == "600":
        results.add(
            ".env File Permissions",
            True,
            f"Permissions are {mode} (correct)"
        )
        print(f"  ✅ Permissions: {mode} (correct)")
    else:
        results.add(
            ".env File Permissions",
            False,
            f"Permissions are {mode} (should be 600)"
        )
        print(f"  ❌ Permissions: {mode} (should be 600)")


def test_model_allowlist(results: SecurityTestResults):
    """Test 2: Verify model allowlist is defined"""
    print("\n🔍 Test 2: Model Allowlist Defined")
    print("-" * 80)

    if ALLOWED_OPENROUTER_MODELS and len(ALLOWED_OPENROUTER_MODELS) > 0:
        results.add(
            "Model Allowlist Defined",
            True,
            f"{len(ALLOWED_OPENROUTER_MODELS)} models in allowlist"
        )
        print(f"  ✅ Allowlist defined with {len(ALLOWED_OPENROUTER_MODELS)} models")
        print(f"  📋 Models: {', '.join(list(ALLOWED_OPENROUTER_MODELS)[:5])}...")
    else:
        results.add(
            "Model Allowlist Defined",
            False,
            "Allowlist is empty or undefined"
        )
        print("  ❌ Allowlist is empty or undefined")


async def test_invalid_prompt_rejection(results: SecurityTestResults):
    """Test 3: Verify invalid prompt is rejected"""
    print("\n🔍 Test 3: Invalid Prompt Rejection")
    print("-" * 80)

    try:
        service = OpenRouterService()

        # Test with empty prompt (should fail min_length=1 validation)
        try:
            await service.generate_content(
                prompt="",
                model_name="anthropic/claude-3.5-sonnet"
            )
            results.add(
                "Invalid Prompt Rejection",
                False,
                "Empty prompt was not rejected"
            )
            print("  ❌ Empty prompt was NOT rejected (security issue)")
        except ValueError as e:
            error_msg = str(e)
            # Check that error message is sanitized (no variable names)
            if "prompt" in error_msg.lower() and "invalid" in error_msg.lower():
                results.add(
                    "Invalid Prompt Rejection",
                    True,
                    "Empty prompt rejected with sanitized error"
                )
                print(f"  ✅ Empty prompt rejected: {error_msg}")
            else:
                results.add(
                    "Invalid Prompt Rejection",
                    False,
                    f"Error message not sanitized: {error_msg}"
                )
                print(f"  ❌ Error message may not be sanitized: {error_msg}")
        except Exception as e:
            results.add(
                "Invalid Prompt Rejection",
                False,
                f"Unexpected error: {e}"
            )
            print(f"  ❌ Unexpected error: {e}")

    except Exception as e:
        results.add(
            "Invalid Prompt Rejection",
            False,
            f"Test setup failed: {e}"
        )
        print(f"  ❌ Test setup failed: {e}")


async def test_unauthorized_model_rejection(results: SecurityTestResults):
    """Test 4: Verify unauthorized model is rejected"""
    print("\n🔍 Test 4: Unauthorized Model Rejection")
    print("-" * 80)

    try:
        service = OpenRouterService()

        # Test with unauthorized model
        try:
            await service.generate_content(
                prompt="Hello",
                model_name="unauthorized/malicious-model"
            )
            results.add(
                "Unauthorized Model Rejection",
                False,
                "Unauthorized model was NOT rejected (critical security issue)"
            )
            print("  ❌ Unauthorized model was NOT rejected (CRITICAL)")
        except ValueError as e:
            error_msg = str(e)
            # Check that error message mentions authorization
            if "authorized" in error_msg.lower() or "not authorized" in error_msg.lower():
                results.add(
                    "Unauthorized Model Rejection",
                    True,
                    "Unauthorized model rejected correctly"
                )
                print(f"  ✅ Unauthorized model rejected: {error_msg}")
            else:
                results.add(
                    "Unauthorized Model Rejection",
                    False,
                    f"Error message unclear: {error_msg}"
                )
                print(f"  ❌ Error message unclear: {error_msg}")
        except Exception as e:
            results.add(
                "Unauthorized Model Rejection",
                False,
                f"Unexpected error: {e}"
            )
            print(f"  ❌ Unexpected error: {e}")

    except Exception as e:
        results.add(
            "Unauthorized Model Rejection",
            False,
            f"Test setup failed: {e}"
        )
        print(f"  ❌ Test setup failed: {e}")


async def test_temperature_validation(results: SecurityTestResults):
    """Test 5: Verify temperature range validation"""
    print("\n🔍 Test 5: Temperature Range Validation")
    print("-" * 80)

    try:
        service = OpenRouterService()

        # Test with temperature > 2.0 (should fail)
        try:
            await service.generate_content(
                prompt="Hello",
                model_name="anthropic/claude-3.5-sonnet",
                temperature=3.0
            )
            results.add(
                "Temperature Range Validation",
                False,
                "Temperature > 2.0 was NOT rejected"
            )
            print("  ❌ Temperature > 2.0 was NOT rejected")
        except ValueError as e:
            error_msg = str(e)
            results.add(
                "Temperature Range Validation",
                True,
                "Temperature out of range rejected"
            )
            print(f"  ✅ Temperature > 2.0 rejected: {error_msg}")
        except Exception as e:
            results.add(
                "Temperature Range Validation",
                False,
                f"Unexpected error: {e}"
            )
            print(f"  ❌ Unexpected error: {e}")

    except Exception as e:
        results.add(
            "Temperature Range Validation",
            False,
            f"Test setup failed: {e}"
        )
        print(f"  ❌ Test setup failed: {e}")


async def test_max_tokens_validation(results: SecurityTestResults):
    """Test 6: Verify max_tokens cap validation"""
    print("\n🔍 Test 6: Max Tokens Cap Validation")
    print("-" * 80)

    try:
        service = OpenRouterService()

        # Test with max_tokens > 32768 (should fail)
        try:
            await service.generate_content(
                prompt="Hello",
                model_name="anthropic/claude-3.5-sonnet",
                max_tokens=100000
            )
            results.add(
                "Max Tokens Cap Validation",
                False,
                "max_tokens > 32768 was NOT rejected"
            )
            print("  ❌ max_tokens > 32768 was NOT rejected")
        except ValueError as e:
            error_msg = str(e)
            results.add(
                "Max Tokens Cap Validation",
                True,
                "max_tokens cap enforced"
            )
            print(f"  ✅ max_tokens > 32768 rejected: {error_msg}")
        except Exception as e:
            results.add(
                "Max Tokens Cap Validation",
                False,
                f"Unexpected error: {e}"
            )
            print(f"  ❌ Unexpected error: {e}")

    except Exception as e:
        results.add(
            "Max Tokens Cap Validation",
            False,
            f"Test setup failed: {e}"
        )
        print(f"  ❌ Test setup failed: {e}")


async def main():
    """Run all security tests"""
    print("="*80)
    print("OpenRouter Security Validation Test Suite")
    print("="*80)

    results = SecurityTestResults()

    # Test 1: .env permissions
    test_env_permissions(results)

    # Test 2: Model allowlist
    test_model_allowlist(results)

    # Test 3-6: Input validation tests
    await test_invalid_prompt_rejection(results)
    await test_unauthorized_model_rejection(results)
    await test_temperature_validation(results)
    await test_max_tokens_validation(results)

    # Print summary
    success = results.print_summary()

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
