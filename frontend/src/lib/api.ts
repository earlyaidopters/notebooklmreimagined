// API client for NotebookLM Reimagined

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export interface ApiResponse<T = unknown> {
  data: T;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
    model_used: string;
  };
}

export interface ChatRequest {
  message: string;
  source_ids?: string[];
  session_id?: string;
  model?: string;
}

export interface ChatResponse {
  message_id: string;
  session_id: string;
  content: string;
  citations: Citation[];
  suggested_questions: string[];
}

export interface Citation {
  number: number;
  source_id: string;
  source_name: string;
  text: string;
  confidence: number;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface StudyGuide {
  title: string;
  summary: string;
  key_concepts: { term: string; definition: string; importance: string }[];
  glossary: { term: string; definition: string }[];
  review_questions: string[];
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface AudioOverview {
  id: string;
  notebook_id: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress_percent: number;
  script?: string;
  audio_file_path?: string;
  duration_seconds?: number;
  cost_usd?: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface Note {
  id: string;
  notebook_id: string;
  type: 'written' | 'saved_response';
  title?: string;
  content?: string;
  tags?: string[];
  is_pinned: boolean;
  original_message_id?: string;
  created_at: string;
  updated_at: string;
}

// Helper to get auth token
async function getAuthToken(): Promise<string | null> {
  try {
    const { createClient } = await import('./supabase');
    const supabase = createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) {
      console.warn('Failed to get auth session:', error);
      return null;
    }
    return session?.access_token || null;
  } catch (e) {
    console.warn('Auth token retrieval failed:', e);
    return null;
  }
}

// Fetch wrapper with auth
export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  } catch (e) {
    if (e instanceof TypeError && e.message === 'Failed to fetch') {
      throw new Error('Network error - please check your connection and try again');
    }
    throw e;
  }
}

// Notebooks API
export const notebooksApi = {
  async updateSettings(
    notebookId: string,
    settings: Record<string, unknown>
  ): Promise<ApiResponse<unknown>> {
    return fetchWithAuth(`/api/v1/notebooks/${notebookId}`, {
      method: 'PATCH',
      body: JSON.stringify({ settings }),
    });
  },
};

