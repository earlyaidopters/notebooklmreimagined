# CI/CD Architecture Diagram

## Component Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GitHub Actions CI/CD Platform                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
            ┌───────▼────────┐            ┌────────▼────────┐
            │   Push Event   │            │ Pull Request    │
            │ (to main/dev)  │            │  (any branch)   │
            └───────┬────────┘            └────────┬────────┘
                    │                               │
        ┌───────────┴───────────┐       ┌──────────┴──────────┐
        │                       │       │                     │
    ┌───▼────┐            ┌────▼────┐              ┌─────────▼────────┐
    │Backend │            │Frontend │              │    PR Check      │
    │  CI    │            │   CI    │              │  (quick smoke)   │
    └───┬────┘            └────┬────┘              └────────┬────────┘
        │                      │                            │
        │                      │                            │
    ┌───▼──────────────────────▼────────────┐   ┌──────────▼─────────┐
    │         Integration Tests             │   │  Code Quality      │
    │  (Backend + Frontend + Supabase)      │   │  (TODOs, logs)     │
    └───┬───────────────────────────────────┘   └──────────┬─────────┘
        │                                                  │
        │                                                  │
        │           ┌──────────────────────────────────────┘
        │           │
        └───────────┴──────────────────────────────────────┐
                    │                                      │
            ┌───────▼────────┐              ┌──────────────▼───────┐
            │  Merge to Main │              │   All Checks Pass?   │
            └───────┬────────┘              └──────────────┬───────┘
                    │                                      │
                    │                           ┌──────────┴──────────┐
                    │                           │                     │
                ┌───▼──────┐           ┌────────▼─────┐    ┌────────▼──────┐
                │ Release  │           │  PR Blocked  │    │  PR Approved  │
                │ Workflow │           └──────────────┘    └────────┬──────┘
                └────┬─────┘                                      │
                     │                                            │
         ┌───────────┴──────────┐                     ┌──────────┴──────────┐
         │                      │                     │                     │
    ┌────▼─────┐          ┌────▼─────┐          ┌────▼─────┐        ┌────▼─────┐
    │Backend   │          │Frontend  │          │GitHub    │        │Deploy    │
    │Deploy    │          │Deploy    │          │Release   │        │Notify    │
    └────┬─────┘          └────┬─────┘          └────┬─────┘        └────┬─────┘
         │                     │                     │                    │
         └─────────────────────┴─────────────────────┴────────────────────┘
                                       │
                              ┌────────▼────────┐
                              │  Production     │
                              │  Deployment     │
                              └─────────────────┘
