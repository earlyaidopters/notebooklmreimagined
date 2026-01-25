/**
 * API client for providers endpoint
 * Handles fetching available LLM providers and their models
 */

import { fetchWithAuth } from '@/lib/api';
import { PROVIDER_PREFERENCE_KEY } from '@/lib/types/providers';
import type {
  ProvidersListResponse,
  ProviderConfigResponse,
  LLMProvider,
  LLMModel,
  ProviderPreference,
} from '@/lib/types/providers';

/**
 * Fetch all available providers
 */
export async function getProviders(): Promise<ProvidersListResponse> {
  return fetchWithAuth('/api/providers');
}

/**
 * Fetch current provider configuration
 */
export async function getProviderConfig(): Promise<ProviderConfigResponse> {
  return fetchWithAuth('/api/providers/config');
}

/**
 * Get all models for a specific provider
 */
export async function getProviderModels(providerId: string): Promise<LLMModel[]> {
  const response = await getProviders();
  const provider = response.providers.find((p) => p.id === providerId);
  return provider?.models || [];
}

/**
 * Get all OpenRouter models
 */
export async function getOpenRouterModels(): Promise<LLMModel[]> {
  return getProviderModels('openrouter');
}

/**
 * Get all Google models
 */
export async function getGoogleModels(): Promise<LLMModel[]> {
  return getProviderModels('google');
}

/**
 * Save user's provider preference to localStorage
 */
export function saveProviderPreference(preference: ProviderPreference): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROVIDER_PREFERENCE_KEY, JSON.stringify(preference));
  }
}

/**
 * Load user's provider preference from localStorage
 */
export function loadProviderPreference(): ProviderPreference | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(PROVIDER_PREFERENCE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as ProviderPreference;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Clear user's provider preference from localStorage
 */
export function clearProviderPreference(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PROVIDER_PREFERENCE_KEY);
  }
}

/**
 * Get the preferred provider/model for a user
 * Falls back to server defaults if no preference is set
 */
export async function getPreferredProvider(): Promise<ProviderPreference> {
  // Check localStorage first
  const saved = loadProviderPreference();
  if (saved) {
    return saved;
  }

  // Fall back to server defaults
  const config = await getProviderConfig();
  return {
    provider: config.default_provider,
    model: config.openrouter_default_model || 'gemini-2.0-flash',
  };
}

/**
 * Find a provider by ID
 */
export function findProviderById(
  providers: LLMProvider[],
  providerId: string
): LLMProvider | undefined {
  return providers.find((p) => p.id === providerId);
}

/**
 * Find a model by ID within a provider
 */
export function findModelById(
  provider: LLMProvider,
  modelId: string
): LLMModel | undefined {
  return provider.models.find((m) => m.id === modelId);
}

/**
 * Get available providers only (filtered by availability and configuration)
 */
export function getAvailableProviders(providers: LLMProvider[]): LLMProvider[] {
  return providers.filter((p) => p.available && p.configured);
}

/**
 * Check if a provider is available
 */
export function isProviderAvailable(
  providers: LLMProvider[],
  providerId: string
): boolean {
  const provider = findProviderById(providers, providerId);
  return provider?.available && provider?.configured;
}

// Providers API object for consistency with other API modules
export const providersApi = {
  getProviders,
  getProviderConfig,
  getProviderModels,
  getOpenRouterModels,
  getGoogleModels,
  saveProviderPreference,
  loadProviderPreference,
  clearProviderPreference,
  getPreferredProvider,
  findProviderById,
  findModelById,
  getAvailableProviders,
  isProviderAvailable,
};
