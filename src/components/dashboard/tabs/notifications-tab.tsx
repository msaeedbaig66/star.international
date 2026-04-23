'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime, cn } from '@/lib/utils'
import { SafeTime, HydratedOnly } from '@/components/shared/safe-time'
import { UserLink, NotificationLink } from '@/components/shared/navigation-links'

interface NotificationsTabProps {
 profile: any
}

export function NotificationsTab({ profile }: NotificationsTabProps) {
 const [notifications, setNotifications] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [nextCursor, setNextCursor] = useState<string | null>(null)
 const [hasMore, setHasMore] = useState(false)
 const [isLoadingMore, setIsLoadingMore] = useState(false)

 const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications])

 const loadNotifications = async (isInitial = true) => {
 if (isInitial) {
 setLoading(true)
 } else {
 setIsLoadingMore(true)
 }

 try {
 const url = new URL('/api/notifications', window.location.origin)
 if (!isInitial && nextCursor) url.searchParams.set('cursor', nextCursor)
 url.searchParams.set('limit', '20')

 const res = await fetch(url.toString())
 const json = await res.json()
 
 if (res.ok && Array.isArray(json.data)) {
 if (isInitial) {
 setNotifications(json.data)
 } else {
 setNotifications(prev => [...prev, ...json.data])
 }
 setNextCursor(json.nextCursor)
 setHasMore(!!json.nextCursor)
 }
 } finally {
 setLoading(false)
 setIsLoadingMore(false)
 }
 }

 useEffect(() => {
 loadNotifications(true)
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [])

 useEffect(() => {
 const supabase = createClient()
 const channel = supabase
 .channel(`dashboard-notifications-${profile.id}`)
 .on(
 'postgres_changes',
 {
 event: 'INSERT',
 schema: 'public',
 table: 'notifications',
 filter: `user_id=eq.${profile.id}`,
 },
 () => {
 loadNotifications(true)
 }
 )
 .subscribe()

 return () => {
 supabase.removeChannel(channel)
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [profile.id])

 const markAsRead = async (id: string) => {
 const snapshot = notifications
 setNotifications((prev) => prev.filter((n) => n.id !== id))
 try {
 const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
 if (!res.ok) throw new Error('Failed to mark as read')
 } catch (err) {
 console.error('markAsRead rollback:', err)
 setNotifications(snapshot)
 }
 }

 const markAllAsRead = async () => {
 const snapshot = notifications
 setNotifications((prev) => prev.filter((n) => n.is_read))
 try {
 const res = await fetch('/api/notifications', { method: 'PATCH' })
 if (!res.ok) throw new Error('Failed to mark all as read')
 } catch (err) {
 console.error('markAllAsRead rollback:', err)
 setNotifications(snapshot)
 }
 }

 return (
 <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
 <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
 <div>
 <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase leading-tight">Notifications</h1>
 <p className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mt-1 opacity-60">
 Real-time activity matrix
 </p>
 </div>
 <HydratedOnly>
 <button
 onClick={markAllAsRead}
 disabled={unreadCount === 0}
 className="w-full sm:w-auto px-5 py-2.5 rounded-2xl sm:rounded-full border border-slate-200 bg-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-500 hover:text-emerald-600 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 shadow-sm"
 >
 Mark all as read
 </button>
 </HydratedOnly>
 </div>

 <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.02)] overflow-hidden min-h-[400px]">
 {loading ? (
 <div className="p-6 sm:p-8 space-y-6">
 {Array.from({ length: 5 }).map((_, i) => (
 <div key={i} className="flex items-center gap-4 animate-pulse">
 <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-xl" />
 <div className="flex-1 space-y-2">
 <div className="h-4 w-1/4 bg-slate-50 rounded-md" />
 <div className="h-3 w-3/4 bg-slate-50 rounded-md" />
 </div>
 </div>
 ))}
 </div>
 ) : notifications.length === 0 ? (
 <div className="py-24 sm:py-32 text-center animate-in fade-in duration-700">
 <span className="material-symbols-outlined text-5xl sm:text-6xl text-slate-100 mb-4 sm:mb-6 block">notifications_off</span>
 <p className="text-slate-400 font-bold uppercase tracking-widest text-xs sm:text-sm">Quiet as a library</p>
 <p className="text-[10px] sm:text-xs text-slate-300 mt-2">Check back later for updates.</p>
 </div>
 ) : (
 <div className="divide-y divide-slate-50">
 {notifications.map((n) => (
 <div
 key={n.id}
 className={cn(
 "relative w-full text-left px-4 sm:px-8 py-4 sm:py-5 transition-all flex items-start gap-3 sm:gap-5",
 !n.is_read ? 'bg-emerald-500/[0.03]' : 'bg-white',
 "hover:bg-slate-50 group"
 )}
 >
 {/* Main Notification Link - Inset Overlay */}
 <NotificationLink
 notification={n}
 onRead={n.is_read ? undefined : markAsRead}
 className="absolute inset-0 z-10"
 >
 <span className="sr-only">View notification</span>
 </NotificationLink>

 <div className="relative flex-shrink-0 z-20">
 <div className="pointer-events-auto">
 <UserLink 
 user={n.actor || { username: 'support', full_name: 'Allpanga Team' }} 
 avatarOnly 
 size="md" 
 isAnonymous={n.is_anonymous}
 />
 </div>
 {!n.is_read && (
 <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
 )}
 </div>
 
 <div className="min-w-0 flex-1 relative z-20 pointer-events-none">
 <div className="flex items-center justify-between gap-4 mb-0.5 sm:mb-1">
 <div className="pointer-events-auto overflow-hidden">
 <UserLink 
 user={n.actor || { username: 'support', full_name: 'Allpanga Team' }} 
 showAvatar={false} 
 size="sm" 
 className="font-black text-slate-900 uppercase tracking-tight text-xs sm:text-sm truncate block" 
 isAnonymous={n.is_anonymous}
 />
 </div>
 <SafeTime date={n.created_at} className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap" />
 </div>
 <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2 sm:line-clamp-none">
 {n.message}
 </p>
 </div>
 </div>
 ))}

 {hasMore && (
 <div className="p-4 border-t border-border flex justify-center">
 <button
 onClick={() => loadNotifications(false)}
 disabled={isLoadingMore}
 className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-surface border border-border text-[10px] font-black uppercase tracking-widest text-text-primary hover:border-primary transition-all disabled:opacity-50"
 id="load-more-notifications"
 >
 {isLoadingMore ? (
 <>
 <div className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
 <span>Loading...</span>
 </>
 ) : (
 <>
 <span className="material-symbols-outlined text-sm">expand_more</span>
 <span>Show Older Notifications</span>
 </>
 )}
 </button>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 )
}
