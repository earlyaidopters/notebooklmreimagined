#!/usr/bin/env python3
"""
Simple test script for rate limiting on provider endpoints.
Run this after starting the FastAPI server to verify rate limiting works.

Usage:
    1. Start the server: python -m uvicorn app.main:app --reload
    2. In another terminal: python test_rate_limit_simple.py
"""
import asyncio
import httpx
import time

BASE_URL = "http://localhost:8000/api/v1"

async def test_rate_limit():
    """Test rate limiting on the /providers/models endpoint."""
    print("=" * 60)
    print("Rate Limiting Test - /providers/models endpoint")
    print("Limit: 10 requests per minute")
    print("=" * 60)

    async with httpx.AsyncClient() as client:
        successful = 0
        rate_limited = 0

        # Make 15 requests (should hit rate limit after 10)
        for i in range(15):
            try:
                response = await client.get(f"{BASE_URL}/providers/models")
                if response.status_code == 200:
                    successful += 1
                    print(f"Request {i+1}: OK (200)")
                elif response.status_code == 429:
                    rate_limited += 1
                    print(f"Request {i+1}: RATE LIMITED (429) - {response.json()}")
                else:
                    print(f"Request {i+1}: Unexpected status {response.status_code}")
            except Exception as e:
                print(f"Request {i+1}: Error - {e}")

            # Small delay between requests
            await asyncio.sleep(0.1)

        print("\n" + "=" * 60)
        print("Results:")
        print(f"  Successful requests: {successful}")
        print(f"  Rate limited requests: {rate_limited}")

        if rate_limited > 0:
            print("\nSUCCESS: Rate limiting is working!")
        else:
            print("\nWARNING: No rate limiting detected (or limit not reached)")

if __name__ == "__main__":
    try:
        asyncio.run(test_rate_limit())
    except KeyboardInterrupt:
        print("\n\nTests interrupted by user.")
