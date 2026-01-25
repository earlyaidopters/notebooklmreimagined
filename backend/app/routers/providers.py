from fastapi import APIRouter, HTTPException, Depends, Request, Query
from typing import List, Dict, Any, Optional
import logging
import math
from app.config import get_settings
from app.services.openrouter import get_openrouter_service, OpenRouterService
from app.services.auth import get_optional_user
from app.models.schemas import PaginatedModelsResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/providers", tags=["providers"])

# Rate limiter will be set from app state
limiter = None


def set_limiter(l):
    """Set the rate limiter instance (called from main.py)"""
    global limiter
    limiter = l


def _apply_rate_limit(endpoint_func: str, rate_limit: str):
    """Helper to apply rate limiting after limiter is set."""
    def decorator(func):
        # Store the rate limit for later application
        func._rate_limit = rate_limit
        func._rate_limit_endpoint = endpoint_func
        return func
    return decorator


@router.get(
    "",
    summary="List available LLM providers",
    description="""List all configured LLM providers with their available models and status.

This endpoint returns different information based on authentication status:

**Unauthenticated users** receive:
- Provider ID, name, and description
- Availability status (whether provider is configured)
- List of available models

**Authenticated users** additionally receive:
- Default provider configuration
- Default model settings
- User ID for personalized settings

The response includes both Google Gemini (original NotebookLM provider) and OpenRouter (100+ models including Claude, GPT-4, Llama).

**Rate Limiting**: 30 requests per minute per IP address.
""",
    responses={
        200: {
            "description": "Providers retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "providers": [
                            {
                                "id": "google",
                                "name": "Google Gemini",
                                "description": "Original NotebookLM LLM provider",
                                "available": True,
                                "models": ["gemini-2.0-flash", "gemini-2.5-pro"]
                            },
                            {
                                "id": "openrouter",
                                "name": "OpenRouter",
                                "description": "Access to 100+ LLM providers via unified API",
                                "available": True,
                                "models": ["anthropic/claude-3.5-sonnet", "openai/gpt-4"]
                            }
                        ],
                        "default_provider": "openrouter",
                        "default_model": "anthropic/claude-3.5-sonnet",
                        "authenticated": True
                    }
                }
            }
        }
    }
)
@_apply_rate_limit("list_providers", "30/minute")
async def list_providers(
    request: Request,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """List available LLM providers with configuration status."""
    settings = get_settings()
    is_authenticated = current_user is not None

    providers = [
        {
            "id": "google",
            "name": "Google Gemini",
            "description": "Original NotebookLM LLM provider",
            "available": bool(settings.google_api_key),
            "models": [
                "gemini-2.0-flash",
                "gemini-2.0-flash-lite",
                "gemini-2.5-pro",
                "gemini-2.5-flash",
            ],
        },
        {
            "id": "openrouter",
            "name": "OpenRouter",
            "description": "Access to 100+ LLM providers via unified API",
            "available": bool(settings.openrouter_api_key),
            "models": [
                "anthropic/claude-3.5-sonnet",
                "anthropic/claude-3-opus",
                "openai/gpt-4",
                "openai/gpt-4-turbo",
                "google/gemini-2.0-flash",
                "google/gemini-2.5-flash",
                "google/gemini-2.5-pro",
                "meta/llama-3.1-70b",
                "zai/c3-7b",
                "zai/c3-13b",
                "zai/c3-40b",
            ],
        }
    ]

    response = {
        "providers": providers,
    }

    # Authenticated users get additional info
    if is_authenticated:
        response["default_provider"] = settings.default_llm_provider
        response["default_model"] = settings.openrouter_default_model if settings.default_llm_provider == "openrouter" else "gemini-2.0-flash"
        response["authenticated"] = True
        response["user_id"] = current_user.get("id")
    else:
        response["authenticated"] = False
        # For unauthenticated users, show a generic default (don't reveal actual config)
        response["default_provider"] = "google"
        response["default_model"] = "gemini-2.0-flash"

    return response


@router.get(
    "/models",
    summary="List OpenRouter models with pagination",
    description="""List all available models from OpenRouter with pagination support.

## Authentication & Access Control

**Unauthenticated users** (Preview Mode):
- Limited to first 10 models only
- 1 page maximum
- Message indicating full list requires authentication

**Authenticated users** (Full Access):
- Complete access to all 300+ models
- Full pagination support
- User-specific tracking

## Pagination Parameters

| Parameter | Type | Default | Constraints | Description |
|-----------|------|---------|-------------|-------------|
| `page` | integer | 1 | >= 1 | Page number (1-indexed) |
| `page_size` | integer | 50 | 1-100 | Items per page (max 100) |

## Response Format

```json
{
  "items": [
    {
      "id": "anthropic/claude-3.5-sonnet",
      "name": "Claude 3.5 Sonnet",
      "context_length": 200000,
      "pricing": {"prompt": 0.003, "completion": 0.015}
    }
  ],
  "total": 346,
  "page": 1,
  "page_size": 50,
  "total_pages": 7,
  "authenticated": true,
  "preview": false,
  "user_id": "user-123"
}
```

## Usage Examples

```bash
# Get first page (default: 50 items)
GET /api/v1/providers/models

# Get second page
GET /api/v1/providers/models?page=2

# Custom page size
GET /api/v1/providers/models?page=1&page_size=100

# Combined parameters
GET /api/v1/providers/models?page=3&page_size=25
```

## Rate Limiting

- **Limit**: 10 requests per minute per IP address
- **Reason**: This endpoint makes expensive external API calls to OpenRouter
- **Headers**: Rate limit info included in response headers

## Error Responses

| Status | Description |
|--------|-------------|
| 503 | OpenRouter service unavailable |
| 500 | Failed to retrieve models from OpenRouter |
""",
    response_model=PaginatedModelsResponse,
    responses={
        200: {
            "description": "Models retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "id": "anthropic/claude-3.5-sonnet",
                                "name": "Claude 3.5 Sonnet",
                                "context_length": 200000,
                                "pricing": {"prompt": 0.003, "completion": 0.015}
                            }
                        ],
                        "total": 346,
                        "page": 1,
                        "page_size": 50,
                        "total_pages": 7,
                        "authenticated": True,
                        "preview": False,
                        "user_id": "user-123"
                    }
                }
            }
        },
        503: {
            "description": "OpenRouter service unavailable",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": 503,
                            "message": "Provider service unavailable. Please try again later."
                        }
                    }
                }
            }
        },
        500: {
            "description": "Failed to retrieve models",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": 500,
                            "message": "Failed to retrieve models. Please try again later."
                        }
                    }
                }
            }
        }
    }
)
@_apply_rate_limit("list_openrouter_models", "10/minute")
async def list_openrouter_models(
    request: Request,
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=50, ge=1, le=100, description="Items per page (max 100)"),
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """List available models from OpenRouter with pagination support.

    Pagination Parameters:
    - **page**: Page number (1-indexed, default: 1)
    - **page_size**: Items per page (default: 50, max: 100)

    Access Levels:
    - **Unauthenticated**: Preview mode (first 10 models only, 1 page max)
    - **Authenticated**: Full access to all models with pagination

    Response Format:
    ```json
    {
        "items": [...],           // Models for current page
        "total": 346,             // Total model count
        "page": 1,                // Current page
        "page_size": 50,          // Items per page
        "total_pages": 7,         // Total pages available
        "authenticated": true,    // Auth status
        "user_id": "user-123",    // User ID (if auth)
        "preview": false          // Preview mode flag
    }
    ```

    Rate limit: 10 requests per minute per IP address.
    This endpoint makes expensive external API calls to OpenRouter.
    """
    openrouter_service = get_openrouter_service()

    if not openrouter_service:
        logger.warning("OpenRouter service not available")
        raise HTTPException(
            status_code=503,
            detail="Provider service unavailable. Please try again later."
        )

    try:
        models = await openrouter_service.get_available_models()
        total_models = len(models)

        # Unauthenticated users get a limited preview
        if current_user is None:
            # Preview mode: max 10 items, 1 page only
            preview_limit = 10
            preview_models = models[:preview_limit]

            return {
                "items": preview_models,
                "total": total_models,
                "page": 1,
                "page_size": len(preview_models),
                "total_pages": 1,
                "authenticated": False,
                "preview": True,
                "user_id": None,
                "message": "Full model list available for authenticated users"
            }

        # Authenticated users get paginated access
        # Calculate pagination
        total_pages = math.ceil(total_models / page_size) if total_models > 0 else 1

        # Ensure page is within valid range
        if page > total_pages:
            page = total_pages

        # Calculate slice indices
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size

        # Get models for current page
        paginated_models = models[start_idx:end_idx]

        return {
            "items": paginated_models,
            "total": total_models,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "authenticated": True,
            "preview": False,
            "user_id": current_user.get("id")
        }
    except Exception as e:
        # Sanitized error message - don't expose internal details
        logger.error(f"Error fetching OpenRouter models: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve models. Please try again later."
        )


