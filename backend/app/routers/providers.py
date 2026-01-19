from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from app.config import get_settings
from app.services.openrouter import get_openrouter_service, OpenRouterService

router = APIRouter(prefix="/providers", tags=["providers"])


@router.get("")
async def list_providers():
    """
    List available LLM providers with configuration status
    """
    settings = get_settings()

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

    return {
        "providers": providers,
        "default_provider": settings.default_llm_provider,
        "default_model": settings.openrouter_default_model if settings.default_llm_provider == "openrouter" else "gemini-2.0-flash",
    }


@router.get("/models")
async def list_openrouter_models():
    """
    List all available models from OpenRouter
    """
    openrouter_service = get_openrouter_service()

    if not openrouter_service:
        raise HTTPException(
            status_code=503,
            detail="OpenRouter not configured. Add OPENROUTER_API_KEY to environment."
        )

    try:
        models = await openrouter_service.get_available_models()
        return {"models": models, "count": len(models)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config")
async def get_provider_config():
    """
    Get current provider configuration
    """
    settings = get_settings()

    return {
        "default_provider": settings.default_llm_provider,
        "openrouter_default_model": settings.openrouter_default_model,
        "openrouter_provider": settings.openrouter_provider,
        "google_configured": bool(settings.google_api_key),
        "openrouter_configured": bool(settings.openrouter_api_key),
    }
