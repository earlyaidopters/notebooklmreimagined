<p align="center">
  <img src="https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge" alt="PRs Welcome">
  <img src="https://img.shields.io/badge/Gemini-2.0-blue?style=for-the-badge&logo=google" alt="Gemini">
</p>

<h1 align="center">NotebookLM Reimagined</h1>

<p align="center">
  <strong>The open-source research intelligence platform that does what NotebookLM won't.</strong>
</p>

<p align="center">
  <em>API-first. Self-hostable. Fully customizable. Built for developers who demand more.</em>
</p>

<p align="center">
  <a href="#-why-this-exists">Why This Exists</a> •
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-api-reference">API Reference</a>
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/placeholder-screenshot.png" alt="NotebookLM Reimagined Screenshot" width="800">
</p>

---

## Why This Exists

Google's NotebookLM is powerful, but it's a black box. You can't:
- Access your data via API
- Self-host for privacy
- Customize the AI behavior
- Export your research
- Build automations

**NotebookLM Reimagined fixes all of that.**

Built from the ground up with an API-first philosophy, every single feature is accessible programmatically. Your research, your data, your rules.

---

## Features

### Research & Chat
| Feature | Description |
|---------|-------------|
| **Multi-Source RAG** | Upload PDFs, paste URLs, add YouTube videos, or write notes—chat with all of them simultaneously |
| **Citation Tracking** | Every AI response includes clickable citations back to the exact source |
| **Global Search** | Query across ALL your notebooks with a single API call |
| **AI Personas** | Configure how the AI responds: Critical Reviewer, Simple Explainer, Technical Expert, Socratic Teacher, or create your own |
| **Multiple Chat Threads** | Maintain separate conversations per notebook with full history |

### Content Generation
| Feature | Description |
|---------|-------------|
| **Audio Overviews** | Generate podcast-style discussions with multiple AI hosts (Deep Dive, Brief Summary, Debate Mode) |
| **Video Overviews** | Create AI-generated video summaries powered by Veo |
| **Study Materials** | Auto-generate flashcards, quizzes, study guides, FAQs, and mind maps |
| **Creative Outputs** | Generate data tables, briefing documents, slide decks, and infographics |

### Developer Experience
| Feature | Description |
|---------|-------------|
| **Full API Access** | 50+ REST endpoints for complete programmatic control |
| **Export Everything** | Download notebooks as ZIP (all files), JSON (structured data), or PDF (summary) |
| **Cost Transparency** | See exact token usage and USD cost for every single operation |
| **React Query Caching** | Lightning-fast UI with intelligent cache invalidation |
| **Customizable Preferences** | Control response length, tone, citation style, and example inclusion |

---

## What's New

### Chat Threads
Maintain multiple conversation threads within each notebook. Search, filter, rename, and organize your research discussions.

### Full Notebook Export
Export your entire research with one click:
- **ZIP** — All source files, chat history, notes, and generated content
- **JSON** — Structured data for programmatic access
- **PDF** — Human-readable summary document

### AI Personas & Preferences
Customize how the AI thinks and responds:

| Persona | Behavior |
|---------|----------|
| **Critical Reviewer** | Questions assumptions, identifies weaknesses, thorough critique |
| **Simple Explainer** | ELI5-style, avoids jargon, uses relatable examples |
| **Technical Expert** | Deep technical detail, precise terminology, comprehensive |
| **Creative Thinker** | Novel connections, unconventional perspectives, brainstorming |
| **Socratic Teacher** | Guides through questions, promotes critical thinking |
| **Custom** | Write your own persona instructions |

Plus fine-tune preferences:
- Response length (Concise / Balanced / Detailed)
- Tone (Professional / Casual / Academic)
- Citation style (Inline / Footnote / None)
- Include examples toggle

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Supabase account (free tier works)
- Google AI API key

### 1. Clone & Setup

```bash
git clone https://github.com/earlyaidopters/notebooklmreimagined.git
cd notebooklmreimagined
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env
cp .env.example .env
# Edit .env with your keys

uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install

# Create .env.local
cp .env.example .env.local
# Edit .env.local with your keys

npm run dev
```

### 4. Open

