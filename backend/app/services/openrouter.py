import httpx
import logging
import asyncio
import time
from typing import Optional, List, Dict, Any
from pydantic import ValidationError, Field
from app.config import get_settings
from app.models.schemas import (
    ALLOWED_OPENROUTER_MODELS,
    OpenRouterGenerateRequest,
    OpenRouterContextRequest
)

logger = logging.getLogger(__name__)
settings = get_settings()

# Cache storage for models list
_models_cache: Dict[str, Any] = {
    "data": None,
    "timestamp": 0,
}
_models_cache_lock = asyncio.Lock()
MODELS_CACHE_TTL = 3600  # 1 hour in seconds

# OpenRouter pricing (per 1M tokens - approximate)
# Actual pricing varies by provider
MODEL_PRICING = {
    "anthropic/claude-3.5-sonnet": {"input": 3.0, "output": 15.0},
    "anthropic/claude-3-opus": {"input": 15.0, "output": 75.0},
    "openai/gpt-4": {"input": 30.0, "output": 60.0},
    "openai/gpt-4-turbo": {"input": 10.0, "output": 30.0},
    "google/gemini-2.0-flash": {"input": 0.10, "output": 0.40},
    "google/gemini-2.5-flash": {"input": 0.15, "output": 0.60},
    "google/gemini-2.5-pro": {"input": 1.25, "output": 10.0},
    "meta/llama-3.1-70b": {"input": 0.70, "output": 0.70},
    "zai/c3-7b": {"input": 0.05, "output": 0.05},
    "zai/c3-13b": {"input": 0.10, "output": 0.10},
    "zai/c3-40b": {"input": 0.50, "output": 0.50},
}


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost in USD for a given model and token counts."""
    pricing = MODEL_PRICING.get(model, MODEL_PRICING["google/gemini-2.0-flash"])
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    return round(input_cost + output_cost, 6)


class OpenRouterService:
    """OpenRouter API client for multi-LLM support"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or getattr(settings, "openrouter_api_key", None)
        self.base_url = "https://openrouter.ai/api/v1"

        if not self.api_key:
            raise ValueError("OpenRouter API key not configured")

    async def generate_content(
        self,
        prompt: str,
        model_name: str = "anthropic/claude-3.5-sonnet",
        provider: Optional[str] = None,
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> Dict[str, Any]:
        """Generate content using OpenRouter.

        Security: Validates all inputs against Pydantic schema and model allowlist.
        Error messages are sanitized to prevent information disclosure.
        """

        # Validate request parameters using Pydantic schema
        try:
            validated_request = OpenRouterGenerateRequest(
                prompt=prompt,
                model_name=model_name,
                provider=provider,
                system_instruction=system_instruction,
                temperature=temperature,
                max_tokens=max_tokens
            )
        except ValidationError as e:
            logger.warning(f"Invalid generation request: {e}")
            raise ValueError("Invalid request parameters. Please check your input.") from e

        # Validate model name against allowlist
        if validated_request.model_name not in ALLOWED_OPENROUTER_MODELS:
            logger.warning(f"Blocked unauthorized model: {validated_request.model_name}")
            raise ValueError(
                f"Model '{validated_request.model_name}' is not authorized. "
                f"Please use one of the allowed models."
            )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://notebooklm-api.vercel.app",
            "X-Title": "NotebookLM Reimagined",
            "Content-Type": "application/json",
        }

        # Build messages array
        messages = []

        if validated_request.system_instruction:
            messages.append({
                "role": "system",
                "content": validated_request.system_instruction
            })

        messages.append({
            "role": "user",
            "content": validated_request.prompt
        })

        # Build request payload
        payload = {
            "model": validated_request.model_name,
            "messages": messages,
            "temperature": validated_request.temperature,
            "max_tokens": validated_request.max_tokens,
        }

        # Add provider filter if specified
        if validated_request.provider:
            payload["provider"] = {
                "order": [validated_request.provider]
            }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                data = response.json()

        except httpx.HTTPStatusError as e:
            # Sanitized error message - don't expose internal details
            logger.error(f"OpenRouter API error: {e.response.status_code}")
            raise ValueError(f"Content generation failed. Please try again later.") from e

        except httpx.RequestError as e:
            # Sanitized error message - don't expose connection details
            logger.error(f"OpenRouter request error: {e}")
            raise ValueError("Failed to connect to content generation service.") from e

        except Exception as e:
            # Generic sanitized error for unexpected issues
            logger.error(f"Unexpected error in generate_content: {e}")
            raise ValueError("An unexpected error occurred during content generation.") from e

        # Extract response data
        choice = data["choices"][0]
        content = choice["message"]["content"]

        # Extract usage information
        usage = data.get("usage", {})
        input_tokens = usage.get("prompt_tokens", 0)
        output_tokens = usage.get("completion_tokens", 0)

        # Calculate cost
        cost = calculate_cost(validated_request.model_name, input_tokens, output_tokens)

        return {
            "content": content,
            "usage": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost_usd": cost,
                "model_used": validated_request.model_name,
                "provider": data.get("provider", "openrouter"),
            },
            "raw_response": data,
        }

    async def generate_with_context(
        self,
        message: str,
        context: str,
        model_name: str = "anthropic/claude-3.5-sonnet",
        provider: Optional[str] = None,
        source_names: Optional[List[str]] = None,
        persona_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate content with document context for RAG.

        Security: Validates all inputs against Pydantic schema and model allowlist.
        Error messages are sanitized to prevent information disclosure.
        """
        base_instruction = """You are a helpful research assistant. Answer questions based on the provided sources.
Always cite your sources using [1], [2], etc. notation when referencing specific information.
If the information is not in the sources, say so clearly.
Be concise but thorough."""

        # Validate request parameters using Pydantic schema
        try:
            validated_request = OpenRouterContextRequest(
                message=message,
                context=context,
                model_name=model_name,
                provider=provider,
                source_names=source_names,
                persona_instructions=persona_instructions
            )
        except ValidationError as e:
            logger.warning(f"Invalid context request: {e}")
            raise ValueError("Invalid request parameters. Please check your input.") from e

        # Validate model name against allowlist
        if validated_request.model_name not in ALLOWED_OPENROUTER_MODELS:
            logger.warning(f"Blocked unauthorized model: {validated_request.model_name}")
            raise ValueError(
                f"Model '{validated_request.model_name}' is not authorized. "
                f"Please use one of the allowed models."
            )

        # Prepend persona instructions if provided
        if validated_request.persona_instructions:
            system_instruction = f"{validated_request.persona_instructions}\n\n{base_instruction}"
        else:
            system_instruction = base_instruction

        source_context = ""
        if validated_request.source_names:
            for i, name in enumerate(validated_request.source_names, 1):
                source_context += f"[{i}] Source: {name}\n"

        # Construct user message with context - more reliable format
        user_message = f"""Context sources:
{validated_request.context}

{source_context}Question: {validated_request.message}

Please answer based on the provided context sources, citing your sources."""

        return await self.generate_content(
            prompt=user_message,
            model_name=validated_request.model_name,
            provider=validated_request.provider,
            system_instruction=system_instruction,
        )

    async def get_available_models(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """Get list of available models from OpenRouter.

        Uses in-memory cache with 1-hour TTL to reduce API calls.
        The models list changes infrequently, so caching significantly
        improves performance for the /api/providers/models endpoint.

        Args:
            force_refresh: If True, bypass cache and fetch fresh data from API.

        Returns:
            List of model dictionaries with id, name, context_length,
            pricing, and provider information.

        Cache behavior:
            - Cache TTL: 1 hour (3600 seconds)
            - Thread-safe: Uses asyncio.Lock for concurrent requests
            - Manual invalidation: Use force_refresh=True or clear_models_cache()
        """
        current_time = time.time()
        cache_age = current_time - _models_cache["timestamp"]

        # Check if cache is valid
        if not force_refresh and _models_cache["data"] is not None and cache_age < MODELS_CACHE_TTL:
            logger.debug(f"Using cached models list (age: {cache_age:.0f}s)")
            return _models_cache["data"]

        # Cache miss or expired - fetch fresh data
        async with _models_cache_lock:
            # Double-check after acquiring lock (another request might have refreshed)
            current_time = time.time()
            cache_age = current_time - _models_cache["timestamp"]
            if not force_refresh and _models_cache["data"] is not None and cache_age < MODELS_CACHE_TTL:
                return _models_cache["data"]

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "HTTP-Referer": "https://notebooklm-api.vercel.app",
                "X-Title": "NotebookLM Reimagined",
            }

            logger.info("Fetching models list from OpenRouter API")
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/models",
                    headers=headers
                )
                response.raise_for_status()
                data = response.json()

            models = []
            for model in data.get("data", []):
                models.append({
                    "id": model["id"],
                    "name": model["name"],
                    "context_length": model.get("context_length", 4096),
                    "pricing": model.get("pricing", {}),
                    "provider": model.get("provider", {}).get("name", "unknown"),
                })

            # Update cache
            _models_cache["data"] = models
            _models_cache["timestamp"] = time.time()
            logger.info(f"Cached {len(models)} models (TTL: {MODELS_CACHE_TTL}s)")

            return models

    @classmethod
    def clear_models_cache(cls) -> None:
        """Clear the models cache.

        Use this to force a refresh on the next call to get_available_models().
        For example, after updating the allowlist or when you need fresh data.
        """
        _models_cache["data"] = None
        _models_cache["timestamp"] = 0
        logger.info("Models cache cleared")


# Singleton instance (created when API key is available)
_openrouter_service: Optional[OpenRouterService] = None


def get_openrouter_service() -> Optional[OpenRouterService]:
    """Get OpenRouter service instance if configured."""
    global _openrouter_service

    if _openrouter_service is None:
        api_key = getattr(settings, "openrouter_api_key", None)
        if api_key:
            _openrouter_service = OpenRouterService(api_key=api_key)

    return _openrouter_service
