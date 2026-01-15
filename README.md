<p align="center">
  <img src="https://img.shields.io/badge/API-Live-success?style=for-the-badge&logo=vercel" alt="API Live">
  <img src="https://img.shields.io/badge/Gemini-2.5-blue?style=for-the-badge&logo=google" alt="Gemini">
  <img src="https://img.shields.io/badge/n8n-Ready-orange?style=for-the-badge&logo=n8n" alt="n8n Ready">
  <img src="https://img.shields.io/badge/Zapier-Compatible-orange?style=for-the-badge&logo=zapier" alt="Zapier">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

<h1 align="center">NotebookLM Reimagined</h1>

<p align="center">
  <strong>Google's NotebookLM, rebuilt for developers. API-first. Self-hostable. Automation-ready.</strong>
</p>

<p align="center">
  <code>https://notebooklm-api.vercel.app</code>
</p>

<p align="center">
  <a href="#new-here-start-here">Beginners</a> •
  <a href="#30-second-demo">30s Demo</a> •
  <a href="#features">Features</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#self-hosting">Self-Hosting</a>
</p>

---

## 30-Second Demo

```bash
# 1. Create a notebook
curl -X POST "https://notebooklm-api.vercel.app/api/v1/notebooks" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Research", "description": "AI research notes"}'

# 2. Add a source
curl -X POST "https://notebooklm-api.vercel.app/api/v1/notebooks/{notebook_id}/sources/text" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Research Paper", "content": "Your research content here..."}'

# 3. Chat with your sources
curl -X POST "https://notebooklm-api.vercel.app/api/v1/notebooks/{notebook_id}/chat" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the key insights?", "model": "gemini-2.5-flash"}'
```

**That's it.** Your own NotebookLM, accessible via API.

---

## Why This Exists

Google's NotebookLM is a black box:

| Google NotebookLM | NotebookLM Reimagined |
|-------------------|----------------------|
| No API access | **50+ REST endpoints** |
| No automation | **n8n, Zapier, Make ready** |
| No self-hosting | **Deploy anywhere** |
| No customization | **AI personas, custom prompts** |
| No export | **ZIP, JSON, PDF export** |
| Closed source | **MIT licensed** |

---

## New Here? Start Here

### What is this?

**NotebookLM** is Google's AI research assistant that lets you upload documents and chat with them. Think of it like ChatGPT, but it only answers based on YOUR documents — no hallucinations from random internet data.

**NotebookLM Reimagined** is an open-source version you can:
- Use via our **web app** (no coding required)
- Control via **API** (for developers)
- **Self-host** on your own servers

### What can I do with it?

| I want to... | How |
|--------------|-----|
| Chat with my PDFs, articles, YouTube videos | Upload sources → Ask questions |
| Generate a podcast from my research | Upload sources → Click "Audio Overview" |
| Create flashcards for studying | Upload sources → Click "Flashcards" |
| Build an AI app with my own data | Use the API endpoints |
| Automate research workflows | Connect to n8n/Zapier |

### Try it now (no code)

