import httpx
from typing import Optional, List, Dict, Any
from app.config import get_settings

settings = get_settings()

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
        """Generate content using OpenRouter."""

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://notebooklm-api.vercel.app",
            "X-Title": "NotebookLM Reimagined",
            "Content-Type": "application/json",
        }

        # Build messages array
        messages = []

        if system_instruction:
            messages.append({
                "role": "system",
                "content": system_instruction
            })

        messages.append({
            "role": "user",
            "content": prompt
        })

        # Build request payload
        payload = {
            "model": model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        # Add provider filter if specified
        if provider:
            payload["provider"] = {
                "order": [provider]
            }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()

        # Extract response data
        choice = data["choices"][0]
        content = choice["message"]["content"]

        # Extract usage information
        usage = data.get("usage", {})
        input_tokens = usage.get("prompt_tokens", 0)
        output_tokens = usage.get("completion_tokens", 0)

        # Calculate cost
        cost = calculate_cost(model_name, input_tokens, output_tokens)

        return {
            "content": content,
            "usage": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost_usd": cost,
                "model_used": model_name,
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
        """Generate content with document context for RAG."""
        base_instruction = """You are a helpful research assistant. Answer questions based on the provided sources.
Always cite your sources using [1], [2], etc. notation when referencing specific information.
If the information is not in the sources, say so clearly.
Be concise but thorough."""

        # Prepend persona instructions if provided
        if persona_instructions:
            system_instruction = f"{persona_instructions}\n\n{base_instruction}"
        else:
            system_instruction = base_instruction

        source_context = ""
        if source_names:
            for i, name in enumerate(source_names, 1):
                source_context += f"[{i}] Source: {name}\n"

        prompt = f"""Sources:
{context}

{source_context}

User Question: {message}

Provide a well-cited response:"""

        return await self.generate_content(
            prompt=prompt,
            model_name=model_name,
            provider=provider,
            system_instruction=system_instruction,
        )

    async def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of available models from OpenRouter."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://notebooklm-api.vercel.app",
            "X-Title": "NotebookLM Reimagined",
        }

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

        return models


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
