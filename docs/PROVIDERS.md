# Multi-LLM Provider Support

NotebookLM Reimagined supports multiple AI providers, giving you flexibility in model selection, cost optimization, and performance.

## Overview

The system currently supports two providers:

### Google Gemini (Default)
- **Models**: `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-2.5-pro`, `gemini-2.5-flash`
- **Best for**: Fast, cost-effective responses
- **Pricing**: Competitive per-token pricing
- **Setup**: Requires `GOOGLE_API_KEY` environment variable

### OpenRouter (100+ Models)
- **Models**: Claude 3.5 Sonnet, GPT-4, Llama 3.1, and 90+ more
- **Best for**: Access to diverse model ecosystem, specialized models
- **Pricing**: Varies by model (see [OpenRouter pricing](https://openrouter.ai/models))
- **Setup**: Requires `OPENROUTER_API_KEY` environment variable

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Required: Google Gemini (default provider)
GOOGLE_API_KEY=AIza...

# Optional: OpenRouter Multi-LLM Support
OPENROUTER_API_KEY=sk-or-...
DEFAULT_LLM_PROVIDER=google  # "google" or "openrouter"
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_PROVIDER=  # Optional: specific OpenRouter provider to route through
```

### Getting API Keys

**Google Gemini:**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to your environment variables

**OpenRouter:**
1. Visit [OpenRouter](https://openrouter.ai/keys)
2. Create an account and generate an API key
3. Add to your environment variables

## Usage

### Basic Chat with Provider Selection

```bash
# Use Google Gemini (default)
curl -X POST "https://notebooklm-api.vercel.app/api/v1/notebooks/{id}/chat" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Summarize the key points",
    "provider": "google",
    "model": "gemini-2.5-flash"
  }'

# Use OpenRouter with Claude
curl -X POST "https://notebooklm-api.vercel.app/api/v1/notebooks/{id}/chat" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Analyze this in depth",
    "provider": "openrouter",
    "provider_model": "anthropic/claude-3.5-sonnet"
  }'

# Use default provider (configured via DEFAULT_LLM_PROVIDER)
curl -X POST "https://notebooklm-api.vercel.app/api/v1/notebooks/{id}/chat" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the main themes?"
  }'
```

### Provider Selection Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `provider` | string | `"google"` or `"openrouter"` (optional, uses default if not specified) |
| `provider_model` | string | Model identifier (e.g., `"anthropic/claude-3.5-sonnet"`) (optional) |
| `model` | string | Alias for `provider_model` when using Google provider (optional) |

### Response Format

All responses include provider and model information:

```json
{
  "data": {
    "response": "Based on your sources...",
    "citations": [
      {"source_id": "uuid", "source_name": "Research Paper", "text": "relevant quote"}
    ]
  },
  "usage": {
    "input_tokens": 1500,
    "output_tokens": 500,
    "cost_usd": 0.002,
    "model_used": "anthropic/claude-3.5-sonnet",
    "provider": "openrouter"
  }
}
```

## API Endpoints

### List Providers

Get all available providers and their status:

```bash
curl -X GET "https://notebooklm-api.vercel.app/api/providers" \
  -H "X-API-Key: YOUR_API_KEY"
```

Response:
```json
{
  "providers": [
    {
      "id": "google",
      "name": "Google Gemini",
      "description": "Original NotebookLM LLM provider",
      "available": true,
      "models": ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"]
    },
    {
      "id": "openrouter",
      "name": "OpenRouter",
      "description": "Access to 100+ LLM providers via unified API",
      "available": true,
      "models": ["anthropic/claude-3.5-sonnet", "openai/gpt-4", ...]
    }
  ],
  "default_provider": "google",
  "default_model": "gemini-2.0-flash"
}
```

### Get Provider Configuration

Get current provider configuration:

```bash
curl -X GET "https://notebooklm-api.vercel.app/api/providers/config" \
  -H "X-API-Key: YOUR_API_KEY"
```

Response:
```json
{
  "default_provider": "google",
  "openrouter_default_model": "anthropic/claude-3.5-sonnet",
  "openrouter_provider": "",
  "google_configured": true,
  "openrouter_configured": true
}
```

### List OpenRouter Models

Get all available models from OpenRouter:

```bash
curl -X GET "https://notebooklm-api.vercel.app/api/providers/models" \
  -H "X-API-Key: YOUR_API_KEY"
