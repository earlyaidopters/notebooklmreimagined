#!/usr/bin/env python3
"""
Test script for rate limiting on provider endpoints.
Run this after starting the FastAPI server to verify rate limiting works.
"""
import asyncio
import httpx
import time
from typing import Dict, Any

BASE_URL = "http://localhost:8000/api/v1"

async def test_endpoint_rate_limit(
    client: httpx.AsyncClient,
    endpoint: str,
    requests_count: int = 15,
    delay: float = 0.1
) -> Dict[str, Any]:
    """Test rate limiting on a specific endpoint."""
    results = {
        "endpoint": endpoint,
        "total_requests": requests_count,
        "successful": 0,
        "rate_limited": 0,
        "other_errors": 0,
        "response_times": [],
    }

    for i in range(requests_count):
        start_time = time.time()
        try:
            response = await client.get(f"{BASE_URL}{endpoint}")
            elapsed = time.time() - start_time
            results["response_times"].append(elapsed)

            if response.status_code == 200:
                results["successful"] += 1
            elif response.status_code == 429:
                results["rate_limited"] += 1
                print(f"  Request {i+1}: Rate limited (429) - {response.json()}")
            else:
                results["other_errors"] += 1
                print(f"  Request {i+1}: Unexpected status {response.status_code}")
        except Exception as e:
            results["other_errors"] += 1
            print(f"  Request {i+1}: Error - {e}")

        # Small delay between requests
        await asyncio.sleep(delay)

    return results


async def main():
    """Run rate limit tests on all provider endpoints."""
    print("=" * 60)
    print("Rate Limiting Test Suite")
    print("=" * 60)
    print("\nMake sure the FastAPI server is running on http://localhost:8000")
    print("Press Ctrl+C to stop the tests\n")

    async with httpx.AsyncClient() as client:
        # Test 1: /providers (30/minute)
        print("\n[TEST 1] Testing /providers endpoint (limit: 30/minute)")
        print("-" * 60)
        result1 = await test_endpoint_rate_limit(client, "/providers", requests_count=35, delay=0.05)
        print(f"\nResults for {result1['endpoint']}:")
        print(f"  Successful: {result1['successful']}")
        print(f"  Rate limited: {result1['rate_limited']}")
        print(f"  Other errors: {result1['other_errors']}")
        print(f"  Avg response time: {sum(result1['response_times'])/len(result1['response_times']):.3f}s")

        # Test 2: /providers/models (10/minute)
        print("\n[TEST 2] Testing /providers/models endpoint (limit: 10/minute)")
        print("-" * 60)
        result2 = await test_endpoint_rate_limit(client, "/providers/models", requests_count=15, delay=0.1)
        print(f"\nResults for {result2['endpoint']}:")
        print(f"  Successful: {result2['successful']}")
        print(f"  Rate limited: {result2['rate_limited']}")
        print(f"  Other errors: {result2['other_errors']}")
        print(f"  Avg response time: {sum(result2['response_times'])/len(result2['response_times']):.3f}s")

        # Test 3: /providers/config (30/minute)
        print("\n[TEST 3] Testing /providers/config endpoint (limit: 30/minute)")
        print("-" * 60)
        result3 = await test_endpoint_rate_limit(client, "/providers/config", requests_count=35, delay=0.05)
        print(f"\nResults for {result3['endpoint']}:")
        print(f"  Successful: {result3['successful']}")
        print(f"  Rate limited: {result3['rate_limited']}")
        print(f"  Other errors: {result3['other_errors']}")
        print(f"  Avg response time: {sum(result3['response_times'])/len(result3['response_times']):.3f}s")

    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    all_rate_limited = result1["rate_limited"] > 0 and result2["rate_limited"] > 0 and result3["rate_limited"] > 0
    if all_rate_limited:
        print("SUCCESS: Rate limiting is working correctly on all endpoints!")
    else:
        print("WARNING: Some endpoints may not be rate limiting properly.")
        print(f"  /providers rate limited: {result1['rate_limited']} requests")
        print(f"  /providers/models rate limited: {result2['rate_limited']} requests")
        print(f"  /providers/config rate limited: {result3['rate_limited']} requests")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nTests interrupted by user.")
