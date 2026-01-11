'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { useState } from 'react'

// Available themes
export const THEMES = [
  { id: 'dark', name: 'Dark', description: 'Deep purple/blue', preview: ['#0f0f23', '#7c8aff'] },
  { id: 'light', name: 'Light', description: 'Clean white', preview: ['#f8f9fc', '#5b6eea'] },
  { id: 'midnight', name: 'Midnight Blue', description: 'Deep navy', preview: ['#0a1628', '#60a5fa'] },
  { id: 'crimson', name: 'Crimson', description: 'Dark with red', preview: ['#140a0a', '#dc2626'] },
] as const

export type ThemeId = typeof THEMES[number]['id']

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Don't retry on auth errors or network failures
          if (error instanceof Error) {
            const message = error.message.toLowerCase()
            if (message.includes('unauthorized') ||
                message.includes('auth') ||
                message.includes('failed to fetch') ||
                message.includes('network')) {
              return false
            }
          }
          return failureCount < 2
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      },
    },
  }))

  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="dark"
      themes={['dark', 'light', 'midnight', 'crimson']}
      enableSystem={false}
      storageKey="notebooklm-theme"
      disableTransitionOnChange={false}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </NextThemesProvider>
  )
}