// Chat API
export const chatApi = {
  async sendMessage(notebookId: string, request: ChatRequest): Promise<ApiResponse<ChatResponse>> {
    return fetchWithAuth(`/api/v1/notebooks/${notebookId}/chat`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  async getSessions(notebookId: string) {
    return fetchWithAuth(`/api/v1/notebooks/${notebookId}/chat/sessions`);
  },

  async getSession(notebookId: string, sessionId: string) {
    return fetchWithAuth(`/api/v1/notebooks/${notebookId}/chat/sessions/${sessionId}`);
  },
};

// Study Materials API
export const studyApi = {
  async generateFlashcards(
    notebookId: string,
    sourceIds?: string[],
    count = 10
  ): Promise<ApiResponse<{ flashcards: Flashcard[] }>> {
    return fetchWithAuth(`/api/v1/notebooks/${notebookId}/flashcards`, {
      method: 'POST',
      body: JSON.stringify({ source_ids: sourceIds, count }),
    });
  },

  async generateQuiz(
    notebookId: string,
    sourceIds?: string[],
    questionCount = 10
  ): Promise<ApiResponse<{ questions: QuizQuestion[] }>> {
    return fetchWithAuth(`/api/v1/notebooks/${notebookId}/quiz`, {
      method: 'POST',
      body: JSON.stringify({ source_ids: sourceIds, question_count: questionCount }),
    });
  },

  async generateStudyGuide(
    notebookId: string,
    sourceIds?: string[]
  ): Promise<ApiResponse<StudyGuide>> {
    return fetchWithAuth(`/api/v1/notebooks/${notebookId}/study-guide`, {
      method: 'POST',
      body: JSON.stringify({ source_ids: sourceIds }),
    });
  },

  async generateFaq(
    notebookId: string,
    sourceIds?: string[],
    count = 10
  ): Promise<ApiResponse<{ faqs: FAQ[] }>> {
    return fetchWithAuth(`/api/v1/notebooks/${notebookId}/faq`, {
      method: 'POST',
      body: JSON.stringify({ source_ids: sourceIds, count }),
    });
  },
};

// Audio API
export const audioApi = {
  async estimate(notebookId: string, format: string, sourceIds?: string[]) {
    return fetchWithAuth(`/api/v1/notebooks/${notebookId}/audio/estimate`, {
      method: 'POST',
      body: JSON.stringify({ format, source_ids: sourceIds }),
    });
  },

  async generate(
    notebookId: string,
    format: string,
    sourceIds?: string[],
    customInstructions?: string
  ): Promise<ApiResponse<AudioOverview>> {
    return fetchWithAuth(`/api/v1/notebooks/${notebookId}/audio`, {
      method: 'POST',
      body: JSON.stringify({
        format,
        source_ids: sourceIds,
        custom_instructions: customInstructions,
      }),
    });
  },

  async list(notebookId: string): Promise<ApiResponse<AudioOverview[]>> {
    return fetchWithAuth(`/api/v1/notebooks/${notebookId}/audio`);
  },

  async get(notebookId: string, audioId: string): Promise<ApiResponse<AudioOverview>> {
    return fetchWithAuth(`/api/v1/notebooks/${notebookId}/audio/${audioId}`);
  },

  async delete(notebookId: string, audioId: string) {
    return fetchWithAuth(`/api/v1/notebooks/${notebookId}/audio/${audioId}`, {
      method: 'DELETE',
    });
  },
};

// Notes API
export const notesApi = {
  async create(
    notebookId: string,
    title: string,
    content: string,
    tags?: string[]
  ): Promise<ApiResponse<Note>> {
    return fetchWithAuth(`/api/v1/notebooks/${notebookId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ title, content, tags }),
    });
  },

  async list(notebookId: string): Promise<ApiResponse<Note[]>> {
    return fetchWithAuth(`/api/v1/notebooks/${notebookId}/notes`);
  },

  async get(notebookId: string, noteId: string): Promise<ApiResponse<Note>> {
    return fetchWithAuth(`/api/v1/notebooks/${notebookId}/notes/${noteId}`);
  },

  async update(
    notebookId: string,
    noteId: string,
    data: Partial<Note>
  ): Promise<ApiResponse<Note>> {
    return fetchWithAuth(`/api/v1/notebooks/${notebookId}/notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(notebookId: string, noteId: string) {
    return fetchWithAuth(`/api/v1/notebooks/${notebookId}/notes/${noteId}`, {
      method: 'DELETE',
    });
  },

  async saveResponse(notebookId: string, messageId: string): Promise<ApiResponse<Note>> {
    return fetchWithAuth(`/api/v1/notebooks/${notebookId}/notes/save-response`, {
      method: 'POST',
      body: JSON.stringify({ message_id: messageId }),
    });
  },
};

// API Keys types
export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_rpm: number;
  rate_limit_rpd: number;
  total_requests: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_cost_usd: number;
  last_used_at: string | null;
  is_active: boolean;
  expires_at: string | null;
  description: string | null;
  allowed_ips: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyWithSecret extends ApiKey {
  key: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes?: string[];
  rate_limit_rpm?: number;
  rate_limit_rpd?: number;
  expires_at?: string;
  description?: string;
  allowed_ips?: string[];
}

export interface UpdateApiKeyRequest {
  name?: string;
  scopes?: string[];
  rate_limit_rpm?: number;
  rate_limit_rpd?: number;
  is_active?: boolean;
  expires_at?: string;
  description?: string;
  allowed_ips?: string[];
}

export interface ApiKeyUsageStats {
  total_requests: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_cost_usd: number;
  requests_today: number;
  rate_limit_rpm: number;
  rate_limit_rpd: number;
  last_used_at: string | null;
}

// API Keys API
export const apiKeysApi = {
  async create(data: CreateApiKeyRequest): Promise<ApiResponse<ApiKeyWithSecret>> {
    return fetchWithAuth('/api/v1/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async list(): Promise<ApiResponse<ApiKey[]>> {
    return fetchWithAuth('/api/v1/api-keys');
  },

  async get(keyId: string): Promise<ApiResponse<ApiKey>> {
    return fetchWithAuth(`/api/v1/api-keys/${keyId}`);
  },

  async update(keyId: string, data: UpdateApiKeyRequest): Promise<ApiResponse<ApiKey>> {
    return fetchWithAuth(`/api/v1/api-keys/${keyId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async revoke(keyId: string): Promise<ApiResponse<{ deleted: boolean; id: string }>> {
    return fetchWithAuth(`/api/v1/api-keys/${keyId}`, {
      method: 'DELETE',
    });
  },

  async getUsage(keyId: string): Promise<ApiResponse<ApiKeyUsageStats>> {
    return fetchWithAuth(`/api/v1/api-keys/${keyId}/usage`);
  },

  async rotate(keyId: string): Promise<ApiResponse<ApiKeyWithSecret>> {
    return fetchWithAuth(`/api/v1/api-keys/${keyId}/rotate`, {
      method: 'POST',
    });
  },
};

// Re-export providers API for convenience
export { providersApi } from './api/providers';
export * from './types/providers';
