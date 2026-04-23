'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface RealtimeFallbackOptions {
  table: string
  filter?: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  onData: (payload: any) => void
  onFallbackFetch: () => Promise<void>
  fallbackInterval?: number
}

/**
 * useRealtimeWithFallback
 * 
 * Professionals don't just rely on WebSockets. If the realtime connection fails or is 
 * blocked by a network, this hook automatically falls back to HTTP Polling.
 */
export function useRealtimeWithFallback({
  table,
  filter,
  event = '*',
  onData,
  onFallbackFetch,
  fallbackInterval = 15000 // 15 seconds standby
}: RealtimeFallbackOptions) {
  const [status, setStatus] = useState<'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'INITIAL'>('INITIAL')
  const [isFallingBack, setIsFallingBack] = useState(false)
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  const startFallback = useCallback(() => {
    if (fallbackTimerRef.current) return
    setIsFallingBack(true)
    onFallbackFetch() // Initial fetch
    fallbackTimerRef.current = setInterval(() => {
      onFallbackFetch()
    }, fallbackInterval)
  }, [onFallbackFetch, fallbackInterval])

  const stopFallback = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current)
      fallbackTimerRef.current = null
    }
    setIsFallingBack(false)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    
    const channel = supabase
      .channel(`fallback_${table}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          filter
        },
        (payload) => {
          // If we get data via realtime, we know it's working
          setStatus('SUBSCRIBED')
          stopFallback()
          onData(payload)
        }
      )
      .subscribe((newStatus) => {
        setStatus(newStatus as any)
        
        if (newStatus === 'SUBSCRIBED') {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Realtime] Connected to ${table}`)
        }
          stopFallback()
        } else if (newStatus === 'TIMED_OUT' || newStatus === 'CLOSED') {
          console.warn(`[Realtime] Failed connection to ${table}. Falling back to polling...`)
          startFallback()
        }
      })

    return () => {
      supabase.removeChannel(channel)
      stopFallback()
    }
  }, [table, filter, event, onData, stopFallback, startFallback])

  return { status, isFallingBack }
}
