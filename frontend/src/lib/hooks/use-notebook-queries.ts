'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient, Notebook, Source, ChatMessage } from '@/lib/supabase'

// Query key factory for consistent cache keys
export const notebookKeys = {
  all: ['notebooks'] as const,
  lists: () => [...notebookKeys.all, 'list'] as const,
  list: (filters: string) => [...notebookKeys.lists(), { filters }] as const,
  details: () => [...notebookKeys.all, 'detail'] as const,
  detail: (id: string) => [...notebookKeys.details(), id] as const,
  sources: (notebookId: string) => [...notebookKeys.detail(notebookId), 'sources'] as const,
  notes: (notebookId: string) => [...notebookKeys.detail(notebookId), 'notes'] as const,
  chatSessions: (notebookId: string) => [...notebookKeys.detail(notebookId), 'chat-sessions'] as const,
  chatSession: (notebookId: string, sessionId: string) => [...notebookKeys.chatSessions(notebookId), sessionId] as const,
  audio: (notebookId: string) => [...notebookKeys.detail(notebookId), 'audio'] as const,
  video: (notebookId: string) => [...notebookKeys.detail(notebookId), 'video'] as const,
  research: (notebookId: string) => [...notebookKeys.detail(notebookId), 'research'] as const,
  studyMaterials: (notebookId: string) => [...notebookKeys.detail(notebookId), 'study-materials'] as const,
  creativeOutputs: (notebookId: string) => [...notebookKeys.detail(notebookId), 'creative-outputs'] as const,
}

// Helper to get auth headers
async function getAuthHeaders() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  }
}

// =============== NOTEBOOK QUERIES ===============

