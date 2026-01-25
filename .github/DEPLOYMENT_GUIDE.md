# CI/CD Deployment Guide - OpenRouter Integration

This guide covers the complete CI/CD pipeline setup for the NotebookLM Reimagined project with OpenRouter integration support.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [GitHub Secrets Configuration](#github-secrets-configuration)
4. [Workflow Files](#workflow-files)
5. [Environment Setup](#environment-setup)
6. [Deployment Process](#deployment-process)
7. [Testing Strategies](#testing-strategies)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## Overview

The CI/CD pipeline consists of 5 main workflows:

| Workflow | Purpose | Trigger |
|----------|---------|---------|
| `backend-ci.yml` | Backend testing & deployment | Push to backend/** |
| `frontend-ci.yml` | Frontend testing & deployment | Push to frontend/** |
| `integration-tests.yml` | End-to-end integration tests | Push to integration files |
| `pr-check.yml` | Quick PR validation | Pull requests |
| `release.yml` | Production releases | Push to main |

### Pipeline Flow

```
Feature Branch → PR Check → Integration Tests → Merge to Main → Release
     ↓               ↓                ↓                    ↓
  Backend CI      Smoke Tests      Full E2E          Deploy to Prod
  Frontend CI     Code Quality     API Tests         Create Release
```

---

## Prerequisites

### Required Accounts

1. **GitHub** - Repository hosting
2. **Vercel** - Frontend deployment (optional)
3. **Supabase** - Backend database
4. **OpenRouter** - Multi-LLM provider API
5. **Google Cloud** - Gemini API

### Local Tools

```bash
# Python 3.11+
python --version

# Node.js 20+
node --version

# Git
git --version
```

---

## GitHub Secrets Configuration

Navigate to: **Repository Settings → Secrets and variables → Actions**

### Required Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `GOOGLE_API_KEY` | Google Gemini API key | `AIzaSy...` |
| `OPENROUTER_API_KEY` | OpenRouter API key | `sk-or-v1-...` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGci...` |
| `VERCEL_TOKEN` | Vercel deployment token | `VPxU...` |

### Optional Secrets

| Secret Name | Description |
|-------------|-------------|
| `BACKEND_URL` | Backend deployment URL |
| `FRONTEND_URL` | Frontend deployment URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase URL (frontend) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase key (frontend) |

### Setting Secrets via CLI

```bash
# Install GitHub CLI
brew install gh  # macOS
# or: sudo apt install gh  # Linux

# Authenticate
gh auth login

# Set secrets
gh secret set GOOGLE_API_KEY
gh secret set OPENROUTER_API_KEY
gh secret set SUPABASE_URL
gh secret set SUPABASE_ANON_KEY
gh secret set VERCEL_TOKEN
```

---

## Workflow Files

### 1. Backend CI (`.github/workflows/backend-ci.yml`)

**Jobs:**
- `lint` - Ruff and mypy checks
- `test-unit` - Unit tests without API keys
- `test-integration` - Integration tests with API keys
- `security-scan` - Bandit and safety checks
- `deploy` - Deploy to production (main only)

**Environment Variables:**
```yaml
PYTHON_VERSION: '3.11'
NODE_VERSION: '20'
```

**Key Commands:**
```bash
# Run locally
cd backend
pytest test_providers.py -v
ruff check .
mypy app/
```

### 2. Frontend CI (`.github/workflows/frontend-ci.yml`)

**Jobs:**
- `lint` - ESLint and Prettier checks
- `type-check` - TypeScript validation
- `build` - Production build check
- `test-components` - Component tests (if available)
- `analyze` - Bundle size analysis (PR only)
- `deploy` - Deploy to Vercel (main only)

**Key Commands:**
```bash
# Run locally
cd frontend
npm run lint
npm run type-check
npm run build
```

### 3. Integration Tests (`.github/workflows/integration-tests.yml`)

**Services:**
- PostgreSQL (Supabase local)

**Jobs:**
- `setup-supabase` - Start local PostgreSQL
- `backend-integration` - Test backend endpoints
- `frontend-integration` - Test frontend components
- `e2e-api-tests` - Full API flow tests

**Matrix Testing:**
```yaml
matrix:
  test-suite:
    - name: provider-endpoints
    - name: openrouter-service
```

### 4. PR Check (`.github/workflows/pr-check.yml`)

**Jobs:**
- `backend-smoke` - Quick backend validation
- `frontend-smoke` - Quick frontend validation
- `code-quality` - Common issue detection

**Triggers:** All pull requests to main/develop

### 5. Release (`.github/workflows/release.yml`)

**Jobs:**
- `version` - Determine semantic version
- `deploy-backend` - Deploy backend to production
- `deploy-frontend` - Deploy frontend to production
- `create-release` - Create GitHub release
- `notify` - Send notifications

**Manual Trigger:**
```bash
gh workflow run release.yml -f version=v1.2.0
```

---

## Environment Setup

### Backend Environment

Create `backend/.env`:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Gemini API
GOOGLE_API_KEY=your_google_api_key

# OpenRouter API
OPENROUTER_API_KEY=your_openrouter_api_key

# LLM Provider Configuration
DEFAULT_LLM_PROVIDER=google
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_PROVIDER=Anthropic

# App Configuration
APP_NAME=NotebookLM Reimagined
DEBUG=false
```

### Frontend Environment

Create `frontend/.env.local`:

```bash
# Supabase Configuration (Public)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### CI Environment Variables

Set in workflow files:

```yaml
env:
  PYTHON_VERSION: '3.11'
  NODE_VERSION: '20'
```

---

## Deployment Process

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/openrouter-enhancement

# 2. Make changes
# ... edit files ...

# 3. Commit changes
git add .
git commit -m "feat: Add new OpenRouter model support"

# 4. Push to GitHub
git push origin feature/openrouter-enhancement

# 5. Create PR
gh pr create --title "Add new OpenRouter model support" --body "Description..."
```

### PR Check Process

1. **PR Created** → Triggers `pr-check.yml`
2. **Smoke Tests Run** → Validates code syntax
3. **Code Quality Check** → Detects common issues
4. **PR Summary** → Posted to PR conversation

### Integration Test Process

1. **PR Merged** → Triggers `integration-tests.yml`
2. **Supabase Started** → Local PostgreSQL instance
3. **Backend Tests** → Test all provider endpoints
4. **Frontend Tests** → Test ProviderSelector component
5. **E2E Tests** → Test complete API flow

### Production Deployment

```bash
# Automatic (on merge to main)
git checkout main
git merge feature/openrouter-enhancement
git push origin main

# Manual release
gh workflow run release.yml -f version=v1.5.0
```

### Deployment Flow

```
Merge to main
    ↓
Backend CI → Test → Security Scan
Frontend CI → Test → Build
    ↓
Integration Tests → Full E2E validation
    ↓
Release → Deploy to production
    ↓
GitHub Release → Tag and publish
```

---

## Testing Strategies

### Unit Tests (No API keys)

```python
# backend/test_providers.py - Mock tests
@pytest.mark.unit
def test_config_loading():
    settings = get_settings()
    assert settings.default_llm_provider in ["google", "openrouter"]
```

**Run locally:**
```bash
cd backend
pytest test_providers.py -m unit -v
```

### Integration Tests (With API keys)

```python
# backend/test_providers.py - Live API tests
@pytest.mark.integration
async def test_openrouter_models():
    service = get_openrouter_service()
    models = await service.get_available_models()
    assert len(models) > 0
```

**Run locally:**
```bash
cd backend
export OPENROUTER_API_KEY=your_key
pytest test_providers.py -m integration -v
```

### E2E Tests

```bash
# Start backend
cd backend
uvicorn app.main:app --reload

# Test endpoints
curl http://localhost:8000/api/v1/providers
curl http://localhost:8000/api/v1/providers/config
curl http://localhost:8000/api/v1/providers/models
```

### Test Coverage Goals

| Component | Target Coverage | Status |
|-----------|----------------|--------|
| Backend services | 80%+ | In Progress |
| Backend API | 70%+ | In Progress |
| Frontend components | 60%+ | Future |
| E2E flows | 100% (critical paths) | In Progress |

---

## Troubleshooting

### Common Issues

#### Issue 1: Tests fail in CI but pass locally

**Cause:** Environment variables not set in CI

**Solution:**
```bash
# Check secrets are set
gh secret list

# Verify in workflow logs
# Look for: "Environment variables loaded"
```

#### Issue 2: Supabase connection fails

**Cause:** PostgreSQL not ready or wrong credentials

**Solution:**
```yaml
# Add health check
services:
  postgres:
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
```

#### Issue 3: OpenRouter API timeout

**Cause:** Rate limiting or network issues

**Solution:**
```python
# Add retry logic
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential())
async def call_openrouter_api():
    # API call
```

#### Issue 4: Frontend build fails

**Cause:** Type errors or missing dependencies

**Solution:**
```bash
# Run locally
cd frontend
npm run type-check
npm run build

# Fix errors before pushing
```

### Debug Mode

Enable debug logging in workflows:

```yaml
- name: Run tests with debug
  run: |
    export DEBUG=true
    pytest test_providers.py -vv -s
```

### Workflow Logs

Access workflow logs:
```bash
# List recent runs
gh run list

# View specific run
gh run view <run-id>

# View logs
gh run view <run-id> --log
```

---

## Best Practices

### Branch Protection

**Settings → Branches → Add Rule:**

```
Branch name pattern: main
✅ Require pull request reviews (1)
✅ Require status checks to pass
  - Backend CI / test-unit
  - Frontend CI / build
  - Integration Tests / backend-integration
✅ Require branches to be up to date
❌ Do not allow bypassing
```

### Semantic Versioning

```
MAJOR.MINOR.PATCH

v1.5.0  → Minor feature (OpenRouter integration)
v1.5.1  → Patch (bug fix)
v2.0.0  → Major (breaking changes)
```

### Commit Messages

Follow Conventional Commits:

```
feat: Add OpenRouter provider support
fix: Correct API key validation
docs: Update deployment guide
test: Add integration tests for providers
refactor: Simplify provider selection logic
```

### Code Review Checklist

- [ ] Tests pass locally and in CI
- [ ] No console.log or debug statements
- [ ] Environment variables documented
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Documentation updated
- [ ] Changelog updated

### Deployment Checklist

Before merging to main:
- [ ] All CI checks pass
- [ ] Integration tests pass
- [ ] Security scan passes
- [ ] No outstanding TODOs
- [ ] Environment variables configured
- [ ] Rollback plan documented

---

## Quick Reference

### Common Commands

```bash
# Trigger workflow manually
gh workflow run backend-ci.yml

# View workflow status
gh run list --workflow=backend-ci.yml

# Cancel running workflow
gh run cancel <run-id>

# Re-run failed workflow
gh run rerun <run-id>

# View secrets
gh secret list

# Set secret
gh secret set OPENROUTER_API_KEY

# Create PR
gh pr create --title "Title" --body "Description"

# Merge PR
gh pr merge <pr-number> --merge
```

### Workflow Status Badges

Add to README.md:

```markdown
![Backend CI](https://github.com/user/notebooklmreimagined/workflows/Backend%20CI/badge.svg)
![Frontend CI](https://github.com/user/notebooklmreimagined/workflows/Frontend%20CI/badge.svg)
![Integration Tests](https://github.com/user/notebooklmreimagined/workflows/Integration%20Tests/badge.svg)
```

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/user/notebooklmreimagined/issues
- Documentation: https://github.com/user/notebooklmreimagined/wiki
- CI/CD Status: https://github.com/user/notebooklmreimagined/actions

---

**Last Updated:** 2026-01-24
**Version:** 1.0.0
