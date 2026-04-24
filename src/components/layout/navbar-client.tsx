'use client'

import { useState, useCallback, FormEvent, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ROUTES } from '@/lib/routes'
import { parseSearchQuery } from '@/lib/search-ranking'
import { cn } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'

/**
 * Resolves a notification object to its clickable destination URL.
 */
function resolveNotificationLink(notification: any): string {
 const { type, listing_id, blog_id, post_id, actor } = notification;
 switch (type) {
 case 'like':
 case 'comment':
 if (blog_id) return ROUTES.blog.detail(blog_id);
 if (listing_id) return ROUTES.marketplace.detail(listing_id);
 return ROUTES.home();
 case 'follow':
 return actor?.username ? ROUTES.profile.view(actor.username) : ROUTES.home();
 case 'reply':
 return blog_id ? ROUTES.blog.detail(blog_id) : ROUTES.home();
 case 'listing_approved':
 case 'new_listing':
 return listing_id ? ROUTES.marketplace.detail(listing_id) : ROUTES.marketplace.list();
 case 'listing_rejected':
 return ROUTES.dashboard.sell(listing_id || undefined);
 case 'blog_approved':
 case 'blog_update':
 case 'new_blog':
 return blog_id ? ROUTES.blog.detail(blog_id) : ROUTES.blog.list();
 case 'blog_rejected':
 return ROUTES.dashboard.blogStudio(blog_id || undefined);
 case 'community_approved':
 case 'community_update':
 return notification.community_id ? ROUTES.communities.detail(notification.community_id) : ROUTES.communities.list();
 case 'community_rejected':
 return ROUTES.dashboard.tab('communities');
 case 'message':
 return post_id ? ROUTES.dashboard.messages(post_id) : ROUTES.dashboard.messages();
 default:
 return ROUTES.home();
 }
}

interface NavbarClientProps {
 user: User | null;
 profile: any | null;
 hideSearch?: boolean;
 hideActions?: boolean;
}