export function useNotebook(notebookId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: notebookKeys.detail(notebookId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notebooks')
        .select('*')
        .eq('id', notebookId)
        .single()

      if (error) throw error
      return data as Notebook
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useNotebooks() {
  const supabase = createClient()

  return useQuery({
    queryKey: notebookKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notebooks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Notebook[]
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

// =============== SOURCES QUERIES ===============

export function useSources(notebookId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: notebookKeys.sources(notebookId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .eq('notebook_id', notebookId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Source[]
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

// =============== NOTES QUERIES ===============

interface LocalNote {
  id: string
  notebook_id: string
  type: 'written' | 'saved_response'
  title: string | null
  content: string | null
  tags: string[]
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export function useNotes(notebookId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: notebookKeys.notes(notebookId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('notebook_id', notebookId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as LocalNote[]
    },
    staleTime: 30 * 1000,
  })
}

// =============== CHAT SESSION QUERIES ===============

interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

export function useChatSessions(notebookId: string) {
  return useQuery({
    queryKey: notebookKeys.chatSessions(notebookId),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/notebooks/${notebookId}/chat/sessions`, { headers })
      const result = await response.json()
      return result.data as ChatSession[] || []
    },
    staleTime: 30 * 1000,
  })
}

export function useChatSession(notebookId: string, sessionId: string | null) {
  return useQuery({
    queryKey: notebookKeys.chatSession(notebookId, sessionId || 'new'),
    queryFn: async () => {
      if (!sessionId) return { messages: [] }
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/notebooks/${notebookId}/chat/sessions/${sessionId}`, { headers })
      const result = await response.json()
      return result.data as { messages: ChatMessage[] }
    },
    enabled: !!sessionId,
    staleTime: 30 * 1000,
  })
}

// =============== GENERATED CONTENT QUERIES ===============

interface GeneratedAudio {
  id: string
  format: string
  status: string
  script?: string
  audio_url?: string
  duration_seconds?: number
  created_at: string
}

interface GeneratedVideo {
  id: string
  style: string
  status: string
  script?: string
  video_url?: string
  thumbnail_url?: string
  duration_seconds?: number
  created_at: string
}

interface GeneratedResearch {
  id: string
  query: string
  mode: string
  status: string
  progress_message?: string
  sources_found_count?: number
  sources_analyzed_count?: number
  report_content?: string
  report_citations?: { title: string; url: string }[]
  created_at: string
  completed_at?: string
}

export function useGeneratedAudio(notebookId: string) {
  return useQuery({
    queryKey: notebookKeys.audio(notebookId),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/notebooks/${notebookId}/audio`, { headers })
      const result = await response.json()
      return result.data?.[0] as GeneratedAudio | null
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

export function useGeneratedVideo(notebookId: string) {
  return useQuery({
    queryKey: notebookKeys.video(notebookId),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/notebooks/${notebookId}/video`, { headers })
      const result = await response.json()
      return result.data?.[0] as GeneratedVideo | null
    },
    staleTime: 60 * 1000,
  })
}

export function useGeneratedResearch(notebookId: string) {
  return useQuery({
    queryKey: notebookKeys.research(notebookId),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/notebooks/${notebookId}/research`, { headers })
      const result = await response.json()
      return result.data?.[0] as GeneratedResearch | null
    },
    staleTime: 60 * 1000,
  })
}

// =============== STUDY MATERIALS & CREATIVE OUTPUTS ===============

interface StudyMaterial {
  id: string
  type: string
  sourceIds: string[]
  sourceNames: string[]
  createdAt: string
  itemCount?: number
  data?: Record<string, unknown>
}

interface CreativeOutput {
  id: string
  type: string
  title: string
  status: string
  createdAt: string
  content?: Record<string, unknown>
}

export function useStudyMaterials(notebookId: string, sources: { id: string; name: string }[] = []) {
  return useQuery({
    queryKey: notebookKeys.studyMaterials(notebookId),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/notebooks/${notebookId}/study`, { headers })
      const result = await response.json()

      if (!result.data || !Array.isArray(result.data)) return { materials: [], byType: {} }

      // Group by type and get latest of each
      const materialsByType: Record<string, typeof result.data[0]> = {}
      for (const material of result.data) {
        if (!materialsByType[material.type]) {
          materialsByType[material.type] = material
        }
      }

      // Build metadata
      const metaArray = Object.values(materialsByType).map((material) => {
        const sourceIds = material.source_ids || []
        const sourceNames = sourceIds.map((id: string) => {
          const source = sources.find(s => s.id === id)
          return source?.name || 'Unknown source'
        })

        let itemCount = 0
        if (material.type === 'flashcards') itemCount = material.data?.flashcards?.length || 0
        else if (material.type === 'quiz') itemCount = material.data?.questions?.length || 0
        else if (material.type === 'faq') itemCount = material.data?.faq?.length || 0

        return {
          id: material.id,
          type: material.type,
          sourceIds,
          sourceNames,
          createdAt: material.created_at,
          itemCount,
          data: material.data,
        } as StudyMaterial
      })

      return { materials: metaArray, byType: materialsByType }
    },
    staleTime: 30 * 1000,
  })
}

export function useCreativeOutputs(notebookId: string) {
  return useQuery({
    queryKey: notebookKeys.creativeOutputs(notebookId),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/notebooks/${notebookId}/studio`, { headers })
      const result = await response.json()

      if (!result.data || !Array.isArray(result.data)) return { outputs: [], byType: {} }

      // Group by type and get latest completed of each
      const outputsByType: Record<string, typeof result.data[0]> = {}
      for (const output of result.data) {
        if (output.status === 'completed' && !outputsByType[output.type]) {
          outputsByType[output.type] = output
        }
      }

      const metaArray = Object.values(outputsByType).map((output) => ({
        id: output.id,
        type: output.type,
        title: output.title || output.type.replace('_', ' '),
        status: output.status,
        createdAt: output.created_at,
        content: output.content,
      } as CreativeOutput))

      return { outputs: metaArray, byType: outputsByType }
    },
    staleTime: 30 * 1000,
  })
}

// =============== INVALIDATION HELPERS ===============

export function useInvalidateNotebook() {
  const queryClient = useQueryClient()

  return {
    invalidateSources: (notebookId: string) =>
      queryClient.invalidateQueries({ queryKey: notebookKeys.sources(notebookId) }),
    invalidateNotes: (notebookId: string) =>
      queryClient.invalidateQueries({ queryKey: notebookKeys.notes(notebookId) }),
    invalidateChatSessions: (notebookId: string) =>
      queryClient.invalidateQueries({ queryKey: notebookKeys.chatSessions(notebookId) }),
    invalidateAudio: (notebookId: string) =>
      queryClient.invalidateQueries({ queryKey: notebookKeys.audio(notebookId) }),
    invalidateVideo: (notebookId: string) =>
      queryClient.invalidateQueries({ queryKey: notebookKeys.video(notebookId) }),
    invalidateResearch: (notebookId: string) =>
      queryClient.invalidateQueries({ queryKey: notebookKeys.research(notebookId) }),
    invalidateStudyMaterials: (notebookId: string) =>
      queryClient.invalidateQueries({ queryKey: notebookKeys.studyMaterials(notebookId) }),
    invalidateCreativeOutputs: (notebookId: string) =>
      queryClient.invalidateQueries({ queryKey: notebookKeys.creativeOutputs(notebookId) }),
    invalidateAll: (notebookId: string) =>
      queryClient.invalidateQueries({ queryKey: notebookKeys.detail(notebookId) }),
  }
}