1. **Visit the web app:** [notebooklm-reimagined.vercel.app](https://notebooklm-reimagined.vercel.app)
2. **Create an account** (free)
3. **Create a notebook** and add some sources (paste text, URLs, or upload PDFs)
4. **Start chatting** — the AI will answer based only on your sources

### Common Questions

<details>
<summary><strong>Do I need to know how to code?</strong></summary>

No! The web app works just like Google's NotebookLM. The API and self-hosting options are for developers who want more control.
</details>

<details>
<summary><strong>Is it free?</strong></summary>

The software is free and open source (MIT license). You'll need your own API keys for AI services (Google Gemini, Supabase) if self-hosting. Our hosted version has usage limits on the free tier.
</details>

<details>
<summary><strong>What's the difference from Google's NotebookLM?</strong></summary>

Google's version is a closed product — you can't access it via API, automate it, or run it on your own servers. This project gives you full control: API access, automation support, and self-hosting.
</details>

<details>
<summary><strong>What AI models does it use?</strong></summary>

- **Chat:** Google Gemini 2.5 Flash (fast) or Pro (quality)
- **Audio podcasts:** Gemini TTS (text-to-speech)
- **Video:** Google Veo
- All models are configurable per request
</details>

<details>
<summary><strong>Is my data private?</strong></summary>

If self-hosted: 100% private, your data never leaves your servers. On our hosted version: data is stored in Supabase with row-level security (each user can only access their own data).
</details>

---

## n8n / Zapier Integration

### Production API

```
Base URL: https://notebooklm-api.vercel.app
```

### Authentication

Add this header to all requests:
```
X-API-Key: nb_live_your_api_key_here
```

### n8n HTTP Request Node Setup

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `https://notebooklm-api.vercel.app/api/v1/notebooks/{id}/chat` |
| Authentication | None (use header) |
| Headers | `X-API-Key`: `your_key`, `Content-Type`: `application/json` |
| Body | JSON: `{"message": "Your question", "model": "gemini-2.5-flash"}` |

### Copy-Paste Workflows

<details>
<summary><strong>Chat with a Notebook</strong></summary>

```bash
curl -X POST "https://notebooklm-api.vercel.app/api/v1/notebooks/YOUR_NOTEBOOK_ID/chat" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "message": "Summarize the main points from my sources",
    "model": "gemini-2.5-flash"
  }'
```
</details>

<details>
<summary><strong>Add a URL Source</strong></summary>

```bash
curl -X POST "https://notebooklm-api.vercel.app/api/v1/notebooks/YOUR_NOTEBOOK_ID/sources/url" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "url": "https://example.com/article"
  }'
```
</details>

<details>
<summary><strong>Add YouTube Video</strong></summary>

```bash
curl -X POST "https://notebooklm-api.vercel.app/api/v1/notebooks/YOUR_NOTEBOOK_ID/sources/youtube" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "youtube_url": "https://www.youtube.com/watch?v=VIDEO_ID"
  }'
```
</details>

<details>
<summary><strong>Generate Flashcards</strong></summary>

```bash
curl -X POST "https://notebooklm-api.vercel.app/api/v1/notebooks/YOUR_NOTEBOOK_ID/flashcards" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "count": 10
  }'
```
</details>

<details>
<summary><strong>Generate Audio Overview (Podcast)</strong></summary>

```bash
curl -X POST "https://notebooklm-api.vercel.app/api/v1/notebooks/YOUR_NOTEBOOK_ID/audio" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "format": "deep_dive"
  }'
```
</details>

<details>
<summary><strong>Global Search (All Notebooks)</strong></summary>

```bash
curl -X POST "https://notebooklm-api.vercel.app/api/v1/chat/global" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "message": "Find everything about machine learning"
  }'
```
</details>

<details>
<summary><strong>Export Notebook as JSON</strong></summary>

```bash
curl -X GET "https://notebooklm-api.vercel.app/api/v1/notebooks/YOUR_NOTEBOOK_ID/export/json" \
  -H "X-API-Key: YOUR_API_KEY"
```
</details>

---

## API Reference

### Base URL
```
Production: https://notebooklm-api.vercel.app
Local:      http://localhost:8000
```

### Response Format

Every response includes cost transparency:

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
    "model_used": "gemini-2.5-flash"
  }
}
```

### Endpoints

#### Notebooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/notebooks` | List all notebooks |
| `POST` | `/api/v1/notebooks` | Create notebook |
| `GET` | `/api/v1/notebooks/{id}` | Get notebook |
| `PATCH` | `/api/v1/notebooks/{id}` | Update notebook |
| `DELETE` | `/api/v1/notebooks/{id}` | Delete notebook |
| `PATCH` | `/api/v1/notebooks/{id}/settings` | Update AI persona |