export default function NavbarClient({ 
 user, 
 profile, 
 hideSearch = false, 
 hideActions = false 
}: NavbarClientProps) {
 const [search, setSearch] = useState('')
 const [notifOpen, setNotifOpen] = useState(false)
 const [notifications, setNotifications] = useState<any[]>([])
 const [notifFetched, setNotifFetched] = useState(false)
 const router = useRouter()

 const fetchNotifications = useCallback(async () => {
 if (!user) return
 const supabase = createClient()
 const { data } = await supabase
 .from('notifications')
 .select('id, type, message, is_read, created_at, listing_id, blog_id, post_id, actor:profiles!actor_id(username)')
 .eq('user_id', user.id)
 .eq('is_read', false)
 .order('created_at', { ascending: false })
 .limit(10)
 if (data) setNotifications(data)
 setNotifFetched(true)
 }, [user])

 // Reset notification state when user changes
 useEffect(() => {
 setNotifications([])
 setNotifFetched(false)
 }, [user?.id])

 // Realtime notification listener
 useEffect(() => {
 if (!user) return
 const supabase = createClient()
 const channel = supabase
 .channel(`user-notifications:${user.id}`)
 .on(
 'postgres_changes',
 {
 event: 'INSERT',
 schema: 'public',
 table: 'notifications',
 filter: `user_id=eq.${user.id}`
 },
 async (payload) => {
 // Fetch full profile info for the actor
 const { data: actorData } = await supabase
 .from('profiles')
 .select('username')
 .eq('id', payload.new.actor_id)
 .single()

 const newNotif = {
 ...payload.new,
 actor: actorData || { username: 'someone' }
 }
 
 setNotifications(prev => [newNotif, ...prev].slice(0, 10))
 }
 )
 .subscribe()

 return () => {
 supabase.removeChannel(channel)
 }
 }, [user])

 const handleSearch = (e: FormEvent) => {
 e.preventDefault()
 const input = search.trim()
 if (!input) return
 const parsed = parseSearchQuery(input, undefined)
 router.push(ROUTES.search.results(input, parsed.resolvedType))
 }

 const handleMarkAsRead = async (id: string) => {
 try {
 await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
 setNotifications(prev => prev.filter(n => n.id !== id))
 } catch (e) { console.error(e) }
 }

 const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications])

 return (
 <div className={cn(
 "flex items-center gap-4 sm:gap-6",
 !hideActions && !hideSearch ? "w-full max-w-2xl ml-auto" : "flex-1"
 )}>
 {/* ── Search Command Palette Style ── */}
 {!hideSearch && (
 <div className="flex-1 relative group/search">
 <form onSubmit={handleSearch} className="relative flex items-center">
 <div className="absolute left-4 flex items-center pointer-events-none">
 <svg className="w-4 h-4 text-emerald-500/80 transition-all duration-300 group-focus-within/search:text-emerald-500 group-focus-within/search:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
 <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>
 </div>
 <input
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search communities, items,... "
 className="w-full bg-slate-100/60 border border-slate-200/50 rounded-2xl py-3 pl-11 pr-14 focus:bg-white focus:border-emerald-500/40 focus:ring-8 focus:ring-emerald-500/5 text-base md:text-[13px] font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 shadow-inner backdrop-blur-md"
 />
 <div className="absolute right-3 hidden lg:flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-lg shadow-sm pointer-events-none opacity-40 group-focus-within/search:opacity-100 transition-opacity">
 <span className="text-[9px] font-black text-slate-400">⌘</span>
 <span className="text-[9px] font-black text-slate-400">K</span>
 </div>
 </form>
 </div>
 )}

 {/* ── User Action Cluster ── */}
 {!hideActions && (
 <div className="flex items-center gap-4 shrink-0">
 {!user ? (
 <Link 
 href={ROUTES.auth.login()} 
 className="sm:hidden w-11 h-11 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 active:scale-95 transition-all"
 >
 <span className="material-symbols-outlined text-xl">login</span>
 </Link>
 ) : (
 <div className="flex items-center gap-4 pl-4 border-l border-slate-200/50">
 {/* Notifications */}
 <div className="relative">
 <button 
 onClick={() => { const willOpen = !notifOpen; setNotifOpen(willOpen); if (willOpen && !notifFetched) fetchNotifications(); }} 
 className={cn(
 "p-2.5 w-11 h-11 flex items-center justify-center text-slate-400 hover:text-emerald-500 rounded-xl hover:bg-slate-100 relative transition-all active:scale-90", 
 notifOpen && 'bg-emerald-50 text-emerald-500'
 )}
 >
 <span className="material-symbols-outlined text-2xl">notifications</span>
 {unreadCount > 0 && (
 <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse shadow-sm" />
 )}
 </button>
 
 {notifOpen && (
 <div className="fixed left-4 right-4 top-[70px] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-4 sm:w-80 bg-white/95 border border-slate-200/50 shadow-2xl rounded-3xl overflow-hidden py-3 z-[1000] animate-reveal backdrop-blur-xl">
 <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-50">
 <span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Activity Center</span>
 {unreadCount > 0 && <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{unreadCount} New</span>}
 </div>
 <div className="max-h-80 overflow-y-auto px-3 py-2 flex flex-col gap-1.5 custom-scrollbar">
 {!notifFetched ? (
 <div className="p-12 flex flex-col items-center gap-3">
 <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing...</span>
 </div>
 ) : notifications.length === 0 ? (
 <div className="p-12 text-center flex flex-col items-center gap-2 opacity-30">
 <span className="material-symbols-outlined text-4xl">inbox</span>
 <span className="text-[10px] font-black uppercase tracking-widest italic">All caught up</span>
 </div>
 ) : (
 notifications.map(n => (
 <div key={n.id} onClick={() => { !n.is_read && handleMarkAsRead(n.id); router.push(resolveNotificationLink(n)); setNotifOpen(false); }} className={cn("p-4 rounded-2xl cursor-pointer transition-all border group/item", !n.is_read ? 'bg-emerald-50/50 border-emerald-100/50' : 'border-transparent hover:bg-slate-50')}>
 <div className="flex justify-between items-start mb-1">
 <span className="font-black text-[10px] uppercase tracking-wider text-slate-900 group-hover/item:text-emerald-500 transition-colors">{n.type}</span>
 {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />}
 </div>
 <span className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{n.message}</span>
 </div>
 ))
 )}
 </div>
 </div>
 )}
 </div>

 {/* Profile */}
 <Link href={ROUTES.dashboard.home()} className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-transparent hover:border-emerald-500/50 transition-all group shrink-0 shadow-lg shadow-black/5 active:scale-90 bg-slate-50">
 {profile?.avatar_url ? (
 <Image src={profile.avatar_url as string} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-125" alt="Avatar" width={44} height={44} />
 ) : (
 <div className="w-full h-full flex items-center justify-center font-black text-sm text-emerald-600 bg-emerald-50/50 uppercase">{(profile?.full_name as string || 'U').charAt(0)}</div>
 )}
 </Link>
 </div>
 )}
 </div>
 )}
 </div>
 )
}
