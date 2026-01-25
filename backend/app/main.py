from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import uuid
import hashlib
from datetime import datetime
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.routers import notebooks, sources, chat, audio, video, research, study, notes, api_keys, global_chat, studio, export, profile, providers

settings = get_settings()

# Rate limiter configuration
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(
    title=settings.app_name,
    description="""# NotebookLM Reimagined API

An API-first research intelligence platform that combines the power of NotebookLM's AI-driven research with multi-provider LLM support.

## Features

- **Multi-Provider LLM Support**: Google Gemini and OpenRouter (100+ models)
- **Notebook Management**: Create, organize, and manage research notebooks
- **Source Integration**: Add documents, videos, audio, and web content
- **AI-Powered Chat**: Context-aware conversations with your sources
- **Study Materials**: Generate flashcards, quizzes, and study guides
- **Audio Generation**: Create deep-dive audio overviews
- **Video Generation**: Generate whiteboard-style videos
- **Research Assistant**: Automated research with citation tracking
- **Global Chat**: Query across all your notebooks at once
- **Studio Outputs**: Generate data tables, reports, slide decks, and infographics

## Authentication

Most endpoints require authentication via Supabase Auth. Include your session token in the Authorization header:

```
Authorization: Bearer <your-supabase-jwt-token>
```

## Rate Limiting

API requests are rate limited to prevent abuse:
- Default: 30 requests per minute per IP
- Authenticated users: Higher limits based on their plan
- Rate limit headers are included in all responses

## Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "code": 400,
    "message": "Error description"
  }
}
```

Common status codes:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable (external provider issue)

## Providers

The platform supports multiple LLM providers:

- **Google Gemini**: The original NotebookLM provider
- **OpenRouter**: Unified access to 100+ models including Claude, GPT-4, Llama, and more

See the `/api/v1/providers` endpoint for available models and configuration status.
""",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    contact={
        "name": "NotebookLM Reimagined",
        "url": "https://github.com/yourusername/notebooklm-reimagined",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    openapi_tags=[
        {
            "name": "providers",
            "description": "LLM provider management and configuration. Check available models and provider status.",
        },
        {
            "name": "notebooks",
            "description": "Create and manage research notebooks. Notebooks contain sources and enable AI-powered conversations.",
        },
        {
            "name": "sources",
            "description": "Add and manage source materials (documents, videos, audio, web content) to notebooks.",
        },
        {
            "name": "chat",
            "description": "AI-powered conversations with notebook context, including citations and suggested questions.",
        },
        {
            "name": "audio",
            "description": "Generate audio overviews of notebook content in various formats.",
        },
        {
            "name": "video",
            "description": "Generate video summaries with different visual styles.",
        },
        {
            "name": "research",
            "description": "Automated research assistant that finds and analyzes sources on any topic.",
        },
        {
            "name": "study",
            "description": "Generate study materials including flashcards, quizzes, study guides, and FAQs.",
        },
        {
            "name": "notes",
            "description": "Save and manage notes from conversations and research.",
        },
        {
            "name": "studio",
            "description": "Generate structured outputs like data tables, reports, slide decks, and infographics.",
        },
        {
            "name": "global-chat",
            "description": "Query across multiple notebooks simultaneously for comprehensive research.",
        },
        {
            "name": "api-keys",
            "description": "Manage API keys for programmatic access to the platform.",
        },
        {
            "name": "profile",
            "description": "User profile and usage statistics.",
        },
        {
            "name": "export",
            "description": "Export notebooks and sources in various formats.",
        },
    ],
)

# Register rate limit exception handler with custom JSON response
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom rate limit exceeded handler with proper JSON error response."""
    return JSONResponse(
        status_code=429,
        content={
            "error": {
                "code": 429,
                "message": "Rate limit exceeded",
                "details": str(exc.detail),
            }
        },
        headers={
            "Retry-After": "60",
        },
    )


# Note: providers router uses optional authentication via get_optional_user
# Initialize the providers router with the limiter
providers.set_limiter(limiter)
providers.setup_rate_limiting()

# GZip compression for responses > 1KB
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Cache control patterns
CACHE_PATTERNS = {
    # Public cacheable endpoints (short cache for list endpoints)
    "/api/v1/notebooks": ("private", 60),  # 1 minute
    "/api/v1/sources": ("private", 60),
    "/api/v1/notes": ("private", 60),
    # Longer cache for specific resources
    "/api/v1/notebooks/": ("private", 300),  # 5 minutes
    "/api/v1/sources/": ("private", 300),
    # No cache for mutation-heavy endpoints
    "/api/v1/chat": ("no-store", 0),
    "/api/v1/global-chat": ("no-store", 0),
    "/api/v1/audio": ("no-store", 0),
    "/api/v1/video": ("no-store", 0),
    "/api/v1/research": ("no-store", 0),
    "/api/v1/study": ("no-store", 0),
    "/api/v1/studio": ("no-store", 0),
    # Health/docs
    "/health": ("public", 60),
    "/docs": ("public", 3600),
    "/redoc": ("public", 3600),
}


def get_cache_headers(path: str, method: str) -> dict:
    """Determine appropriate cache headers based on path and method."""
    # Only cache GET requests
    if method != "GET":
        return {"Cache-Control": "no-store"}

    # Check for matching pattern
    for pattern, (cache_type, max_age) in CACHE_PATTERNS.items():
        if path.startswith(pattern):
            if cache_type == "no-store":
                return {"Cache-Control": "no-store"}
            return {
                "Cache-Control": f"{cache_type}, max-age={max_age}",
                "Vary": "Authorization, Accept-Encoding",
            }

    # Default: private, short cache
    return {
        "Cache-Control": "private, max-age=30",
        "Vary": "Authorization, Accept-Encoding",
    }


# Request ID and caching middleware
@app.middleware("http")
async def add_request_id_and_cache(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id

    response = await call_next(request)

    # Add request ID
    response.headers["X-Request-ID"] = request_id

    # Add cache headers (only if not already set)
    if "Cache-Control" not in response.headers:
        cache_headers = get_cache_headers(request.url.path, request.method)
        for key, value in cache_headers.items():
            response.headers[key] = value

    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"

    return response


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
            }
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": 500,
                "message": "Internal server error",
                "details": str(exc) if settings.debug else None,
            }
        },
    )


# Include routers
app.include_router(api_keys.router, prefix="/api/v1")
app.include_router(notebooks.router, prefix="/api/v1")
app.include_router(sources.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(audio.router, prefix="/api/v1")
app.include_router(video.router, prefix="/api/v1")
app.include_router(research.router, prefix="/api/v1")
app.include_router(study.router, prefix="/api/v1")
app.include_router(notes.router, prefix="/api/v1")
app.include_router(studio.router, prefix="/api/v1")
app.include_router(global_chat.router, prefix="/api/v1")
app.include_router(export.router, prefix="/api/v1")
app.include_router(profile.router, prefix="/api/v1")
app.include_router(providers.router, prefix="/api/v1")


@app.get(
    "/",
    tags=["root"],
    summary="API information",
    description="Returns basic API information including name, version, and documentation links.",
    responses={
        200: {
            "description": "API information retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "name": "NotebookLM Reimagined",
                        "version": "1.0.0",
                        "docs": "/docs"
                    }
                }
            }
        }
    }
)
async def root():
    """Get API information and documentation links."""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get(
    "/health",
    tags=["health"],
    summary="Health check endpoint",
    description="Check if the API is running and healthy. Can be used for monitoring and load balancer health checks.",
    responses={
        200: {
            "description": "API is healthy",
            "content": {
                "application/json": {
                    "example": {"status": "healthy"}
                }
            }
        }
    }
)
async def health():
    """Health check endpoint for monitoring and load balancers."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
