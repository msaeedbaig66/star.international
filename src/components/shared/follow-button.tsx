'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { dispatchSync, useSyncListener } from '@/lib/action-sync'

type FollowButtonProps = {
 userId: string
 initialIsFollowing: boolean
 initialFollowerCount?: number
 showFollowerCount?: boolean
 compact?: boolean
}

export function FollowButton({
 userId,
 initialIsFollowing,
 initialFollowerCount = 0,
 showFollowerCount = false,
 compact = false
}: FollowButtonProps) {
 const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
 const [followerCount, setFollowerCount] = useState(initialFollowerCount)
 const [loading, setLoading] = useState(false)
 const serverStateRef = useRef({ following: initialIsFollowing, count: initialFollowerCount })
 const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

 useEffect(() => {
 setIsFollowing(initialIsFollowing)
 setFollowerCount(initialFollowerCount)
 serverStateRef.current = { following: initialIsFollowing, count: initialFollowerCount }
 }, [initialIsFollowing, initialFollowerCount])

 // LISTEN for external sync events
 useSyncListener('user-follow', userId, (nextState, nextCount) => {
 setIsFollowing(nextState);
 if (typeof nextCount === 'number') setFollowerCount(nextCount);
 });

 const handleFollowToggle = () => {
 // 1. Optimistic State
 const nextFollowing = !isFollowing
 const nextCount = Math.max(followerCount + (nextFollowing ? 1 : -1), 0)
 
 setIsFollowing(nextFollowing)
 setFollowerCount(nextCount)
 setLoading(true)

 // Dispatch global sync event
 dispatchSync({ type: 'user-follow', id: userId, state: nextFollowing, count: nextCount });
 
 // 2. Debounce Sync
 if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
 
 debounceTimerRef.current = setTimeout(async () => {
 // Net-zero check
 if (nextFollowing === serverStateRef.current.following) {
 setLoading(false)
 return
 }

 try {
 const res = await fetch(`/api/users/${userId}/follow`, { 
 method: nextFollowing ? 'POST' : 'DELETE' 
 })
 
 if (!res.ok) {
 if (res.status === 401) {
 window.location.href = '/login'
 return
 }
 throw new Error('Follow Sync Failed')
 }
 
 serverStateRef.current = { following: nextFollowing, count: nextCount }
 } catch (e) {
 console.error('Follow Sync Error:', e)
 // Rollback
 setIsFollowing(serverStateRef.current.following)
 setFollowerCount(serverStateRef.current.count)
 } finally {
 setLoading(false)
 }
 }, 1000)
 }

 return (
 <div className={`flex ${compact ? 'items-center gap-3' : 'flex-col sm:flex-row sm:items-center gap-3'}`}>
 <button 
 onClick={handleFollowToggle}
 disabled={loading}
 className={`${compact ? 'px-6 py-2.5 text-[10px]' : 'px-10 py-3.5 text-xs'} rounded-full font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all ${isFollowing ? 'bg-surface text-text-primary border border-border shadow-none' : 'bg-primary text-white shadow-primary/20'} ${loading ? 'opacity-50' : 'opacity-100'}`}
 >
 {isFollowing ? 'Following' : 'Follow'}
 </button>
 {showFollowerCount && (
 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
 {followerCount} Followers
 </p>
 )}
 </div>
 )
}
