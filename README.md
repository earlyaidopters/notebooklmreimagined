<p align="center">
  <img src="https://img.shields.io/badge/Status-Alpha-orange?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge" alt="PRs Welcome">
</p>

<h1 align="center">NotebookLM Reimagined</h1>

<p align="center">
  <strong>An API-first research intelligence platform</strong><br>
  <em>Google's NotebookLM, reimagined for developers</em>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## What is NotebookLM Reimagined?

NotebookLM Reimagined is an **API-first** research platform that lets you:

- **Upload any document** (PDFs, URLs, YouTube videos, text) and chat with your sources
- **Generate podcast-style audio** summaries of your research
- **Create study materials** (flashcards, quizzes, study guides) automatically
- **Query across ALL your notebooks** with a single API call
- **Access everything via API** for automation and integrations

Unlike proprietary alternatives, NotebookLM Reimagined gives you:
- Full control over your data
- API-first design for developers
- Self-hosting capability
- Complete cost transparency per operation

---

## Features

### Core Features
| Feature | Description |
|---------|-------------|
| **Multi-Source RAG** | Chat with PDFs, URLs, YouTube transcripts, and text |
| **Citation Tracking** | Every response includes source citations |
| **Global Search** | Query across ALL notebooks simultaneously |
| **Cost Transparency** | See token usage and cost for every operation |

### Content Generation
| Feature | Description |
|---------|-------------|
| **Audio Overviews** | Generate podcast-style summaries (deep dive, brief, debate) |
| **Video Overviews** | Create video summaries with Veo |
| **Study Materials** | Auto-generate flashcards, quizzes, study guides, FAQs |
| **Studio Outputs** | Generate data tables, reports, slide decks, infographics |

### Developer Experience
| Feature | Description |
|---------|-------------|
| **API Keys** | Full API key management with scopes and rate limits |
| **50+ Endpoints** | Comprehensive REST API for everything |
| **Interactive Docs** | Built-in documentation with copy-paste cURL examples |
| **Dual Auth** | Support for both JWT and API key authentication |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│                   Next.js 14 + shadcn/ui                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Notebooks │ │ Sources  │ │   Chat   │ │  Audio   │  ...      │
│  │  Router  │ │  Router  │ │  Router  │ │  Router  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    Supabase     │ │   Gemini API    │ │ Supabase Storage│
│   PostgreSQL    │ │   (AI/RAG)      │ │    (Files)      │
│   + Auth + RLS  │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React, Tailwind CSS, shadcn/ui |
| **Backend** | FastAPI (Python 3.11+) |
| **Database** | Supabase PostgreSQL with Row Level Security |
| **Auth** | Supabase Auth (JWT) + Custom API Keys |
| **Storage** | Supabase Storage |
| **AI/LLM** | Google Gemini API (2.0 Flash, Pro, TTS, Veo) |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Supabase account
- Google AI API key

### 1. Clone the Repository

```bash
git clone https://github.com/promptadvisers/notebooklmreimagined.git
cd notebooklmreimagined
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_API_KEY=your-google-api-key
EOF

# Run the server
uvicorn app.main:app --reload
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF

npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Interactive API Docs**: http://localhost:3000/docs

---

## API Reference

### Authentication

All API requests require authentication via API key:

```bash
curl -X GET "http://localhost:8000/api/v1/notebooks" \
  -H "X-API-Key: nb_live_your_api_key_here"
```

### Key Endpoints

#### Notebooks
```bash
# List notebooks
GET /api/v1/notebooks

# Create notebook
POST /api/v1/notebooks
{"name": "My Research", "emoji": "📚"}
```

#### Sources
```bash
# Add text source
POST /api/v1/notebooks/{id}/sources/text
{"name": "Notes", "content": "Your text here..."}

# Add URL
POST /api/v1/notebooks/{id}/sources/url
{"url": "https://example.com/article"}

# Add YouTube video
POST /api/v1/notebooks/{id}/sources/youtube
{"url": "https://youtube.com/watch?v=..."}
```

#### Chat
```bash
# Chat with sources
POST /api/v1/notebooks/{id}/chat
{"message": "What are the main findings?"}

# Global chat (across ALL notebooks)
POST /api/v1/chat/global
{"message": "Find everything about machine learning", "notebook_ids": null}
```

#### Study Materials
```bash
# Generate flashcards
POST /api/v1/notebooks/{id}/flashcards
{"count": 10}

# Generate quiz
POST /api/v1/notebooks/{id}/quiz
{"question_count": 10}
```

### Response Format

All responses include usage information:

```json
{
  "data": { ... },
  "usage": {
    "input_tokens": 1500,
    "output_tokens": 500,
    "cost_usd": 0.002,
    "model_used": "gemini-2.0-flash"
  }
}
```

For complete API documentation with cURL examples, visit `/docs` in the frontend.

---

## Project Structure

```
notebooklmreimagined/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings management
│   │   ├── routers/             # API endpoints
│   │   │   ├── notebooks.py
│   │   │   ├── sources.py
│   │   │   ├── chat.py
│   │   │   ├── global_chat.py   # Cross-notebook queries
│   │   │   ├── audio.py
│   │   │   ├── video.py
│   │   │   ├── study.py
│   │   │   ├── notes.py
│   │   │   ├── studio.py
│   │   │   ├── research.py
│   │   │   └── api_keys.py
│   │   ├── services/
│   │   │   ├── auth.py          # JWT + API key auth
│   │   │   ├── gemini.py        # Gemini API integration
│   │   │   └── supabase_client.py
│   │   └── models/
│   │       └── schemas.py       # Pydantic models
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Dashboard
│   │   │   ├── settings/        # API key management
│   │   │   ├── docs/            # Interactive API docs
│   │   │   └── notebooks/[id]/  # Notebook view
│   │   ├── components/
│   │   └── lib/
│   │       └── api.ts           # API client
│   └── package.json
│
├── CLAUDE.md                    # AI assistant instructions
└── README.md
```

---

## Database Schema

The application uses 12 PostgreSQL tables with Row Level Security:

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends Supabase Auth) |
| `notebooks` | User notebooks |
| `sources` | Documents, URLs, YouTube transcripts |
| `chat_sessions` | Conversation sessions |
| `chat_messages` | Individual messages with citations |
| `audio_overviews` | Generated audio content |
| `video_overviews` | Generated video content |
| `research_tasks` | Deep research jobs |
| `notes` | User notes and saved responses |
| `studio_outputs` | Generated reports, tables, slides |
| `api_keys` | API key management |
| `api_key_usage_logs` | API usage tracking |

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

## Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation
- Keep the API docs in sync with changes

---

## Roadmap

- [ ] Streaming chat responses
- [ ] Webhook integrations
- [ ] Team/organization support
- [ ] Custom embedding models
- [ ] Local LLM support (Ollama)
- [ ] Browser extension
- [ ] Mobile apps

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Inspired by Google's NotebookLM
- Built with [Supabase](https://supabase.com), [FastAPI](https://fastapi.tiangolo.com), and [Next.js](https://nextjs.org)
- AI powered by [Google Gemini](https://ai.google.dev)

---

<p align="center">
  <strong>Built with ❤️ by the Open Source Community</strong>
</p>
