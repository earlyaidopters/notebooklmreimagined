# Manual Testing Guide - OpenRouter Provider Integration

## Prerequisites

1. **Install Dependencies**
   ```bash
   cd backend
   pip3 install --break-system-packages fastapi httpx pydantic-settings uvicorn
   ```

2. **Set Environment Variables**
   ```bash
   export GOOGLE_API_KEY="your-google-api-key"
   export OPENROUTER_API_KEY="your-openrouter-api-key"
   export SUPABASE_URL="your-supabase-url"
   export SUPABASE_ANON_KEY="your-anon-key"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   export DEFAULT_LLM_PROVIDER="google"  # or "openrouter"
   export OPENROUTER_DEFAULT_MODEL="anthropic/claude-3.5-sonnet"
   ```

3. **Run Database Migration** (in Supabase SQL Editor)
   ```sql
   ALTER TABLE chat_messages
   ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'google',
   ADD COLUMN IF NOT EXISTS cost_usd DECIMAL(10, 6) DEFAULT 0;

   CREATE INDEX IF NOT EXISTS idx_chat_messages_provider
   ON chat_messages(provider);
   ```

4. **Start Backend Server**
   ```bash
   cd backend
   python3 -m uvicorn app.main:app --reload --port 8000
   ```

## Test Cases

### Test 1: Root Endpoint
```bash
curl http://localhost:8000/
```

**Expected**:
```json
{
  "name": "NotebookLM Reimagined",
  "version": "1.0.0",
  "docs": "/docs"
}
```

### Test 2: Health Check
```bash
curl http://localhost:8000/health
```

**Expected**:
```json
{"status": "healthy"}
```

### Test 3: List Providers
```bash
curl http://localhost:8000/api/v1/providers | jq
```

**Expected**:
```json
{
  "providers": [
    {
      "id": "google",
      "name": "Google Gemini",
      "description": "Original NotebookLM LLM provider",
      "available": true,
      "models": ["gemini-2.0-flash", "gemini-2.0-flash-lite", ...]
    },
    {
      "id": "openrouter",
      "name": "OpenRouter",
      "description": "Access to 100+ LLM providers via unified API",
      "available": true,
      "models": ["anthropic/claude-3.5-sonnet", ...]
    }
  ],
  "default_provider": "google",
  "default_model": "gemini-2.0-flash"
}
```

### Test 4: Get Provider Config
```bash
curl http://localhost:8000/api/v1/providers/config | jq
```

**Expected**:
```json
{
  "default_provider": "google",
  "openrouter_default_model": "anthropic/claude-3.5-sonnet",
  "openrouter_provider": "",
  "google_configured": true,
  "openrouter_configured": true
}
```

### Test 5: List OpenRouter Models
```bash
curl http://localhost:8000/api/v1/providers/models | jq '.models[:5]'
```

**Expected**:
```json
[
  {
    "id": "anthropic/claude-3.5-sonnet",
    "name": "Claude 3.5 Sonnet",
    "context_length": 200000,
    "pricing": {"prompt": "3.0", "completion": "15.0"},
    "provider": "Anthropic"
  },
  ...
]
```

### Test 6: Chat with Google Provider
```bash
# Requires authentication token
NOTEBOOK_ID="your-notebook-id"
TOKEN="your-jwt-token"

curl -X POST "http://localhost:8000/api/v1/notebooks/$NOTEBOOK_ID/chat?provider=google" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is 2+2?",
    "model": "gemini-2.0-flash"
  }' | jq
```

**Expected**:
```json
{
  "data": {
    "message_id": "...",
    "session_id": "...",
    "content": "2+2 equals 4.",
    "citations": [],
    "suggested_questions": []
  },
  "usage": {
    "input_tokens": 5,
    "output_tokens": 10,
    "cost_usd": 0.000001,
    "model_used": "gemini-2.0-flash",
    "provider": "google"
  }
}
```

### Test 7: Chat with OpenRouter Provider
```bash
curl -X POST "http://localhost:8000/api/v1/notebooks/$NOTEBOOK_ID/chat?provider=openrouter" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is 2+2?",
    "provider_model": "anthropic/claude-3.5-sonnet"
  }' | jq
```

**Expected**:
```json
{
  "data": {
    "message_id": "...",
    "session_id": "...",
    "content": "2+2 equals 4.",
    "citations": [],
    "suggested_questions": []
  },
  "usage": {
    "input_tokens": 15,
    "output_tokens": 8,
    "cost_usd": 0.000165,
    "model_used": "anthropic/claude-3.5-sonnet",
    "provider": "openrouter"
  }
}
```

### Test 8: Chat with Default Provider
```bash
curl -X POST "http://localhost:8000/api/v1/notebooks/$NOTEBOOK_ID/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is 2+2?"
  }' | jq '.usage.provider'
```

**Expected**: Should return `"google"` or `"openrouter"` based on `DEFAULT_LLM_PROVIDER` env var

### Test 9: OpenRouter Not Configured Error
```bash
# Temporarily unset API key
unset OPENROUTER_API_KEY
# Restart server
curl http://localhost:8000/api/v1/providers/models
```

**Expected**:
```json
{
  "error": {
    "code": 503,
    "message": "OpenRouter not configured. Add OPENROUTER_API_KEY to environment."
  }
}
```

## OpenAPI Documentation

Visit `http://localhost:8000/docs` for interactive API documentation.

## Troubleshooting

### "No module named 'uvicorn'"
```bash
pip3 install --break-system-packages uvicorn
```

### "OpenRouter not configured"
Set `OPENROUTER_API_KEY` environment variable

### "Notebook not found"
Ensure you have a valid notebook ID and authentication token

### "503 Service Unavailable"
Check that API keys are set and services are accessible

## Test Results Template

| Test | Status | Notes |
|------|--------|-------|
| Root endpoint | ☐ | |
| Health check | ☐ | |
| List providers | ☐ | |
| Get config | ☐ | |
| List models | ☐ | |
| Chat with Google | ☐ | |
| Chat with OpenRouter | ☐ | |
| Default provider | ☐ | |
| Error handling | ☐ | |

---

**Quick Test Script**:
```bash
# Run all tests
for test in root health providers config models; do
  echo "Testing $test..."
  bash test_$test.sh
done
```
