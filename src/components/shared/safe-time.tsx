'use client'

import { useEffect, useState, ReactNode } from 'react'
import { formatRelativeTime, formatPrice, formatDate } from '@/lib/utils'

/**
 * HydratedOnly ensures that its children are only rendered on the client after hydration.
 * This prevents common Next.js hydration mismatches for browser-only data or 
 * non-deterministic values (like relative dates).
 */
export function HydratedOnly({ children, fallback = null }: { children: ReactNode, fallback?: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <>{fallback}</>
  return <>{children}</>
}

/**
 * SafeTime renders a relative time string only after hydration.
 * Replaces direct calls to formatRelativeTime in JSX.
 */
export function SafeTime({ date, className }: { date: string | Date, className?: string }) {
  return (
    <HydratedOnly fallback={<span className={className}>...</span>}>
      <span className={className}>{formatRelativeTime(date)}</span>
    </HydratedOnly>
  )
}

/**
 * SafePrice renders a formatted price only after hydration.
 * Replaces direct calls to formatPrice in JSX.
 */
export function SafePrice({ price, className }: { price: number, className?: string }) {
  return (
    <HydratedOnly fallback={<span className={className}>Rs ...</span>}>
      <span className={className}>{formatPrice(price)}</span>
    </HydratedOnly>
  )
}

/**
 * SafeDate renders a static formatted date string only after hydration.
 * Replaces direct calls to formatDate (or toLocaleDateString) in JSX.
 */
export function SafeDate({ date, className }: { date: string | Date, className?: string }) {
  return (
    <HydratedOnly fallback={<span className={className}>...</span>}>
      <span className={className}>{formatDate(date)}</span>
    </HydratedOnly>
  )
}