```

---

## Workflow Trigger Matrix

| Event | Backend CI | Frontend CI | Integration Tests | PR Check | Release |
|-------|-----------|-------------|-------------------|----------|---------|
| Push to `backend/**` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Push to `frontend/**` | ❌ | ✅ | ❌ | ❌ | ❌ |
| Push to `integration/**` | ❌ | ❌ | ✅ | ❌ | ❌ |
| Push to `main` | ✅ | ✅ | ✅ | ❌ | ✅ |
| PR to `main/develop` | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manual dispatch | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Job Dependencies

### Backend CI
```
lint → test-unit → test-integration → security-scan → deploy
```

### Frontend CI
```
lint → type-check → build → test-components → deploy
                     ↓
                 analyze (PR only)
```

### Integration Tests
```
setup-supabase → backend-integration → e2e-api-tests
               ↓
        frontend-integration
```

### PR Check
```
backend-smoke ─┐
               ├→ pr-summary
frontend-smoke ─┤
               │
code-quality ────┘
```

### Release
```
version → deploy-backend → create-release → notify
       ↓
  deploy-frontend
```

---

## Data Flow

### 1. Development Flow
```
Developer → Feature Branch → Push → PR Check → PR Created
                                                    ↓
                                    Integration Tests (on merge)
```

### 2. Test Flow
```
┌─────────────────────────────────────────────────────────────┐
│                     Test Execution Flow                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Unit Tests          Integration Tests        E2E Tests     │
│  (No API keys)      (With API keys)        (Full Stack)    │
│       │                    │                     │         │
│       ▼                    ▼                     ▼         │
│  ┌─────────┐         ┌──────────┐         ┌───────────┐   │
│  │  Mock   │         │  Real    │         │ Production│   │
│  │  Data   │         │   APIs   │         │  Stack    │   │
│  └─────────┘         └──────────┘         └───────────┘   │
│       │                    │                     │         │
│       ▼                    ▼                     ▼         │
│  Fast (< 1min)      Medium (2-5min)       Slow (5-10min)  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3. Deployment Flow
```
┌─────────────────────────────────────────────────────────────┐
│                    Deployment Pipeline                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Stage 1: Build & Test                                     │
│  ├── Backend: lint → unit → integration → security         │
│  └── Frontend: lint → type-check → build → test            │
│                                                             │
│  Stage 2: Deploy to Staging (optional)                     │
│  ├── Backend: Deploy to staging environment                │
│  └── Frontend: Deploy to Vercel preview                    │
│                                                             │
│  Stage 3: Deploy to Production                             │
│  ├── Backend: Deploy to production                         │
│  ├── Frontend: Deploy to Vercel production                 │
│  └── Database: Run migrations if needed                    │
│                                                             │
│  Stage 4: Post-Deployment                                  │
│  ├── Smoke tests                                           │
│  ├── Monitor metrics                                       │
│  └── Create release notes                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Artifact Management

### Artifacts Created

| Workflow | Artifact | Retention | Content |
|----------|----------|-----------|---------|
| Backend CI | `unit-test-results` | 7 days | Test results, coverage |
| Backend CI | `integration-test-results` | 7 days | API test results |
| Backend CI | `security-reports` | 30 days | Bandit/Safety reports |
| Frontend CI | `frontend-build` | 7 days | Next.js build output |
| Frontend CI | `frontend-coverage` | 7 days | Test coverage reports |
| Frontend CI | `bundle-analysis` | 7 days | Bundle size analysis |
| Integration Tests | `backend-integration-*` | 7 days | Integration test results |
| Integration Tests | `frontend-integration-build` | 7 days | Frontend build |

---

## Environment Strategy

### Development Environment
- **Branch:** `feature/*`, `bugfix/*`
- **Trigger:** Push to branch
- **Tests:** Unit tests only (no API keys)
- **Deployment:** None
- **Duration:** < 2 minutes

### Pull Request Environment
- **Branch:** Any PR branch
- **Trigger:** PR creation/update
- **Tests:** Full CI + smoke tests
- **Deployment:** None
- **Duration:** < 5 minutes

### Integration Environment
- **Branch:** `develop`, `feature/openrouter-*`
- **Trigger:** Push to integration files
- **Tests:** Integration tests with APIs
- **Deployment:** None
- **Duration:** 5-10 minutes

### Production Environment
- **Branch:** `main`
- **Trigger:** Merge to main
- **Tests:** Full CI + integration
- **Deployment:** Automatic to production
- **Duration:** 10-15 minutes

---

## Secret Management

### Secret Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Secrets Store                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  Required       │    │  Optional       │                │
│  │  Secrets        │    │  Secrets        │                │
│  ├─────────────────┤    ├─────────────────┤                │
│  │ • GOOGLE_API_KEY│    │ • BACKEND_URL   │                │
│  │ • OPENROUTER_   │    │ • FRONTEND_URL  │                │
│  │   API_KEY       │    │ • NEXT_PUBLIC_  │                │
│  │ • SUPABASE_URL  │    │   SUPABASE_URL  │                │
│  │ • SUPABASE_     │    │ • NEXT_PUBLIC_  │                │
│  │   ANON_KEY      │    │   SUPABASE_ANON │
│  │ • SUPABASE_     │    │   _KEY          │
│  │   SERVICE_ROLE  │    │                 │                │
│  │   _KEY          │    │                 │                │
│  │ • VERCEL_TOKEN  │    │                 │                │
│  └─────────────────┘    └─────────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Secret Access by Workflow

| Workflow | GOOGLE_API_KEY | OPENROUTER_API_KEY | SUPABASE | VERCEL_TOKEN |
|----------|----------------|-------------------|----------|--------------|
| Backend CI | ✅ (integration) | ✅ (integration) | ❌ | ❌ |
| Frontend CI | ❌ | ❌ | ❌ | ✅ (deploy) |
| Integration Tests | ✅ | ✅ | ✅ (local) | ❌ |
| PR Check | ❌ | ❌ | ❌ | ❌ |
| Release | ❌ | ❌ | ❌ | ✅ |

---

## Notification Strategy

### Success Notifications
- ✅ All tests pass
- ✅ Deployment successful
- ✅ Release created

### Failure Notifications
- ❌ Tests failed
- ❌ Security issues found
- ❌ Deployment failed

### Warning Notifications
- ⚠️ Tests passed with warnings
- ⚠️ Code quality issues found
- ⚠️ Coverage below threshold

---

## Rollback Strategy

### Automatic Rollback Triggers
- Critical test failures
- Security vulnerabilities detected
- Deployment health check failures

### Manual Rollback Procedure

```bash
# 1. Identify bad release
gh release list
gh run list

# 2. Revert commit
git revert HEAD

# 3. Push revert
git push origin main

# 4. Monitor rollback
gh run list --workflow=release.yml

# 5. Or redeploy specific version
gh release create v1.4.0 --notes "Rollback from v1.5.0"
```

---

## Monitoring & Observability

### Metrics Tracked

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Build Duration | GitHub Actions | > 15 minutes |
| Test Failure Rate | Test Results | > 10% |
| Security Issues | Bandit/Safety | Any high/critical |
| Bundle Size | Bundle Analysis | > 1MB increase |
| API Response Time | Integration Tests | > 5 seconds |

### Logging

- **Workflow Logs:** Stored in GitHub Actions (90 days)
- **Test Logs:** Uploaded as artifacts (7-30 days)
- **Security Logs:** Uploaded as artifacts (30 days)
- **Deployment Logs:** Stored in Vercel/Supabase

---

## Cost Optimization

### Caching Strategy
- **pip cache:** Python dependencies
- **npm cache:** Node.js dependencies
- **Build cache:** Next.js build artifacts

### Parallel Execution
- Backend and frontend CI run in parallel
- Test jobs run in parallel where possible
- Integration tests use matrix strategy

### Resource Limits
- **Runner:** ubuntu-latest (2 cores, 7 GB RAM)
- **Timeout:** 30 minutes per job
- **Concurrency:** Cancel in-progress runs on new commits

---

## Security Considerations

### Security Scanning
- **Bandit:** Python security linter
- **Safety:** Dependency vulnerability scanner
- **npm audit:** Frontend dependencies

### Secret Protection
- Never log secrets
- Use GitHub Secrets for sensitive data
- Rotate API keys regularly
- Use least-privilege access

### Branch Protection
- Require PR reviews
- Require status checks
- Require branches to be up to date
- Do not allow bypassing rules

---

## Future Enhancements

### Planned Improvements
- [ ] Add performance benchmarking
- [ ] Add visual regression tests
- [ ] Add accessibility testing
- [ ] Add chaos engineering tests
- [ ] Add automated rollback on failure
- [ ] Add multi-region deployment
- [ ] Add blue-green deployment

### Possible Integrations
- [ ] Docker container scanning
- [ ] Kubernetes deployment
- [ ] Terraform infrastructure as code
- [ ] Monitoring (Datadog, New Relic)
- [ ] Error tracking (Sentry)
- [ ] Feature flags (LaunchDarkly)

---

**Last Updated:** 2026-01-24
**Version:** 1.0.0
