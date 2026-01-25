from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID
from enum import Enum


# Enums
class SourceType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    YOUTUBE = "youtube"
    URL = "url"
    AUDIO = "audio"
    TEXT = "text"


class SourceStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class AudioFormat(str, Enum):
    DEEP_DIVE = "deep_dive"
    BRIEF = "brief"
    CRITIQUE = "critique"
    DEBATE = "debate"


class VideoStyle(str, Enum):
    WHITEBOARD = "whiteboard"
    CLASSIC = "classic"
    ANIME = "anime"
    RETRO = "retro"


class ResearchMode(str, Enum):
    FAST = "fast"
    DEEP = "deep"


# Base schemas
class UsageInfo(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0
    model_used: str = ""


class ApiResponse(BaseModel):
    data: Any = None
    usage: Optional[UsageInfo] = None
    meta: dict = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    error: dict


# Notebook schemas
class NotebookCreate(BaseModel):
    name: str
    description: Optional[str] = None
    emoji: str = "📓"


class NotebookUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    emoji: Optional[str] = None
    settings: Optional[dict] = None


class NotebookResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str]
    emoji: str
    settings: dict
    file_search_store_id: Optional[str]
    source_count: int
    created_at: datetime
    updated_at: datetime


# Source schemas
class SourceCreate(BaseModel):
    type: SourceType
    name: str
    content: Optional[str] = None  # For text/URL sources


class SourceResponse(BaseModel):
    id: UUID
    notebook_id: UUID
    type: SourceType
    name: str
    status: SourceStatus
    file_path: Optional[str]
    original_filename: Optional[str]
    mime_type: Optional[str]
    file_size_bytes: Optional[int]
    token_count: Optional[int]
    metadata: dict
    source_guide: Optional[dict]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime


class YouTubeSourceCreate(BaseModel):
    url: str
    name: Optional[str] = None


class URLSourceCreate(BaseModel):
    url: str
    name: Optional[str] = None


class TextSourceCreate(BaseModel):
    content: str
    name: str


# Chat schemas
class ChatMessage(BaseModel):
    message: str
    session_id: Optional[UUID] = None
    source_ids: Optional[List[UUID]] = None
    model: str = "gemini-2.0-flash"


class Citation(BaseModel):
    number: int
    source_id: UUID
    source_name: str
    text: str
    confidence: float = 0.0


class ChatResponse(BaseModel):
    message_id: UUID
    session_id: UUID
    content: str
    citations: List[Citation] = []
    suggested_questions: List[str] = []


class ChatSessionResponse(BaseModel):
    id: UUID
    notebook_id: UUID
    title: Optional[str]
    created_at: datetime
    updated_at: datetime


# Audio schemas
class AudioCreate(BaseModel):
    format: AudioFormat = AudioFormat.DEEP_DIVE
    custom_instructions: Optional[str] = None
    source_ids: Optional[List[UUID]] = None


class AudioEstimate(BaseModel):
    estimated_duration_seconds: int
    estimated_cost_usd: float
    format: AudioFormat


class AudioResponse(BaseModel):
    id: UUID
    notebook_id: UUID
    format: AudioFormat
    status: str
    progress_percent: int
    custom_instructions: Optional[str]
    source_ids: List[UUID]
    script: Optional[str]
    audio_file_path: Optional[str]
    duration_seconds: Optional[int]
    model_used: Optional[str]
    cost_usd: Optional[float]
    error_message: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]


# Video schemas
class VideoCreate(BaseModel):
    style: VideoStyle = VideoStyle.WHITEBOARD
    source_ids: Optional[List[UUID]] = None


class VideoEstimate(BaseModel):
    estimated_duration_seconds: int
    estimated_cost_usd: float
    style: VideoStyle


class VideoResponse(BaseModel):
    id: UUID
    notebook_id: UUID
    style: VideoStyle
    status: str
    progress_percent: int
    source_ids: List[UUID]
    script: Optional[str]
    video_file_path: Optional[str]
    thumbnail_path: Optional[str]
    duration_seconds: Optional[int]
    model_used: Optional[str]
    cost_usd: Optional[float]
    error_message: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]


# Research schemas
class ResearchCreate(BaseModel):
    query: str
    mode: ResearchMode = ResearchMode.FAST


class ResearchResponse(BaseModel):
    id: UUID
    notebook_id: UUID
    query: str
    mode: ResearchMode
    status: str
    progress_message: Optional[str]
    sources_found_count: int
    sources_analyzed_count: int
    report_content: Optional[str]
    report_citations: List[dict]
    cost_usd: Optional[float]
    created_at: datetime
    completed_at: Optional[datetime]


# Study materials schemas
class FlashcardCreate(BaseModel):
    source_ids: Optional[List[UUID]] = None
    count: int = 10
    model: str = "gemini-2.0-flash"


class Flashcard(BaseModel):
    question: str
    answer: str
    source_id: Optional[UUID] = None


class FlashcardsResponse(BaseModel):
    flashcards: List[Flashcard]