#### Sources
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/notebooks/{id}/sources` | List sources |
| `POST` | `/api/v1/notebooks/{id}/sources/text` | Add text content |
| `POST` | `/api/v1/notebooks/{id}/sources/url` | Add URL |
| `POST` | `/api/v1/notebooks/{id}/sources/youtube` | Add YouTube video |
| `POST` | `/api/v1/notebooks/{id}/sources/pdf` | Upload PDF |
| `DELETE` | `/api/v1/notebooks/{id}/sources/{sid}` | Delete source |

#### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/notebooks/{id}/chat` | Send message |
| `GET` | `/api/v1/notebooks/{id}/chat/sessions` | List chat threads |
| `POST` | `/api/v1/notebooks/{id}/chat/sessions` | Create thread |
| `DELETE` | `/api/v1/notebooks/{id}/chat/sessions/{sid}` | Delete thread |
| `POST` | `/api/v1/chat/global` | Search all notebooks |

#### Content Generation
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/notebooks/{id}/audio` | Generate podcast |
| `POST` | `/api/v1/notebooks/{id}/video` | Generate video |
| `POST` | `/api/v1/notebooks/{id}/flashcards` | Generate flashcards |
| `POST` | `/api/v1/notebooks/{id}/quiz` | Generate quiz |
| `POST` | `/api/v1/notebooks/{id}/study-guide` | Generate study guide |
| `POST` | `/api/v1/notebooks/{id}/faq` | Generate FAQ |
| `POST` | `/api/v1/notebooks/{id}/studio/report` | Generate report |
| `POST` | `/api/v1/notebooks/{id}/studio/slide-deck` | Generate slides |
| `POST` | `/api/v1/notebooks/{id}/studio/infographic` | Generate infographic |

#### Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/notebooks/{id}/export/json` | Export as JSON |
| `GET` | `/api/v1/notebooks/{id}/export/zip` | Export as ZIP |

#### API Keys
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/api-keys` | List API keys |
| `POST` | `/api/v1/api-keys` | Create API key |
| `DELETE` | `/api/v1/api-keys/{id}` | Revoke API key |

---

## Features

### Research & Chat
- **Multi-Source RAG** — PDFs, URLs, YouTube, text notes
- **Citation Tracking** — Every response cites its sources
- **Global Search** — Query across all notebooks
- **Chat Threads** — Multiple conversations per notebook
- **AI Personas** — Critical Reviewer, Simple Explainer, Technical Expert, Socratic Teacher, or custom

### Content Generation
- **Audio Overviews** — Podcast-style with multiple hosts (Deep Dive, Brief, Debate)
- **Video Overviews** — AI-generated video summaries (Veo)
- **Study Materials** — Flashcards, quizzes, study guides, FAQs, mind maps
- **Creative Outputs** — Data tables, reports, slide decks, infographics

### Developer Experience
- **50+ REST Endpoints** — Full programmatic control
- **Cost Transparency** — Token usage + USD cost on every call
- **Export Everything** — ZIP, JSON, PDF
- **Self-Hostable** — Deploy on Vercel, Railway, or your own infra

---

## Self-Hosting

### Prerequisites
- Python 3.11+
- Node.js 18+
- Supabase account (free tier works)
- Google AI API key

### Quick Start

```bash
# Clone
git clone https://github.com/earlyaidopters/notebooklmreimagined.git
cd notebooklmreimagined

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Add your keys
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local  # Add your keys
npm run dev
```

### Deploy to Vercel

```bash
# Backend
cd backend
vercel --prod

# Frontend
cd frontend
vercel --prod
```

### Environment Variables

**Backend:**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_API_KEY=AIza...
```

**Frontend:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=https://your-api.vercel.app
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                    Next.js 14 + React Query                      │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│  │ Dashboard │ │ Notebook  │ │  Studio   │ │ Settings  │       │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘       │
└─────────────────────────────────────────────────────────────────┘
                                │
                     ┌──────────┴──────────┐
                     ▼                     ▼
              ┌─────────────┐       ┌─────────────┐
              │   Vercel    │       │   n8n /     │
              │   Hosted    │       │   Zapier    │
              └─────────────┘       └─────────────┘
                     │                     │
                     └──────────┬──────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                          BACKEND                                 │
