from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Dict, Any, Optional
import logging
from app.config import get_settings
from app.services.openrouter import get_openrouter_service, OpenRouterService
from app.services.auth import get_optional_user

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


@router.get("")
@_apply_rate_limit("list_providers", "30/minute")
async def list_providers(
    request: Request,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    List available LLM providers with configuration status.

    - Unauthenticated users: See public provider info (id, name, description, available models)
    - Authenticated users: See additional configuration details

    Rate limit: 30 requests per minute per IP address.
    """
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


@router.get("/models")
@_apply_rate_limit("list_openrouter_models", "10/minute")
async def list_openrouter_models(
    request: Request,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    List all available models from OpenRouter.

    - Unauthenticated users: Limited to 10 models (preview)
    - Authenticated users: Full model list with no limit

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

        # Unauthenticated users get a limited preview
        if current_user is None:
            return {
                "models": models[:10],
                "count": len(models),
                "authenticated": False,
                "preview": True,
                "message": "Full model list available for authenticated users"
            }

        # Authenticated users get the full list
        return {
            "models": models,
            "count": len(models),
            "authenticated": True,
            "user_id": current_user.get("id")
        }
    except Exception as e:
        # Sanitized error message - don't expose internal details
        logger.error(f"Error fetching OpenRouter models: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve models. Please try again later."
        )


@router.get("/config")
@_apply_rate_limit("get_provider_config", "30/minute")
async def get_provider_config(
    request: Request,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    Get current provider configuration.

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
