#!/bin/bash
# Simple test script for OpenRouter provider integration
# This script tests the API endpoints using curl

echo "========================================================================"
echo "OpenRouter Provider Integration Test Suite"
echo "========================================================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
WARNINGS=()

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS${NC} - $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}❌ FAIL${NC} - $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARNING${NC} - $1"
    WARNINGS+=("$1")
}

section() {
    echo ""
    echo "🔍 $1"
    echo "--------------------------------------------------------------------------------"
}

# Check if backend is running
section "Test 0: Backend Server Status"
BACKEND_URL="http://localhost:8000"

if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
    pass "Backend server is running on $BACKEND_URL"
    echo "   Health check: $(curl -s $BACKEND_URL/health)"
else
    fail "Backend server is NOT running on $BACKEND_URL"
    echo "   Start with: cd backend && python3 -m uvicorn app.main:app --reload"
    exit 1
fi

# Test 1: Root endpoint
section "Test 1: Root Endpoint"
ROOT_RESPONSE=$(curl -s "$BACKEND_URL/")
if echo "$ROOT_RESPONSE" | grep -q "NotebookLM Reimagined"; then
    pass "Root endpoint returns app info"
    echo "   $ROOT_RESPONSE"
else
    fail "Root endpoint unexpected response"
fi

# Test 2: Providers list
section "Test 2: GET /api/v1/providers"
PROVIDERS_RESPONSE=$(curl -s "$BACKEND_URL/api/v1/providers")

if echo "$PROVIDERS_RESPONSE" | jq -e '.providers' > /dev/null 2>&1; then
    pass "Providers list returns valid JSON"

    # Check providers
    GOOGLE_AVAILABLE=$(echo "$PROVIDERS_RESPONSE" | jq -r '.providers[] | select(.id=="google") | .available')
    OPENROUTER_AVAILABLE=$(echo "$PROVIDERS_RESPONSE" | jq -r '.providers[] | select(.id=="openrouter") | .available')

    echo "   Google provider: $([ "$GOOGLE_AVAILABLE" == "true" ] && echo "Available" || echo "Not configured")"
    echo "   OpenRouter provider: $([ "$OPENROUTER_AVAILABLE" == "true" ] && echo "Available" || echo "Not configured")"

    if [ "$GOOGLE_AVAILABLE" == "false" ]; then
        warn "Google provider not available - GOOGLE_API_KEY not set"
    fi

    if [ "$OPENROUTER_AVAILABLE" == "false" ]; then
        warn "OpenRouter provider not available - OPENROUTER_API_KEY not set"
    fi
else
    fail "Providers list endpoint error"
    echo "   Response: $PROVIDERS_RESPONSE"
fi

# Test 3: Provider config
section "Test 3: GET /api/v1/providers/config"
CONFIG_RESPONSE=$(curl -s "$BACKEND_URL/api/v1/providers/config")

if echo "$CONFIG_RESPONSE" | jq -e '.default_provider' > /dev/null 2>&1; then
    pass "Provider config returns valid JSON"

    DEFAULT_PROVIDER=$(echo "$CONFIG_RESPONSE" | jq -r '.default_provider')
    GOOGLE_CONFIGURED=$(echo "$CONFIG_RESPONSE" | jq -r '.google_configured')
    OPENROUTER_CONFIGURED=$(echo "$CONFIG_RESPONSE" | jq -r '.openrouter_configured')

    echo "   Default provider: $DEFAULT_PROVIDER"
    echo "   Google configured: $GOOGLE_CONFIGURED"
    echo "   OpenRouter configured: $OPENROUTER_CONFIGURED"
else
    fail "Provider config endpoint error"
    echo "   Response: $CONFIG_RESPONSE"
fi

# Test 4: OpenRouter models (requires API key)
section "Test 4: GET /api/v1/providers/models"
MODELS_RESPONSE=$(curl -s "$BACKEND_URL/api/v1/providers/models")

if echo "$MODELS_RESPONSE" | jq -e '.models' > /dev/null 2>&1; then
    MODEL_COUNT=$(echo "$MODELS_RESPONSE" | jq -r '.count')
    pass "OpenRouter models list retrieved"
    echo "   Available models: $MODEL_COUNT"

    # Show sample models
    echo "   Sample models:"
    echo "$MODELS_RESPONSE" | jq -r '.models[:5] | .[] | "     - \(.id) (\(.provider))"'
elif echo "$MODELS_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_DETAIL=$(echo "$MODELS_RESPONSE" | jq -r '.error.detail')
    fail "OpenRouter models endpoint error: $ERROR_DETAIL"
    warn "OpenRouter API key not configured - skipping model tests"
else
    fail "OpenRouter models endpoint unexpected response"
    echo "   Response: $MODELS_RESPONSE"
fi

# Test 5: OpenAPI docs
section "Test 5: API Documentation"
if curl -s "$BACKEND_URL/docs" > /dev/null 2>&1; then
    pass "OpenAPI docs available at $BACKEND_URL/docs"
else
    fail "OpenAPI docs not available"
fi

# Summary
echo ""
echo "========================================================================"
echo "TEST SUMMARY"
echo "========================================================================"
echo "Total: $((PASSED + FAILED)) | Passed: $PASSED | Failed: $FAILED"

if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo ""
    echo "⚠️  WARNINGS:"
    for warning in "${WARNINGS[@]}"; do
        echo "  - $warning"
    done
fi

echo "========================================================================"

# Exit code
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
