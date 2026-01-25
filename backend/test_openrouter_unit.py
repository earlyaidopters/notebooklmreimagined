#!/usr/bin/env python3
"""
Unit tests for OpenRouter service with mocked HTTP client.

These tests use pytest and pytest-asyncio to test the OpenRouterService
without making real network calls. All HTTP interactions are mocked.
"""

import pytest
from unittest.mock import AsyncMock, Mock, patch, MagicMock
from datetime import datetime
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.openrouter import OpenRouterService, calculate_cost, MODEL_PRICING
from app.models.schemas import ALLOWED_OPENROUTER_MODELS


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def mock_api_key():
    """Fixture providing a test API key."""
    return "test-api-key-12345"


@pytest.fixture
def openrouter_service(mock_api_key):
    """Fixture providing an OpenRouterService instance."""
    return OpenRouterService(api_key=mock_api_key)


@pytest.fixture
def mock_httpx_client():
    """Fixture providing a mocked httpx.AsyncClient."""
    mock_client = AsyncMock()
    return mock_client


@pytest.fixture
def successful_chat_response():
    """Fixture providing a successful OpenRouter chat completion response."""
    return {
        "id": "chatcmpl-123",
        "provider": "anthropic",
        "model": "anthropic/claude-3.5-sonnet",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "Test response content"
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": 10,
            "completion_tokens": 20,
            "total_tokens": 30
        }
    }


@pytest.fixture
def successful_models_response():
    """Fixture providing a successful OpenRouter models list response."""
    return {
        "data": [
            {
                "id": "anthropic/claude-3.5-sonnet",
                "name": "Claude 3.5 Sonnet",
                "context_length": 200000,
                "pricing": {"prompt": "3.0", "completion": "15.0"},
                "provider": {"name": "Anthropic"}
            },
            {
                "id": "openai/gpt-4",
                "name": "GPT-4",
                "context_length": 8192,
                "pricing": {"prompt": "30.0", "completion": "60.0"},
                "provider": {"name": "OpenAI"}
            }
        ]
    }


# ============================================================================
# calculate_cost() Tests
# ============================================================================

class TestCalculateCost:
    """Test the calculate_cost utility function."""

    def test_calculate_cost_known_model(self):
        """Test cost calculation for a known model."""
        # Claude 3.5 Sonnet: $3.0 input, $15.0 output per 1M tokens
        cost = calculate_cost("anthropic/claude-3.5-sonnet", 1000, 500)
        expected_input_cost = (1000 / 1_000_000) * 3.0
        expected_output_cost = (500 / 1_000_000) * 15.0
        expected_total = round(expected_input_cost + expected_output_cost, 6)

        assert cost == expected_total
        assert cost > 0

    def test_calculate_cost_unknown_model_defaults_to_gemini(self):
        """Test that unknown models default to Gemini Flash pricing."""
        # Unknown model should use google/gemini-2.0-flash pricing
        cost = calculate_cost("unknown/model", 1000, 500)
        expected_input_cost = (1000 / 1_000_000) * 0.10
        expected_output_cost = (500 / 1_000_000) * 0.40
        expected_total = round(expected_input_cost + expected_output_cost, 6)

        assert cost == expected_total

    def test_calculate_cost_zero_tokens(self):
        """Test cost calculation with zero tokens."""
        cost = calculate_cost("anthropic/claude-3.5-sonnet", 0, 0)
        assert cost == 0.0

    def test_calculate_cost_large_token_count(self):
        """Test cost calculation with large token counts."""
        # 1M tokens input, 500K output
        cost = calculate_cost("openai/gpt-4", 1_000_000, 500_000)
        # GPT-4: $30 input, $60 output per 1M
        expected = 30.0 + (500_000 / 1_000_000) * 60.0
        assert cost == round(expected, 6)

    def test_calculate_cost_all_pricing_models(self):
        """Test cost calculation for all models in pricing table."""
        test_tokens = (1000, 500)

        for model, pricing in MODEL_PRICING.items():
            cost = calculate_cost(model, *test_tokens)
            assert cost >= 0, f"Cost calculation failed for {model}"
            assert cost < 1.0, f"Cost unusually high for {model}: {cost}"


# ============================================================================
# OpenRouterService.__init__() Tests
# ============================================================================

