'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient, Notebook, Source, ChatMessage } from '@/lib/supabase'
import { chatApi, notebooksApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  ArrowLeft, Loader2, Sparkles, X, RotateCcw,
  BookOpen, ListChecks, FileText, HelpCircle, Mic, Video, Search, Share2,
  Maximize2, Minimize2, Table, FileSpreadsheet, Presentation, Image as ImageIcon,
  History, Settings, Download
} from 'lucide-react'
// Toast notifications removed per user request
// import { toast } from 'sonner'
import { User } from '@supabase/supabase-js'

import { ThreePanelLayout } from '@/components/panels/three-panel-layout'
import { SourcesPanel } from '@/components/sources/sources-panel'
import { ChatPanel } from '@/components/chat/chat-panel'
import { StudioPanel, ExportOptionsState } from '@/components/studio/studio-panel'
import type { GenerationConfig } from '@/components/studio/generation-config-dialog'
import { exportNotebook, exportSlideDeckToPPTX, exportReportToDocx, SlideDeckData, ReportData } from '@/lib/export-utils'
import {
  useNotebook,
  useSources,
  useNotes,
  useChatSessions,
  useGeneratedAudio,
  useGeneratedVideo,
  useGeneratedResearch,
  useStudyMaterials,
  useCreativeOutputs,
  useInvalidateNotebook,
} from '@/lib/hooks/use-notebook-queries'

// Study viewers
import { FlashcardViewer } from '@/components/study/flashcard-viewer'
import { QuizViewer } from '@/components/study/quiz-viewer'
import { StudyGuideViewer } from '@/components/study/study-guide-viewer'
import { FAQViewer } from '@/components/study/faq-viewer'
import { MindMapViewer } from '@/components/study/mind-map-viewer'

// Studio viewers
import { AudioPlayer } from '@/components/studio/audio-player'
import { VideoPlayer } from '@/components/studio/video-player'
import { ResearchReport } from '@/components/studio/research-report'
import { InfographicViewer } from '@/components/studio/infographic-viewer'

// Notebook settings
import { NotebookSettingsDialog, NotebookSettings } from '@/components/notebook/notebook-settings'

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

