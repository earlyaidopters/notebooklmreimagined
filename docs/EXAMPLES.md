# Multi-LLM Provider Usage Examples

This document provides practical examples for using the multi-provider LLM support in NotebookLM Reimagined.

## Table of Contents

- [Basic Examples](#basic-examples)
- [Provider Selection Strategies](#provider-selection-strategies)
- [Cost Optimization](#cost-optimization)
- [Model Comparison](#model-comparison)
- [n8n Integration](#n8n-integration)
- [Advanced Patterns](#advanced-patterns)

## Basic Examples

### Example 1: Simple Chat with Default Provider

```bash
# Uses default provider (Google Gemini)
curl -X POST "https://notebooklm-api.vercel.app/api/v1/notebooks/{id}/chat" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the key findings in this research?"
  }'
```

### Example 2: Explicit Provider Selection

```bash
# Use Google Gemini explicitly
curl -X POST "https://notebooklm-api.vercel.app/api/v1/notebooks/{id}/chat" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Summarize the main points",
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
```

### Example 3: Chat with Source Selection

```bash
# Use specific sources with Claude
curl -X POST "https://notebooklm-api.vercel.app/api/v1/notebooks/{id}/chat" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What do the technical papers say about X?",
    "provider": "openrouter",
    "provider_model": "anthropic/claude-3.5-sonnet",
    "source_ids": ["uuid-1", "uuid-2", "uuid-3"]
  }'
```

## Provider Selection Strategies

### Strategy 1: Task-Based Selection

```python
import requests

API_KEY = "your_api_key"
NOTEBOOK_ID = "your_notebook_id"
BASE_URL = "https://notebooklm-api.vercel.app"

def chat(message, task_type="general"):
    """Select provider based on task type"""
    providers = {
        "general": {"provider": "google", "model": "gemini-2.0-flash"},
        "analysis": {"provider": "openrouter", "provider_model": "anthropic/claude-3.5-sonnet"},
        "reasoning": {"provider": "openrouter", "provider_model": "openai/gpt-4"},
        "coding": {"provider": "openrouter", "provider_model": "anthropic/claude-3.5-sonnet"},
        "cost_conscious": {"provider": "google", "model": "gemini-2.0-flash"},
    }

    config = providers.get(task_type, providers["general"])

    response = requests.post(
        f"{BASE_URL}/api/v1/notebooks/{NOTEBOOK_ID}/chat",
        headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
        json={
            "message": message,
            **config
        }
    )

    return response.json()

# Examples
result = chat("Summarize this", task_type="general")
result = chat("Analyze the methodology", task_type="analysis")
result = chat("What are the implications?", task_type="reasoning")
```

### Strategy 2: Cost-Budgeted Selection

```python
def chat_with_budget(message, max_cost_usd=0.01):
    """Select provider based on cost budget"""

    # Check current costs
    providers_response = requests.get(
        f"{BASE_URL}/api/providers/config",
        headers={"X-API-Key": API_KEY}
    )

    # Choose model based on budget
    if max_cost_usd >= 0.01:
        config = {"provider": "openrouter", "provider_model": "anthropic/claude-3.5-sonnet"}
    elif max_cost_usd >= 0.005:
        config = {"provider": "google", "model": "gemini-2.5-flash"}
    else:
        config = {"provider": "google", "model": "gemini-2.0-flash"}

    response = requests.post(
        f"{BASE_URL}/api/v1/notebooks/{NOTEBOOK_ID}/chat",
        headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
        json={
            "message": message,
            **config
        }
    )

    return response.json()

# Examples
result = chat_with_budget("Quick summary", max_cost_usd=0.001)
result = chat_with_budget("Deep analysis", max_cost_usd=0.02)
```

### Strategy 3: A/B Testing Models

```python
def compare_models(message, models=None):
    """Compare responses from different models"""

    if models is None:
        models = [
            {"provider": "google", "model": "gemini-2.0-flash"},
            {"provider": "openrouter", "provider_model": "anthropic/claude-3.5-sonnet"},
            {"provider": "openrouter", "provider_model": "openai/gpt-4-turbo"},
        ]

    results = []
    for config in models:
        response = requests.post(
            f"{BASE_URL}/api/v1/notebooks/{NOTEBOOK_ID}/chat",
            headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
            json={
                "message": message,
                **config
            }
        )
        results.append({
            "config": config,
            "response": response.json()
        })

    # Compare costs
    for result in results:
        config = result["config"]
        usage = result["response"]["usage"]
        model = config.get("provider_model") or config.get("model")
        print(f"{model}: ${usage['cost_usd']:.6f} - {usage['input_tokens'] + usage['output_tokens']} tokens")

    return results

# Example
results = compare_models("What are the key themes in this research?")
```

## Cost Optimization

### Example 1: Tiered Processing

```python
def process_research_pipeline(questions):
    """Use different models for different processing stages"""

    results = []
    for question in questions:

        # Stage 1: Quick skimming with fast/cheap model
        quick_response = requests.post(
            f"{BASE_URL}/api/v1/notebooks/{NOTEBOOK_ID}/chat",
            headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
            json={
                "message": f"Give me a 2-sentence summary: {question}",
                "provider": "google",
                "model": "gemini-2.0-flash"
            }
        ).json()

        # Stage 2: If needed, deep dive with better model
        if "needs analysis" in quick_response["data"]["response"].lower():
            detailed_response = requests.post(
                f"{BASE_URL}/api/v1/notebooks/{NOTEBOOK_ID}/chat",
                headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
                json={
                    "message": question,
                    "provider": "openrouter",
                    "provider_model": "anthropic/claude-3.5-sonnet"
                }
            ).json()

            results.append(detailed_response)
        else:
            results.append(quick_response)

    return results
```

### Example 2: Batch Processing with Cost Tracking

```python
def batch_chat_with_cost_tracking(messages):
    """Process multiple messages and track total cost"""

    total_cost = 0
    total_tokens = 0
    results = []

    for message in messages:
        response = requests.post(
            f"{BASE_URL}/api/v1/notebooks/{NOTEBOOK_ID}/chat",
            headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
            json={
                "message": message,
                "provider": "google",
                "model": "gemini-2.0-flash"
            }
        ).json()

        usage = response["usage"]
        total_cost += usage["cost_usd"]
        total_tokens += usage["input_tokens"] + usage["output_tokens"]

        results.append({
            "message": message,
            "response": response["data"]["response"],
            "cost": usage["cost_usd"]
        })

    print(f"Total cost: ${total_cost:.6f} for {total_tokens} tokens")

    return results
```

## Model Comparison

### Example 1: Benchmarking Models

```python
def benchmark_models(test_questions):
    """Benchmark multiple models on the same questions"""

    models = [
        {"provider": "google", "model": "gemini-2.0-flash", "name": "Gemini 2.0 Flash"},
        {"provider": "openrouter", "provider_model": "anthropic/claude-3.5-sonnet", "name": "Claude 3.5 Sonnet"},
        {"provider": "openrouter", "provider_model": "openai/gpt-4-turbo", "name": "GPT-4 Turbo"},
    ]

    benchmark_results = {}

    for model_config in models:
        model_name = model_config["name"]
        benchmark_results[model_name] = {
            "total_cost": 0,
            "total_tokens": 0,
            "responses": []
        }

        for question in test_questions:
            response = requests.post(
                f"{BASE_URL}/api/v1/notebooks/{NOTEBOOK_ID}/chat",
                headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
                json={
                    "message": question,
                    **{k: v for k, v in model_config.items() if k != "name"}
                }
            ).json()

            usage = response["usage"]
            benchmark_results[model_name]["total_cost"] += usage["cost_usd"]
            benchmark_results[model_name]["total_tokens"] += usage["input_tokens"] + usage["output_tokens"]
            benchmark_results[model_name]["responses"].append(response["data"]["response"])

    # Print results
    for model_name, stats in benchmark_results.items():
        print(f"{model_name}: ${stats['total_cost']:.6f} for {stats['total_tokens']} tokens")

    return benchmark_results
```

### Example 2: Quality vs Cost Trade-off

```python
def analyze_quality_cost_tradeoff(question):
    """Analyze the quality-cost trade-off for a question"""

    models = [
        {"provider": "google", "model": "gemini-2.0-flash", "tier": "budget"},
        {"provider": "google", "model": "gemini-2.5-flash", "tier": "standard"},
        {"provider": "openrouter", "provider_model": "anthropic/claude-3.5-sonnet", "tier": "premium"},
    ]

    results = []

    for model_config in models:
        response = requests.post(
            f"{BASE_URL}/api/v1/notebooks/{NOTEBOOK_ID}/chat",
            headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
            json={
                "message": question,
                **{k: v for k, v in model_config.items() if k != "tier"}
            }
        ).json()

        results.append({
            "tier": model_config["tier"],
            "model": model_config.get("provider_model") or model_config.get("model"),
            "cost": response["usage"]["cost_usd"],
            "tokens": response["usage"]["input_tokens"] + response["usage"]["output_tokens"],
            "response_length": len(response["data"]["response"])
        })

    # Analyze trade-offs
    for result in results:
        cost_per_char = result["cost"] / result["response_length"]
        print(f"{result['tier']}: ${result['cost']:.6f}, {result['tokens']} tokens, ${cost_per_char:.8f} per character")

    return results
```

## n8n Integration

### Example 1: Dynamic Provider Selection in n8n

```json
{
  "nodes": [
    {
      "name": "HTTP Request - Chat",
      "type": "n8n-nodes-base.httpRequest",
      "position": [250, 300],
      "parameters": {
        "url": "https://notebooklm-api.vercel.app/api/v1/notebooks/{{ $json.notebook_id }}/chat",
        "method": "POST",
        "headers": {
          "X-API-Key": "={{ $env.API_KEY }}",
          "Content-Type": "application/json"
        },
        "body": {
          "message": "={{ $json.message }}",
          "provider": "={{ $json.task_type === 'complex' ? 'openrouter' : 'google' }}",
          "provider_model": "={{ $json.task_type === 'complex' ? 'anthropic/claude-3.5-sonnet' : undefined }}"
        }
      }
    }
  ]
}
```

### Example 2: Cost Monitoring Workflow

```json
{
  "nodes": [
    {
      "name": "Function - Calculate Budget",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "code": "const budget = $input.first().json.budget;\nreturn [{\n  json: {\n    provider: budget > 0.01 ? 'openrouter' : 'google',\n    model: budget > 0.01 ? 'anthropic/claude-3.5-sonnet' : 'gemini-2.0-flash'\n  }\n}];"
      }
    }
  ]
}
```

## Advanced Patterns

### Example 1: Fallback Strategy

```python
def chat_with_fallback(message, preferred_provider="openrouter"):
    """Try preferred provider, fall back to Google if it fails"""

    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/notebooks/{NOTEBOOK_ID}/chat",
            headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
            json={
                "message": message,
                "provider": preferred_provider,
                "provider_model": "anthropic/claude-3.5-sonnet"
            },
            timeout=30
        )
        response.raise_for_status()
        return response.json()

    except (requests.RequestException, KeyError) as e:
        print(f"Primary provider failed: {e}, falling back to Google")

        response = requests.post(
            f"{BASE_URL}/api/v1/notebooks/{NOTEBOOK_ID}/chat",
            headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
            json={
                "message": message,
                "provider": "google",
                "model": "gemini-2.5-flash"
            },
            timeout=30
        )
        response.raise_for_status()
        return response.json()
```

### Example 2: Provider Rotation

```python
def chat_with_rotation(message, notebook_id):
    """Rotate providers to distribute load"""

    providers = [
        {"provider": "google", "model": "gemini-2.0-flash"},
        {"provider": "openrouter", "provider_model": "anthropic/claude-3.5-sonnet"},
        {"provider": "openrouter", "provider_model": "openai/gpt-4-turbo"},
    ]

    # Use a simple counter or hash to select provider
    provider_index = hash(notebook_id) % len(providers)
    selected_provider = providers[provider_index]

    response = requests.post(
        f"{BASE_URL}/api/v1/notebooks/{NOTEBOOK_ID}/chat",
        headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
        json={
            "message": message,
            **selected_provider
        }
    )

    return response.json()
```

### Example 3: Context-Aware Provider Selection

```python
def chat_with_context_awareness(message, context_metadata):
    """Select provider based on context metadata"""

    # Analyze context to determine best provider
    message_length = len(message)
    source_count = context_metadata.get("source_count", 0)
    complexity_score = context_metadata.get("complexity", "low")

    if complexity_score == "high" or source_count > 10:
        # Complex task with many sources - use best model
        config = {"provider": "openrouter", "provider_model": "anthropic/claude-3.5-sonnet"}
    elif message_length > 1000:
        # Long message - use model with large context
        config = {"provider": "openrouter", "provider_model": "openai/gpt-4-turbo"}
    else:
        # Simple task - use fast model
        config = {"provider": "google", "model": "gemini-2.0-flash"}

    response = requests.post(
        f"{BASE_URL}/api/v1/notebooks/{NOTEBOOK_ID}/chat",
        headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
        json={
            "message": message,
            **config
        }
    )

    return response.json()
```

## Best Practices

1. **Always check provider availability** before making requests
2. **Implement fallback strategies** for production reliability
3. **Monitor costs** using the `usage` field in responses
4. **Use appropriate models** for the task (don't over-engineer)
5. **Implement rate limiting** to respect provider quotas
6. **Cache responses** when appropriate to reduce costs
7. **Test different models** to find the best fit for your use case
8. **Set spending limits** in your OpenRouter dashboard

## Additional Resources

- [PROVIDERS.md](./PROVIDERS.md) - Comprehensive provider documentation
- [SECURITY.md](./SECURITY.md) - Security considerations
- [API Reference](../README.md#api-reference) - Complete API documentation
- [OpenRouter Models](https://openrouter.ai/models) - Available models and pricing