class TestOpenRouterServiceInit:
    """Test OpenRouterService initialization."""

    def test_init_with_api_key(self, mock_api_key):
        """Test initialization with provided API key."""
        service = OpenRouterService(api_key=mock_api_key)
        assert service.api_key == mock_api_key
        assert service.base_url == "https://openrouter.ai/api/v1"

    def test_init_without_api_key_raises_error(self):
        """Test that initialization without API key raises ValueError."""
        # Patch both the settings module-level import and the get_settings function
        with patch('app.services.openrouter.settings') as mock_settings:
            # Make openrouter_api_key return None
            type(mock_settings).openrouter_api_key = None

            with pytest.raises(ValueError, match="OpenRouter API key not configured"):
                OpenRouterService(api_key=None)


# ============================================================================
# generate_content() Tests - Success Cases
# ============================================================================

class TestGenerateContentSuccess:
    """Test successful content generation scenarios."""

    @pytest.mark.asyncio
    async def test_generate_content_basic(self, openrouter_service, successful_chat_response):
        """Test basic content generation."""
        with patch('httpx.AsyncClient') as mock_client_class:
            # Setup mock response
            mock_response = Mock()
            mock_response.json.return_value = successful_chat_response
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            # Execute
            result = await openrouter_service.generate_content(
                prompt="What is 2+2?",
                model_name="anthropic/claude-3.5-sonnet"
            )

            # Assertions
            assert result["content"] == "Test response content"
            assert result["usage"]["input_tokens"] == 10
            assert result["usage"]["output_tokens"] == 20
            assert result["usage"]["model_used"] == "anthropic/claude-3.5-sonnet"
            assert result["usage"]["cost_usd"] > 0
            assert "raw_response" in result

    @pytest.mark.asyncio
    async def test_generate_content_with_system_instruction(self, openrouter_service, successful_chat_response):
        """Test content generation with system instruction."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = successful_chat_response
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            system_instruction = "You are a helpful assistant."
            result = await openrouter_service.generate_content(
                prompt="Hello",
                system_instruction=system_instruction
            )

            # Verify the request was made correctly
            call_args = mock_client.post.call_args
            payload = call_args[1]["json"]
            messages = payload["messages"]

            # Check system message is first
            assert messages[0]["role"] == "system"
            assert messages[0]["content"] == system_instruction
            assert messages[1]["role"] == "user"
            assert messages[1]["content"] == "Hello"

    @pytest.mark.asyncio
    async def test_generate_content_with_provider_filter(self, openrouter_service, successful_chat_response):
        """Test content generation with provider filter."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = successful_chat_response
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            result = await openrouter_service.generate_content(
                prompt="Hello",
                provider="anthropic"
            )

            # Verify provider filter in payload
            call_args = mock_client.post.call_args
            payload = call_args[1]["json"]
            assert "provider" in payload
            assert payload["provider"]["order"] == ["anthropic"]

    @pytest.mark.asyncio
    async def test_generate_content_with_custom_temperature(self, openrouter_service, successful_chat_response):
        """Test content generation with custom temperature."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = successful_chat_response
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            result = await openrouter_service.generate_content(
                prompt="Hello",
                temperature=0.3
            )

            # Verify temperature in payload
            call_args = mock_client.post.call_args
            payload = call_args[1]["json"]
            assert payload["temperature"] == 0.3

    @pytest.mark.asyncio
    async def test_generate_content_with_custom_max_tokens(self, openrouter_service, successful_chat_response):
        """Test content generation with custom max_tokens."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = successful_chat_response
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            result = await openrouter_service.generate_content(
                prompt="Hello",
                max_tokens=2048
            )

            # Verify max_tokens in payload
            call_args = mock_client.post.call_args
            payload = call_args[1]["json"]
            assert payload["max_tokens"] == 2048

    @pytest.mark.asyncio
    async def test_generate_content_all_allowed_models(self, openrouter_service, successful_chat_response):
        """Test that all models in allowlist are accepted."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = successful_chat_response
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            for model in ALLOWED_OPENROUTER_MODELS:
                result = await openrouter_service.generate_content(
                    prompt="Test",
                    model_name=model
                )
                assert result["usage"]["model_used"] == model


# ============================================================================
# generate_content() Tests - Input Validation
# ============================================================================

class TestGenerateContentValidation:
    """Test input validation for generate_content."""

    @pytest.mark.asyncio
    async def test_empty_prompt_raises_value_error(self, openrouter_service):
        """Test that empty prompt raises ValueError."""
        with pytest.raises(ValueError, match="Invalid request parameters"):
            await openrouter_service.generate_content(
                prompt="",
                model_name="anthropic/claude-3.5-sonnet"
            )

    @pytest.mark.asyncio
    async def test_prompt_too_long_raises_value_error(self, openrouter_service):
        """Test that prompt exceeding max_length raises ValueError."""
        # Create a prompt longer than 50000 characters
        long_prompt = "a" * 50001

        with pytest.raises(ValueError, match="Invalid request parameters"):
            await openrouter_service.generate_content(
                prompt=long_prompt,
                model_name="anthropic/claude-3.5-sonnet"
            )

    @pytest.mark.asyncio
    async def test_temperature_below_minimum_raises_value_error(self, openrouter_service):
        """Test that temperature < 0 raises ValueError."""
        with pytest.raises(ValueError, match="Invalid request parameters"):
            await openrouter_service.generate_content(
                prompt="Hello",
                temperature=-0.1
            )

    @pytest.mark.asyncio
    async def test_temperature_above_maximum_raises_value_error(self, openrouter_service):
        """Test that temperature > 2.0 raises ValueError."""
        with pytest.raises(ValueError, match="Invalid request parameters"):
            await openrouter_service.generate_content(
                prompt="Hello",
                temperature=2.1
            )

    @pytest.mark.asyncio
    async def test_max_tokens_below_minimum_raises_value_error(self, openrouter_service):
        """Test that max_tokens < 1 raises ValueError."""
        with pytest.raises(ValueError, match="Invalid request parameters"):
            await openrouter_service.generate_content(
                prompt="Hello",
                max_tokens=0
            )

    @pytest.mark.asyncio
    async def test_max_tokens_above_maximum_raises_value_error(self, openrouter_service):
        """Test that max_tokens > 32768 raises ValueError."""
        with pytest.raises(ValueError, match="Invalid request parameters"):
            await openrouter_service.generate_content(
                prompt="Hello",
                max_tokens=32769
            )

    @pytest.mark.asyncio
    async def test_unauthorized_model_rejected(self, openrouter_service):
        """Test that unauthorized model is rejected."""
        with pytest.raises(ValueError, match="not authorized"):
            await openrouter_service.generate_content(
                prompt="Hello",
                model_name="unauthorized/malicious-model"
            )

    @pytest.mark.asyncio
    async def test_system_instruction_too_long_raises_value_error(self, openrouter_service):
        """Test that system_instruction exceeding max_length raises ValueError."""
        long_instruction = "a" * 10001

        with pytest.raises(ValueError, match="Invalid request parameters"):
            await openrouter_service.generate_content(
                prompt="Hello",
                system_instruction=long_instruction
            )


# ============================================================================
# generate_content() Tests - Error Handling
# ============================================================================

class TestGenerateContentErrors:
    """Test error handling in generate_content."""

    @pytest.mark.asyncio
    async def test_http_status_error_sanitized(self, openrouter_service):
        """Test that HTTP errors are sanitized in error message."""
        with patch('httpx.AsyncClient') as mock_client_class:
            # Setup mock to raise HTTPStatusError
            mock_response = Mock()
            mock_response.status_code = 401
            mock_response.text = "Unauthorized: Invalid API key"

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.side_effect = Mock(
                side_effect=Exception("HTTP error")
            )
            mock_client_class.return_value = mock_client

            # Import httpx for the exception
            import httpx

            # Create proper HTTPStatusError
            async def mock_post_with_error(*args, **kwargs):
                raise httpx.HTTPStatusError(
                    "Client error '401 Unauthorized'",
                    request=Mock(),
                    response=mock_response
                )

            mock_client.post = mock_post_with_error

            # Execute and verify sanitized error
            with pytest.raises(ValueError, match="Content generation failed"):
                await openrouter_service.generate_content(prompt="Hello")

            # Verify original error details are NOT exposed
            try:
                await openrouter_service.generate_content(prompt="Hello")
            except ValueError as e:
                error_msg = str(e)
                assert "Invalid API key" not in error_msg
                assert "401" not in error_msg

    @pytest.mark.asyncio
    async def test_request_error_sanitized(self, openrouter_service):
        """Test that request errors are sanitized."""
        with patch('httpx.AsyncClient') as mock_client_class:
            import httpx

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.side_effect = httpx.RequestError("Connection timeout")
            mock_client_class.return_value = mock_client

            # Execute and verify sanitized error
            with pytest.raises(ValueError, match="Failed to connect"):
                await openrouter_service.generate_content(prompt="Hello")

            # Verify original error details are NOT exposed
            try:
                await openrouter_service.generate_content(prompt="Hello")
            except ValueError as e:
                error_msg = str(e)
                assert "timeout" not in error_msg.lower()

    @pytest.mark.asyncio
    async def test_generic_error_sanitized(self, openrouter_service):
        """Test that unexpected errors are sanitized."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.side_effect = Exception("Unexpected database error")
            mock_client_class.return_value = mock_client

            # Execute and verify sanitized error
            with pytest.raises(ValueError, match="unexpected error"):
                await openrouter_service.generate_content(prompt="Hello")


