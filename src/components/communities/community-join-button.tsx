'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

export function CommunityJoinButton({ communityId, initialIsMember }: { communityId: string, initialIsMember: boolean }) {
  const [isMember, setIsMember] = useState(initialIsMember)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleJoinToggle = async () => {
    if (loading) return
    setLoading(true)

    try {
      const res = await fetch(`/api/communities/${communityId}/join`, {
        method: isMember ? 'DELETE' : 'POST'
      })

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = ROUTES.auth.login()
          return
        }
        throw new Error('Failed to toggle community membership')
      }

      setIsMember(!isMember)
      router.refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button 
      onClick={handleJoinToggle}
      disabled={loading}
      className={`font-black uppercase tracking-[0.2em] text-xs px-10 py-5 rounded-full shadow-xl transition-all active:scale-95 ${isMember ? 'bg-surface text-text-primary border border-border hover:bg-surface/80 shadow-none' : 'bg-primary text-white hover:shadow-2xl hover:bg-primary/95 shadow-primary/20'} ${loading ? 'opacity-50' : 'opacity-100'}`}
    >
      {isMember ? 'Leave Community' : 'Join Community'}
    </button>
  )
}
