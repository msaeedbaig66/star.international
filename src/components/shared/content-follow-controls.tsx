'use client'

import { useState } from 'react'
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
 const [loadingFollow, setLoadingFollow] = useState(false)
 const [loadingMute, setLoadingMute] = useState(false)
 const router = useRouter()

 const handleFollowToggle = async () => {
 if (loadingFollow) return
 setLoadingFollow(true)
 try {
 const res = await fetch('/api/content-follows', {
 method: isFollowing ? 'DELETE' : 'POST',
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
 setIsFollowing(!isFollowing)
 if (isFollowing) setIsMuted(false)
 router.refresh()
 } catch (err) {
 console.error(err)
 } finally {
 setLoadingFollow(false)
 }
 }

 const handleMuteToggle = async () => {
 if (loadingMute || !isFollowing) return
 setLoadingMute(true)
 try {
 const res = await fetch('/api/notification-mutes', {
 method: isMuted ? 'DELETE' : 'POST',
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
 setIsMuted(!isMuted)
 router.refresh()
 } catch (err) {
 console.error(err)
 } finally {
 setLoadingMute(false)
 }
 }

 const targetLabel = targetType === 'blog' ? 'Blog' : 'Community'

 return (
 <div className="flex flex-wrap items-center gap-2">
 <button
 onClick={handleFollowToggle}
 disabled={loadingFollow}
 className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
 isFollowing
 ? 'bg-surface text-text-primary border-border'
 : 'bg-primary text-white border-primary'
 } ${loadingFollow ? 'opacity-50' : 'opacity-100'}`}
 >
 {isFollowing ? `Following ${targetLabel}` : `Follow ${targetLabel}`}
 </button>
 <button
 onClick={handleMuteToggle}
 disabled={loadingMute || !isFollowing}
 className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
 isMuted
 ? 'bg-amber-50 text-amber-700 border-amber-300'
 : 'bg-white text-text-secondary border-border'
 } ${(loadingMute || !isFollowing) ? 'opacity-50' : 'opacity-100'}`}
 >
 {isMuted ? 'Unmute Alerts' : 'Mute Alerts'}
 </button>
 </div>
 )
}