@router.get(
    "/config",
    summary="Get provider configuration",
    description="""Get current LLM provider configuration and default settings.

This endpoint returns different information based on authentication status:

**Unauthenticated users** receive:
- Which providers are configured (boolean flags)
- No sensitive configuration details

**Authenticated users** receive:
- Default provider selection
- Default model settings
- OpenRouter provider preferences
- User-specific configuration

## Response Fields

| Field | Type | Auth Required | Description |
|-------|------|---------------|-------------|
| `google_configured` | boolean | No | Whether Google Gemini API key is set |
| `openrouter_configured` | boolean | No | Whether OpenRouter API key is set |
| `default_provider` | string | Yes | Default LLM provider (google/openrouter) |
| `openrouter_default_model` | string | Yes | Default model for OpenRouter |
| `openrouter_provider` | string | Yes | Preferred OpenRouter provider (optional) |
| `authenticated` | boolean | No | Authentication status |
| `user_id` | string | Yes | Current user ID |

## Rate Limiting

- **Limit**: 30 requests per minute per IP address
- **Authentication**: Optional (different response levels)

## Example Response (Authenticated)

```json
{
  "google_configured": true,
  "openrouter_configured": true,
  "default_provider": "openrouter",
  "openrouter_default_model": "anthropic/claude-3.5-sonnet",
  "openrouter_provider": null,
  "authenticated": true,
  "user_id": "user-123"
}
```

## Example Response (Unauthenticated)

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
""",
    responses={
        200: {
            "description": "Configuration retrieved successfully",
            "content": {
                "application/json": {
                    "examples": {
                        "authenticated": {
                            "summary": "Authenticated user response",
                            "value": {
                                "google_configured": True,
                                "openrouter_configured": True,
                                "default_provider": "openrouter",
                                "openrouter_default_model": "anthropic/claude-3.5-sonnet",
                                "openrouter_provider": None,
                                "authenticated": True,
                                "user_id": "user-123"
                            }
                        },
                        "unauthenticated": {
                            "summary": "Unauthenticated user response",
                            "value": {
                                "google_configured": True,
                                "openrouter_configured": True,
                                "default_provider": "google",
                                "openrouter_default_model": "google/gemini-2.0-flash",
                                "openrouter_provider": None,
                                "authenticated": False
                            }
                        }
                    }
                }
            }
        }
    }
)
@_apply_rate_limit("get_provider_config", "30/minute")
async def get_provider_config(
    request: Request,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """Get current provider configuration.

    - Unauthenticated users: Limited info (only which providers are available)
    - Authenticated users: Full configuration details including defaults

    Rate limit: 30 requests per minute per IP address.
    """
    settings = get_settings()
    is_authenticated = current_user is not None

    # Base response - available for all users
    base_response = {
        "google_configured": bool(settings.google_api_key),
        "openrouter_configured": bool(settings.openrouter_api_key),
        "authenticated": is_authenticated,
    }

    # Authenticated users get full configuration
    if is_authenticated:
        base_response.update({
            "default_provider": settings.default_llm_provider,
            "openrouter_default_model": settings.openrouter_default_model,
            "openrouter_provider": settings.openrouter_provider,
            "user_id": current_user.get("id"),
        })
    else:
        # Unauthenticated users don't see actual defaults
        base_response.update({
            "default_provider": "google",
            "openrouter_default_model": "google/gemini-2.0-flash",
            "openrouter_provider": None,
        })

    return base_response


def setup_rate_limiting():
    """Apply rate limiting to all marked endpoints after limiter is set."""
    if limiter is None:
        return

    for route in router.routes:
        if hasattr(route, 'endpoint') and hasattr(route.endpoint, '_rate_limit'):
            # Apply the rate limit decorator
            rate_limit = route.endpoint._rate_limit
            route.endpoint = limiter.limit(rate_limit)(route.endpoint)
