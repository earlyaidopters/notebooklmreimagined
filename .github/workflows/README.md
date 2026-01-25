# GitHub Workflows - Quick Reference

This directory contains CI/CD workflows for the NotebookLM Reimagined project.

## Workflows Overview

| Workflow | File | Purpose | Trigger |
|----------|------|---------|---------|
| Backend CI | `backend-ci.yml` | Test and deploy backend | Push to `backend/**` |
| Frontend CI | `frontend-ci.yml` | Test and deploy frontend | Push to `frontend/**` |
| Integration Tests | `integration-tests.yml` | E2E testing | Push to integration files |
| PR Check | `pr-check.yml` | Quick PR validation | Pull requests |
| Release | `release.yml` | Production releases | Push to `main` |

## Quick Start

### For Developers

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and commit
git add .
git commit -m "feat: Add my feature"

# 3. Push and create PR
git push origin feature/my-feature
gh pr create --title "Add my feature"
```

### For Releases

```bash
# Automatic (on merge to main)
git checkout main
git merge feature/my-feature
git push origin main

# Manual (specify version)
gh workflow run release.yml -f version=v1.5.0
```

## Required Secrets

Set these in: **Repository Settings → Secrets → Actions**

```
GOOGLE_API_KEY           - Google Gemini API key
OPENROUTER_API_KEY       - OpenRouter API key
SUPABASE_URL            - Supabase project URL
SUPABASE_ANON_KEY       - Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY - Supabase service role key
VERCEL_TOKEN            - Vercel deployment token
```

## Workflow Status

View workflow runs:
```bash
gh run list
gh run view <run-id>
```

## Documentation

See [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) for complete documentation.
