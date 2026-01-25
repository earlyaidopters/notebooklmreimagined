'use client';

import {
  Check,
  ChevronDown,
  Globe,
  Loader2,
  Sparkles,
  Info,
  DollarSign,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  getProviders,
  getProviderConfig,
  saveProviderPreference,
  loadProviderPreference,
  getAvailableProviders,
  findProviderById,
  type LLMProvider,
  type LLMModel,
  type ProviderPreference,
} from '@/lib/api/providers';
import { PROVIDER_COLORS, PROVIDER_ICONS } from '@/lib/types/providers';

interface ProviderSelectorProps {
  /**
   * Callback when provider selection changes
   */
  onSelectionChange?: (preference: ProviderPreference) => void;
  /**
   * Initial provider selection (overrides localStorage)
   */
  initialSelection?: ProviderPreference;
  /**
   * Size variant for the selector
   */
  size?: 'sm' | 'default';
  /**
   * Show pricing information
   */
  showPricing?: boolean;
  /**
   * Show description
   */
  showDescription?: boolean;
  /**
   * Compact mode (hide description, show badges only)
   */
  compact?: boolean;
}

export function ProviderSelector({
  onSelectionChange,
  initialSelection,
  size = 'default',
  showPricing = false,
  showDescription = true,
  compact = false,
}: ProviderSelectorProps) {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [config, setConfig] = useState<{ default_provider: string; default_model: string } | null>(
    null
  );
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch providers and config
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [providersData, configData] = await Promise.all([
        getProviders(),
        getProviderConfig().catch(() => null),
      ]);

      setProviders(providersData.providers);
      if (configData) {
        setConfig({
          default_provider: configData.default_provider,
          default_model: configData.openrouter_default_model || 'gemini-2.0-flash',
        });
      }

      // Determine initial selection
      let initialProvider: string;
      let initialModel: string;

      if (initialSelection) {
        initialProvider = initialSelection.provider;
        initialModel = initialSelection.model;
      } else {
        // Check localStorage first
        const saved = loadProviderPreference();
        if (saved) {
          initialProvider = saved.provider;
          initialModel = saved.model;
        } else if (configData) {
          initialProvider = configData.default_provider;
          initialModel = configData.openrouter_default_model || 'gemini-2.0-flash';
        } else {
          // Fall back to first available provider
          const available = getAvailableProviders(providersData.providers);
          initialProvider = available[0]?.id || providersData.providers[0]?.id || '';
          initialModel = providersData.providers[0]?.models[0]?.id || '';
        }
      }

      setSelectedProvider(initialProvider);
      setSelectedModel(initialModel);
    } catch (err) {
      console.error('Failed to fetch providers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, [initialSelection]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle provider change
  const handleProviderChange = useCallback(
    (providerId: string) => {
      setSelectedProvider(providerId);
      const provider = findProviderById(providers, providerId);
      if (provider) {
        const firstModel = provider.models[0]?.id || '';
        setSelectedModel(firstModel);
        saveAndNotify({ provider: providerId, model: firstModel });
      }
    },
    [providers]
  );

  // Handle model change
  const handleModelChange = useCallback(
    (modelId: string) => {
      setSelectedModel(modelId);
      saveAndNotify({ provider: selectedProvider, model: modelId });
    },
    [selectedProvider]
  );

  // Save to localStorage and notify parent
  const saveAndNotify = useCallback(
    (preference: ProviderPreference) => {
      saveProviderPreference(preference);
      onSelectionChange?.(preference);
    },
    [onSelectionChange]
  );

  // Get current provider
  const currentProvider = findProviderById(providers, selectedProvider);
  const availableProviders = getAvailableProviders(providers);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--text-tertiary)]" />
        <span className="text-sm text-[var(--text-tertiary)]">Loading providers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-red-400" />
        <span className="text-sm text-red-400">Failed to load providers</span>
      </div>
    );
  }

  if (availableProviders.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-[var(--text-tertiary)]" />
        <span className="text-sm text-[var(--text-tertiary)]">No providers configured</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Provider Selector */}
      <div className="flex items-center gap-2">
        <label
          className={`font-medium text-[var(--text-secondary)] ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
        >
          Provider
        </label>
        <Select value={selectedProvider} onValueChange={handleProviderChange} disabled={loading}>
          <SelectTrigger
            className={`w-[180px] border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)] ${
              size === 'sm' ? 'h-8' : ''
            }`}
            size={size}
          >
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent className="border-[rgba(255,255,255,0.15)] bg-[#1a1a2e]">
            {availableProviders.map((provider) => {
              const isDefault = config?.default_provider === provider.id;
              const icon = PROVIDER_ICONS[provider.id] || 'Globe';
              const Icon = icon === 'Google' ? Globe : icon === 'Sparkles' ? Sparkles : Globe;

              return (
                <SelectItem
                  key={provider.id}
                  value={provider.id}
                  className="cursor-pointer hover:bg-[var(--bg-tertiary)] focus:bg-[var(--bg-tertiary)]"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${provider.id === 'google' ? 'text-blue-400' : 'text-purple-400'}`} />
                    <span className="flex-1">{provider.name}</span>
                    {isDefault && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Model Selector */}
      {currentProvider && currentProvider.models.length > 0 && (
        <div className="flex items-center gap-2">
          <label
            className={`font-medium text-[var(--text-secondary)] ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
          >
            Model
          </label>
          <Select value={selectedModel} onValueChange={handleModelChange} disabled={loading}>
            <SelectTrigger
              className={`w-[220px] border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)] ${
                size === 'sm' ? 'h-8' : ''
              }`}
              size={size}
            >
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] border-[rgba(255,255,255,0.15)] bg-[#1a1a2e]">
              <SelectLabel className="px-2 py-1.5 text-xs text-[var(--text-tertiary)]">
                {currentProvider.name} Models
              </SelectLabel>
              <SelectSeparator />
              {currentProvider.models.map((model) => {
                const isDefault = config?.default_model === model.id;

                return (
                  <SelectItem
                    key={model.id}
                    value={model.id}
                    className="cursor-pointer hover:bg-[var(--bg-tertiary)] focus:bg-[var(--bg-tertiary)]"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="flex-1 truncate text-sm">{model.name}</span>
                        {isDefault && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Default
                          </Badge>
                        )}
                        {showPricing && model.pricing && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 shrink-0"
                              >
                                <DollarSign className="h-3 w-3 text-green-400" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <div className="space-y-1 text-xs">
                                <p className="font-medium">Pricing per 1M tokens:</p>
                                <p>Prompt: ${model.pricing.prompt.toFixed(2)}</p>
                                <p>Completion: ${model.pricing.completion.toFixed(2)}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      {!compact && showDescription && model.description && (
                        <span className="text-xs text-[var(--text-tertiary)] line-clamp-1">
                          {model.description}
                        </span>
                      )}
                      {model.context_length && (
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {model.context_length.toLocaleString()} tokens context
                        </span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Current Selection Badge */}
      {currentProvider && !compact && (
        <Badge
          className={`border ${PROVIDER_COLORS[currentProvider.id] || PROVIDER_COLORS.google}`}
        >
          {selectedModel}
        </Badge>
      )}
    </div>
  );
}

/**
 * Compact provider badge for displaying current selection
 */
export function ProviderBadge({
  provider,
  model,
  className = '',
}: {
  provider: string;
  model: string;
  className?: string;
}) {
  const colors = PROVIDER_COLORS[provider] || PROVIDER_COLORS.google;
  const icon = PROVIDER_ICONS[provider] || 'Globe';
  const Icon = icon === 'Google' ? Globe : icon === 'Sparkles' ? Sparkles : Globe;

  return (
    <Badge className={`border ${colors} ${className}`}>
      <Icon className="mr-1 h-3 w-3" />
      <span className="max-w-[150px] truncate">{model}</span>
    </Badge>
  );
}

/**
 * Provider selector for settings page with more detailed information
 */
export function ProviderSelectorSettings({
  onSelectionChange,
  initialSelection,
}: Omit<ProviderSelectorProps, 'size' | 'compact' | 'showPricing' | 'showDescription'>) {
  return (
    <ProviderSelector
      onSelectionChange={onSelectionChange}
      initialSelection={initialSelection}
      size="default"
      showPricing={true}
      showDescription={true}
      compact={false}
    />
  );
}

/**
 * Compact provider selector for chat interface
 */
export function ProviderSelectorCompact({
  onSelectionChange,
  initialSelection,
}: Omit<ProviderSelectorProps, 'size' | 'compact' | 'showPricing' | 'showDescription'>) {
  return (
    <ProviderSelector
      onSelectionChange={onSelectionChange}
      initialSelection={initialSelection}
      size="sm"
      showPricing={false}
      showDescription={false}
      compact={true}
    />
  );
}
