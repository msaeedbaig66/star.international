'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const savedTheme = localStorage.getItem('allpanga-theme') as 'light' | 'dark'
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light')
    setTheme(initialTheme)
    document.documentElement.setAttribute('data-theme', initialTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('allpanga-theme', newTheme)
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
        "bg-surface hover:bg-surface-high border border-border group"
      )}
      aria-label="Toggle dark mode"
    >
      <span className={cn(
        "material-symbols-outlined text-[20px] transition-all duration-500",
        theme === 'light' ? "text-amber-500 rotate-0" : "text-primary rotate-[360deg]"
      )}>
        {theme === 'light' ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  )
}
