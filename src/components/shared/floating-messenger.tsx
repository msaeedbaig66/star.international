'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { cn, formatRelativeTime } from '@/lib/utils'
import { toast } from 'sonner'
import { ROUTES } from '@/lib/routes'
import { formatTime } from '@/lib/utils'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import { createPortal } from 'react-dom'
import { getOptimizedImageUrl } from '@/lib/cloudinary'

interface FloatingMessengerProps {
 userId: string
 profile: any
}

export function FloatingMessenger({ userId, profile }: FloatingMessengerProps) {
 const [isOpen, setIsOpen] = useState(false)
 const [currentView, setCurrentView] = useState<'threads' | 'chat'>('threads')
 const [threads, setThreads] = useState<any[]>([])
 const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
 const [newMessage, setNewMessage] = useState('')
 const [loading, setLoading] = useState(false)
 const [searchQuery, setSearchQuery] = useState('')
 const [searchResults, setSearchResults] = useState<any[]>([])
 const [isSearching, setIsSearching] = useState(false)
 const [mounted, setMounted] = useState(false)
 const [isUploading, setIsUploading] = useState(false)
 const fileInputRef = useRef<HTMLInputElement>(null)
 
 useEffect(() => {
 setMounted(true)
 }, [])

 const { messages, loading: messagesLoading, addMessage } = useRealtimeMessages(activeThreadId)
 const messagesEndRef = useRef<HTMLDivElement>(null)

 const fetchThreads = useCallback(async () => {
 setLoading(true)
 try {
 const res = await fetch('/api/messages?limit=10')
 const json = await res.json()
 if (json.data) setThreads(json.data)
 } finally {
 setLoading(false)
 }
 }, [])

 useEffect(() => {
 const supabase = createClient()
 const channel = supabase.channel('global-chat-list')
 .on(
 'postgres_changes',
 { event: '*', schema: 'public', table: 'message_threads' },
 () => fetchThreads()
 )
 .subscribe()

 return () => { supabase.removeChannel(channel) }
 }, [fetchThreads])

 useEffect(() => {
 if (isOpen && currentView === 'threads') {
 fetchThreads()
 }
 }, [isOpen, currentView, fetchThreads])

 useEffect(() => {
 async function searchUsers() {
 if (searchQuery.length < 2) {
 setSearchResults([])
 return
 }
 setIsSearching(true)
 try {
 const supabase = createClient()
 const { data } = await supabase
 .from('profiles')
 .select('id, username, full_name, avatar_url')
 .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
 .neq('id', userId)
 .limit(5)
 if (data) setSearchResults(data)
 } finally {
 setIsSearching(false)
 }
 }
 const timer = setTimeout(searchUsers, 500)
 return () => clearTimeout(timer)
 }, [searchQuery, userId])

 useEffect(() => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
 }, [messages])

 const handleSendMessage = async (e?: React.FormEvent, attachmentUrl?: string) => {
 e?.preventDefault()
 const content = newMessage.trim()
 if (!activeThreadId || (!content && !attachmentUrl)) return

 try {
 const res = await fetch(`/api/messages/${activeThreadId}`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ 
 content: content || undefined,
 attachment_url: attachmentUrl
 }),
 })
 if (res.ok) {
 setNewMessage('')
 }
 } catch (e) {
 console.error(e)
 }
 }

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0]
 if (!file || !activeThreadId) return

 // 10MB limit (matching platform constants)
 if (file.size > 10 * 1024 * 1024) {
 toast.error("File too large. Max 10MB allowed.")
 return;
 }

 setIsUploading(true)
 try {
 const formData = new FormData()
 formData.append('file', file)
 formData.append('category', 'messages')

 const res = await fetch('/api/upload', {
 method: 'POST',
 body: formData
 })
 const data = await res.json()
 if (data.url) {
 await handleSendMessage(undefined, data.url)
 } else {
 toast.error(data.error || "Upload failed")
 }
 } catch (err) {
 console.error(err)
 toast.error("Upload error")
 } finally {
 setIsUploading(false)
 if (fileInputRef.current) fileInputRef.current.value = ''
 }
 }

 const handleCreateThread = async (targetUserId: string) => {
 setLoading(true)
 try {
 const res = await fetch('/api/messages', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ targetUserId }),
 })
 const { data } = await res.json()
 if (data?.thread_id) {
 setActiveThreadId(data.thread_id)
 setCurrentView('chat')
 setSearchQuery('')
 setSearchResults([])
 await fetchThreads()
 }
 } catch (e) {
 console.error(e)
 } finally {
 setLoading(false)
 }
 }

 const activeThread = threads.find(t => t.id === activeThreadId)
 const otherUser = activeThread?.participants?.find((p: any) => p.user?.id !== userId)?.user

 const renderContent = () => {
 if (currentView === 'threads') {
 return (
 <div className="flex flex-col h-full bg-white">
 <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
 <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Conversations</h3>
 <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-900">
 <span className="material-symbols-outlined text-[20px]">close</span>
 </button>
 </div>
 <div className="p-4 border-b border-slate-50">
 <div className="relative">
 <input 
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-900 focus:ring-4 focus:ring-sky-500/10 outline-none placeholder:text-slate-400"
 placeholder="Search students..."
 />
 <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
 </div>
 </div>
 <div className="flex-1 overflow-y-auto p-2 space-y-1">
 {isSearching ? (
 <div className="p-8 text-center text-[10px] font-black uppercase text-slate-300 tracking-widest animate-pulse">Relaying Signals...</div>
 ) : searchResults.length > 0 ? (
 searchResults.map(u => (
 <button 
 key={u.id} 
 onClick={() => handleCreateThread(u.id)}
 className="w-full p-3 flex items-center gap-3 rounded-2xl hover:bg-emerald-50 transition-all text-left"
 >
 <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
 {u.avatar_url ? <Image src={getOptimizedImageUrl(u.avatar_url, 80, 80)} alt="A" width={40} height={40} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-xs text-emerald-600 bg-slate-50">{(u.username || 'U').charAt(0).toUpperCase()}</div>}
 </div>
 <div>
 <div className="font-bold text-sm text-slate-900">{u.full_name || u.username}</div>
 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">@{u.username}</div>
 </div>
 </button>
 ))
 ) : threads.length === 0 ? (
 <div className="p-12 text-center">
 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
 <span className="material-symbols-outlined text-slate-200 text-3xl">chat_bubble</span>
 </div>
 <div className="text-[10px] uppercase font-black text-slate-300 tracking-widest">No Transmissions Yet</div>
 </div>
 ) : threads.map(t => {
 const user = t.participants?.find((p: any) => p.user?.id !== userId)?.user
 const lastMsg = t.messages?.[0]
 return (
 <button 
 key={t.id} 
 onClick={() => { setActiveThreadId(t.id); setCurrentView('chat'); }}
 className="w-full p-3 flex items-center gap-3 rounded-2xl hover:bg-slate-50 transition-all text-left group"
 >
 <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 {user?.avatar_url ? <img src={getOptimizedImageUrl(user.avatar_url, 100, 100)} alt="A" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-xs text-sky-600 bg-slate-50">{(user?.username || 'U').charAt(0).toUpperCase()}</div>}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex justify-between items-baseline mb-0.5">
 <div className="font-bold text-sm text-slate-900 truncate">{user?.full_name || user?.username || 'Unknown'}</div>
 <div className="text-[9px] font-black uppercase text-slate-300">
 {lastMsg ? formatRelativeTime(lastMsg.created_at) : ''}
 </div>
 </div>
 <div className="text-xs text-slate-500 truncate font-medium">
 {lastMsg?.sender_id === userId && <span className="text-emerald-500 mr-1">You:</span>}
 {lastMsg?.content || 'Sent an attachment'}
 </div>
 </div>
 </button>
 )
 })}
 </div>
 </div>
 )
 }

 return (
 <div className="flex flex-col h-full bg-white">
 <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
 <button onClick={() => setCurrentView('threads')} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
 <span className="material-symbols-outlined text-[20px] text-slate-600">arrow_back</span>
 </button>
 <div className="flex items-center gap-2 flex-1 min-w-0">
 <div className="w-8 h-8 rounded-full border border-slate-200 overflow-hidden flex-shrink-0">
 {otherUser?.avatar_url ? <Image src={getOptimizedImageUrl(otherUser.avatar_url, 80, 80)} alt="A" width={32} height={32} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-[10px] text-sky-600 bg-slate-50">{(otherUser?.username || 'U').charAt(0).toUpperCase()}</div>}
 </div>
 <div className="font-bold text-xs text-slate-900 truncate">{otherUser?.full_name || otherUser?.username}</div>
 </div>
 <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-900">
 <span className="material-symbols-outlined text-[20px]">close</span>
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
 <div className="flex flex-col items-center py-6">
 <div className="w-16 h-16 rounded-full border-2 border-slate-100 overflow-hidden mb-3">
 {otherUser?.avatar_url ? <Image src={getOptimizedImageUrl(otherUser.avatar_url, 160, 160)} alt="A" width={64} height={64} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-xl text-sky-600 bg-slate-50">{(otherUser?.username || 'U').charAt(0).toUpperCase()}</div>}
 </div>
 <div className="font-black text-sm text-slate-900">{otherUser?.full_name || otherUser?.username}</div>
 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">@{otherUser?.username}</div>
 <button className="mt-4 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95">View Profile</button>
 </div>

 {messages.map((m, idx) => {
 const isMe = m.sender_id === userId
 return (
 <div key={m.id || idx} className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
 <div className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter px-1">
 {formatTime(m.created_at)}
 </div>
 {m.attachment_url && (
 <div className="max-w-[85%] rounded-2xl overflow-hidden border border-slate-100 shadow-sm mb-1 bg-slate-50">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img 
 src={getOptimizedImageUrl(m.attachment_url, 600)} 
 alt="Attachment" 
 className="max-w-full h-auto object-cover max-h-[300px] block"
 loading="lazy"
 />
 </div>
 )}
 {m.content && (
 <div className={cn(
 "max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm transition-all animate-in fade-in slide-in-from-bottom-1 duration-300",
 isMe ? "bg-sky-600 text-white rounded-tr-none" : "bg-slate-100 text-slate-900 rounded-tl-none border border-slate-200"
 )}>
 {m.content}
 </div>
 )}
 </div>
 )
 })}
 <div ref={messagesEndRef} />
 </div>

 <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-50 flex items-center gap-2 bg-white">
 <input 
 type="file" 
 ref={fileInputRef} 
 onChange={handleFileUpload} 
 className="hidden" 
 accept="image/*,.pdf,.doc,.docx"
 />
 <div className="flex gap-1 pr-1">
 <button 
 type="button" 
 onClick={() => fileInputRef.current?.click()}
 disabled={isUploading}
 className={cn("p-2 text-slate-400 hover:text-sky-500 transition-colors", isUploading && "animate-pulse")}
 >
 <span className="material-symbols-outlined text-[20px]">{isUploading ? 'sync' : 'image'}</span>
 </button>
 </div>
 <input 
 disabled={isUploading} value={newMessage}
 onChange={(e) => setNewMessage(e.target.value)}
 className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none placeholder:text-slate-400"
 placeholder="Message..."
 />
 <button 
 type="submit" 
 disabled={!newMessage.trim()}
 className={cn(
 "px-4 py-2 font-bold text-sm transition-all rounded-full",
 newMessage.trim() ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-300 pointer-events-none"
 )}
 >
 Send
 </button>
 </form>
 </div>
 )
 }

 if (!mounted || typeof window === 'undefined') return null

 return createPortal(
 <>
 <button 
 onClick={() => setIsOpen(!isOpen)}
 className={cn(
 "fixed bottom-6 sm:bottom-10 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-[10000] transition-all active:scale-90",
 isOpen ? "bg-slate-900 text-white rotate-90 scale-90" : "bg-white text-sky-600 hover:bg-sky-50 hover:scale-110"
 )}
 >
 <span className="material-symbols-outlined text-[28px]">
 {isOpen ? 'close' : 'chat_bubble'}
 </span>
 {!isOpen && (
 <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 border-2 border-white rounded-full animate-pulse" />
 )}
 </button>

 {isOpen && (
 <div className="fixed bottom-6 sm:bottom-10 right-4 sm:right-6 w-[calc(100vw-32px)] sm:w-[30%] sm:min-w-[360px] sm:max-w-[450px] h-[60vh] sm:h-[75vh] sm:max-h-[700px] bg-white rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-slate-100 z-[10000] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-10 zoom-in-95 duration-500 cubic-bezier(0.4, 0, 0.2, 1)">
 {renderContent()}
 </div>
 )}
 </>,
 document.body
 )
}