```

Response:
```json
{
  "models": [
    {
      "id": "anthropic/claude-3.5-sonnet",
      "name": "Claude 3.5 Sonnet",
      "context_length": 200000,
      "pricing": {"prompt": 0.000003, "completion": 0.000015},
      "provider": "Anthropic"
    },
    ...
  ],
  "count": 100
}
```

## Popular Models

### Google Gemini Models

| Model | Context | Best For |
|-------|---------|----------|
| `gemini-2.0-flash` | 1M | Fast responses, cost-effective |
| `gemini-2.0-flash-lite` | 1M | Ultra-fast, simple queries |
| `gemini-2.5-pro` | 1M | Complex reasoning, analysis |
| `gemini-2.5-flash` | 1M | Balanced speed and quality |

### OpenRouter Popular Models

| Model | Context | Best For |
|-------|---------|----------|
| `anthropic/claude-3.5-sonnet` | 200K | General purpose, coding, analysis |
| `anthropic/claude-3-opus` | 200K | Complex reasoning, nuance |
| `openai/gpt-4-turbo` | 128K | General purpose, well-rounded |
| `openai/gpt-4` | 8K | Complex tasks, reasoning |
| `google/gemini-2.5-flash` | 1M | Fast, cost-effective |
| `google/gemini-2.5-pro` | 1M | High quality, complex tasks |
| `meta/llama-3.1-70b` | 128K | Open source alternative |
| `zai/c3-7b` | 32K | Lightweight, fast queries |
| `zai/c3-13b` | 32K | Balanced performance |
| `zai/c3-40b` | 32K | High quality, cost-effective |

## Cost Comparison

Approximate costs per 1M tokens (input/output):

| Model | Input | Output | Ratio |
|-------|-------|--------|-------|
| `gemini-2.0-flash` | $0.10 | $0.40 | 1:4 |
| `gemini-2.5-flash` | $0.15 | $0.60 | 1:4 |
| `gemini-2.5-pro` | $1.25 | $10.00 | 1:8 |
| `claude-3.5-sonnet` | $3.00 | $15.00 | 1:5 |
| `claude-3-opus` | $15.00 | $75.00 | 1:5 |
| `gpt-4-turbo` | $10.00 | $30.00 | 1:3 |
| `gpt-4` | $30.00 | $60.00 | 1:2 |
| `llama-3.1-70b` | $0.70 | $0.70 | 1:1 |
| `zai/c3-7b` | $0.05 | $0.05 | 1:1 |

*Pricing as of 2025-01-24. Actual costs may vary. See [OpenRouter pricing](https://openrouter.ai/models) for current rates.*

## Best Practices

### Choosing a Provider

**Use Google Gemini when:**
- You need fast, cost-effective responses
- You're working with large context (up to 1M tokens)
- You want consistent, reliable performance

**Use OpenRouter when:**
- You need specific model capabilities (e.g., Claude for coding, GPT-4 for reasoning)
- You want to compare model outputs
- You need features not available in Gemini (e.g., specific context windows)

### Setting Defaults

For production deployments, set a sensible default:

```bash
# Cost-conscious deployment
DEFAULT_LLM_PROVIDER=google
OPENROUTER_DEFAULT_MODEL=gemini-2.0-flash

# Quality-focused deployment
DEFAULT_LLM_PROVIDER=openrouter
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet

# Balanced approach
DEFAULT_LLM_PROVIDER=google
OPENROUTER_DEFAULT_MODEL=gemini-2.5-flash
```

### Error Handling

If a provider is not configured, the API will return an error:

```json
{
  "detail": "OpenRouter not configured. Add OPENROUTER_API_KEY to environment."
}
```

Always check provider availability before making requests:

```bash
# Check if OpenRouter is available
curl -X GET "https://notebooklm-api.vercel.app/api/providers" \
  -H "X-API-Key: YOUR_API_KEY" | jq '.providers[] | select(.id=="openrouter") | .available'
```

## Security Considerations

1. **API Key Storage**: Never commit API keys to version control. Use environment variables or secret management services.
2. **Access Control**: Provider endpoints respect the same authentication as other API endpoints (via `X-API-Key` header).
3. **Rate Limits**: Both providers have rate limits. Implement exponential backoff for production use.
4. **Cost Monitoring**: Monitor usage through the `usage` field in responses to track costs.

## Troubleshooting

### "Provider not configured" error

**Problem**: You're trying to use OpenRouter but haven't set the API key.

**Solution**:
```bash
# Add to your .env file
OPENROUTER_API_KEY=sk-or-...
```

### Model not found

**Problem**: You specified a model that doesn't exist or isn't available.

**Solution**:
```bash
# List available models
curl -X GET "https://notebooklm-api.vercel.app/api/providers/models" \
  -H "X-API-Key: YOUR_API_KEY"
```

### High costs

**Problem**: Usage is higher than expected.

**Solution**:
1. Check the `cost_usd` field in responses
2. Switch to a more cost-effective model (e.g., `gemini-2.0-flash`)
3. Implement caching for repeated queries
4. Use `provider_model` to specify cheaper models for simple tasks

## Migration Guide

### From Google-Only Setup

If you're currently using only Google Gemini, adding OpenRouter is straightforward:

1. Get an OpenRouter API key
2. Add `OPENROUTER_API_KEY` to your environment
3. Optionally set `DEFAULT_LLM_PROVIDER=openrouter`
4. Update your chat requests to include `provider` parameter

Your existing requests will continue to work without changes, as Google Gemini remains the default provider.

## Additional Resources

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [OpenRouter Model Pricing](https://openrouter.ai/models)
- [Google AI Documentation](https://ai.google.dev/docs)
- [API Reference](./README.md#api-reference)
