'use client'

import { useEffect, useRef } from 'react'

interface ViewTrackerProps {
 targetId: string
 type: 'blog' | 'listing' | 'post'
}

/**
 * PRODUCTION-GRADE VIEW TRACKER
 * Using an Effect-based ping to track unique impressions without blocking SSR.
 */
export function ViewTracker({ targetId, type }: ViewTrackerProps) {
 const trackedRef = useRef(false)

 useEffect(() => {
 if (trackedRef.current) return
 trackedRef.current = true

 // Non-blocking fire-and-forget request
 fetch(`/api/views/${targetId}?type=${type}`, {
 method: 'POST',
 }).catch((err) => console.error('View tracking failed:', err))
 }, [targetId, type])

 return null // Ghost component
}
