'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ClockCounterClockwise,
  FunnelSimple,
  ArrowsClockwise,
  SquaresFour,
  List,
  Microphone,
  VideoCamera,
  MagnifyingGlass,
  Table,
  FileText,
  PresentationChart,
  Image,
  Cards,
  Question,
  BookOpen,
  ChatCircleText,
  TreeStructure,
  Note,
  Clock,
  SpinnerGap,
  Sparkle
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import type { HistoryItem, HistoryItemType } from '@/app/api/notebooks/[id]/history/route'

// Type configuration with Phosphor icons and refined colors
const typeConfig: Record<HistoryItemType, {
  icon: React.ElementType
  label: string
  iconBg: string
  iconColor: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
}> = {
  audio: {
    icon: Microphone,
    label: 'Audio',
    iconBg: 'from-orange-500/30 to-amber-600/20',
    iconColor: 'text-orange-400',
    badgeBg: 'bg-orange-500/10',
    badgeText: 'text-orange-400',
    badgeBorder: 'border-orange-500/20'
  },
  video: {
    icon: VideoCamera,
    label: 'Video',
    iconBg: 'from-purple-500/30 to-violet-600/20',
    iconColor: 'text-purple-400',
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-400',
    badgeBorder: 'border-purple-500/20'
  },
  research: {
    icon: MagnifyingGlass,
    label: 'Research',
    iconBg: 'from-blue-500/30 to-cyan-600/20',
    iconColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-400',
    badgeBorder: 'border-blue-500/20'
  },
  data_table: {
    icon: Table,
    label: 'Table',
    iconBg: 'from-emerald-500/30 to-green-600/20',
    iconColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/20'
  },
  report: {
    icon: FileText,
    label: 'Report',
    iconBg: 'from-indigo-500/30 to-blue-600/20',
    iconColor: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/10',
    badgeText: 'text-indigo-400',
    badgeBorder: 'border-indigo-500/20'
  },
  slide_deck: {
    icon: PresentationChart,
    label: 'Slides',
    iconBg: 'from-violet-500/30 to-purple-600/20',
    iconColor: 'text-violet-400',
    badgeBg: 'bg-violet-500/10',
    badgeText: 'text-violet-400',
    badgeBorder: 'border-violet-500/20'
  },
  infographic: {
    icon: Image,
    label: 'Infographic',
    iconBg: 'from-rose-500/30 to-pink-600/20',
    iconColor: 'text-rose-400',
    badgeBg: 'bg-rose-500/10',
    badgeText: 'text-rose-400',
    badgeBorder: 'border-rose-500/20'
  },
  flashcards: {
    icon: Cards,
    label: 'Flashcards',
    iconBg: 'from-sky-500/30 to-blue-600/20',
    iconColor: 'text-sky-400',
    badgeBg: 'bg-sky-500/10',
    badgeText: 'text-sky-400',
    badgeBorder: 'border-sky-500/20'
  },
  quiz: {
    icon: Question,
    label: 'Quiz',
    iconBg: 'from-fuchsia-500/30 to-purple-600/20',
    iconColor: 'text-fuchsia-400',
    badgeBg: 'bg-fuchsia-500/10',
    badgeText: 'text-fuchsia-400',
    badgeBorder: 'border-fuchsia-500/20'
  },
  study_guide: {
    icon: BookOpen,
    label: 'Study Guide',
    iconBg: 'from-yellow-500/30 to-orange-600/20',
    iconColor: 'text-yellow-400',
    badgeBg: 'bg-yellow-500/10',
    badgeText: 'text-yellow-400',
    badgeBorder: 'border-yellow-500/20'
  },
  faq: {
    icon: ChatCircleText,
    label: 'FAQ',
    iconBg: 'from-teal-500/30 to-emerald-600/20',
    iconColor: 'text-teal-400',
    badgeBg: 'bg-teal-500/10',
    badgeText: 'text-teal-400',
    badgeBorder: 'border-teal-500/20'
  },
  mind_map: {
    icon: TreeStructure,
    label: 'Mind Map',
    iconBg: 'from-cyan-500/30 to-blue-600/20',
    iconColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-400',
    badgeBorder: 'border-cyan-500/20'
  },
  note: {
    icon: Note,
    label: 'Note',
    iconBg: 'from-amber-500/30 to-yellow-600/20',
    iconColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/20'
  }
}