class QuizCreate(BaseModel):
    source_ids: Optional[List[UUID]] = None
    question_count: int = 10
    model: str = "gemini-2.0-flash"


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_index: int
    explanation: str
    source_id: Optional[UUID] = None


class QuizResponse(BaseModel):
    questions: List[QuizQuestion]


class StudyGuideCreate(BaseModel):
    source_ids: Optional[List[UUID]] = None
    model: str = "gemini-2.0-flash"


class StudyGuideResponse(BaseModel):
    title: str
    summary: str
    key_concepts: List[dict]
    glossary: List[dict]
    review_questions: List[str]


class FAQCreate(BaseModel):
    source_ids: Optional[List[UUID]] = None
    count: int = 10
    model: str = "gemini-2.0-flash"


class FAQItem(BaseModel):
    question: str
    answer: str


class FAQResponse(BaseModel):
    faqs: List[FAQItem]


# Notes schemas
class NoteCreate(BaseModel):
    title: Optional[str] = None
    content: str
    tags: List[str] = []


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    is_pinned: Optional[bool] = None


class NoteResponse(BaseModel):
    id: UUID
    notebook_id: UUID
    type: str
    title: Optional[str]
    content: Optional[str]
    tags: List[str]
    is_pinned: bool
    original_message_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime


class SaveResponseCreate(BaseModel):
    message_id: UUID


# Usage schemas
class UsageStats(BaseModel):
    total_cost_usd: float
    total_input_tokens: int
    total_output_tokens: int
    by_operation: dict
    by_model: dict
    period_start: datetime
    period_end: datetime


# Studio Output schemas (Data Table, Report, Slide Deck, Infographic)
class StudioOutputType(str, Enum):
    DATA_TABLE = "data_table"
    REPORT = "report"
    SLIDE_DECK = "slide_deck"
    INFOGRAPHIC = "infographic"


class StudioOutputStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class StudioOutputCreate(BaseModel):
    type: StudioOutputType
    source_ids: Optional[List[UUID]] = None
    custom_instructions: Optional[str] = None
    model: str = "gemini-2.0-flash"


class DataTableCreate(BaseModel):
    source_ids: Optional[List[UUID]] = None
    custom_instructions: Optional[str] = None
    model: str = "gemini-2.0-flash"


class ReportCreate(BaseModel):
    source_ids: Optional[List[UUID]] = None
    custom_instructions: Optional[str] = None
    model: str = "gemini-2.0-flash"


class SlideDeckCreate(BaseModel):
    source_ids: Optional[List[UUID]] = None
    slide_count: int = 10
    custom_instructions: Optional[str] = None
    model: str = "gemini-2.0-flash"


class InfographicCreate(BaseModel):
    source_ids: Optional[List[UUID]] = None
    style: str = "modern"  # modern, minimal, bold, infographic
    custom_instructions: Optional[str] = None
    model: str = "gemini-2.0-flash"


class StudioOutputResponse(BaseModel):
    id: UUID
    notebook_id: UUID
    type: StudioOutputType
    status: StudioOutputStatus
    title: Optional[str]
    source_ids: List[UUID]
    custom_instructions: Optional[str]
    content: dict
    file_path: Optional[str]
    thumbnail_path: Optional[str]
    model_used: Optional[str]
    cost_usd: Optional[float]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]


# Data Table specific content structure
class DataTableColumn(BaseModel):
    header: str
    key: str
    type: str = "text"  # text, number, date, boolean


class DataTableContent(BaseModel):
    title: str
    description: Optional[str] = None
    columns: List[DataTableColumn]
    rows: List[dict]
    summary: Optional[str] = None


# Report specific content structure
class ReportSection(BaseModel):
    title: str
    content: str
    order: int


class ReportContent(BaseModel):
    title: str
    executive_summary: str
    sections: List[ReportSection]
    key_findings: List[str]
    conclusion: str


# Slide Deck specific content structure
class Slide(BaseModel):
    title: str
    content: str
    notes: Optional[str] = None
    layout: str = "title_content"  # title_only, title_content, two_column, image_content
    order: int


class SlideDeckContent(BaseModel):
    title: str
    subtitle: Optional[str] = None
    slides: List[Slide]


# Infographic specific content structure
class InfographicContent(BaseModel):
    title: str
    description: str
    image_url: Optional[str] = None
    image_prompt: str
    key_points: List[str]


# ============================================
# API Key Schemas
# ============================================

class ApiKeyScope(str, Enum):
    ALL = "*"
    READ = "read"
    NOTEBOOKS = "notebooks"
    SOURCES = "sources"
    CHAT = "chat"
    AUDIO = "audio"
    VIDEO = "video"
    RESEARCH = "research"
    STUDY = "study"
    NOTES = "notes"


class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    scopes: List[str] = Field(default=["*"])
    rate_limit_rpm: int = Field(default=60, ge=1, le=1000)
    rate_limit_rpd: int = Field(default=10000, ge=1, le=1000000)
    expires_at: Optional[datetime] = None
    description: Optional[str] = None
    allowed_ips: Optional[List[str]] = None


class ApiKeyResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    key_prefix: str
    scopes: List[str]
    rate_limit_rpm: int
    rate_limit_rpd: int
    total_requests: int
    total_tokens_in: int
    total_tokens_out: int
    total_cost_usd: float
    last_used_at: Optional[datetime]
    is_active: bool
    expires_at: Optional[datetime]
    description: Optional[str]
    allowed_ips: Optional[List[str]]
    created_at: datetime
    updated_at: datetime


class ApiKeyCreatedResponse(ApiKeyResponse):
    """Response when creating a new API key - includes the full key (only shown once)"""
    key: str


class ApiKeyUpdate(BaseModel):
    name: Optional[str] = None
    scopes: Optional[List[str]] = None
    rate_limit_rpm: Optional[int] = Field(default=None, ge=1, le=1000)
    rate_limit_rpd: Optional[int] = Field(default=None, ge=1, le=1000000)
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None
    description: Optional[str] = None
    allowed_ips: Optional[List[str]] = None


class ApiKeyUsageStats(BaseModel):
    total_requests: int
    total_tokens_in: int
    total_tokens_out: int
    total_cost_usd: float
    requests_today: int
    rate_limit_rpm: int
    rate_limit_rpd: int
    last_used_at: Optional[datetime]


class ApiKeyUsageLog(BaseModel):
    id: UUID
    endpoint: str
    method: str
    status_code: int
    input_tokens: int
    output_tokens: int
    cost_usd: float
    response_time_ms: int
    created_at: datetime


# ============================================
# Global Chat Schemas
# ============================================

class GlobalChatMessage(BaseModel):
    """Chat message that can query across multiple notebooks."""
    message: str
    notebook_ids: Optional[List[UUID]] = None  # None = query all notebooks
    model: str = "gemini-2.0-flash"
    max_sources_per_notebook: int = Field(default=10, ge=1, le=50)


class GlobalCitation(BaseModel):
    """Citation that includes notebook attribution."""
    number: int
    notebook_id: UUID
    notebook_name: str
    source_id: UUID
    source_name: str
    text: str
    confidence: float = 0.0


class GlobalChatResponse(BaseModel):
    """Response from global chat query."""
    content: str
    citations: List[GlobalCitation] = []
    notebooks_queried: List[dict] = []  # List of {id, name, source_count}
    suggested_questions: List[str] = []


# ============================================
# OpenRouter Security Schemas
# ============================================

# Allowlist of approved models to prevent arbitrary model usage
ALLOWED_OPENROUTER_MODELS = {
    "anthropic/claude-3.5-sonnet",
    "anthropic/claude-3-opus",
    "openai/gpt-4",
    "openai/gpt-4-turbo",
    "google/gemini-2.0-flash",
    "google/gemini-2.5-flash",
    "google/gemini-2.5-pro",
    "meta/llama-3.1-70b",
    "zai/c3-7b",
    "zai/c3-13b",
    "zai/c3-40b",
}


class OpenRouterGenerateRequest(BaseModel):
    """Secure request schema for OpenRouter content generation."""
    prompt: str = Field(
        ...,
        min_length=1,
        max_length=50000,
        description="User prompt to generate content from"
    )
    model_name: str = Field(
        default="anthropic/claude-3.5-sonnet",
        description="OpenRouter model identifier"
    )
    provider: Optional[str] = Field(
        default=None,
        description="Optional provider filter for OpenRouter"
    )
    system_instruction: Optional[str] = Field(
        default=None,
        max_length=10000,
        description="Optional system instruction to guide generation"
    )
    temperature: float = Field(
        default=0.7,
        ge=0.0,
        le=2.0,
        description="Sampling temperature (0.0 - 2.0)"
    )
    max_tokens: int = Field(
        default=4096,
        ge=1,
        le=32768,
        description="Maximum tokens to generate (1 - 32768)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "prompt": "Explain quantum computing in simple terms",
                "model_name": "anthropic/claude-3.5-sonnet",
                "temperature": 0.7,
                "max_tokens": 4096
            }
        }


class OpenRouterContextRequest(BaseModel):
    """Secure request schema for OpenRouter context-based generation (RAG)."""
    message: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="User question/message"
    )
    context: str = Field(
        ...,
        min_length=1,
        max_length=100000,
        description="Document context for RAG"
    )
    model_name: str = Field(
        default="anthropic/claude-3.5-sonnet",
        description="OpenRouter model identifier"
    )
    provider: Optional[str] = Field(
        default=None,
        description="Optional provider filter for OpenRouter"
    )
    source_names: Optional[List[str]] = Field(
        default=None,
        description="Optional list of source names for citation"
    )
    persona_instructions: Optional[str] = Field(
        default=None,
        max_length=10000,
        description="Optional persona instructions"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "message": "When was Python created?",
                "context": "Document 1: Python is a programming language...",
                "model_name": "anthropic/claude-3.5-sonnet",
                "source_names": ["Document 1", "Document 2"]
            }
        }