# ============================================================================
# generate_with_context() Tests
# ============================================================================

class TestGenerateWithContext:
    """Test context-based generation (RAG)."""

    @pytest.mark.asyncio
    async def test_generate_with_context_basic(self, openrouter_service, successful_chat_response):
        """Test basic context generation."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = successful_chat_response
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            context = "Document 1: Python is a programming language."
            result = await openrouter_service.generate_with_context(
                message="What is Python?",
                context=context
            )

            # Verify result structure
            assert result["content"] == "Test response content"
            assert result["usage"]["input_tokens"] == 10

            # Verify the prompt was constructed correctly
            call_args = mock_client.post.call_args
            payload = call_args[1]["json"]
            user_message = payload["messages"][1]["content"]

            assert "Context sources:" in user_message
            assert context in user_message
            assert "What is Python?" in user_message

    @pytest.mark.asyncio
    async def test_generate_with_context_with_source_names(self, openrouter_service, successful_chat_response):
        """Test context generation with source names."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = successful_chat_response
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            source_names = ["Doc 1", "Doc 2", "Doc 3"]
            result = await openrouter_service.generate_with_context(
                message="Question?",
                context="Content",
                source_names=source_names
            )

            # Verify source citations are included
            call_args = mock_client.post.call_args
            payload = call_args[1]["json"]
            user_message = payload["messages"][1]["content"]

            assert "[1] Source: Doc 1" in user_message
            assert "[2] Source: Doc 2" in user_message
            assert "[3] Source: Doc 3" in user_message

    @pytest.mark.asyncio
    async def test_generate_with_context_with_persona_instructions(self, openrouter_service, successful_chat_response):
        """Test context generation with custom persona."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = successful_chat_response
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            persona = "You are a science teacher for 5th graders."
            result = await openrouter_service.generate_with_context(
                message="Explain gravity",
                context="Content",
                persona_instructions=persona
            )

            # Verify persona is prepended to system instruction
            call_args = mock_client.post.call_args
            payload = call_args[1]["json"]
            system_message = payload["messages"][0]["content"]

            assert persona in system_message
            assert "helpful research assistant" in system_message

    @pytest.mark.asyncio
    async def test_generate_with_context_empty_message_raises_error(self, openrouter_service):
        """Test that empty message raises ValueError."""
        with pytest.raises(ValueError, match="Invalid request parameters"):
            await openrouter_service.generate_with_context(
                message="",
                context="Some context"
            )

    @pytest.mark.asyncio
    async def test_generate_with_context_empty_context_raises_error(self, openrouter_service):
        """Test that empty context raises ValueError."""
        with pytest.raises(ValueError, match="Invalid request parameters"):
            await openrouter_service.generate_with_context(
                message="Question?",
                context=""
            )

    @pytest.mark.asyncio
    async def test_generate_with_context_unauthorized_model_rejected(self, openrouter_service):
        """Test that unauthorized model is rejected in context mode."""
        with pytest.raises(ValueError, match="not authorized"):
            await openrouter_service.generate_with_context(
                message="Question?",
                context="Context",
                model_name="unauthorized/malicious-model"
            )

    @pytest.mark.asyncio
    async def test_generate_with_context_message_too_long_raises_error(self, openrouter_service):
        """Test that message exceeding max_length raises ValueError."""
        long_message = "a" * 10001

        with pytest.raises(ValueError, match="Invalid request parameters"):
            await openrouter_service.generate_with_context(
                message=long_message,
                context="Context"
            )

    @pytest.mark.asyncio
    async def test_generate_with_context_context_too_long_raises_error(self, openrouter_service):
        """Test that context exceeding max_length raises ValueError."""
        long_context = "a" * 100001

        with pytest.raises(ValueError, match="Invalid request parameters"):
            await openrouter_service.generate_with_context(
                message="Question?",
                context=long_context
            )


# ============================================================================
# get_available_models() Tests
# ============================================================================

class TestGetAvailableModels:
    """Test get_available_models endpoint."""

    @pytest.mark.asyncio
    async def test_get_available_models_success(self, openrouter_service, successful_models_response):
        """Test successful models list retrieval."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = successful_models_response
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.get.return_value = mock_response
            mock_client_class.return_value = mock_client

            models = await openrouter_service.get_available_models()

            assert len(models) == 2
            assert models[0]["id"] == "anthropic/claude-3.5-sonnet"
            assert models[0]["name"] == "Claude 3.5 Sonnet"
            assert models[0]["context_length"] == 200000
            assert models[0]["provider"] == "Anthropic"

    @pytest.mark.asyncio
    async def test_get_available_models_with_missing_fields(self, openrouter_service):
        """Test handling of models with missing optional fields."""
        # Clear the cache first to avoid interference from previous tests
        openrouter_service.clear_models_cache()

        # Create a new, fresh mock response to avoid caching issues
        response_with_missing = {
            "data": [
                {
                    "id": "test/model",
                    "name": "Test Model"
                    # Missing context_length, pricing, provider
                }
            ]
        }

        with patch('httpx.AsyncClient') as mock_client_class:
            # Create fresh mock objects
            mock_response = MagicMock()
            mock_response.json.return_value = response_with_missing
            mock_response.raise_for_status = MagicMock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.get.return_value = mock_response
            mock_client_class.return_value = mock_client

            models = await openrouter_service.get_available_models()

            assert len(models) == 1
            assert models[0]["context_length"] == 4096  # Default
            assert models[0]["pricing"] == {}
            assert models[0]["provider"] == "unknown"

    @pytest.mark.asyncio
    async def test_get_available_models_http_error(self, openrouter_service):
        """Test HTTP error handling in get_available_models."""
        # Clear the cache and use force_refresh to ensure API call is made
        openrouter_service.clear_models_cache()
        import httpx

        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.status_code = 500
            mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
                "Server error",
                request=Mock(),
                response=mock_response
            )

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.get.return_value = mock_response
            mock_client_class.return_value = mock_client

            with pytest.raises(httpx.HTTPStatusError):
                await openrouter_service.get_available_models(force_refresh=True)


