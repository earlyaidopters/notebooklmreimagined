'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient, Notebook } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, BookOpen, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { User } from '@supabase/supabase-js'
import { DashboardHeader } from '@/components/dashboard/header'
import { DashboardTabs } from '@/components/dashboard/tabs'
import { FeaturedCarousel } from '@/components/dashboard/featured-carousel'
import { NotebookCard, CreateNotebookCard } from '@/components/dashboard/notebook-card'

const EMOJI_OPTIONS = ['📚', '🔬', '💡', '🎯', '📊', '🚀', '💻', '🎨', '📝', '🔍', '🧠', '⚡']

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newNotebookName, setNewNotebookName] = useState('')
  const [newNotebookDescription, setNewNotebookDescription] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('📚')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('recent')
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      fetchNotebooks()
    }
    checkUser()
  }, [])

  const fetchNotebooks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('notebooks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load notebooks')
    } else {
      setNotebooks(data || [])
    }
    setLoading(false)
  }

  const createNotebook = async () => {
    if (!newNotebookName.trim()) return

    setCreating(true)
    const { data, error } = await supabase
      .from('notebooks')
      .insert({
        name: newNotebookName,
        description: newNotebookDescription || null,
        emoji: selectedEmoji,
        user_id: user?.id
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed to create notebook')
    } else {
      toast.success('Notebook created!')
      setNotebooks([data, ...notebooks])
      resetDialog()
      router.push(`/notebooks/${data.id}`)
    }
    setCreating(false)
  }

  const resetDialog = () => {
    setNewNotebookName('')
    setNewNotebookDescription('')
    setSelectedEmoji('📚')
    setDialogOpen(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const deleteNotebook = async (id: string) => {
    const { error } = await supabase
      .from('notebooks')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete notebook')
    } else {
      setNotebooks(notebooks.filter(n => n.id !== id))
      toast.success('Notebook deleted')
    }
  }

  const toggleFeatured = async (id: string) => {
    const notebook = notebooks.find(n => n.id === id)
    if (!notebook) return

    const { error } = await supabase
      .from('notebooks')
      .update({ is_featured: !notebook.is_featured })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update notebook')
    } else {
      setNotebooks(notebooks.map(n =>
        n.id === id ? { ...n, is_featured: !n.is_featured } : n
      ))
    }
  }

  const formatLastEdited = (date: string) => {
    const now = new Date()
    const edited = new Date(date)
    const diffMs = now.getTime() - edited.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return edited.toLocaleDateString()
  }

  const filteredNotebooks = useMemo(() => {
    let filtered = notebooks

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        n => n.name.toLowerCase().includes(query) ||
             n.description?.toLowerCase().includes(query)
      )
    }

    // Apply tab filter
    if (activeTab === 'featured') {
      filtered = filtered.filter(n => n.is_featured)
    } else if (activeTab === 'archived') {
      filtered = filtered.filter(n => n.is_archived)
    } else {
      // Recent: exclude archived
      filtered = filtered.filter(n => !n.is_archived)
    }

    return filtered
  }, [notebooks, searchQuery, activeTab])

  const featuredNotebooks = useMemo(() =>
    notebooks.filter(n => n.is_featured && !n.is_archived),
    [notebooks]
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <DashboardHeader
        user={user}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Featured Section */}
        {activeTab === 'recent' && featuredNotebooks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <FeaturedCarousel
              notebooks={featuredNotebooks.map(n => ({
                id: n.id,
                emoji: n.emoji,
                name: n.name,
                sourceCount: n.source_count || 0,
                description: n.description,
              }))}
              onOpen={(id) => router.push(`/notebooks/${id}`)}
            />
          </motion.div>
        )}

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div className="flex items-center gap-4">
            <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          <Button
            onClick={() => setDialogOpen(true)}
            className="h-10 px-4 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white font-medium btn-hover"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Notebook
          </Button>
        </motion.div>

        {/* Notebooks Grid */}
        <AnimatePresence mode="wait">
          {filteredNotebooks.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-20 h-20 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-6">
                <BookOpen className="h-10 w-10 text-[var(--text-tertiary)]" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                {searchQuery ? 'No notebooks found' : 'No notebooks yet'}
              </h3>
              <p className="text-[var(--text-secondary)] mb-6 text-center max-w-sm">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Create your first notebook to start researching with AI-powered insights'
                }
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setDialogOpen(true)}
                  className="h-11 px-6 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white font-medium btn-hover"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Notebook
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              <CreateNotebookCard onClick={() => setDialogOpen(true)} />

              {filteredNotebooks.map((notebook, index) => (
                <motion.div
                  key={notebook.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <NotebookCard
                    id={notebook.id}
                    emoji={notebook.emoji}
                    name={notebook.name}
                    sourceCount={notebook.source_count || 0}
                    description={notebook.description}
                    lastEdited={formatLastEdited(notebook.updated_at || notebook.created_at)}
                    isFeatured={notebook.is_featured}
                    onOpen={(id) => router.push(`/notebooks/${id}`)}
                    onDelete={deleteNotebook}
                    onToggleFeatured={toggleFeatured}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Create Notebook Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetDialog()}>
        <DialogContent className="sm:max-w-md bg-[var(--bg-secondary)] border-[rgba(255,255,255,0.1)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">Create New Notebook</DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              Start a new research project with AI-powered insights.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Emoji Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">Icon</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`
                      w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all
                      ${selectedEmoji === emoji
                        ? 'bg-[var(--accent-primary)]/20 ring-2 ring-[var(--accent-primary)]'
                        : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-surface)]'
                      }
                    `}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">Name</label>
              <Input
                placeholder="My Research Project"
                value={newNotebookName}
                onChange={(e) => setNewNotebookName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createNotebook()}
                className="h-11 bg-[var(--bg-tertiary)] border-[rgba(255,255,255,0.1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] rounded-xl"
              />
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Description <span className="text-[var(--text-tertiary)]">(optional)</span>
              </label>
              <Textarea
                placeholder="What is this notebook about?"
                value={newNotebookDescription}
                onChange={(e) => setNewNotebookDescription(e.target.value)}
                className="resize-none bg-[var(--bg-tertiary)] border-[rgba(255,255,255,0.1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] rounded-xl"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={resetDialog}
              className="rounded-xl border-[rgba(255,255,255,0.1)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
            >
              Cancel
            </Button>
            <Button
              onClick={createNotebook}
              disabled={creating || !newNotebookName.trim()}
              className="rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white btn-hover"
            >
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Notebook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
