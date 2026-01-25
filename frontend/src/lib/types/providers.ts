/**
 * Provider types for multi-LLM provider support
 * Supports Google Gemini and OpenRouter with 100+ models
 */

export interface LLMModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: number; // Cost per million tokens
    completion: number; // Cost per million tokens
  };
}

export interface LLMProvider {
  id: string;
  name: string;
  description: string;
  available: boolean;
  configured: boolean;
  models: LLMModel[];
}

export interface ProvidersListResponse {
  providers: LLMProvider[];
  default_provider: string;
  default_model: string;
}

export interface ProviderConfigResponse {
  default_provider: string;
  openrouter_default_model?: string;
  google_configured: boolean;
  openrouter_configured: boolean;
}

export interface ProviderPreference {
  provider: string;
  model: string;
}

// Local storage key for user preferences
export const PROVIDER_PREFERENCE_KEY = 'notebooklm_provider_preference';

// Provider icons mapping
export const PROVIDER_ICONS: Record<string, string> = {
  google: 'Google',
  openrouter: 'Network',
  anthropic: 'Bot',
  openai: 'Sparkles',
} as const;

// Provider colors for badges
export const PROVIDER_COLORS: Record<string, string> = {
  google: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  openrouter: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  anthropic: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  openai: 'bg-green-500/20 text-green-400 border-green-500/30',
} as const;
