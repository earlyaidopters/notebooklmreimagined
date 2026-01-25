# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Multi-LLM Provider Support**: Integration with OpenRouter for access to 100+ AI models
  - New endpoints: `/api/providers`, `/api/providers/config`, `/api/providers/models`
  - Provider selection per chat request via `provider` and `provider_model` parameters
  - Support for Anthropic Claude, OpenAI GPT-4, Meta Llama, and more
  - Configurable default provider via `DEFAULT_LLM_PROVIDER` environment variable
  - Model-specific pricing transparency in usage tracking
  - Full backward compatibility with existing Google Gemini provider

### Changed
- Chat endpoint now accepts optional `provider` ("google" or "openrouter") and `provider_model` parameters
- Response format includes `provider` field in usage metadata
- Enhanced cost calculation support for multiple model pricing tiers

### Security
- Improved API key validation for provider services
- Proper error handling when optional providers are not configured

## [1.2.4] - 2025-12-14

### Added
- Infinite scroll for notebook sources - no more 50 source limit (#325)
- Markdown table rendering in chat responses, search results, and insights (#325)

### Fixed
- Timeout errors with Ollama and local LLMs - increased to 10 minutes (#325)
- "Unable to Connect to API Server" on Docker startup - frontend now waits for API health check (#325, #315)
- SSL issues with langchain (#274)
- Query key consistency for source mutations to properly refresh infinite scroll (#325)
- Docker compose start-all flow (#323)

### Changed
- Timeout configuration now uses granular httpx.Timeout (short connect, long read) (#325)

### Dependencies
- Updated next.js to 15.4.10
- Updated httpx to >=0.27.0 for SSL fix
