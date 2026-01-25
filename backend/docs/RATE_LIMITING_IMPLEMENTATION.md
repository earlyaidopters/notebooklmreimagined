# Rate Limiting Implementation for Provider Endpoints

## Overview
Rate limiting has been successfully implemented for the provider endpoints using the `slowapi` library to prevent DoS attacks and protect expensive external API calls.

## Files Modified

### 1. `/backend/requirements.txt`
Added `slowapi>=0.1.9` dependency.

### 2. `/backend/app/main.py`
- Imported `Limiter`, `get_remote_address`, and `RateLimitExceeded` from `slowapi`
- Created global `limiter` instance with IP-based rate limiting
- Registered custom exception handler for `RateLimitExceeded` errors
- Returns proper JSON error response with status code 429
- Added `Retry-After: 60` header for rate limit responses

### 3. `/backend/app/routers/providers.py`
- Added rate limiter integration with lazy initialization
- Implemented `_apply_rate_limit` decorator for storing rate limit metadata
- Added `set_limiter()` and `setup_rate_limiting()` functions
- Applied rate limits to three endpoints:
  - `GET /api/v1/providers` - 30 requests/minute
  - `GET /api/v1/providers/models` - 10 requests/minute (expensive API call)
  - `GET /api/v1/providers/config` - 30 requests/minute

## Rate Limits by Endpoint

| Endpoint | Rate Limit | Rationale |
|----------|------------|-----------|
| `GET /api/v1/providers` | 30/minute | Provider list is cached data, higher limit acceptable |
| `GET /api/v1/providers/models` | 10/minute | Makes expensive OpenRouter API call, stricter limit |
| `GET /api/v1/providers/config` | 30/minute | Configuration data, higher limit acceptable |

## Rate Limiting Strategy

- **Key Function**: `get_remote_address` - rate limits by IP address
- **Storage**: In-memory (can be extended to Redis for distributed systems)
- **Error Response**: JSON with `error.code: 429` and `error.message`
- **Headers**: Includes `Retry-After: 60` header

## Testing

A test script has been provided at `/backend/test_rate_limit_simple.py`:

```bash
# Terminal 1: Start the server
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --reload

# Terminal 2: Run the test
cd backend
source venv/bin/activate
python test_rate_limit_simple.py
```

## Error Response Format

When rate limit is exceeded:

```json
{
  "error": {
    "code": 429,
    "message": "Rate limit exceeded",
    "details": "1 per 1 minute"
  }
}
```

With headers:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

## Future Enhancements

1. **Distributed Rate Limiting**: Use Redis for multi-instance deployments
2. **User-based Rate Limiting**: Rate limit by authenticated user ID instead of IP
3. **Sliding Window**: More accurate rate limiting than fixed window
4. **Configurable Limits**: Allow rate limits to be configured via environment variables

## Security Considerations

- Rate limiting helps prevent DoS attacks on expensive endpoints
- The `/providers/models` endpoint has stricter limits due to external API costs
- IP-based rate limiting prevents abuse from single sources
- Custom error handler doesn't leak internal implementation details
