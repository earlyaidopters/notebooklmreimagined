# Security Considerations

This document outlines security considerations for NotebookLM Reimagined, including multi-provider LLM support.

## API Key Management

### Environment Variables

All API keys should be stored as environment variables and never committed to version control:

```bash
# .env file (add to .gitignore)
GOOGLE_API_KEY=AIza...
OPENROUTER_API_KEY=sk-or-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Production Deployment

For production deployments, use secret management services:

**Vercel:**
```bash
vercel env add GOOGLE_API_KEY
vercel env add OPENROUTER_API_KEY
```

**Docker:**
```bash
docker run -e GOOGLE_API_KEY="$GOOGLE_API_KEY" \
           -e OPENROUTER_API_KEY="$OPENROUTER_API_KEY" \
           ...
```

**Kubernetes:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: notebooklm-secrets
type: Opaque
stringData:
  google-api-key: AIza...
  openrouter-api-key: sk-or-...
```

## Provider Security

### Google Gemini

1. **API Key Scope**: Google AI API keys are scoped to specific projects
2. **Quotas**: Implement rate limiting to prevent abuse
3. **Monitoring**: Monitor usage through Google Cloud Console

### OpenRouter

1. **API Key Protection**: OpenRouter keys provide access to all models on the platform
2. **Cost Controls**: Set spending limits in your OpenRouter dashboard
3. **Usage Monitoring**: Monitor costs through OpenRouter's usage tracking
4. **Provider Isolation**: Use `OPENROUTER_PROVIDER` to restrict to specific providers if needed

## API Security

### Authentication

All API endpoints require authentication via `X-API-Key` header:

```bash
curl -X POST "https://notebooklm-api.vercel.app/api/v1/notebooks/{id}/chat" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "..."}'
```

### Rate Limiting

Implement rate limiting to prevent abuse:

```python
# Example: Using slowapi
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/v1/notebooks/{id}/chat")
@limiter.limit("60/minute")
async def send_message(...):
    ...
```

### Input Validation

All user inputs should be validated:

```python
from pydantic import BaseModel, Field, validator

class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    provider: Optional[Literal["google", "openrouter"]] = None
    provider_model: Optional[str] = Field(None, max_length=100)

    @validator('provider_model')
    def validate_model(cls, v, values):
        if v and values.get('provider') == 'openrouter':
            # Validate against allowed models
            if v not in ALLOWED_OPENROUTER_MODELS:
                raise ValueError(f"Model {v} not allowed")
        return v
```

## Data Privacy

### User Data

1. **Storage**: All user data is stored in Supabase with Row Level Security (RLS)
2. **Isolation**: Each user can only access their own notebooks and sources
3. **Encryption**: Use TLS for all data in transit

### Provider Data Handling

**Google Gemini:**
- Data sent to Gemini is used for processing responses only
- Review [Google AI data usage](https://ai.google.dev/gemini-api/docs/data-usage) for details

**OpenRouter:**
- Data is routed through OpenRouter to the selected model provider
- Review [OpenRouter privacy policy](https://openrouter.ai/privacy) for details
- Each model provider may have different data handling practices

### Sensitive Data

For sensitive data, consider:

1. **Local Models**: Use local LLMs (Ollama) for highly sensitive data (planned feature)
2. **Data Sanitization**: Remove PII before sending to providers
3. **Enterprise Plans**: Use enterprise agreements with data processing addendums

## CORS Configuration

Configure CORS to restrict access to your domains:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com", "https://app.yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Security Headers

Add security headers to your API:

```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware

# Redirect HTTP to HTTPS
app.add_middleware(HTTPSRedirectMiddleware)

# Only allow specific hosts
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["yourdomain.com", "*.yourdomain.com"]
)
```

## Audit Logging

Log all provider usage for security and compliance:

```python
import logging

logger = logging.getLogger(__name__)

async def send_message(...):
    # Log provider usage
    logger.info(
        f"Provider usage: user={user_id}, "
        f"provider={provider}, "
        f"model={model}, "
        f"tokens={usage['input_tokens'] + usage['output_tokens']}, "
        f"cost={usage['cost_usd']}"
    )
```

## Best Practices

### Development

1. **Never commit API keys** to version control
2. **Use .env files** for local development (add to .gitignore)
3. **Rotate keys regularly** (every 90 days)
4. **Use separate keys** for development and production

### Production

1. **Enable audit logging** for all provider usage
2. **Set up alerts** for unusual usage patterns
3. **Implement rate limiting** to prevent abuse
4. **Use HTTPS only** for all communications
5. **Monitor costs** daily to detect anomalies

### Incident Response

If you suspect an API key has been compromised:

1. **Revoke the key immediately** in your provider dashboard
2. **Rotate to a new key** in your deployment
3. **Review audit logs** for unauthorized usage
4. **Notify affected users** if data was accessed
5. **Document the incident** for post-mortem

## Compliance

### GDPR Considerations

- User data is stored in Supabase (EU data centers available)
- Provider data handling varies (review provider policies)
- Implement data export and deletion endpoints
- Obtain user consent for data processing

### SOC 2 / HIPAA

For regulated environments:

1. **Use enterprise agreements** with providers
2. **Implement additional logging** and monitoring
3. **Conduct regular security assessments**
4. **Use encrypted databases** (at rest and in transit)
5. **Document all data flows** and processing

## Additional Resources

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Google AI Security](https://ai.google.dev/gemini-api/docs/safety-guidance)
- [OpenRouter Security](https://openrouter.ai/docs#security)
- [Supabase Security](https://supabase.com/docs/guides/security)