const typeLabels: Record<HistoryItemType, string> = {
  audio: 'Audio',
  video: 'Video',
  research: 'Research',
  data_table: 'Data Table',
  report: 'Report',
  slide_deck: 'Slides',
  infographic: 'Infographic',
  flashcards: 'Flashcards',
  quiz: 'Quiz',
  study_guide: 'Study Guide',
  faq: 'FAQ',
  mind_map: 'Mind Map',
  note: 'Notes'
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function formatFullDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getPreviewText(type: HistoryItemType, preview: Record<string, unknown>): string {
  switch (type) {
    case 'audio':
      const duration = preview.duration_seconds as number
      return duration ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')} duration` : 'Audio overview'
    case 'video':
      const videoDuration = preview.duration_seconds as number
      return videoDuration ? `${videoDuration}s • ${preview.style || 'video'}` : 'Video overview'
    case 'research':
      return preview.query as string || 'Research report'
    case 'data_table':
      return `${preview.row_count || 0} rows × ${preview.column_count || 0} columns`
    case 'report':
      return `${preview.report_type || 'Report'} • ${preview.section_count || 0} sections`
    case 'slide_deck':
      return `${preview.slide_count || 0} slides`
    case 'infographic':
      return `${preview.image_count || 0} images`
    case 'flashcards':
      return `${preview.card_count || 0} cards`
    case 'quiz':
      return `${preview.question_count || 0} questions`
    case 'study_guide':
      return `${preview.section_count || 0} sections`
    case 'faq':
      return `${preview.item_count || 0} items`
    case 'mind_map':
      return `${preview.node_count || 0} nodes`
    case 'note':
      return (preview.content_preview as string)?.slice(0, 60) || 'Note'
    default:
      return ''
  }
}

interface HistoryCardProps {
  item: HistoryItem
  onClick: () => void
  viewMode: 'grid' | 'list'
  index: number
}

function HistoryCard({ item, onClick, viewMode, index }: HistoryCardProps) {
  const config = typeConfig[item.type] || typeConfig.note
  const Icon = config.icon
  const previewText = getPreviewText(item.type, item.preview)
  const isProcessing = item.status === 'processing'
  const timeAgo = formatTimeAgo(item.created_at)
  const fullDate = formatFullDate(item.created_at)

  if (viewMode === 'list') {
    return (
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03, duration: 0.3 }}
        onClick={onClick}
        className="glass-card glass-card-hover w-full text-left p-4 rounded-2xl group focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
      >
        <div className="flex items-center gap-4">
          {/* Icon with gradient background */}
          <div className={cn(
            'relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
            'bg-gradient-to-br shadow-lg',
            config.iconBg
          )}>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent" />
            {isProcessing ? (
              <SpinnerGap className={cn('h-5 w-5 animate-spin', config.iconColor)} weight="bold" />
            ) : (
              <Icon className={cn('h-5 w-5 relative z-10', config.iconColor)} weight="duotone" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[15px] font-medium text-[var(--text-primary)] truncate group-hover:text-white transition-colors">
                {item.title}
              </span>
              <span className={cn(
                'badge-premium flex-shrink-0',
                config.badgeBg,
                config.badgeText,
                config.badgeBorder,
                'border'
              )}>
                {config.label}
              </span>
            </div>
            <p className="text-sm text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors">
              {previewText}
            </p>
          </div>

          {/* Timestamp */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="timestamp-premium flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                <Clock className="h-3.5 w-3.5" weight="bold" />
                <span>{timeAgo}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="glass-card border-0">
              <p className="text-xs">{fullDate}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </motion.button>
    )
  }

  // Grid view
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      onClick={onClick}
      className="glass-card glass-card-hover w-full text-left p-5 rounded-2xl h-full group focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            'relative w-11 h-11 rounded-xl flex items-center justify-center',
            'bg-gradient-to-br shadow-lg',
            config.iconBg
          )}>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent" />
            {isProcessing ? (
              <SpinnerGap className={cn('h-5 w-5 animate-spin', config.iconColor)} weight="bold" />
            ) : (
              <Icon className={cn('h-5 w-5 relative z-10', config.iconColor)} weight="duotone" />
            )}
          </div>
          <span className={cn(
            'badge-premium',
            config.badgeBg,
            config.badgeText,
            config.badgeBorder,
            'border'
          )}>
            {config.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-1.5 line-clamp-2 group-hover:text-white transition-colors">
          {item.title}
        </h3>

        {/* Preview */}
        <p className="text-sm text-[var(--text-tertiary)] mb-4 line-clamp-2 flex-1 group-hover:text-[var(--text-secondary)] transition-colors">
          {previewText}
        </p>

        {/* Timestamp */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="timestamp-premium opacity-60 group-hover:opacity-100 transition-opacity">
              <Clock className="h-3.5 w-3.5" weight="bold" />
              <span>{timeAgo}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="glass-card border-0">
            <p className="text-xs">{fullDate}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </motion.button>
  )
}

export default function HistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: notebookId } = use(params)
  const router = useRouter()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterTypes, setFilterTypes] = useState<HistoryItemType[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [notebookTitle, setNotebookTitle] = useState<string>('')

  const fetchHistory = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const { data: notebook } = await supabase
        .from('notebooks')
        .select('title')
        .eq('id', notebookId)
        .single()

      if (notebook) {
        setNotebookTitle(notebook.title)
      }

      const params = new URLSearchParams({
        limit: '100',
        offset: '0'
      })

      if (filterTypes.length > 0) {
        params.set('types', filterTypes.join(','))
      }

      const response = await fetch(`/api/notebooks/${notebookId}/history?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch history')
      }

      const result = await response.json()
      setItems(result.data || [])
      setTotal(result.total || 0)
    } catch (err) {
      console.error('Fetch history error:', err)
      setError('Failed to load history')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [notebookId, filterTypes])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const toggleFilter = (type: HistoryItemType) => {
    setFilterTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const clearFilters = () => {
    setFilterTypes([])
  }

  const handleItemClick = (item: HistoryItem) => {
    const typeMap: Record<string, string> = {
      audio: 'audio',
      video: 'video',
      research: 'research',
      data_table: 'datatable',
      report: 'report',
      slide_deck: 'slides',
      infographic: 'infographic',
      flashcards: 'flashcards',
      quiz: 'quiz',
      study_guide: 'guide',
      faq: 'faq',
      mind_map: 'mindmap',
      note: 'notes',
    }
    const studyType = typeMap[item.type]
    if (studyType) {
      router.push(`/notebooks/${notebookId}?view=${studyType}&itemId=${item.id}`)
    }
  }

  // Group items by date
  const groupedItems = items.reduce((groups, item) => {
    const date = new Date(item.created_at)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let groupKey: string
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday'
    } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      groupKey = 'This Week'
    } else if (date > new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) {
      groupKey = 'This Month'
    } else {
      groupKey = 'Older'
    }

    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(item)
    return groups
  }, {} as Record<string, HistoryItem[]>)

  const groupOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older']

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] mesh-gradient relative">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--accent-primary)]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--accent-secondary)]/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b border-[rgba(255,255,255,0.06)]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/notebooks/${notebookId}`)}
                className="h-10 w-10 rounded-xl glass-card border-0 hover:bg-white/5"
              >
                <ArrowLeft className="h-5 w-5" weight="bold" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 flex items-center justify-center">
                    <ClockCounterClockwise className="h-4 w-4 text-[var(--accent-primary)]" weight="duotone" />
                  </div>
                  Content History
                </h1>
                {notebookTitle && (
                  <p className="text-sm text-[var(--text-tertiary)] mt-0.5">{notebookTitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center glass-card rounded-xl p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'h-8 w-8 rounded-lg transition-all',
                    viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-[var(--text-tertiary)] hover:text-white'
                  )}
                >
                  <SquaresFour className="h-4 w-4" weight={viewMode === 'grid' ? 'fill' : 'regular'} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'h-8 w-8 rounded-lg transition-all',
                    viewMode === 'list' ? 'bg-white/10 text-white' : 'text-[var(--text-tertiary)] hover:text-white'
                  )}
                >
                  <List className="h-4 w-4" weight={viewMode === 'list' ? 'fill' : 'regular'} />
                </Button>
              </div>

              {/* Filter dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'h-10 px-4 rounded-xl glass-card border-0 gap-2 btn-premium',
                      filterTypes.length > 0 && 'ring-1 ring-[var(--accent-primary)]/30'
                    )}
                  >
                    <FunnelSimple className="h-4 w-4" weight="bold" />
                    <span className="text-sm">Filter</span>
                    {filterTypes.length > 0 && (
                      <span className="ml-1 bg-[var(--accent-primary)] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                        {filterTypes.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 glass-card border-[rgba(255,255,255,0.08)]">
                  {(Object.keys(typeLabels) as HistoryItemType[]).map(type => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={filterTypes.includes(type)}
                      onCheckedChange={() => toggleFilter(type)}
                      className="rounded-lg"
                    >
                      {typeLabels[type]}
                    </DropdownMenuCheckboxItem>
                  ))}
                  {filterTypes.length > 0 && (
                    <>
                      <div className="divider-gradient my-1" />
                      <DropdownMenuCheckboxItem
                        checked={false}
                        onCheckedChange={clearFilters}
                        className="text-[var(--text-tertiary)] rounded-lg"
                      >
                        Clear all filters
                      </DropdownMenuCheckboxItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Refresh button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fetchHistory(true)}
                disabled={isRefreshing}
                className="h-10 w-10 rounded-xl glass-card border-0 btn-premium"
              >
                <ArrowsClockwise className={cn('h-4 w-4', isRefreshing && 'animate-spin')} weight="bold" />
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-4 mt-4 text-sm text-[var(--text-tertiary)]">
            <div className="flex items-center gap-2">
              <Sparkle className="h-4 w-4 text-[var(--accent-primary)]" weight="duotone" />
              <span>
                {filterTypes.length > 0
                  ? `Showing ${items.length} of ${total} items`
                  : `${total} total items`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 relative z-0">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-20"
            >
              <SpinnerGap className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="glass-card p-8 rounded-2xl flex flex-col items-center gap-4">
                <p className="text-base text-[var(--text-tertiary)]">{error}</p>
                <Button
                  onClick={() => fetchHistory()}
                  className="rounded-xl btn-premium bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90"
                >
                  Try again
                </Button>
              </div>
            </motion.div>
          ) : items.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="glass-card p-12 rounded-3xl flex flex-col items-center gap-4 max-w-md">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 flex items-center justify-center">
                  <ClockCounterClockwise className="h-10 w-10 text-[var(--accent-primary)]" weight="duotone" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {filterTypes.length > 0 ? 'No items match your filters' : 'No content yet'}
                </h3>
                <p className="text-sm text-[var(--text-tertiary)]">
                  {filterTypes.length > 0
                    ? 'Try removing some filters to see more content'
                    : 'Generate audio, video, study materials, or other content to see them here'}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10"
            >
              {groupOrder.map(group => {
                const groupItems = groupedItems[group]
                if (!groupItems || groupItems.length === 0) return null

                return (
                  <div key={group}>
                    <h2 className="section-header mb-5 flex items-center gap-2">
                      <span>{group}</span>
                      <span className="text-[var(--text-tertiary)]/50">({groupItems.length})</span>
                    </h2>
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {groupItems.map((item, index) => (
                          <HistoryCard
                            key={`${item.type}-${item.id}`}
                            item={item}
                            onClick={() => handleItemClick(item)}
                            viewMode={viewMode}
                            index={index}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {groupItems.map((item, index) => (
                          <HistoryCard
                            key={`${item.type}-${item.id}`}
                            item={item}
                            onClick={() => handleItemClick(item)}
                            viewMode={viewMode}
                            index={index}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