# ============================================================================
# Edge Cases and Boundary Tests
# ============================================================================

class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    @pytest.mark.asyncio
    async def test_minimum_valid_prompt_length(self, openrouter_service, successful_chat_response):
        """Test prompt with exactly 1 character (min_length=1)."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = successful_chat_response
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            # Single character should be valid
            result = await openrouter_service.generate_content(
                prompt="a",
                model_name="anthropic/claude-3.5-sonnet"
            )
            assert result["content"] == "Test response content"

    @pytest.mark.asyncio
    async def test_maximum_valid_prompt_length(self, openrouter_service, successful_chat_response):
        """Test prompt with exactly 50000 characters (max_length=50000)."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = successful_chat_response
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            # Exactly 50000 characters should be valid
            max_prompt = "a" * 50000
            result = await openrouter_service.generate_content(
                prompt=max_prompt,
                model_name="anthropic/claude-3.5-sonnet"
            )
            assert result["content"] == "Test response content"

    @pytest.mark.asyncio
    async def test_boundary_temperature_values(self, openrouter_service, successful_chat_response):
        """Test temperature at boundary values (0.0 and 2.0)."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = successful_chat_response
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            # Test minimum temperature
            result1 = await openrouter_service.generate_content(
                prompt="Hello",
                temperature=0.0
            )
            assert result1["content"] == "Test response content"

            # Test maximum temperature
            result2 = await openrouter_service.generate_content(
                prompt="Hello",
                temperature=2.0
            )
            assert result2["content"] == "Test response content"

    @pytest.mark.asyncio
    async def test_boundary_max_tokens_values(self, openrouter_service, successful_chat_response):
        """Test max_tokens at boundary values (1 and 32768)."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = successful_chat_response
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            # Test minimum max_tokens
            result1 = await openrouter_service.generate_content(
                prompt="Hello",
                max_tokens=1
            )
            assert result1["content"] == "Test response content"

            # Test maximum max_tokens
            result2 = await openrouter_service.generate_content(
                prompt="Hello",
                max_tokens=32768
            )
            assert result2["content"] == "Test response content"

    @pytest.mark.asyncio
    async def test_unicode_prompt(self, openrouter_service, successful_chat_response):
        """Test prompt with unicode characters."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = successful_chat_response
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            unicode_prompt = "Hello 世界 🌍 مرحبا"
            result = await openrouter_service.generate_content(
                prompt=unicode_prompt,
                model_name="anthropic/claude-3.5-sonnet"
            )
            assert result["content"] == "Test response content"

    @pytest.mark.asyncio
    async def test_special_characters_in_prompt(self, openrouter_service, successful_chat_response):
        """Test prompt with special characters."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = successful_chat_response
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            special_prompt = "Test <script>alert('xss')</script> & \"quotes\""
            result = await openrouter_service.generate_content(
                prompt=special_prompt,
                model_name="anthropic/claude-3.5-sonnet"
            )
            assert result["content"] == "Test response content"


