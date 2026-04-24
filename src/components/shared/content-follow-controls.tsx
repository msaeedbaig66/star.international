'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type TargetType = 'blog' | 'community'

interface ContentFollowControlsProps {
 targetType: TargetType
 targetId: string
 initialIsFollowing: boolean
 initialIsMuted: boolean
}

export function ContentFollowControls({
 targetType,
 targetId,
 initialIsFollowing,
 initialIsMuted
}: ContentFollowControlsProps) {
 const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
 const [isMuted, setIsMuted] = useState(initialIsMuted)
 
 const serverStateRef = useRef({ following: initialIsFollowing, muted: initialIsMuted })
 const debounceTimerRef = useRef<{ follow: NodeJS.Timeout | null; mute: NodeJS.Timeout | null }>({ follow: null, mute: null })
 
 const router = useRouter()

 const handleFollowToggle = () => {
 const nextFollowing = !isFollowing
 setIsFollowing(nextFollowing)
 if (nextFollowing) setIsMuted(false)
 
 if (debounceTimerRef.current.follow) clearTimeout(debounceTimerRef.current.follow)
 
 debounceTimerRef.current.follow = setTimeout(async () => {
  if (nextFollowing === serverStateRef.current.following) return
  
  try {
   const res = await fetch('/api/content-follows', {
    method: nextFollowing ? 'POST' : 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetType, targetId })
   })
   
   if (!res.ok) {
    if (res.status === 401) {
     window.location.href = '/login'
     return
    }
    throw new Error('Failed to toggle follow')
   }
   
   serverStateRef.current.following = nextFollowing
   if (nextFollowing) serverStateRef.current.muted = false
   router.refresh()
  } catch (err) {
   console.error(err)
   setIsFollowing(serverStateRef.current.following)
   setIsMuted(serverStateRef.current.muted)
  }
 }, 800)
 }

 const handleMuteToggle = () => {
 if (!isFollowing) return
 
 const nextMuted = !isMuted
 setIsMuted(nextMuted)
 
 if (debounceTimerRef.current.mute) clearTimeout(debounceTimerRef.current.mute)
 
 debounceTimerRef.current.mute = setTimeout(async () => {
  if (nextMuted === serverStateRef.current.muted) return
  
  try {
   const res = await fetch('/api/notification-mutes', {
    method: nextMuted ? 'POST' : 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetType, targetId })
   })
   
   if (!res.ok) {
    if (res.status === 401) {
     window.location.href = '/login'
     return
    }
    throw new Error('Failed to toggle mute')
   }
   
   serverStateRef.current.muted = nextMuted
   router.refresh()
  } catch (err) {
   console.error(err)
   setIsMuted(serverStateRef.current.muted)
  }
 }, 800)
 }

 const targetLabel = targetType === 'blog' ? 'Blog' : 'Community'

 return (
 <div className="flex flex-wrap items-center gap-2">
 <button
 onClick={handleFollowToggle}
 className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border active:scale-95 ${
 isFollowing
 ? 'bg-surface text-text-primary border-border shadow-none'
 : 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
 }`}
 >
 {isFollowing ? `Following ${targetLabel}` : `Follow ${targetLabel}`}
 </button>
 <button
 onClick={handleMuteToggle}
 disabled={!isFollowing}
 className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border active:scale-95 ${
 isMuted
 ? 'bg-amber-50 text-amber-700 border-amber-300'
 : 'bg-white text-text-secondary border-border'
 } ${!isFollowing ? 'opacity-50 pointer-events-none' : 'hover:bg-slate-50'}`}
 >
 {isMuted ? 'Unmute Alerts' : 'Mute Alerts'}
 </button>
 </div>
 )
}