- **App**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND                                      │
│                     Next.js 14 + React Query                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │  Dashboard  │ │  Notebook   │ │   Studio    │ │   Settings  │       │
│  │    Page     │ │  3-Panel    │ │   Panel     │ │    Page     │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            BACKEND                                       │
│                         FastAPI (Python)                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │Notebooks │ │ Sources  │ │   Chat   │ │  Audio   │ │  Export  │     │
│  │  Router  │ │  Router  │ │  Router  │ │  Router  │ │  Router  │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │  Video   │ │  Study   │ │  Studio  │ │ Research │ │ API Keys │     │
│  │  Router  │ │  Router  │ │  Router  │ │  Router  │ │  Router  │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 ▼                  ▼                  ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│      SUPABASE       │ │     GEMINI API      │ │   SUPABASE STORAGE  │
│     PostgreSQL      │ │    2.0 Flash/Pro    │ │       (Files)       │
│    + Auth + RLS     │ │   TTS + Veo + DR    │ │                     │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion |
| **State** | React Query (TanStack Query) with intelligent caching |
| **Backend** | FastAPI (Python 3.11+) with async support |
| **Database** | Supabase PostgreSQL with Row Level Security |
| **Auth** | Supabase Auth (JWT) + Custom API Keys |
| **Storage** | Supabase Storage for file uploads |
| **AI Models** | Gemini 2.0 Flash, Gemini Pro, Gemini TTS, Veo, Deep Research |
| **Export** | jsPDF, JSZip for client-side document generation |

---

## API Reference

### Authentication

```bash
# Using API Key (recommended for integrations)
curl -X GET "http://localhost:8000/api/v1/notebooks" \
  -H "X-API-Key: nb_live_your_api_key"

# Using JWT (for frontend)
curl -X GET "http://localhost:8000/api/v1/notebooks" \
  -H "Authorization: Bearer your_jwt_token"
```

### Core Endpoints

#### Notebooks
```bash
GET    /api/v1/notebooks              # List all notebooks
POST   /api/v1/notebooks              # Create notebook
GET    /api/v1/notebooks/{id}         # Get notebook
PATCH  /api/v1/notebooks/{id}         # Update notebook
DELETE /api/v1/notebooks/{id}         # Delete notebook
PATCH  /api/v1/notebooks/{id}/settings # Update AI persona settings
```

#### Sources
```bash
GET    /api/v1/notebooks/{id}/sources           # List sources
POST   /api/v1/notebooks/{id}/sources/text      # Add text
POST   /api/v1/notebooks/{id}/sources/url       # Add URL
POST   /api/v1/notebooks/{id}/sources/youtube   # Add YouTube
POST   /api/v1/notebooks/{id}/sources/pdf       # Upload PDF
DELETE /api/v1/notebooks/{id}/sources/{sid}     # Delete source
```

#### Chat
```bash
POST   /api/v1/notebooks/{id}/chat              # Send message
GET    /api/v1/notebooks/{id}/chat/sessions     # List sessions
POST   /api/v1/notebooks/{id}/chat/sessions     # Create session
PATCH  /api/v1/notebooks/{id}/chat/sessions/{s} # Rename session
DELETE /api/v1/notebooks/{id}/chat/sessions/{s} # Delete session
POST   /api/v1/chat/global                      # Global search
```

#### Content Generation
```bash
POST   /api/v1/notebooks/{id}/audio             # Generate audio
POST   /api/v1/notebooks/{id}/video             # Generate video
POST   /api/v1/notebooks/{id}/flashcards        # Generate flashcards
POST   /api/v1/notebooks/{id}/quiz              # Generate quiz
POST   /api/v1/notebooks/{id}/study-guide       # Generate study guide
POST   /api/v1/notebooks/{id}/faq               # Generate FAQ
POST   /api/v1/notebooks/{id}/studio/report     # Generate report
POST   /api/v1/notebooks/{id}/studio/slide-deck # Generate slides
```

#### Export
```bash
GET    /api/v1/notebooks/{id}/export/json       # Export as JSON
GET    /api/v1/notebooks/{id}/export/zip        # Export as ZIP
```

### Response Format

Every response includes usage telemetry:

```json
{
  "data": {
    "message": "Based on the sources...",
    "citations": [{"source_id": "...", "text": "..."}]
  },
  "usage": {
    "input_tokens": 1500,
    "output_tokens": 500,
    "cost_usd": 0.002,
    "model_used": "gemini-2.0-flash"
  }
}
```

