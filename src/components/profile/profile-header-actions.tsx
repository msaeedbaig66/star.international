'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ProfileHeaderActions({ 
  userId,
  username
}: { 
  userId: string
  username: string
}) {
  const [messaging, setMessaging] = useState(false)
  const router = useRouter()

  const handleMessageUser = async () => {
    if (messaging) return
    setMessaging(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId: userId
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
        window.location.href = `/dashboard?tab=messages&threadId=${thread.data.thread_id}`
      } else if (thread.id) {
        window.location.href = `/dashboard?tab=messages&threadId=${thread.id}`
      }
    } catch (e) {
      console.error(e)
      setMessaging(false)
    }
  }

  const handleMoreOptions = () => {
    // For now, let's show a simple alert or maybe we can implement a basic modal later
    // In a real app, this would be a dropdown menu
    alert('Options for ' + username + ': Report User, Block User, Copy Profile Link')
  }

  return (
    <div className="flex items-center gap-3">
      <button 
        onClick={handleMessageUser}
        disabled={messaging}
        className={`h-12 w-12 rounded-2xl border border-border bg-white text-text-muted hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center active:scale-90 ${messaging ? 'opacity-50' : 'opacity-100'}`}
        title="Message User"
      >
        <span className="material-symbols-outlined">{messaging ? 'sync' : 'mail'}</span>
      </button>
      <button 
        onClick={handleMoreOptions}
        className="h-12 w-12 rounded-full border border-border bg-white text-text-muted hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center active:scale-90"
        title="More Options"
      >
        <span className="material-symbols-outlined">more_horiz</span>
      </button>
    </div>
  )
}
