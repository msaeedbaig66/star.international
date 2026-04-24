'use client'

import { useState, useEffect, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * PAGE REVEAL COMPONENT
 * Prevents "flash of unstyled content" or "garbage data" by hiding the UI 
 * until the client-side hydration is ready, then performing a premium fade-in.
 */
export function PageReveal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Small delay to allow images to start loading and layout to stabilize
    const timer = setTimeout(() => setRevealed(true), 150)
    return () => clearTimeout(timer)
  }, [])

  // On the server, we want the content to be there for SEO, but hidden by CSS
  // if the JS hasn't run yet. We can achieve this with a global CSS rule or inline styles.
  
  return (
    <div 
      className={cn(
        "transition-all duration-1000 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        revealed 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-4"
      )}
    >
      {children}
    </div>
  )
}