export default function NotebookPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const notebookId = params.id as string
  const supabase = createClient()

  // Core state - React Query for cached data
  const [user, setUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  // React Query hooks for cached data
  const { data: notebook, isLoading: notebookLoading } = useNotebook(notebookId)
  const { data: sources = [], isLoading: sourcesLoading } = useSources(notebookId)
  const { data: notes = [], isLoading: notesLoading } = useNotes(notebookId)
  const { data: chatSessions = [], isLoading: loadingSessions } = useChatSessions(notebookId)
  const { data: generatedAudio } = useGeneratedAudio(notebookId)
  const { data: generatedVideo } = useGeneratedVideo(notebookId)
  const { data: generatedResearch } = useGeneratedResearch(notebookId)
  const { data: studyMaterialsData } = useStudyMaterials(notebookId, sources.map(s => ({ id: s.id, name: s.name })))
  const { data: creativeOutputsData } = useCreativeOutputs(notebookId)
  const invalidate = useInvalidateNotebook()

  // Derived loading state
  const loading = !authChecked || notebookLoading || sourcesLoading || notesLoading

  // Chat state
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set())
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Source state
  const [viewingSource, setViewingSource] = useState<Source | null>(null)
  const [uploading, setUploading] = useState(false)

  // Notes state
  const [addNoteOpen, setAddNoteOpen] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Settings state
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notebookSettings, setNotebookSettings] = useState<NotebookSettings | null>(null)

  // Audio state
  const [audioFormat, setAudioFormat] = useState('deep_dive')
  const [audioInstructions, setAudioInstructions] = useState('')
  const [generatingAudio, setGeneratingAudio] = useState(false)

  // Video state
  const [videoStyle, setVideoStyle] = useState('explainer')
  const [generatingVideo, setGeneratingVideo] = useState(false)

  // Research state
  const [researchQuery, setResearchQuery] = useState('')
  const [researchMode, setResearchMode] = useState('fast')
  const [researching, setResearching] = useState(false)

  // Export state
  const [exportingNotebook, setExportingNotebook] = useState(false)

  // Consolidated generating states - single object to reduce re-renders
  const [generating, setGenerating] = useState({
    flashcards: false,
    quiz: false,
    studyGuide: false,
    faq: false,
    mindMap: false,
    dataTable: false,
    report: false,
    slideDeck: false,
    infographic: false,
  })

  // Helper to update single generating state
  const setGeneratingState = (key: keyof typeof generating, value: boolean) => {
    setGenerating(prev => ({ ...prev, [key]: value }))
  }

  // Study results
  const [flashcards, setFlashcards] = useState<Array<{ id: string; front: string; back: string }>>([])
  const [quizQuestions, setQuizQuestions] = useState<Array<{ id: string; question: string; options: string[]; correct_index: number; explanation: string }>>([])
  const [studyGuide, setStudyGuide] = useState<{ title: string; sections: Array<{ heading: string; content: string }> } | null>(null)
  const [faqItems, setFaqItems] = useState<Array<{ question: string; answer: string }>>([])
  const [mindMap, setMindMap] = useState<{ title: string; nodes: Array<{ id: string; label: string; description?: string; children?: Array<{ id: string; label: string; description?: string; children?: Array<{ id: string; label: string; description?: string }> }> }> } | null>(null)

  // Creative outputs data
  const [dataTableData, setDataTableData] = useState<{
    title: string
    description: string
    columns: Array<{ header: string; key: string; type: string }>
    rows: Array<Record<string, string | number | boolean>>
  } | null>(null)
  const [reportData, setReportData] = useState<{
    title: string
    executive_summary: string
    sections: Array<{ heading: string; content: string }>
    key_takeaways: string[]
  } | null>(null)
  const [slideDeckData, setSlideDeckData] = useState<{
    title: string
    subtitle?: string
    slides: Array<{ slide_number: number; title: string; content_type: string; main_content: string; bullet_points?: string[]; speaker_notes?: string }>
    theme_suggestion: string
  } | null>(null)
  // Infographic data - supports new image-based format
  const [infographicData, setInfographicData] = useState<{
    // New image-based format
    images?: Array<{ title: string; prompt: string; imageData: string; mimeType: string }>
    concepts?: string[]
    // Legacy format (for backward compatibility)
    title?: string
    subtitle?: string
    color_scheme?: string[]
    sections?: Array<{ section_type: string; title?: string; content: Record<string, unknown> }>
    style_suggestion?: string
  } | null>(null)

  // Study materials metadata (for UI display)
  const [studyMaterialsMeta, setStudyMaterialsMeta] = useState<Array<{
    id: string
    type: string
    sourceIds: string[]
    sourceNames: string[]
    createdAt: string
    itemCount?: number
  }>>([])

  // Creative outputs metadata (for UI display)
  const [creativeOutputsMeta, setCreativeOutputsMeta] = useState<Array<{
    id: string
    type: string
    title: string
    status: string
    createdAt: string
    content?: Record<string, unknown>
  }>>([])

  const [currentFlashcard, setCurrentFlashcard] = useState(0)
  const [showFlashcardBack, setShowFlashcardBack] = useState(false)
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showQuizAnswer, setShowQuizAnswer] = useState(false)

  // Study materials sheet
  const [studySheetOpen, setStudySheetOpen] = useState(false)
  const [sheetWidth, setSheetWidth] = useState(576) // Default width in pixels
  const [isResizing, setIsResizing] = useState(false)
  const [activeStudyType, setActiveStudyType] = useState<'flashcards' | 'quiz' | 'guide' | 'faq' | 'mindmap' | 'audio' | 'video' | 'research' | 'datatable' | 'report' | 'slides' | 'infographic' | null>(null)

  // Local state for newly generated content (overrides cached until next fetch)
  const [localGeneratedAudio, setLocalGeneratedAudio] = useState<typeof generatedAudio | null>(null)
  const [localGeneratedVideo, setLocalGeneratedVideo] = useState<typeof generatedVideo | null>(null)
  const [localGeneratedResearch, setLocalGeneratedResearch] = useState<{
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
  } | null>(null)

  // Use local state if set, otherwise use cached data
  const activeGeneratedAudio = localGeneratedAudio ?? generatedAudio
  const activeGeneratedVideo = localGeneratedVideo ?? generatedVideo
  const activeGeneratedResearch = localGeneratedResearch ?? generatedResearch

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize - just check auth, React Query handles data fetching
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      setAuthChecked(true)
    }
    init()
  }, [notebookId])


  // Load a chat session
  const loadChatSession = async (loadSessionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/notebooks/${notebookId}/chat/sessions/${loadSessionId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      })
      const result = await response.json()
      if (result.data) {
        setSessionId(loadSessionId)
        setMessages(result.data.messages || [])
      }
    } catch (error) {
      console.error('Failed to load chat session:', error)
      
    }
  }

  // Start a new chat
  const startNewChat = () => {
    setSessionId(null)
    setMessages([])
    setMessage('')
  }

  // Delete a chat session
  const deleteChatSession = async (deleteSessionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/notebooks/${notebookId}/chat/sessions/${deleteSessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      })
      if (response.ok) {
        // Invalidate cache to refresh the list
        invalidate.invalidateChatSessions(notebookId)

        // If we deleted the current session, start a new chat
        if (deleteSessionId === sessionId) {
          startNewChat()
        }
      }
    } catch (error) {
      console.error('Failed to delete chat session:', error)

    }
  }

  // Rename a chat session
  const renameChatSession = async (renameSessionId: string, newTitle: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/notebooks/${notebookId}/chat/sessions/${renameSessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ title: newTitle }),
      })
      if (response.ok) {
        // Invalidate cache to refresh the list
        invalidate.invalidateChatSessions(notebookId)
      }
    } catch (error) {
      console.error('Failed to rename chat session:', error)
    }
  }

  // Load selected sources from localStorage after sources are loaded
  useEffect(() => {
    if (sources.length > 0 && !loading) {
      const savedSelection = localStorage.getItem(`notebook-${notebookId}-selected-sources`)
      if (savedSelection) {
        try {
          const savedIds = JSON.parse(savedSelection) as string[]
          // Only select sources that still exist
          const validIds = savedIds.filter(id => sources.some(s => s.id === id))
          if (validIds.length > 0) {
            setSelectedSources(new Set(validIds))
          }
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
  }, [sources, loading, notebookId])

  // Save selected sources to localStorage whenever they change
  useEffect(() => {
    if (!loading && sources.length > 0) {
      const selectedArray = Array.from(selectedSources)
      localStorage.setItem(`notebook-${notebookId}-selected-sources`, JSON.stringify(selectedArray))
    }
  }, [selectedSources, notebookId, loading, sources.length])

  // Handle view and itemId query params from history page navigation
  useEffect(() => {
    const view = searchParams.get('view')
    const itemId = searchParams.get('itemId')

    if (view && !loading) {
      // Map view param to activeStudyType
      const typeMap: Record<string, typeof activeStudyType> = {
        audio: 'audio',
        video: 'video',
        research: 'research',
        datatable: 'datatable',
        report: 'report',
        slides: 'slides',
        infographic: 'infographic',
        flashcards: 'flashcards',
        quiz: 'quiz',
        guide: 'guide',
        faq: 'faq',
        mindmap: 'mindmap',
      }
      const studyType = typeMap[view]
      if (studyType) {
        setActiveStudyType(studyType)
        setStudySheetOpen(true)

        // Clear the query params after handling
        router.replace(`/notebooks/${notebookId}`, { scroll: false })
      }
    }
  }, [searchParams, loading, notebookId, router])


  // Fetch existing creative outputs (data tables, reports, slides, infographics)
  const fetchCreativeOutputs = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/notebooks/${notebookId}/studio`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      })
      const result = await response.json()

      if (result.data && Array.isArray(result.data)) {
        // Group by type and get the latest of each
        const outputsByType: Record<string, typeof result.data[0]> = {}
        for (const output of result.data) {
          if (output.status === 'completed' && !outputsByType[output.type]) {
            outputsByType[output.type] = output
          }
        }

        // Build metadata array
        const metaArray = Object.values(outputsByType).map((output) => ({
          id: output.id,
          type: output.type,
          title: output.title || output.type.replace('_', ' '),
          status: output.status,
          createdAt: output.created_at,
          content: output.content,
        }))
        setCreativeOutputsMeta(metaArray)

        // Populate state with the latest content of each type
        for (const output of Object.values(outputsByType)) {
          if (output.type === 'data_table' && output.content) {
            setDataTableData(output.content as typeof dataTableData)
          } else if (output.type === 'report' && output.content) {
            setReportData(output.content as typeof reportData)
          } else if (output.type === 'slide_deck' && output.content) {
            setSlideDeckData(output.content as typeof slideDeckData)
          } else if (output.type === 'infographic' && output.content) {
            setInfographicData(output.content as typeof infographicData)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch creative outputs:', error)
    }
  }

  // Fetch existing study materials from Supabase
  const fetchStudyMaterials = async (sourcesData?: Source[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/notebooks/${notebookId}/study`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      })
      const result = await response.json()

      if (result.data && Array.isArray(result.data)) {
        // Group materials by type and get the latest of each
        const materialsByType: Record<string, typeof result.data[0]> = {}
        for (const material of result.data) {
          if (!materialsByType[material.type]) {
            materialsByType[material.type] = material
          }
        }

        // Build metadata array for UI
        const currentSources = sourcesData || sources
        const metaArray = Object.values(materialsByType).map((material) => {
          const sourceIds = material.source_ids || []
          const sourceNames = sourceIds.map((id: string) => {
            const source = currentSources.find(s => s.id === id)
            return source?.name || 'Unknown source'
          })

          // Calculate item count based on type
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
          }
        })
        setStudyMaterialsMeta(metaArray)

        // Populate state with cached data
        if (materialsByType.flashcards?.data?.flashcards) {
          setFlashcards(materialsByType.flashcards.data.flashcards)
        }
        if (materialsByType.quiz?.data?.questions) {
          setQuizQuestions(materialsByType.quiz.data.questions)
        }
        if (materialsByType.study_guide?.data) {
          setStudyGuide(materialsByType.study_guide.data)
        }
        if (materialsByType.faq?.data?.faq) {
          setFaqItems(materialsByType.faq.data.faq)
        }
        if (materialsByType.mind_map?.data) {
          setMindMap(materialsByType.mind_map.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch study materials:', error)
    }
  }

  // Redirect if notebook doesn't exist
  useEffect(() => {
    if (!notebookLoading && !notebook) {
      router.push('/')
    }
  }, [notebook, notebookLoading, router])

  // Load notebook settings when notebook data is available
  useEffect(() => {
    if (notebook?.settings) {
      setNotebookSettings(notebook.settings as unknown as NotebookSettings)
    }
  }, [notebook])

  // Save notebook settings
  const saveNotebookSettings = async (newSettings: NotebookSettings) => {
    try {
      await notebooksApi.updateSettings(notebookId, newSettings as unknown as Record<string, unknown>)
      setNotebookSettings(newSettings)
      invalidate.invalidateAll(notebookId)
    } catch (error) {
      console.error('Failed to save notebook settings:', error)
      throw error
    }
  }

  // Source handlers
  const handleAddSource = async (type: string, data: { input: string; name?: string; file?: File }) => {
    setUploading(true)

    if (type === 'file') {
      // Handle file upload - file is passed from the sources panel
      const file = data.file
      if (file) {
        const fileExt = file.name.split('.').pop()?.toLowerCase()
        const filePath = `${user?.id}/${notebookId}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('sources')
          .upload(filePath, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          
          setUploading(false)
          return
        }

        const { data: sourceData, error } = await supabase
          .from('sources')
          .insert({
            notebook_id: notebookId,
            type: fileExt === 'pdf' ? 'pdf' : fileExt === 'docx' ? 'docx' : 'txt',
            name: file.name,
            status: 'ready',
            file_path: filePath,
            original_filename: file.name,
            mime_type: file.type,
            file_size_bytes: file.size,
          })
          .select()
          .single()

        if (error) {
          console.error('Source creation error:', error)
        } else {
          invalidate.invalidateSources(notebookId)
        }
      }
    } else {
      let sourceData: Partial<Source> = {
        notebook_id: notebookId,
        status: 'ready',
      }

      if (type === 'youtube') {
        sourceData = {
          ...sourceData,
          type: 'youtube',
          name: data.name || `YouTube: ${data.input}`,
          metadata: { url: data.input },
        }
      } else if (type === 'url') {
        sourceData = {
          ...sourceData,
          type: 'url',
          name: data.name || data.input,
          metadata: { url: data.input },
        }
      } else if (type === 'text') {
        sourceData = {
          ...sourceData,
          type: 'text',
          name: data.name || 'Pasted Text',
          metadata: { content: data.input },
        }
      }

      const { error } = await supabase
        .from('sources')
        .insert(sourceData)
        .select()
        .single()

      if (error) {
        console.error('Source creation error:', error)
      } else {
        invalidate.invalidateSources(notebookId)
      }
    }

    setUploading(false)
  }

  const handleDeleteSource = async (sourceId: string) => {
    const { error } = await supabase
      .from('sources')
      .delete()
      .eq('id', sourceId)

    if (error) {
      console.error('Delete source error:', error)
    } else {
      invalidate.invalidateSources(notebookId)
      selectedSources.delete(sourceId)
      setSelectedSources(new Set(selectedSources))
    }
  }

  const toggleSource = (sourceId: string) => {
    const newSelected = new Set(selectedSources)
    if (newSelected.has(sourceId)) {
      newSelected.delete(sourceId)
    } else {
      newSelected.add(sourceId)
    }
    setSelectedSources(newSelected)
  }

  const selectAllSources = () => {
    if (selectedSources.size === sources.length) {
      setSelectedSources(new Set())
    } else {
      setSelectedSources(new Set(sources.map(s => s.id)))
    }
  }

  // Chat handlers
  const sendMessage = async (overrideMessage?: string) => {
    const messageToSend = overrideMessage || message
    if (!messageToSend.trim() || sending) return

    setSending(true)
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      session_id: sessionId || '',
      role: 'user',
      content: messageToSend,
      citations: [],
      source_ids_used: Array.from(selectedSources),
      model_used: null,
      input_tokens: null,
      output_tokens: null,
      cost_usd: null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])
    setMessage('')

    try {
      const response = await chatApi.sendMessage(notebookId, {
        message: userMessage.content,
        source_ids: Array.from(selectedSources),
        session_id: sessionId || undefined,
      })

      const isNewSession = !sessionId
      if (response.data.session_id) {
        setSessionId(response.data.session_id)
      }

      const aiMessage: ChatMessage = {
        id: response.data.message_id,
        session_id: response.data.session_id,
        role: 'assistant',
        content: response.data.content,
        citations: response.data.citations,
        source_ids_used: Array.from(selectedSources),
        model_used: response.usage?.model_used || 'gemini-2.0-flash',
        input_tokens: response.usage?.input_tokens || 0,
        output_tokens: response.usage?.output_tokens || 0,
        cost_usd: response.usage?.cost_usd || 0,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, aiMessage])

      // Refresh chat sessions if this was a new session
      if (isNewSession) {
        invalidate.invalidateChatSessions(notebookId)
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== userMessage.id))
    }
    setSending(false)
  }

  const saveResponseAsNote = async (msg: ChatMessage) => {
    const { error } = await supabase
      .from('notes')
      .insert({
        notebook_id: notebookId,
        type: 'saved_response',
        title: `Saved Response - ${new Date().toLocaleDateString()}`,
        content: msg.content,
        tags: [],
      })
      .select()
      .single()

    if (error) {
      console.error('Save note error:', error)
    } else {
      invalidate.invalidateNotes(notebookId)
    }
  }

  // Notes handlers
  const createNote = async () => {
    if (!noteTitle.trim() && !noteContent.trim()) return

    setSavingNote(true)
    const { error } = await supabase
      .from('notes')
      .insert({
        notebook_id: notebookId,
        type: 'written',
        title: noteTitle || 'Untitled Note',
        content: noteContent,
        tags: [],
      })
      .select()
      .single()

    if (error) {
      console.error('Create note error:', error)
    } else {
      invalidate.invalidateNotes(notebookId)
      setNoteTitle('')
      setNoteContent('')
      setAddNoteOpen(false)
    }
    setSavingNote(false)
  }

  // Audio generation
  const generateAudio = async () => {
    if (selectedSources.size === 0) {
      
      return
    }

    setGeneratingAudio(true)
    setActiveStudyType('audio')
    setStudySheetOpen(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/notebooks/${notebookId}/audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          format: audioFormat,
          source_ids: Array.from(selectedSources),
          custom_instructions: audioInstructions || undefined,
        }),
      })
      const result = await response.json()
      if (result.error) {
        console.error('Audio generation error:', result.error)
      } else if (result.data) {
        setLocalGeneratedAudio(result.data)
        invalidate.invalidateAudio(notebookId)
      }
    } catch (error) {
      console.error('Audio generation error:', error)
    }
    setGeneratingAudio(false)
  }

  // Video generation
  const generateVideo = async () => {
    if (selectedSources.size === 0) {
      return
    }

    setGeneratingVideo(true)
    setActiveStudyType('video')
    setStudySheetOpen(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/notebooks/${notebookId}/video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          style: videoStyle,
          source_ids: Array.from(selectedSources),
        }),
      })
      const result = await response.json()
      if (result.error) {
        console.error('Video generation error:', result.error)
      } else if (result.data) {
        // Map video_file_path to video_url for frontend components
        setLocalGeneratedVideo({
          ...result.data,
          video_url: result.data.video_file_path || result.data.video_url,
        })
        invalidate.invalidateVideo(notebookId)
      }
    } catch (error) {
      console.error('Video generation error:', error)
    }
    setGeneratingVideo(false)
  }

  // Research generation
  const runResearch = async () => {
    if (!researchQuery.trim()) {
      return
    }

    // Clear old research to prevent showing cached results
    setLocalGeneratedResearch(null)
    setResearching(true)
    setActiveStudyType('research')
    setStudySheetOpen(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/notebooks/${notebookId}/research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          query: researchQuery,
          mode: researchMode,
        }),
      })
      const result = await response.json()
      if (result.error) {
        console.error('Research failed:', result.error)
        alert(`Research failed: ${result.error}`)
      } else if (result.data) {
        setLocalGeneratedResearch(result.data)
        invalidate.invalidateResearch(notebookId)
        setResearchQuery('')
      }
    } catch (error) {
      console.error('Research error:', error)
      alert('Research failed. Please try again.')
    }
    setResearching(false)
  }

  // Export notebook handler
  const handleExportNotebook = async (format: 'zip' | 'pdf' | 'json', options: ExportOptionsState) => {
    setExportingNotebook(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      await exportNotebook(notebookId, {
        format,
        includeSources: options.includeSources,
        includeChats: options.includeChats,
        includeNotes: options.includeNotes,
        includeGenerated: options.includeGenerated,
      }, session.access_token)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setExportingNotebook(false)
    }
  }

  // Study material generation handlers
  const handleGenerateFlashcards = async () => {
    setGeneratingState('flashcards', true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/notebooks/${notebookId}/study`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          type: 'flashcards',
          source_ids: Array.from(selectedSources),
          count: 5,
        }),
      })
      const result = await response.json()
      if (result.error) {
        
      } else if (result.data?.flashcards) {
        setFlashcards(result.data.flashcards)
        setCurrentFlashcard(0)
        setShowFlashcardBack(false)
        setActiveStudyType('flashcards')
        setStudySheetOpen(true)
        fetchStudyMaterials()
        
      }
    } catch {
      
    } finally {
      setGeneratingState('flashcards', false)
    }
  }

  const handleGenerateQuiz = async () => {
    setGeneratingState('quiz', true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/notebooks/${notebookId}/study`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          type: 'quiz',
          source_ids: Array.from(selectedSources),
          count: 5,
        }),
      })
      const result = await response.json()
      if (result.error) {
        
      } else if (result.data?.questions) {
        setQuizQuestions(result.data.questions)
        setCurrentQuizQuestion(0)
        setSelectedAnswer(null)
        setShowQuizAnswer(false)
        setActiveStudyType('quiz')
        setStudySheetOpen(true)
        fetchStudyMaterials()
        
      }
    } catch {
      
    } finally {
      setGeneratingState('quiz', false)
    }
  }

  const handleGenerateStudyGuide = async () => {
    setGeneratingState('studyGuide', true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/notebooks/${notebookId}/study`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          type: 'study-guide',
          source_ids: Array.from(selectedSources),
        }),
      })
      const result = await response.json()
      if (result.error) {
        
      } else if (result.data?.sections) {
        setStudyGuide(result.data)
        setActiveStudyType('guide')
        setStudySheetOpen(true)
        fetchStudyMaterials()
        
      }
    } catch {
      
    } finally {
      setGeneratingState('studyGuide', false)
    }
  }

  const handleGenerateFaq = async () => {
    setGeneratingState('faq', true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/notebooks/${notebookId}/study`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          type: 'faq',
          source_ids: Array.from(selectedSources),
        }),
      })
      const result = await response.json()
      if (result.error) {
        
      } else if (result.data?.faq) {
        setFaqItems(result.data.faq)
        setActiveStudyType('faq')
        setStudySheetOpen(true)
        fetchStudyMaterials()
        
      }
    } catch {
      
    } finally {
      setGeneratingState('faq', false)
    }
  }

  const handleGenerateMindMap = async () => {
    setGeneratingState('mindMap', true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/notebooks/${notebookId}/study`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          type: 'mind-map',
          source_ids: Array.from(selectedSources),
        }),
      })
      const result = await response.json()
      if (result.error) {

      } else if (result.data?.nodes) {
        setMindMap(result.data)
        setActiveStudyType('mindmap')
        setStudySheetOpen(true)
        // Refresh metadata to show updated material
        fetchStudyMaterials()

      }
    } catch {

    } finally {
      setGeneratingState('mindMap', false)
    }
  }

  // Unified study material handler with config
  const handleGenerateStudyMaterial = async (config: GenerationConfig) => {
    const sourceIds = config.sourceIds && config.sourceIds.length > 0
      ? config.sourceIds
      : Array.from(selectedSources)

    if (sourceIds.length === 0) return

    // Set loading state based on type
    const typeToStateKey: Record<string, keyof typeof generating> = {
      'flashcards': 'flashcards',
      'quiz': 'quiz',
      'study-guide': 'studyGuide',
      'faq': 'faq',
      'mind-map': 'mindMap',
    }
    const stateKey = typeToStateKey[config.type]
    if (stateKey) setGeneratingState(stateKey, true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      // Build request body with all config options
      const requestBody: Record<string, unknown> = {
        type: config.type,
        source_ids: sourceIds,
      }

      // Add optional config fields
      if (config.count) requestBody.count = config.count
      if (config.difficulty) requestBody.difficulty = config.difficulty
      if (config.focusArea) requestBody.focus_area = config.focusArea
      if (config.customInstructions) requestBody.custom_instructions = config.customInstructions
      if (config.questionTypes) requestBody.question_types = config.questionTypes

      const response = await fetch(`/api/notebooks/${notebookId}/study`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(requestBody),
      })
      const result = await response.json()

      if (result.error) {
        console.error('Generation error:', result.error)
      } else if (result.data) {
        // Handle each type's response
        switch (config.type) {
          case 'flashcards':
            if (result.data.flashcards) {
              setFlashcards(result.data.flashcards)
              setCurrentFlashcard(0)
              setShowFlashcardBack(false)
              setActiveStudyType('flashcards')
              setStudySheetOpen(true)
            }
            break
          case 'quiz':
            if (result.data.questions) {
              setQuizQuestions(result.data.questions)
              setCurrentQuizQuestion(0)
              setSelectedAnswer(null)
              setShowQuizAnswer(false)
              setActiveStudyType('quiz')
              setStudySheetOpen(true)
            }
            break
          case 'study-guide':
            if (result.data.sections) {
              setStudyGuide(result.data)
              setActiveStudyType('guide')
              setStudySheetOpen(true)
            }
            break
          case 'faq':
            if (result.data.faq) {
              setFaqItems(result.data.faq)
              setActiveStudyType('faq')
              setStudySheetOpen(true)
            }
            break
          case 'mind-map':
            if (result.data.nodes) {
              setMindMap(result.data)
              setActiveStudyType('mindmap')
              setStudySheetOpen(true)
            }
            break
        }
        fetchStudyMaterials()
      }
    } catch (error) {
      console.error('Study material generation failed:', error)
    } finally {
      if (stateKey) setGeneratingState(stateKey, false)
    }
  }

  // Unified creative output handler with config
  const handleGenerateCreativeOutput = async (config: GenerationConfig) => {
    const sourceIds = config.sourceIds && config.sourceIds.length > 0
      ? config.sourceIds
      : Array.from(selectedSources)

    if (sourceIds.length === 0) return

    // Set loading state based on type
    const typeToStateKey2: Record<string, keyof typeof generating> = {
      'data_table': 'dataTable',
      'report': 'report',
      'slide_deck': 'slideDeck',
      'infographic': 'infographic',
    }
    const stateKey2 = typeToStateKey2[config.type]
    if (stateKey2) setGeneratingState(stateKey2, true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      // Build request body with all config options
      const requestBody: Record<string, unknown> = {
        type: config.type,
        source_ids: sourceIds,
      }

      // Add optional config fields
      if (config.customInstructions) requestBody.custom_instructions = config.customInstructions
      if (config.focusArea) requestBody.focus_area = config.focusArea
      if (config.reportType) requestBody.report_type = config.reportType
      if (config.tone) requestBody.tone = config.tone
      if (config.slideCount) requestBody.slide_count = config.slideCount
      if (config.style) requestBody.style = config.style
      // Infographic-specific options
      if (config.imageCount) requestBody.image_count = config.imageCount
      if (config.imageStyle) requestBody.image_style = config.imageStyle

      const response = await fetch(`/api/notebooks/${notebookId}/studio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(requestBody),
      })
      const result = await response.json()

      if (result.error) {
        console.error('Generation error:', result.error)
      } else if (result.data) {
        // Handle each type's response
        switch (config.type) {
          case 'data_table':
            setDataTableData(result.data)
            setActiveStudyType('datatable')
            setStudySheetOpen(true)
            break
          case 'report':
            setReportData(result.data)
            setActiveStudyType('report')
            setStudySheetOpen(true)
            break
          case 'slide_deck':
            setSlideDeckData(result.data)
            setActiveStudyType('slides')
            setStudySheetOpen(true)
            break
          case 'infographic':
            setInfographicData(result.data)
            setActiveStudyType('infographic')
            setStudySheetOpen(true)
            break
        }
        fetchCreativeOutputs()
      }
    } catch (error) {
      console.error('Creative output generation failed:', error)
    } finally {
      if (stateKey2) setGeneratingState(stateKey2, false)
    }
  }

  // Creative output generation handlers (legacy - kept for compatibility)
  const handleGenerateDataTable = async () => {
    if (selectedSources.size === 0) {

      return
    }
    setGeneratingState('dataTable', true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/notebooks/${notebookId}/studio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          type: 'data_table',
          source_ids: Array.from(selectedSources),
        }),
      })
      const result = await response.json()
      if (result.error) {
        
      } else if (result.data) {
        setDataTableData(result.data)
        setActiveStudyType('datatable' as typeof activeStudyType)
        setStudySheetOpen(true)
        fetchCreativeOutputs()
      }
    } catch {
      // Error handled silently
    } finally {
      setGeneratingState('dataTable', false)
    }
  }

  const handleGenerateReport = async (reportType: string) => {
    if (selectedSources.size === 0) {

      return
    }
    setGeneratingState('report', true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/notebooks/${notebookId}/studio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          type: 'report',
          source_ids: Array.from(selectedSources),
          report_type: reportType,
        }),
      })
      const result = await response.json()
      if (result.error) {
        
      } else if (result.data) {
        setReportData(result.data)
        setActiveStudyType('report' as typeof activeStudyType)
        setStudySheetOpen(true)
        fetchCreativeOutputs()
      }
    } catch {
      // Error handled silently
    } finally {
      setGeneratingState('report', false)
    }
  }

  const handleGenerateSlideDeck = async () => {
    if (selectedSources.size === 0) {

      return
    }
    setGeneratingState('slideDeck', true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/notebooks/${notebookId}/studio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          type: 'slide_deck',
          source_ids: Array.from(selectedSources),
        }),
      })
      const result = await response.json()
      if (result.error) {
        
      } else if (result.data) {
        setSlideDeckData(result.data)
        setActiveStudyType('slides' as typeof activeStudyType)
        setStudySheetOpen(true)
        fetchCreativeOutputs()
      }
    } catch {
      // Error handled silently
    } finally {
      setGeneratingState('slideDeck', false)
    }
  }

  const handleGenerateInfographic = async () => {
    if (selectedSources.size === 0) {

      return
    }
    setGeneratingState('infographic', true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/notebooks/${notebookId}/studio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          type: 'infographic',
          source_ids: Array.from(selectedSources),
        }),
      })
      const result = await response.json()
      if (result.error) {
        
      } else if (result.data) {
        setInfographicData(result.data)
        setActiveStudyType('infographic' as typeof activeStudyType)
        setStudySheetOpen(true)
        fetchCreativeOutputs()
      }
    } catch {
      // Error handled silently
    } finally {
      setGeneratingState('infographic', false)
    }
  }

  // Sheet resize handlers
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)

    const startX = e.clientX
    const startWidth = sheetWidth

    const handleMouseMove = (e: MouseEvent) => {
      const diff = startX - e.clientX
      const newWidth = Math.min(Math.max(startWidth + diff, 400), window.innerWidth - 50)
      setSheetWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-14 bg-[var(--bg-secondary)] border-b border-[rgba(255,255,255,0.1)] px-4 flex items-center gap-4 shrink-0 sticky top-0 z-50"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/')}
          className="h-9 w-9 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-xl">
            {notebook?.emoji}
          </div>
          <div>
            <h1 className="font-semibold text-[var(--text-primary)]">{notebook?.name}</h1>
            {notebook?.description && (
              <p className="text-xs text-[var(--text-tertiary)] line-clamp-1 max-w-[300px]">
                {notebook.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Badge className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-0 text-xs">
            {sources.length} source{sources.length !== 1 ? 's' : ''}
          </Badge>
          {selectedSources.size > 0 && (
            <Badge className="bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border-0 text-xs">
              {selectedSources.size} selected
            </Badge>
          )}
          {notebookSettings?.persona?.enabled && (
            <Badge className="bg-purple-500/20 text-purple-400 border-0 text-xs">
              {notebookSettings.persona.name || 'Custom Persona'}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="h-9 px-3 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] gap-2"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/notebooks/${notebookId}/history`)}
            className="h-9 px-3 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] gap-2"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </Button>
        </div>
      </motion.header>

      {/* Three Panel Layout */}
      <div className="flex-1 overflow-hidden">
        <ThreePanelLayout
          leftPanelTitle="Sources"
          rightPanelTitle="Studio"
          leftPanel={
            <SourcesPanel
              sources={sources}
              selectedSources={selectedSources}
              onToggleSource={toggleSource}
              onSelectAll={selectAllSources}
              onAddSource={handleAddSource}
              onDeleteSource={handleDeleteSource}
              onViewSource={setViewingSource}
              uploading={uploading}
            />
          }
          centerPanel={
            <ChatPanel
              messages={messages}
              message={message}
              onMessageChange={setMessage}
              onSendMessage={sendMessage}
              sending={sending}
              selectedSourcesCount={selectedSources.size}
              totalSourcesCount={sources.length}
              onSaveResponse={saveResponseAsNote}
              sessions={chatSessions}
              currentSessionId={sessionId}
              onLoadSession={loadChatSession}
              onNewChat={startNewChat}
              onDeleteSession={deleteChatSession}
              onRenameSession={renameChatSession}
              loadingSessions={loadingSessions}
              notebookId={notebookId}
            />
          }
          rightPanel={
            <StudioPanel
              notebookId={notebookId}
              selectedSourcesCount={selectedSources.size}
              selectedSourceIds={Array.from(selectedSources)}
              sources={sources.map(s => ({ id: s.id, name: s.name }))}
              audioFormat={audioFormat}
              onAudioFormatChange={setAudioFormat}
              audioInstructions={audioInstructions}
              onAudioInstructionsChange={setAudioInstructions}
              onGenerateAudio={generateAudio}
              generatingAudio={generatingAudio}
              videoStyle={videoStyle}
              onVideoStyleChange={setVideoStyle}
              onGenerateVideo={generateVideo}
              generatingVideo={generatingVideo}
              researchQuery={researchQuery}
              onResearchQueryChange={setResearchQuery}
              researchMode={researchMode}
              onResearchModeChange={setResearchMode}
              onRunResearch={runResearch}
              researching={researching}
              onGenerateStudyMaterial={handleGenerateStudyMaterial}
              generatingFlashcards={generating.flashcards}
              generatingQuiz={generating.quiz}
              generatingStudyGuide={generating.studyGuide}
              generatingFaq={generating.faq}
              generatingMindMap={generating.mindMap}
              onGenerateCreativeOutput={handleGenerateCreativeOutput}
              generatingDataTable={generating.dataTable}
              generatingReport={generating.report}
              generatingSlideDeck={generating.slideDeck}
              generatingInfographic={generating.infographic}
              creativeOutputs={creativeOutputsMeta}
              onOpenCreativeOutput={(type) => {
                const typeMap: Record<string, typeof activeStudyType> = {
                  data_table: 'datatable',
                  report: 'report',
                  slide_deck: 'slides',
                  infographic: 'infographic',
                }
                setActiveStudyType(typeMap[type] || null)
                setStudySheetOpen(true)
              }}
              studyMaterials={studyMaterialsMeta}
              onOpenStudyMaterial={(type) => {
                const typeMap: Record<string, typeof activeStudyType> = {
                  flashcards: 'flashcards',
                  quiz: 'quiz',
                  study_guide: 'guide',
                  faq: 'faq',
                  mind_map: 'mindmap',
                }
                setActiveStudyType(typeMap[type] || null)
                setStudySheetOpen(true)
              }}
              notesCount={notes.length}
              onAddNote={() => setAddNoteOpen(true)}
              hasGeneratedAudio={!!activeGeneratedAudio}
              hasGeneratedVideo={!!activeGeneratedVideo}
              hasGeneratedResearch={!!activeGeneratedResearch}
              onOpenAudio={() => { setActiveStudyType('audio'); setStudySheetOpen(true) }}
              onOpenVideo={() => { setActiveStudyType('video'); setStudySheetOpen(true) }}
              onOpenResearch={() => { setActiveStudyType('research'); setStudySheetOpen(true) }}
              onExportNotebook={handleExportNotebook}
              exportingNotebook={exportingNotebook}
            />
          }
        />
      </div>

      {/* Source Preview Dialog */}
      <Dialog open={!!viewingSource} onOpenChange={(open) => !open && setViewingSource(null)}>
        <DialogContent className="sm:max-w-lg bg-[var(--bg-secondary)] border-[rgba(255,255,255,0.1)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-[var(--text-primary)]">
              <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              {viewingSource?.name}
            </DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              {viewingSource?.type} source
            </DialogDescription>
          </DialogHeader>

          {viewingSource?.metadata && (() => {
            const meta = viewingSource.metadata as Record<string, unknown>
            if (viewingSource.type === 'text' && meta.content) {
              return (
                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] text-sm max-h-64 overflow-y-auto">
                  <p className="whitespace-pre-wrap text-[var(--text-secondary)]">
                    {String(meta.content)}
                  </p>
                </div>
              )
            }
            if ((viewingSource.type === 'youtube' || viewingSource.type === 'url') && meta.url) {
              return (
                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] text-sm max-h-64 overflow-y-auto">
                  <a
                    href={String(meta.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-primary)] hover:underline break-all"
                  >
                    {String(meta.url)}
                  </a>
                </div>
              )
            }
            return null
          })()}
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={addNoteOpen} onOpenChange={setAddNoteOpen}>
        <DialogContent className="sm:max-w-md bg-[var(--bg-secondary)] border-[rgba(255,255,255,0.1)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">Create Note</DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              Write a new note to save your thoughts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">Title</label>
              <Input
                placeholder="Note title..."
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="h-10 bg-[var(--bg-tertiary)] border-[rgba(255,255,255,0.1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">Content</label>
              <Textarea
                placeholder="Write your note..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={6}
                className="bg-[var(--bg-tertiary)] border-[rgba(255,255,255,0.1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] rounded-lg resize-none"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              onClick={createNote}
              disabled={savingNote}
              className="rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white"
            >
              {savingNote && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Study Materials Sheet */}
      <Sheet open={studySheetOpen} onOpenChange={(open) => {
        setStudySheetOpen(open)
        if (!open) setSheetWidth(576)
      }}>
        <SheetContent
          className="overflow-y-auto bg-[var(--bg-secondary)] border-[rgba(255,255,255,0.1)] p-0"
          style={{ width: sheetWidth, maxWidth: '100vw' }}
        >
          {/* Resize Handle */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-[var(--accent-primary)]/50 transition-colors z-50 ${isResizing ? 'bg-[var(--accent-primary)]/50' : ''}`}
            onMouseDown={handleResizeStart}
          />
          <div className="p-6">
          <SheetHeader>
            <div className="flex items-center gap-2 pr-8">
              <SheetTitle className="flex items-center gap-2 text-[var(--text-primary)] flex-1">
                {activeStudyType === 'flashcards' && <><BookOpen className="h-5 w-5 text-blue-500" /> Flashcards</>}
                {activeStudyType === 'quiz' && <><ListChecks className="h-5 w-5 text-purple-500" /> Quiz</>}
                {activeStudyType === 'guide' && <><FileText className="h-5 w-5 text-orange-500" /> Study Guide</>}
                {activeStudyType === 'faq' && <><HelpCircle className="h-5 w-5 text-teal-500" /> FAQ</>}
                {activeStudyType === 'mindmap' && <><Share2 className="h-5 w-5 text-cyan-500" /> Mind Map</>}
                {activeStudyType === 'datatable' && <><Table className="h-5 w-5 text-emerald-500" /> Data Table</>}
                {activeStudyType === 'report' && <><FileSpreadsheet className="h-5 w-5 text-blue-500" /> Report</>}
                {activeStudyType === 'slides' && <><Presentation className="h-5 w-5 text-violet-500" /> Slide Deck</>}
                {activeStudyType === 'infographic' && <><ImageIcon className="h-5 w-5 text-rose-500" /> Infographic</>}
                {activeStudyType === 'audio' && <><Mic className="h-5 w-5 text-orange-500" /> Audio Overview</>}
                {activeStudyType === 'video' && <><Video className="h-5 w-5 text-purple-500" /> Video Overview</>}
                {activeStudyType === 'research' && <><Search className="h-5 w-5 text-blue-500" /> Research Report</>}
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  if (sheetWidth < 800) {
                    setSheetWidth(900) // Wide
                  } else if (sheetWidth < window.innerWidth - 100) {
                    setSheetWidth(window.innerWidth - 50) // Full
                  } else {
                    setSheetWidth(576) // Normal
                  }
                }}
                title={sheetWidth >= window.innerWidth - 100 ? 'Minimize' : 'Expand'}
              >
                {sheetWidth >= window.innerWidth - 100 ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
            <SheetDescription className="text-[var(--text-secondary)]">
              {activeStudyType === 'flashcards' && `${flashcards.length} cards generated from your sources`}
              {activeStudyType === 'quiz' && `${quizQuestions.length} questions to test your knowledge`}
              {activeStudyType === 'guide' && 'Comprehensive study guide from your sources'}
              {activeStudyType === 'faq' && `${faqItems.length} frequently asked questions`}
              {activeStudyType === 'mindmap' && 'Interactive visualization of key concepts'}
              {activeStudyType === 'datatable' && 'Structured data extracted from your sources'}
              {activeStudyType === 'report' && 'Professional document from your sources'}
              {activeStudyType === 'slides' && 'Presentation slides from your sources'}
              {activeStudyType === 'infographic' && 'AI-generated images visualizing key concepts'}
              {activeStudyType === 'audio' && 'Podcast-style audio discussion'}
              {activeStudyType === 'video' && 'Visual explainer video'}
              {activeStudyType === 'research' && 'Deep web research findings'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 relative">
            {/* Flashcards View */}
            {activeStudyType === 'flashcards' && (
              <FlashcardViewer
                flashcards={flashcards}
                onClose={() => setStudySheetOpen(false)}
              />
            )}

            {/* Quiz View */}
            {activeStudyType === 'quiz' && (
              <QuizViewer
                questions={quizQuestions}
                onClose={() => setStudySheetOpen(false)}
              />
            )}

            {/* Study Guide View */}
            {activeStudyType === 'guide' && studyGuide && (
              <StudyGuideViewer
                guide={studyGuide}
                onClose={() => setStudySheetOpen(false)}
              />
            )}

            {/* FAQ View */}
            {activeStudyType === 'faq' && (
              <FAQViewer
                items={faqItems}
                onClose={() => setStudySheetOpen(false)}
              />
            )}

            {/* Mind Map View */}
            {activeStudyType === 'mindmap' && mindMap && (
              <MindMapViewer
                title={mindMap.title}
                nodes={mindMap.nodes}
                onClose={() => setStudySheetOpen(false)}
              />
            )}

            {/* Audio View */}
            {activeStudyType === 'audio' && (
              <AudioPlayer
                audio={activeGeneratedAudio ?? null}
                isGenerating={generatingAudio}
                onClose={() => setStudySheetOpen(false)}
              />
            )}

            {/* Video View */}
            {activeStudyType === 'video' && (
              <VideoPlayer
                video={activeGeneratedVideo ?? null}
                isGenerating={generatingVideo}
                onClose={() => setStudySheetOpen(false)}
              />
            )}

            {/* Research View */}
            {activeStudyType === 'research' && (
              <ResearchReport
                research={activeGeneratedResearch ?? null}
                isResearching={researching}
                onClose={() => setStudySheetOpen(false)}
              />
            )}

            {/* Data Table View */}
            {activeStudyType === 'datatable' && dataTableData && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{dataTableData.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">{dataTableData.description}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.1)]">
                          {dataTableData.columns.map((col) => (
                            <th key={col.key} className="text-left p-3 font-medium text-[var(--text-primary)]">
                              {col.header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dataTableData.rows.map((row, idx) => (
                          <tr key={idx} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-[var(--bg-secondary)]">
                            {dataTableData.columns.map((col) => (
                              <td key={col.key} className="p-3 text-[var(--text-secondary)]">
                                {String(row[col.key] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Report View */}
            {activeStudyType === 'report' && reportData && (
              <div className="space-y-6">
                {/* Export Button */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      exportReportToDocx(reportData as ReportData, reportData.title.replace(/[^a-zA-Z0-9]/g, '_'))
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download as Word
                  </Button>
                </div>
                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]">
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">{reportData.title}</h2>
                  <div className="p-4 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 mb-6">
                    <h3 className="text-sm font-semibold text-[var(--accent-primary)] mb-2">Executive Summary</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{reportData.executive_summary}</p>
                  </div>
                  {reportData.sections.map((section, idx) => (
                    <div key={idx} className="mb-6">
                      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{section.heading}</h3>
                      <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{section.content}</p>
                    </div>
                  ))}
                  <div className="mt-6 p-4 rounded-lg bg-[var(--bg-secondary)]">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Key Takeaways</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {reportData.key_takeaways.map((takeaway, idx) => (
                        <li key={idx} className="text-sm text-[var(--text-secondary)]">{takeaway}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Slide Deck View */}
            {activeStudyType === 'slides' && slideDeckData && (
              <div className="space-y-4">
                {/* Export Button */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      exportSlideDeckToPPTX(slideDeckData as SlideDeckData, slideDeckData.title.replace(/[^a-zA-Z0-9]/g, '_'))
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download as PowerPoint
                  </Button>
                </div>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">{slideDeckData.title}</h2>
                  {slideDeckData.subtitle && (
                    <p className="text-sm text-[var(--text-secondary)] mt-1">{slideDeckData.subtitle}</p>
                  )}
                  <Badge className="mt-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                    {slideDeckData.slides.length} slides
                  </Badge>
                </div>
                <div className="space-y-4">
                  {slideDeckData.slides.map((slide) => (
                    <div key={slide.slide_number} className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[rgba(255,255,255,0.1)]">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]">
                          {slide.slide_number}
                        </Badge>
                        <span className="text-xs text-[var(--text-tertiary)] uppercase">{slide.content_type}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{slide.title}</h3>
                      <p className="text-sm text-[var(--text-secondary)] mb-3">{slide.main_content}</p>
                      {slide.bullet_points && slide.bullet_points.length > 0 && (
                        <ul className="list-disc list-inside space-y-1 mb-3">
                          {slide.bullet_points.map((point, idx) => (
                            <li key={idx} className="text-sm text-[var(--text-secondary)]">{point}</li>
                          ))}
                        </ul>
                      )}
                      {slide.speaker_notes && (
                        <div className="mt-3 p-3 rounded-lg bg-[var(--bg-secondary)] text-xs text-[var(--text-tertiary)]">
                          <span className="font-medium">Speaker notes:</span> {slide.speaker_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Infographic View */}
            {activeStudyType === 'infographic' && infographicData && (
              // Check if it's the new image-based format
              infographicData.images && infographicData.images.length > 0 ? (
                <InfographicViewer
                  data={{
                    images: infographicData.images,
                    concepts: infographicData.concepts || []
                  }}
                  onClose={() => setStudySheetOpen(false)}
                />
              ) : infographicData.color_scheme && infographicData.sections ? (
                // Legacy format (backward compatibility)
                <div className="space-y-6">
                  {/* Header Section */}
                  <div
                    className="p-8 rounded-2xl text-center"
                    style={{
                      background: `linear-gradient(135deg, ${infographicData.color_scheme[0]}20 0%, ${infographicData.color_scheme[1]}20 100%)`,
                      borderLeft: `4px solid ${infographicData.color_scheme[0]}`
                    }}
                  >
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">{infographicData.title}</h2>
                    {infographicData.subtitle && (
                      <p className="text-base text-[var(--text-secondary)] mt-2">{infographicData.subtitle}</p>
                    )}
                  </div>

                  {/* Render each section based on type */}
                  {infographicData.sections.map((section, idx) => {
                    const sectionColor = infographicData.color_scheme![idx % infographicData.color_scheme!.length]
                    const content = section.content as Record<string, unknown>

                    // Stats Section
                    if (section.section_type === 'stats' && content.items) {
                      const items = content.items as Array<{ value: string; label: string; icon?: string }>
                      return (
                        <div key={idx} className="p-6 rounded-xl bg-[var(--bg-tertiary)]">
                          {section.title && <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{section.title}</h3>}
                          <div className="grid grid-cols-3 gap-4">
                            {items.map((item, i) => (
                              <div key={i} className="text-center p-4 rounded-lg" style={{ backgroundColor: `${sectionColor}15` }}>
                                <div className="text-2xl font-bold" style={{ color: sectionColor }}>{item.value}</div>
                                <div className="text-sm text-[var(--text-secondary)] mt-1">{item.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }

                    // Timeline Section
                    if (section.section_type === 'timeline' && content.events) {
                      const events = content.events as Array<{ date: string; title: string; description?: string }>
                      return (
                        <div key={idx} className="p-6 rounded-xl bg-[var(--bg-tertiary)]">
                          {section.title && <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{section.title}</h3>}
                          <div className="space-y-4">
                            {events.map((event, i) => (
                              <div key={i} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sectionColor }} />
                                  {i < events.length - 1 && <div className="w-0.5 flex-1 mt-1" style={{ backgroundColor: `${sectionColor}40` }} />}
                                </div>
                                <div className="flex-1 pb-4">
                                  <div className="font-semibold" style={{ color: sectionColor }}>{event.date}</div>
                                  <div className="font-medium text-[var(--text-primary)]">{event.title}</div>
                                  {event.description && <div className="text-sm text-[var(--text-secondary)] mt-1">{event.description}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }

                    // Process/Steps Section
                    if (section.section_type === 'process' && content.steps) {
                      const steps = content.steps as Array<{ step: number; title: string; description?: string }>
                      return (
                        <div key={idx} className="p-6 rounded-xl bg-[var(--bg-tertiary)]">
                          {section.title && <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{section.title}</h3>}
                          <div className="space-y-3">
                            {steps.map((step, i) => (
                              <div key={i} className="flex gap-4 items-start">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                                  style={{ backgroundColor: sectionColor }}
                                >
                                  {step.step}
                                </div>
                                <div>
                                  <div className="font-medium text-[var(--text-primary)]">{step.title}</div>
                                  {step.description && <div className="text-sm text-[var(--text-secondary)] mt-1">{step.description}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }

                    // Comparison Section
                    if (section.section_type === 'comparison' && content.left && content.right) {
                      const left = content.left as { label: string; points: string[] }
                      const right = content.right as { label: string; points: string[] }
                      return (
                        <div key={idx} className="p-6 rounded-xl bg-[var(--bg-tertiary)]">
                          {section.title && <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{section.title}</h3>}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg" style={{ backgroundColor: `${infographicData.color_scheme![0]}15` }}>
                              <div className="font-semibold mb-3" style={{ color: infographicData.color_scheme![0] }}>{left.label}</div>
                              <ul className="space-y-2">
                                {left.points.map((point, i) => (
                                  <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                                    <span style={{ color: infographicData.color_scheme![0] }}>•</span>
                                    {point}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="p-4 rounded-lg" style={{ backgroundColor: `${infographicData.color_scheme![1]}15` }}>
                              <div className="font-semibold mb-3" style={{ color: infographicData.color_scheme![1] }}>{right.label}</div>
                              <ul className="space-y-2">
                                {right.points.map((point, i) => (
                                  <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                                    <span style={{ color: infographicData.color_scheme![1] }}>•</span>
                                    {point}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // List Section
                    if (section.section_type === 'list' && content.items) {
                      const items = content.items as string[]
                      return (
                        <div key={idx} className="p-6 rounded-xl bg-[var(--bg-tertiary)]">
                          {section.title && <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{section.title}</h3>}
                          <ul className="space-y-3">
                            {items.map((item, i) => (
                              <li key={i} className="flex items-start gap-3">
                                <div
                                  className="w-2 h-2 rounded-full mt-2 shrink-0"
                                  style={{ backgroundColor: sectionColor }}
                                />
                                <span className="text-[var(--text-secondary)]">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    }

                    // Quote Section
                    if (section.section_type === 'quote') {
                      const quote = content.quote as string
                      const author = content.author as string | undefined
                      return (
                        <div
                          key={idx}
                          className="p-6 rounded-xl"
                          style={{
                            backgroundColor: `${sectionColor}10`,
                            borderLeft: `4px solid ${sectionColor}`
                          }}
                        >
                          {section.title && <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">{section.title}</h3>}
                          <blockquote className="text-lg italic text-[var(--text-primary)]">"{quote}"</blockquote>
                          {author && <div className="mt-2 text-sm text-[var(--text-secondary)]">— {author}</div>}
                        </div>
                      )
                    }

                    // Default/Header/Footer - simple display
                    return (
                      <div key={idx} className="p-6 rounded-xl bg-[var(--bg-tertiary)]">
                        {section.title && <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{section.title}</h3>}
                        {typeof content.subtitle === 'string' && <p className="text-[var(--text-secondary)]">{content.subtitle}</p>}
                        {typeof content.text === 'string' && <p className="text-sm text-[var(--text-tertiary)]">{content.text}</p>}
                      </div>
                    )
                  })}

                  {/* Style suggestion footer */}
                  <p className="text-xs text-[var(--text-tertiary)] text-center italic pt-4 border-t border-[rgba(255,255,255,0.1)]">
                    Design suggestion: {infographicData.style_suggestion}
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 text-[var(--text-tertiary)]">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No infographic data available</p>
                </div>
              )
            )}
          </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
      />

      {/* Notebook Settings Dialog */}
      <NotebookSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={notebookSettings}
        onSave={saveNotebookSettings}
        notebookName={notebook?.name || 'Notebook'}
      />
    </div>
  )
}
