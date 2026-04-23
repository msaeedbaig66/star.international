'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function ListingActions({ 
  listingId, 
  sellerId, 
  initialIsSaved,
  isAdminSeller = false,
  price = 0,
  itemTitle = ''
}: { 
  listingId: string, 
  sellerId: string, 
  initialIsSaved: boolean,
  isAdminSeller?: boolean,
  price?: number,
  itemTitle?: string
}) {
  const [isSaved, setIsSaved] = useState(initialIsSaved)
  const [saving, setSaving] = useState(false)
  const [messaging, setMessaging] = useState(false)
  const router = useRouter()

  const handleOrderNow = () => {
    router.push(`/checkout/${listingId}`)
  }

  const handleMessageSeller = async () => {
    if (messaging) return
    setMessaging(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId: sellerId
        })
      })
      
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error('Failed to create or get thread')
      }
      
      const thread = await res.json()
      if (thread.data && thread.data.thread_id) {
        router.push(`/dashboard?tab=messages&threadId=${thread.data.thread_id}`)
      } else if (thread.id) {
        router.push(`/dashboard?tab=messages&threadId=${thread.id}`)
      }
    } catch (e) {
      console.error(e)
      setMessaging(false)
    }
  }

  const serverStateRef = useRef({ saved: initialIsSaved })
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Sync if props change
  useEffect(() => {
    setIsSaved(initialIsSaved)
    serverStateRef.current = { saved: initialIsSaved }
  }, [initialIsSaved])

  const handleWishlistToggle = () => {
    // 1. Instant UI update
    const nextSaved = !isSaved
    setIsSaved(nextSaved)
    setSaving(true)

    // 2. Debounce
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    debounceTimerRef.current = setTimeout(async () => {
      // Net-zero optimization
      if (nextSaved === serverStateRef.current.saved) {
        setSaving(false)
        return
      }

      try {
        const res = await fetch(`/api/listings/${listingId}/wishlist`, {
          method: nextSaved ? 'POST' : 'DELETE'
        })
        
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = '/login'
            return
          }
          throw new Error('Sync failed')
        }
        
        serverStateRef.current = { saved: nextSaved }
      } catch (e) {
        console.error('Wishlist Sync Error:', e)
        setIsSaved(serverStateRef.current.saved)
      } finally {
        setSaving(false)
      }
    }, 1000)
  }

  return (
    <div className="space-y-3">
      {isAdminSeller ? (
        <button 
          onClick={handleOrderNow}
          className={`w-full py-4 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-full font-bold text-lg hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 opacity-100`}
        >
          <span className="material-symbols-outlined">shopping_bag</span>
          Order This Item
        </button>
      ) : (
        <button 
          onClick={handleMessageSeller}
          disabled={messaging}
          className={`w-full py-4 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-full font-bold text-lg hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${messaging ? 'opacity-50' : 'opacity-100'}`}
        >
          <span className="material-symbols-outlined">chat_bubble</span>
          {messaging ? 'Connecting...' : 'Contact Seller'}
        </button>
      )}
      <button 
        onClick={handleWishlistToggle}
        className={`w-full py-4 border-2 border-primary text-primary rounded-full font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 active:scale-[0.98]`}
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
        {isSaved ? 'Saved to Wishlist' : 'Save to Wishlist'}
      </button>
    </div>
  )
}