---

## Project Structure

```
notebooklmreimagined/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI entry point
│   │   ├── config.py               # Settings management
│   │   ├── routers/
│   │   │   ├── notebooks.py        # CRUD operations
│   │   │   ├── sources.py          # Document management
│   │   │   ├── chat.py             # Conversations
│   │   │   ├── global_chat.py      # Cross-notebook search
│   │   │   ├── audio.py            # Audio generation
│   │   │   ├── video.py            # Video generation
│   │   │   ├── study.py            # Study materials
│   │   │   ├── studio.py           # Creative outputs
│   │   │   ├── export.py           # Export functionality
│   │   │   ├── notes.py            # User notes
│   │   │   ├── research.py         # Deep research
│   │   │   └── api_keys.py         # API key management
│   │   ├── services/
│   │   │   ├── gemini.py           # Gemini API integration
│   │   │   ├── persona_utils.py    # AI persona builder
│   │   │   ├── auth.py             # Authentication
│   │   │   └── supabase_client.py  # Database client
│   │   └── models/
│   │       └── schemas.py          # Pydantic models
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Dashboard
│   │   │   ├── notebooks/[id]/     # Notebook view
│   │   │   │   ├── page.tsx        # 3-panel layout
│   │   │   │   └── history/        # Content history
│   │   │   ├── settings/           # API keys
│   │   │   └── docs/               # API documentation
│   │   ├── components/
│   │   │   ├── chat/               # Chat panel
│   │   │   ├── sources/            # Sources panel
│   │   │   ├── studio/             # Studio panel
│   │   │   ├── notebook/           # Settings dialog
│   │   │   └── ui/                 # shadcn components
│   │   └── lib/
│   │       ├── api.ts              # API client
│   │       ├── export-utils.ts     # Export functions
│   │       └── hooks/              # React Query hooks
│   └── package.json
│
├── CLAUDE.md                       # AI development instructions
└── README.md
```

---

## Database Schema

12 PostgreSQL tables with Row Level Security:

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends Supabase Auth) |
| `notebooks` | User notebooks with settings (persona, preferences) |
| `sources` | Documents, URLs, YouTube transcripts with source guides |
| `chat_sessions` | Named conversation threads |
| `chat_messages` | Messages with citations |
| `audio_overviews` | Generated podcast content |
| `video_overviews` | Generated video content |
| `research_tasks` | Deep research jobs |
| `notes` | User notes and saved responses |
| `studio_outputs` | Reports, tables, slides, infographics |
| `api_keys` | API key management with scopes |
| `api_key_usage_logs` | Usage tracking per key |

---

## Environment Variables

### Backend (.env)
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_API_KEY=AIza...
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Roadmap

- [x] Multi-source RAG chat
- [x] Audio overview generation
- [x] Video overview generation
- [x] Study materials (flashcards, quizzes, guides)
- [x] Studio outputs (reports, slides, infographics)
- [x] API key management
- [x] Global cross-notebook search
- [x] **Chat threads with search**
- [x] **Full notebook export (ZIP/JSON/PDF)**
- [x] **AI personas and preferences**
- [ ] Streaming chat responses
- [ ] Collaborative notebooks (teams)
- [ ] Webhook integrations
- [ ] Custom embedding models
- [ ] Local LLM support (Ollama)
- [ ] Browser extension
- [ ] Mobile apps (React Native)

---

## Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) for details.

```bash
# Fork, clone, then:
git checkout -b feature/your-feature
# Make changes
git commit -m "Add your feature"
git push origin feature/your-feature
# Open a PR
```

---

## License

MIT License — use it however you want.

---

## Acknowledgments

- Inspired by Google's NotebookLM
- Built with [Supabase](https://supabase.com), [FastAPI](https://fastapi.tiangolo.com), [Next.js](https://nextjs.org)
- AI powered by [Google Gemini](https://ai.google.dev)
- UI components from [shadcn/ui](https://ui.shadcn.com)

---

<p align="center">
  <strong>Built with obsessive attention to detail.</strong><br>
  <em>Because researchers deserve better tools.</em>
</p>

<p align="center">
  <a href="https://github.com/earlyaidopters/notebooklmreimagined/stargazers">Star us on GitHub</a> •
  <a href="https://twitter.com/promptadvisers">Follow on Twitter</a>
</p>