# ============================================================================
# Request Structure Tests
# ============================================================================

class TestRequestStructure:
    """Test that HTTP requests are structured correctly."""

    @pytest.mark.asyncio
    async def test_request_headers(self, openrouter_service, successful_chat_response):
        """Test that correct headers are sent."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = successful_chat_response
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            await openrouter_service.generate_content(prompt="Hello")

            # Verify headers
            call_args = mock_client.post.call_args
            headers = call_args[1]["headers"]

            assert headers["Authorization"] == "Bearer test-api-key-12345"
            assert headers["HTTP-Referer"] == "https://notebooklm-api.vercel.app"
            assert headers["X-Title"] == "NotebookLM Reimagined"
            assert headers["Content-Type"] == "application/json"

    @pytest.mark.asyncio
    async def test_request_url(self, openrouter_service, successful_chat_response):
        """Test that correct URL is called."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = successful_chat_response
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            await openrouter_service.generate_content(prompt="Hello")

            # Verify URL
            call_args = mock_client.post.call_args
            url = call_args[0][0]
            assert url == "https://openrouter.ai/api/v1/chat/completions"

    @pytest.mark.asyncio
    async def test_request_timeout(self, openrouter_service, successful_chat_response):
        """Test that correct timeout is used."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = successful_chat_response
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            await openrouter_service.generate_content(prompt="Hello")

            # Verify timeout was set
            assert mock_client_class.call_args[1]["timeout"] == 60.0


# ============================================================================
# Response Processing Tests
# ============================================================================

class TestResponseProcessing:
    """Test response data processing."""

    @pytest.mark.asyncio
    async def test_response_without_usage_field(self, openrouter_service):
        """Test handling of response without usage field."""
        response_without_usage = {
            "id": "chatcmpl-123",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "Response without usage"
                    },
                    "finish_reason": "stop"
                }
            ]
        }

        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = response_without_usage
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            result = await openrouter_service.generate_content(prompt="Hello")

            # Verify default values are used
            assert result["usage"]["input_tokens"] == 0
            assert result["usage"]["output_tokens"] == 0
            assert result["usage"]["cost_usd"] == 0.0

    @pytest.mark.asyncio
    async def test_response_without_provider_field(self, openrouter_service, successful_chat_response):
        """Test handling of response without provider field."""
        response_without_provider = {
            "id": "chatcmpl-123",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "Response"
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 20
            }
        }

        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = Mock()
            mock_response.json.return_value = response_without_provider
            mock_response.raise_for_status = Mock()

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client

            result = await openrouter_service.generate_content(prompt="Hello")

            # Verify default provider is used
            assert result["usage"]["provider"] == "openrouter"


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
