'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { dispatchSync, useSyncListener } from '@/lib/action-sync'

interface BlogLikeButtonProps {
 blogId: string
 initialIsLiked: boolean
 initialLikeCount: number
 variant?: 'default' | 'floating'
}

export function BlogLikeButton({ blogId, initialIsLiked, initialLikeCount, variant = 'default' }: BlogLikeButtonProps) {
 const [isLiked, setIsLiked] = useState(initialIsLiked)
 const [likeCount, setLikeCount] = useState(initialLikeCount)
 const [isPending, setIsPending] = useState(false)
 
 // Ref to track the "ground truth" (what's currently on the server)
 const serverStateRef = useRef({ liked: initialIsLiked, count: initialLikeCount })
 // Ref to track the debounce timer
 const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

 // Keep in sync with server state if it changes externally (e.g. page navigation)
 useEffect(() => {
 setIsLiked(initialIsLiked)
 setLikeCount(initialLikeCount)
 serverStateRef.current = { liked: initialIsLiked, count: initialLikeCount }
 }, [initialIsLiked, initialLikeCount])

 // LISTEN for external sync events
 useSyncListener('blog-like', blogId, (nextState, nextCount) => {
 setIsLiked(nextState);
 if (typeof nextCount === 'number') setLikeCount(nextCount);
 });

 const handleLikeToggle = () => {
 // 1. Calculate next optimistic state
 const nextLiked = !isLiked
 const nextCount = nextLiked ? likeCount + 1 : Math.max(0, likeCount - 1)
 
 // 2. Immediate UI update
 setIsLiked(nextLiked)
 setLikeCount(nextCount)
 setIsPending(true)

 // 2b. Dispatch global sync event
 dispatchSync({ type: 'blog-like', id: blogId, state: nextLiked, count: nextCount });

 // 3. Clear existing debounce timer
 if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
 
 // 4. Set new debounce timer
 debounceTimerRef.current = setTimeout(async () => {
 // Net-zero optimization: If the current UI state equals the known server state, don't even call the API
 if (nextLiked === serverStateRef.current.liked) {
 setIsPending(false)
 return
 }

 try {
 const res = await fetch(`/api/blogs/${blogId}/like`, {
 method: nextLiked ? 'POST' : 'DELETE'
 })
 
 if (!res.ok) {
 if (res.status === 401) {
 window.location.href = '/login'
 return
 }
 throw new Error('Sync failed')
 }
 
 // Success: Update our ground truth
 serverStateRef.current = { liked: nextLiked, count: nextCount }
 } catch (e) {
 console.error('Like Sync Error:', e)
 // Failure: Revert UI to the last known server state
 setIsLiked(serverStateRef.current.liked)
 setLikeCount(serverStateRef.current.count)
 } finally {
 setIsPending(false)
 }
 }, 1000)
 }

 if (variant === 'floating') {
 return (
 <div className="flex flex-col items-center gap-1 group transition-transform hover:scale-110">
 <button
 onClick={handleLikeToggle}
 disabled={false} // Always allow toggle, we handle it optimistically
 className={cn(
 "w-12 h-12 rounded-full border flex items-center justify-center shadow-lg transition-all active:scale-90",
 isLiked 
 ? "bg-primary text-white border-primary shadow-primary/20 scale-105" 
 : "bg-white text-text-muted hover:bg-slate-50 border-slate-200"
 )}
 >
 <span
 className="material-symbols-outlined text-[22px] transition-transform duration-300"
 style={{ 
 fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0",
 transform: isLiked ? 'scale(1.1)' : 'scale(1)'
 }}
 >
 favorite
 </span>
 </button>
 <div className="flex flex-col items-center h-4">
 <span className={cn(
 "text-[10px] font-bold uppercase tracking-tighter transition-colors",
 isLiked ? "text-primary" : "text-slate-400"
 )}>
 {likeCount}
 </span>
 {isPending && (
 <div className="w-1 h-1 rounded-full bg-primary animate-ping" />
 )}
 </div>
 </div>
 )
 }

 return (
 <div className="mt-16 flex flex-col items-center animate-in zoom-in duration-500">
 <div className="relative">
 <button
 onClick={handleLikeToggle}
 className={cn(
 "w-24 h-24 rounded-full flex items-center justify-center mb-4 group cursor-pointer transition-all active:scale-75 shadow-xl border-4 border-white",
 isLiked ? "bg-primary/10 text-primary" : "bg-slate-50 text-slate-300"
 )}
 >
 <span
 className="material-symbols-outlined text-5xl transition-all duration-500"
 style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}
 >
 favorite
 </span>
 {isLiked && (
 <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20" />
 )}
 </button>
 {isPending && (
 <div className="absolute -top-1 -right-1">
 <div className="w-4 h-4 rounded-full bg-primary border-2 border-white animate-spin border-t-transparent" />
 </div>
 )}
 </div>
 
 <p className="text-sm font-semibold text-slate-500 mb-6">
 <span className="text-slate-900 font-bold">{likeCount}</span> {likeCount === 1 ? 'person likes' : 'people liked'} this story
 </p>

 <button
 onClick={handleLikeToggle}
 className={cn(
 "flex items-center gap-3 px-10 py-4 rounded-full font-bold shadow-2xl transition-all active:scale-95 group",
 isLiked 
 ? "bg-slate-900 text-white hover:bg-slate-800" 
 : "bg-primary text-white hover:bg-primary-hover shadow-primary/25"
 )}
 >
 <span className={cn(
 "material-symbols-outlined transition-transform duration-500 group-hover:scale-125",
 isLiked && "fill-current"
 )}>
 favorite
 </span>
 {isLiked ? 'Loved this story' : 'Like this story'}
 </button>
 </div>
 )
}