│                      FastAPI (Python)                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │Notebooks│ │ Sources │ │  Chat   │ │  Audio  │ │  Video  │  │
│  ├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤  │
│  │  Study  │ │ Studio  │ │ Export  │ │ Research│ │API Keys │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
       ┌───────────┐     ┌───────────┐     ┌───────────┐
       │ Supabase  │     │  Gemini   │     │ Supabase  │
       │ Postgres  │     │   API     │     │  Storage  │
       │  + Auth   │     │ 2.5 Flash │     │  (Files)  │
       └───────────┘     └───────────┘     └───────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui |
| **Backend** | FastAPI, Python 3.11+, Pydantic |
| **Database** | Supabase PostgreSQL + Row Level Security |
| **Auth** | Supabase Auth (JWT) + Custom API Keys |
| **Storage** | Supabase Storage |
| **AI** | Gemini 2.5 Flash/Pro, Gemini TTS, Veo |
| **Deployment** | Vercel (Serverless) |
| **DX** | Prettier, ESLint, Husky, lint-staged |

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles |
| `notebooks` | Notebooks with AI persona settings |
| `sources` | Documents, URLs, YouTube with source guides |
| `chat_sessions` | Conversation threads |
| `chat_messages` | Messages with citations |
| `audio_overviews` | Generated podcasts |
| `video_overviews` | Generated videos |
| `study_materials` | Flashcards, quizzes, guides |
| `studio_outputs` | Reports, slides, infographics |
| `research_tasks` | Deep research jobs |
| `notes` | User notes |
| `api_keys` | API key management |

---

## Roadmap

- [x] Multi-source RAG chat
- [x] Audio overview generation
- [x] Video overview generation
- [x] Study materials
- [x] Studio outputs
- [x] Chat threads
- [x] Export (ZIP/JSON/PDF)
- [x] AI personas
- [x] **API deployment (Vercel)**
- [x] **n8n / Zapier ready**
- [x] **DX improvements** (Prettier, ESLint, Husky, HTTP caching)
- [ ] Streaming responses
- [ ] Collaborative notebooks
- [ ] Webhooks
- [ ] Local LLM support (Ollama)
- [ ] Browser extension
- [ ] Mobile apps

---

## Contributing

### Development Setup

```bash
# Clone and install
git clone https://github.com/earlyaidopters/notebooklmreimagined.git
cd notebooklmreimagined/frontend
npm install

# Available scripts
npm run dev           # Start development server
npm run build         # Production build
npm run lint          # Check for linting issues
npm run lint:fix      # Auto-fix linting issues
npm run format        # Format code with Prettier
npm run format:check  # Check formatting
npm run type-check    # TypeScript type checking
npm run analyze       # Bundle size analysis
```

### Code Quality

Pre-commit hooks automatically run on staged files:
- **ESLint** — Catches bugs, enforces best practices
- **Prettier** — Consistent code formatting
- **TypeScript** — Type safety

### Project Structure

```
frontend/
├── src/
│   ├── app/           # Next.js App Router pages
│   ├── components/    # React components
│   └── lib/           # Utilities, hooks, types
├── .prettierrc        # Prettier config
├── eslint.config.mjs  # ESLint config
└── next.config.ts     # Next.js config (security headers, caching)

backend/
├── app/
│   ├── routers/       # API endpoints
│   ├── services/      # Business logic
│   └── models/        # Pydantic schemas
└── requirements.txt
```

---

## License

MIT — do whatever you want.

---

<p align="center">
  <strong>Built for developers who demand more than a black box.</strong>
</p>

<p align="center">
  <a href="https://github.com/earlyaidopters/notebooklmreimagined">GitHub</a> •
  <a href="https://notebooklm-api.vercel.app/docs">API Docs</a> •
  <a href="https://twitter.com/promptadvisers">Twitter</a>
</p>
