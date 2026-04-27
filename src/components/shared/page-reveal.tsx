'use client'

import { useState, useEffect, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * PAGE REVEAL COMPONENT
 * Prevents "flash of unstyled content" or "garbage data" by hiding the UI 
 * until the client-side hydration is ready, then performing a premium fade-in.
 */
export function PageReveal({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    // Immediate mount but staggered reveal to ensure fonts/images are ready
    const timer = setTimeout(() => setRevealed(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div 
      className={cn(
        "transition-all duration-1000 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        revealed 
          ? "opacity-100 translate-y-0 scale-100 blur-0" 
          : "opacity-0 translate-y-6 scale-[0.98] blur-[8px] pointer-events-none"
      )}
    >
      {children}
    </div>
  )
}
