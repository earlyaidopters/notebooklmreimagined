# Swagger UI Testing Guide

## Quick Start

### 1. Start the Server

```bash
cd /Users/devops/Projects/active/notebooklmreimagined/backend
./venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

### 2. Access Documentation

Open your browser to:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Testing Endpoints

### Unauthenticated Endpoints (No Auth Required)

#### 1. Health Check
```
GET /health
```
**Expected Response**:
```json
{
  "status": "healthy"
}
```

#### 2. API Info
```
GET /
```
**Expected Response**:
```json
{
  "name": "NotebookLM Reimagined",
  "version": "1.0.0",
  "docs": "/docs"
}
```

#### 3. List Providers
```
GET /api/v1/providers
```
**Expected Response**:
```json
{
  "providers": [
    {
      "id": "google",
      "name": "Google Gemini",
      "description": "Original NotebookLM LLM provider",
      "available": true,
      "models": ["gemini-2.0-flash", "gemini-2.5-pro", ...]
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
  "default_model": "gemini-2.0-flash",
  "authenticated": false
}
```

#### 4. List OpenRouter Models (with Pagination)
```
GET /api/v1/providers/models?page=1&page_size=10
```

**Query Parameters**:
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 50, max: 100)

**Expected Response** (Unauthenticated):
```json
{
  "items": [...],           // First 10 models only
  "total": 346,
  "page": 1,
  "page_size": 10,
  "total_pages": 1,
  "authenticated": false,
  "preview": true,
  "user_id": null,
  "message": "Full model list available for authenticated users"
}
```

#### 5. Get Provider Config
```
GET /api/v1/providers/config
```
**Expected Response** (Unauthenticated):
```json
{
  "google_configured": true,
  "openrouter_configured": true,
  "default_provider": "google",
  "openrouter_default_model": "google/gemini-2.0-flash",
  "openrouter_provider": null,
  "authenticated": false
}
```

### Authenticated Endpoints (Require Supabase JWT)

To test authenticated endpoints, you need a valid Supabase JWT token.

#### Getting Auth Token

Option 1: Use Supabase Client (if frontend is set up)
```javascript
const { data, error } = await supabase.auth.getSession()
const token = data.session.access_token
```

Option 2: Use existing token from your app

#### Setting Auth in Swagger UI

1. Click the "Authorize" button (lock icon) at the top of Swagger UI
2. Enter your token: `Bearer <your-jwt-token>`
3. Click "Authorize"
4. Close the dialog

#### Authenticated Endpoints to Test

##### 1. Create Notebook
```
POST /api/v1/notebooks
```
**Request Body**:
```json
{
  "name": "Test Notebook",
  "description": "Testing OpenAPI docs",
  "emoji": "🧪"
}
```

##### 2. List Notebooks
```
GET /api/v1/notebooks
```

##### 3. Send Chat Message
```
POST /api/v1/notebooks/{notebook_id}/chat?provider=openrouter
```
**Request Body**:
```json
{
  "message": "What is this notebook about?",
  "model": "anthropic/claude-3.5-sonnet"
}
```

## Pagination Testing

### OpenRouter Models Pagination

Test different page sizes:
```
GET /api/v1/providers/models?page=1&page_size=10
GET /api/v1/providers/models?page=2&page_size=10
GET /api/v1/providers/models?page=1&page_size=100
```

Verify:
- `page` matches requested page
- `page_size` matches requested size (or is capped at 100)
- `total_pages` is calculated correctly: `ceil(total / page_size)`
- `items` array has correct length
- For unauthenticated users: only 10 items returned, 1 page max

## Response Validation

### Check Response Structure

Each endpoint should return:
- `200` status code on success
- Proper `Content-Type: application/json` header
- Response body matching the documented schema

### Example: Validate Providers Response

```json
{
  "providers": [
    {
      "id": "string",           // Required
      "name": "string",          // Required
      "description": "string",   // Required
      "available": boolean,      // Required
      "models": ["string"]       // Required
    }
  ],
  "default_provider": "string",  // Authenticated only
  "default_model": "string",     // Authenticated only
  "authenticated": boolean,      // Required
  "user_id": "string"            // Authenticated only
}
```

## Common Issues

### 1. ModuleNotFoundError
**Issue**: `ModuleNotFoundError: No module named 'slowapi'`

**Solution**: Ensure you're using the virtual environment:
```bash
cd backend
./venv/bin/python -m uvicorn app.main:app --reload
```

### 2. Google API Key Warning
**Issue**: `FutureWarning: All support for the google.generativeai package has ended`

**Solution**: This is a deprecation warning from the Google AI SDK. The app will still work, but consider migrating to `google.genai` in the future.

### 3. 401 Unauthorized
**Issue**: Authenticated endpoints return 401

**Solution**:
- Verify your JWT token is valid
- Check token hasn't expired
- Ensure token is passed as: `Authorization: Bearer <token>`

### 4. Empty Response
**Issue**: Endpoints return empty data

**Solution**:
- For notebooks/sources: Create test data first
- For chat: Add sources to notebook before chatting
- Check Supabase connection is working

## Documentation Features to Verify

### 1. Summary and Description
- Each endpoint has a clear summary
- Detailed description with examples
- Markdown formatting

### 2. Parameters
- Path parameters documented
- Query parameters with types and constraints
- Request body schemas

### 3. Responses
- 200 response with example
- Error responses (400, 404, 500, etc.)
- Response examples match actual API behavior

### 4. Tags
- Endpoints grouped by tag
- Tag descriptions in main app description

## Performance Testing

### Rate Limiting
Test rate limits by making repeated requests:
```
for i in {1..35}; do
  curl http://localhost:8000/api/v1/providers
  echo "Request $i"
done
```

Expected: After rate limit exceeded (30 req/min):
- Status: `429 Too Many Requests`
- Header: `Retry-After: 60`

### Response Time
Monitor response times:
```bash
time curl http://localhost:8000/api/v1/providers
time curl http://localhost:8000/api/v1/providers/models
```

## Code Generation

The OpenAPI spec can be used to generate client SDKs:

### TypeScript
```bash
openapi-generator-cli generate \
  -i http://localhost:8000/openapi.json \
  -g typescript-axios \
  -o ./client/typescript
```

### Python
```bash
openapi-generator-cli generate \
  -i http://localhost:8000/openapi.json \
  -g python \
  -o ./client/python
```

## Checklist

- [ ] Server starts without errors
- [ ] Swagger UI loads at /docs
- [ ] ReDoc loads at /redoc
- [ ] OpenAPI JSON is valid at /openapi.json
- [ ] Unauthenticated endpoints work
- [ ] Authenticated endpoints work with valid token
- [ ] Pagination works correctly
- [ ] Rate limiting is enforced
- [ ] Response examples match actual responses
- [ ] Error responses are documented
- [ ] Tags group endpoints logically
- [ ] Summaries are clear and concise
- [ ] Descriptions provide sufficient detail
