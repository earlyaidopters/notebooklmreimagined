'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Check, Moon, Sun, Palette } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { THEMES, ThemeId } from '@/app/providers'

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Palette className="h-4 w-4" />
      </Button>
    )
  }

  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg hover:bg-[var(--bg-tertiary)]"
        >
          {theme === 'light' ? (
            <Sun className="h-4 w-4 text-[var(--text-secondary)]" />
          ) : theme === 'midnight' ? (
            <Moon className="h-4 w-4 text-[var(--accent-primary)]" />
          ) : theme === 'crimson' ? (
            <Palette className="h-4 w-4 text-red-500" />
          ) : (
            <Palette className="h-4 w-4 text-[var(--accent-primary)]" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-[var(--bg-secondary)] border-[var(--border)]"
      >
        <div className="px-2 py-1.5 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
          Theme
        </div>
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setTheme(t.id)}
            className="flex items-center gap-3 cursor-pointer hover:bg-[var(--bg-tertiary)] focus:bg-[var(--bg-tertiary)] py-2.5"
          >
            {/* Color preview swatch */}
            <div className="flex -space-x-1">
              <div
                className="w-5 h-5 rounded-full border-2 border-[var(--bg-secondary)]"
                style={{ backgroundColor: t.preview[0] }}
              />
              <div
                className="w-5 h-5 rounded-full border-2 border-[var(--bg-secondary)]"
                style={{ backgroundColor: t.preview[1] }}
              />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-[var(--text-primary)]">
                {t.name}
              </div>
              <div className="text-xs text-[var(--text-tertiary)]">
                {t.description}
              </div>
            </div>
            {theme === t.id && (
              <Check className="h-4 w-4 text-[var(--accent-primary)]" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Larger theme picker for settings dialogs
export function ThemePicker() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {THEMES.map((t) => (
          <div
            key={t.id}
            className="h-24 rounded-xl bg-[var(--bg-tertiary)] animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={`relative p-4 rounded-xl border transition-all ${
            theme === t.id
              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
              : 'border-[var(--border)] bg-[var(--bg-tertiary)] hover:border-[rgba(255,255,255,0.2)]'
          }`}
        >
          {/* Theme preview */}
          <div
            className="w-full h-12 rounded-lg mb-3 overflow-hidden"
            style={{ backgroundColor: t.preview[0] }}
          >
            <div className="flex items-center gap-1.5 p-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: t.preview[1] }}
              />
              <div
                className="w-8 h-1.5 rounded-full opacity-50"
                style={{ backgroundColor: t.preview[1] }}
              />
            </div>
            <div className="px-2">
              <div
                className="w-12 h-1 rounded-full opacity-30"
                style={{ backgroundColor: t.preview[1] }}
              />
            </div>
          </div>

          {/* Theme name */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)] text-left">
                {t.name}
              </div>
              <div className="text-xs text-[var(--text-tertiary)] text-left">
                {t.description}
              </div>
            </div>
            {theme === t.id && (
              <div className="w-5 h-5 rounded-full bg-[var(--accent-primary)] flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
