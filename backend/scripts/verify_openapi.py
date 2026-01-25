#!/usr/bin/env python3
"""
OpenAPI Documentation Verification Script

This script verifies that the OpenAPI/Swagger documentation is properly configured
and accessible for the NotebookLM Reimagined API.

Usage:
    python scripts/verify_openapi.py
"""

import sys
import json
from pathlib import Path

# Add parent directory to path to import app
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app


def print_section(title: str):
    """Print a formatted section header."""
    print(f"\n{'=' * 60}")
    print(f" {title}")
    print('=' * 60)


def verify_openapi_schema():
    """Verify the OpenAPI schema is properly structured."""
    print_section("OpenAPI Schema Verification")

    # Get the OpenAPI schema
    schema = app.openapi()

    # Check required fields
    required_fields = ['openapi', 'info', 'paths', 'components']
    missing_fields = [f for f in required_fields if f not in schema]

    if missing_fields:
        print(f"❌ Missing required fields: {missing_fields}")
        return False

    print("✅ All required OpenAPI fields present")

    # Check info section
    info = schema['info']
    info_fields = ['title', 'version', 'description']
    for field in info_fields:
        if field not in info:
            print(f"❌ Missing info field: {field}")
            return False

    print(f"✅ API Title: {info['title']}")
    print(f"✅ API Version: {info['version']}")
    print(f"✅ Description Length: {len(info['description'])} chars")

    # Check tags
    if 'tags' not in schema:
        print("❌ No tags defined")
        return False

    print(f"✅ Total Tags: {len(schema['tags'])}")
    for tag in schema['tags']:
        print(f"   - {tag['name']}: {tag.get('description', 'No description')}")

    return True


def verify_endpoints():
    """Verify that endpoints have proper documentation."""
    print_section("Endpoint Documentation Verification")

    schema = app.openapi()
    paths = schema['paths']

    print(f"✅ Total Paths: {len(paths)}")

    # Check for required documentation on key endpoints
    key_endpoints = [
        ('/', 'get'),
        ('/health', 'get'),
        ('/api/v1/providers', 'get'),
        ('/api/v1/providers/models', 'get'),
        ('/api/v1/providers/config', 'get'),
        ('/api/v1/notebooks', 'post'),
        ('/api/v1/notebooks/{notebook_id}/chat', 'post'),
    ]

    documented = 0
    total = len(key_endpoints)

    for path, method in key_endpoints:
        if path not in paths:
            print(f"⚠️  {method.upper()} {path} - Not found")
            continue

        endpoint = paths[path][method]
        has_summary = 'summary' in endpoint
        has_description = 'description' in endpoint
        has_responses = 'responses' in endpoint

        status = []
        if has_summary:
            status.append("summary")
        if has_description:
            status.append("description")
        if has_responses:
            status.append("responses")

        if len(status) == 3:
            print(f"✅ {method.upper():6} {path}")
            documented += 1
        else:
            missing = [s for s in ['summary', 'description', 'responses'] if s not in status]
            print(f"⚠️  {method.upper():6} {path} - Missing: {', '.join(missing)}")

    print(f"\n📊 Documentation Coverage: {documented}/{total} ({documented/total*100:.0f}%)")
    return documented == total


def verify_providers_endpoint():
    """Detailed verification of the providers endpoints."""
    print_section("Providers Endpoint Verification")

    schema = app.openapi()

    # Check GET /api/v1/providers
    if '/api/v1/providers' not in schema['paths']:
        print("❌ /api/v1/providers endpoint not found")
        return False

    endpoint = schema['paths']['/api/v1/providers']['get']

    checks = {
        'summary': endpoint.get('summary', ''),
        'description_length': len(endpoint.get('description', '')),
        'has_responses': 'responses' in endpoint,
        'has_200_response': '200' in endpoint.get('responses', {}),
        'tag': endpoint.get('tags', [''])[0],
    }

    print("GET /api/v1/providers")
    print(f"  Summary: {checks['summary']}")
    print(f"  Description: {checks['description_length']} chars")
    print(f"  Responses: {'✅' if checks['has_responses'] else '❌'}")
    print(f"  200 Response: {'✅' if checks['has_200_response'] else '❌'}")
    print(f"  Tag: {checks['tag']}")

    # Check pagination on models endpoint
    if '/api/v1/providers/models' in schema['paths']:
        endpoint = schema['paths']['/api/v1/providers/models']['get']
        params = endpoint.get('parameters', [])

        has_page = any(p.get('name') == 'page' for p in params)
        has_page_size = any(p.get('name') == 'page_size' for p in params)

        print("\nGET /api/v1/providers/models")
        print(f"  Has page param: {'✅' if has_page else '❌'}")
        print(f"  Has page_size param: {'✅' if has_page_size else '❌'}")
        print(f"  Total params: {len(params)}")

        for param in params:
            print(f"    - {param['name']}: {param.get('schema', {}).get('type', 'unknown')}")

    return all([
        checks['summary'],
        checks['description_length'] > 100,
        checks['has_responses'],
        checks['has_200_response'],
        checks['tag'] == 'providers',
    ])


def verify_security_docs():
    """Check if security documentation is present."""
    print_section("Security Documentation")

    schema = app.openapi()

    # Check for security schemes
    has_security_schemes = 'components' in schema and 'securitySchemes' in schema['components']

    if has_security_schemes:
        schemes = schema['components']['securitySchemes']
        print(f"✅ Security Schemes: {list(schemes.keys())}")
    else:
        print("⚠️  No security schemes defined (optional for public endpoints)")

    # Check description for auth info
    info = schema.get('info', {})
    description = info.get('description', '')

    has_auth_info = 'Authorization' in description or 'Bearer' in description or 'Authentication' in description

    if has_auth_info:
        print("✅ Authentication documented in API description")
    else:
        print("⚠️  No authentication info in API description")

    return True


def main():
    """Run all verification checks."""
    print("\n🔍 OpenAPI Documentation Verification")
    print("NotebookLM Reimagined API")

    results = {
        'schema': verify_openapi_schema(),
        'endpoints': verify_endpoints(),
        'providers': verify_providers_endpoint(),
        'security': verify_security_docs(),
    }

    print_section("Summary")

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for check, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status:10} {check.capitalize()}")

    print(f"\n{'=' * 60}")
    if passed == total:
        print("🎉 All verification checks passed!")
        print(f"\n📚 Swagger UI: http://localhost:8000/docs")
        print(f"📚 ReDoc:      http://localhost:8000/redoc")
    else:
        print(f"⚠️  {passed}/{total} checks passed")
        print("Some documentation improvements are needed.")

    print('=' * 60 + '\n')

    return 0 if passed == total else 1


if __name__ == '__main__':
    sys.exit(main())
