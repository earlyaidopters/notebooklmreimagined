# OpenAPI/Swagger Quick Reference

## Start Server

```bash
cd /Users/devops/Projects/active/notebooklmreimagined/backend
./venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

## Documentation URLs

| UI | URL |
|----|-----|
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| OpenAPI JSON | http://localhost:8000/openapi.json |

## Test Commands

```bash
# Health check
curl http://localhost:8000/health

# List providers
curl http://localhost:8000/api/v1/providers

# List models (paginated)
curl "http://localhost:8000/api/v1/providers/models?page=1&page_size=10"

# Get provider config
curl http://localhost:8000/api/v1/providers/config
```

## Documented Endpoints

### Core (7 endpoints)
- `GET /` - API info
- `GET /health` - Health check
- `GET /api/v1/providers` - List providers
- `GET /api/v1/providers/models` - List models (paginated)
- `GET /api/v1/providers/config` - Get config
- `POST /api/v1/notebooks` - Create notebook
- `POST /api/v1/notebooks/{id}/chat` - Send message

### Total API
- **48 endpoints** across **14 tags**
- **11 routers** remaining to document

## Tags

`providers`, `notebooks`, `sources`, `chat`, `audio`, `video`, `research`, `study`, `notes`, `studio`, `global-chat`, `api-keys`, `profile`, `export`

## Files

| File | Purpose |
|------|---------|
| `app/main.py` | API metadata, tags, root/health |
| `app/routers/providers.py` | Provider endpoints |
| `app/routers/chat.py` | Chat endpoints |
| `app/routers/notebooks.py` | Notebook endpoints |
| `scripts/verify_openapi.py` | Verification script |

## Verification

```bash
./venv/bin/python scripts/verify_openapi.py
```

Expected: All checks passed ✅

## Response Format

All endpoints follow this format:

```json
{
  "data": {...},
  "usage": {
    "input_tokens": 1234,
    "output_tokens": 567,
    "cost_usd": 0.0023
  }
}
```

Error format:

```json
{
  "error": {
    "code": 400,
    "message": "Error description"
  }
}
```

## Status Codes

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Error
- `503` - Service Unavailable
