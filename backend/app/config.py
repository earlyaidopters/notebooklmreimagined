from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # Google/Gemini
    google_api_key: str

    # OpenRouter
    openrouter_api_key: str = ""

    # AtlasCloud Video API (Wan 2.5)
    atlascloud_api_key: str = ""

    # LLM Provider Configuration
    default_llm_provider: str = "google"  # "google" or "openrouter"
    openrouter_default_model: str = "anthropic/claude-3.5-sonnet"
    openrouter_provider: str = ""  # Optional: specific OpenRouter provider

    # App
    app_name: str = "NotebookLM Reimagined"
    debug: bool = False

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
