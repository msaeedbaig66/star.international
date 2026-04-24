'use client'

import { useEffect, useState, useRef, useCallback, memo, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/avatar'
import { formatRelativeTime, formatPrice, formatTime } from '@/lib/utils'
import { useDebounce } from '@/hooks/use-debounce'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus'
import dynamic from 'next/dynamic'
import NextImage from 'next/image'
import { toast } from 'sonner'
import { uploadToCloudinary, getOptimizedImageUrl } from '@/lib/cloudinary'
import { ROUTES } from '@/lib/routes'
import { UserLink } from '@/components/shared/navigation-links'
import { SafeTime } from '@/components/shared/safe-time'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

interface DashboardProfile {
 id: string
 role: string
}

interface ThreadParticipation {
 thread_id: string
}

interface ThreadBase {
 id: string
 listing_id: string | null
 created_at: string
 updated_at: string
}

interface ParticipantUser {
 id: string
 username: string | null
 full_name: string | null
 avatar_url: string | null
}

interface ThreadParticipantRow {
 thread_id: string
 user_id: string
 user: ParticipantUser | ParticipantUser[] | null
}

interface ThreadMessagePreview {
 id?: string
 thread_id: string
 content: string
 attachment_url?: string | null
 parent_id?: string | null
 reactions?: Record<string, string[]> | null
 parent?: {
 id: string
 content: string
 sender?: { username: string; full_name: string } | null
 } | null
 created_at: string
 sender_id: string | null
 is_read: boolean
}

interface ListingPreview {
 id: string
 title: string
 price: number
 images: string[] | null
}

interface ThreadQueryRow extends ThreadBase {
 listing: ListingPreview | ListingPreview[] | null
 participants: ThreadParticipantRow[] | null
 messages: ThreadMessagePreview[] | null
}

interface ConversationThread extends ThreadBase {
 other_user: ParticipantUser | null
 last_message: ThreadMessagePreview | null
 listing: ListingPreview | null
 unread_count: number
}

interface MessagesTabProps {
 profile: DashboardProfile
 initialThreadId?: string | null
 onOpenSidebar?: () => void
}

const MAX_MESSAGE_LENGTH = 2000
const ThreadItem = memo(({ 
 thread, 
 isActive, 
 onClick, 
 displayName 
}: { 
 thread: any, 
 isActive: boolean, 
 onClick: () => void, 
 displayName: string 
}) => (
 <button
 onClick={onClick}
 className={cn(
 'w-full flex items-center gap-4 px-6 py-6 transition-all text-left relative group border-b border-slate-50',
 isActive ? 'bg-emerald-50' : 'hover:bg-slate-50'
 )}
 >
 {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-600" />}
 <div className="relative">
 <Avatar src={thread.other_user?.avatar_url} fallback={displayName} size="md" />
 {thread.unread_count > 0 && (
 <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
 {thread.unread_count}
 </div>
 )}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between mb-1">
 <h4 className={cn("font-bold text-slate-900 text-sm truncate tracking-tight", thread.unread_count > 0 && "text-emerald-700")}>
 {displayName}
 </h4>
 <span className="text-[10px] font-medium text-slate-400 flex-shrink-0 ml-2">
 {thread.last_message && <SafeTime date={thread.last_message.created_at} />}
 </span>
 </div>
 <p className={cn("text-xs truncate", thread.unread_count > 0 ? "text-slate-900 font-bold" : "text-slate-500")}>
 {thread.last_message?.content || 'No messages yet'}
 </p>
 </div>
 </button>
));
ThreadItem.displayName = 'ThreadItem'

const DELETED_USER_LABEL = 'Deleted User'
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

export function MessagesTab({ profile, initialThreadId, onOpenSidebar }: MessagesTabProps) {
 const router = useRouter()
 const [threads, setThreads] = useState<ConversationThread[]>([])
 const [activeThread, setActiveThread] = useState<string | null>(initialThreadId || null)
 const {
 messages,
 setMessages,
 loading: messagesLoading,
 addMessage,
 removeMessage,
 updateMessage,
 hasMore,
 loadingOlder,
 loadOlder,
 sendBroadcast
 } = useRealtimeMessages(activeThread)
 const { isConnected } = useRealtimeStatus()
 const [newMessage, setNewMessage] = useState('')
 const [loading, setLoading] = useState(true)
 const [sending, setSending] = useState(false)
 const [sendError, setSendError] = useState<string | null>(null)
 const [showMobileList, setShowMobileList] = useState(true)
 const [threadFilter, setThreadFilter] = useState<'all' | 'unread'>('all')
 const [searchConv, setSearchConv] = useState('')
 const [showMoreMenu, setShowMoreMenu] = useState(false)
 const [isBlocking, setIsBlocking] = useState(false)
 const [isBlockedByUs, setIsBlockedByUs] = useState(false)
 const [showEmojiPicker, setShowEmojiPicker] = useState(false)
 
 // New User Search states
 const [searchUsers, setSearchUsers] = useState('')
 const [remoteUsers, setRemoteUsers] = useState<any[]>([])
 const [searchingRemote, setSearchingRemote] = useState(false)
 const [isNewMessageMode, setIsNewMessageMode] = useState(false)
 const debouncedUserSearch = useDebounce(searchUsers, 500)
 
 const messagesContainerRef = useRef<HTMLDivElement>(null)
 const messagesEndRef = useRef<HTMLDivElement>(null)
 const emojiPickerRef = useRef<HTMLDivElement>(null)
 const fileInputRef = useRef<HTMLInputElement>(null)
 const [isUploading, setIsUploading] = useState(false)
 const [selectedFile, setSelectedFile] = useState<File | null>(null)
 const [filePreview, setFilePreview] = useState<string | null>(null)
 const [replyingTo, setReplyingTo] = useState<ThreadMessagePreview | null>(null)
 const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)

 const preserveScrollRef = useRef<{ height: number; top: number } | null>(null)
 const threadIdsRef = useRef<Set<string>>(new Set())

 const loadThreads = useCallback(async (options?: { silent?: boolean }) => {
 const supabase = createClient()
 if (!options?.silent) setLoading(true)
 try {
 const { data: participations, error: participationError } = await supabase
 .from('thread_participants')
 .select('thread_id')
 .eq('user_id', profile.id)

 if (participationError) throw participationError

 if (!participations?.length) {
 setThreads([])
 return
 }

 const threadIds = (participations as ThreadParticipation[]).map((p) => p.thread_id)

 const { data: threadData, error: threadError } = await supabase
 .from('message_threads')
 .select(`
 id,
 listing_id,
 created_at,
 updated_at,
 listing:listings(id, title, price, images),
 participants:thread_participants(thread_id, user_id, user:profiles(id, username, full_name, avatar_url)),
 messages(id, thread_id, content, created_at, sender_id, is_read)
 `)
 .in('id', threadIds)
 .order('updated_at', { ascending: false })
 .order('created_at', { foreignTable: 'messages', ascending: false })
 .limit(1, { foreignTable: 'messages' })
 .limit(100)

 if (threadError) throw threadError
 if (!threadData?.length) {
 setThreads([])
 return
 }

 const { data: unreadRows, error: unreadError } = await supabase
 .from('messages')
 .select('thread_id, sender_id')
 .in('thread_id', threadIds)
 .eq('is_read', false)
 .neq('sender_id', profile.id)

 if (unreadError) throw unreadError

 const unreadCountByThread = new Map<string, number>()
 for (const row of unreadRows || []) {
 const threadId = (row as { thread_id?: string }).thread_id
 if (!threadId) continue
 unreadCountByThread.set(threadId, (unreadCountByThread.get(threadId) || 0) + 1)
 }

 const enriched: ConversationThread[] = (threadData as ThreadQueryRow[]).map((thread) => {
 const participants = Array.isArray(thread.participants) ? thread.participants : []
 const otherParticipant = participants.find((participant) => participant.user_id !== profile.id) || null
 const normalizedUser = otherParticipant
 ? (Array.isArray(otherParticipant.user) ? otherParticipant.user[0] || null : otherParticipant.user)
 : null
 const lastMessage = Array.isArray(thread.messages) ? thread.messages[0] || null : null
 const normalizedListing = Array.isArray(thread.listing) ? thread.listing[0] || null : thread.listing

 return {
 id: thread.id,
 listing_id: thread.listing_id,
 created_at: thread.created_at,
 updated_at: thread.updated_at,
 other_user: normalizedUser,
 last_message: lastMessage,
 listing: normalizedListing,
 unread_count: unreadCountByThread.get(thread.id) || 0,
 }
 })

 setThreads(enriched)
 if (initialThreadId && !activeThread && enriched.some((thread) => thread.id === initialThreadId)) {
 setActiveThread(initialThreadId)
 }
 } catch (error) {
 console.error('Failed to load message threads:', error)
 setThreads([])
 } finally {
 if (!options?.silent) setLoading(false)
 }
 }, [activeThread, initialThreadId, profile.id])

 useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
 setShowEmojiPicker(false)
 }
 }
 if (showEmojiPicker) {
 document.addEventListener('mousedown', handleClickOutside)
 }
 return () => {
 document.removeEventListener('mousedown', handleClickOutside)
 }
 }, [showEmojiPicker])

 useEffect(() => {
 const hasUnreadFromOthers = messages.some((message) => message.sender_id !== profile.id && !message.is_read)
 if (!activeThread) {
 setIsBlockedByUs(false)
 return
 }

 const checkBlockedStatus = async () => {
 const thread = threads.find(t => t.id === activeThread)
 if (!thread?.other_user?.id) return
 
 const supabase = createClient()
 const { data, error } = await supabase
 .from('blocked_users')
 .select('*')
 .eq('blocker_id', profile.id)
 .eq('blocked_id', thread.other_user.id)
 .single()
 
 setIsBlockedByUs(!!data && !error)
 }
 checkBlockedStatus()

 if (!hasUnreadFromOthers) return

 const markAsRead = async () => {
 try {
 const supabase = createClient()
 const { error } = await supabase
 .from('messages')
 .update({ is_read: true })
 .eq('thread_id', activeThread)
 .neq('sender_id', profile.id)
 .eq('is_read', false)
 if (error) {
 console.error('Failed to mark messages as read:', error)
 }
 } catch (error) {
 console.error('Failed to mark messages as read:', error)
 }
 }

 markAsRead()
 }, [activeThread, messages, profile.id, threads])

 useEffect(() => {
 async function fetchUsers() {
 if (debouncedUserSearch.length < 2) {
 setRemoteUsers([])
 return
 }
 setSearchingRemote(true)
 try {
 const supabase = createClient()
 const { data: { user } } = await supabase.auth.getUser()
 
 const { data, error } = await supabase
 .from('profiles')
 .select('id, username, full_name, avatar_url, field_of_study')
 .or(`username.ilike.%${debouncedUserSearch}%,full_name.ilike.%${debouncedUserSearch}%`)
 .neq('id', user?.id)
 .limit(10)
 
 if (!error) setRemoteUsers(data || [])
 } catch (err) {
 console.error(err)
 } finally {
 setSearchingRemote(false)
 }
 }
 fetchUsers()
 }, [debouncedUserSearch])

 useEffect(() => {
 const container = messagesContainerRef.current
 if (!container) return

 if (preserveScrollRef.current) {
 const { height, top } = preserveScrollRef.current
 preserveScrollRef.current = null
 container.scrollTop = container.scrollHeight - height + top
 return
 }

 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
 }, [messages])

 useEffect(() => {
 async function fetchRecommended() {
 if (!isNewMessageMode || searchUsers.trim()) return
 try {
 const supabase = createClient()
 const { data } = await supabase
 .from('profiles')
 .select('id, username, full_name, avatar_url')
 .neq('id', profile.id)
 .limit(8)
 if (data) setRemoteUsers(data)
 } catch (err) {
 console.error(err)
 }
 }
 fetchRecommended()
 }, [isNewMessageMode, searchUsers, profile.id])

 useEffect(() => {
 loadThreads()
 }, [loadThreads])

 useEffect(() => {
 threadIdsRef.current = new Set(threads.map((t) => t.id))
 }, [threads])

 useEffect(() => {
 if (initialThreadId) {
 setActiveThread(initialThreadId)
 setShowMobileList(false)
 }
 }, [initialThreadId])

 useEffect(() => {
 const supabase = createClient()
 let refreshTimer: ReturnType<typeof setTimeout> | null = null
 let fallbackInterval: ReturnType<typeof setInterval> | null = null

 const scheduleRefresh = () => {
 if (refreshTimer) clearTimeout(refreshTimer)
 refreshTimer = setTimeout(() => {
 loadThreads({ silent: true })
 }, 250)
 }

 const startFallback = () => {
 if (fallbackInterval) return
 console.warn('[Messages] Realtime connection lost. Falling back to active polling...')
 fallbackInterval = setInterval(() => {
 loadThreads({ silent: true })
 }, 10000) // Poll every 10s if realtime is down
 }

 const stopFallback = () => {
 if (fallbackInterval) {
 clearInterval(fallbackInterval)
 fallbackInterval = null
 }
 }

 const channel = supabase
 .channel(`messages-list-${profile.id}`)
 .on(
 'postgres_changes',
 { event: 'INSERT', schema: 'public', table: 'thread_participants', filter: `user_id=eq.${profile.id}` },
 () => scheduleRefresh()
 )
 .on(
 'postgres_changes',
 { event: 'UPDATE', schema: 'public', table: 'message_threads' },
 (payload) => {
 const updatedThread = payload.new as { id?: string }
 if (!updatedThread.id) return
 if (!threadIdsRef.current.has(updatedThread.id)) return
 scheduleRefresh()
 }
 )
 .on(
 'postgres_changes',
 { event: 'INSERT', schema: 'public', table: 'messages' },
 (payload) => {
 const msg = payload.new as { thread_id: string }
 if (threadIdsRef.current.has(msg.thread_id)) {
 scheduleRefresh()
 }
 }
 )
 .subscribe((status) => {
 if (status === 'SUBSCRIBED') {
 stopFallback()
 } else if (status === 'CLOSED' || status === 'TIMED_OUT') {
 startFallback()
 }
 })

 return () => {
 if (refreshTimer) clearTimeout(refreshTimer)
 stopFallback()
 supabase.removeChannel(channel)
 }
 }, [loadThreads, profile.id])

 const handleLoadOlder = async () => {
 const container = messagesContainerRef.current
 if (container) {
 preserveScrollRef.current = {
 height: container.scrollHeight,
 top: container.scrollTop,
 }
 }
 await loadOlder()
 }

 const handleCreateThread = async (targetUserId: string) => {
 try {
 setSending(true)
 const res = await fetch('/api/messages', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ targetUserId }),
 })
 const { data, error } = await res.json()
 if (error) throw new Error(error.message || error)
 
 const newThreadId = data.thread_id
 await loadThreads()
 
 setActiveThread(newThreadId)
 setIsNewMessageMode(false)
 } catch (err: any) {
 console.error(err)
 toast.error(err.message || 'Failed to start conversation')
 } finally {
 setSending(false)
 }
 }

 const handleSend = async (attachmentUrl?: string) => {
 if (!activeThread || counterpartDeleted || isBlockedByUs) return
 if (!newMessage.trim() && !attachmentUrl) return

 setSending(true)
 setSendError(null)

 try {
 const res = await fetch(`/api/messages/${activeThread}`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ 
 content: newMessage.trim(),
 attachment_url: attachmentUrl,
 parent_id: replyingTo?.id,
 is_anonymous: false
 }),
 })

 if (!res.ok) {
 const json = await res.json()
 throw new Error(json.error || 'Failed to send message')
 }

 setNewMessage('')
 setSelectedFile(null)
 setFilePreview(null)
 setReplyingTo(null)
 } catch (error: any) {
 console.error('Failed to send message:', error)
 setSendError(error?.message || 'Failed to send message. Please try again.')
 } finally {
 setSending(false)
 }
 }

 const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0]
 if (!file) return
 
 setSelectedFile(file)
 const url = URL.createObjectURL(file)
 setFilePreview(url)
 }

 const compressAndUpload = async (): Promise<string | undefined> => {
 if (!selectedFile) return
 setIsUploading(true)
 try {
 // Automatic compression handled by Cloudinary utility
 const url = await uploadToCloudinary(selectedFile, 'chats')
 return url
 } catch (err) {
 console.error(err)
 } finally {
 setIsUploading(false)
 }
 }

 const handleSendWithAttachment = async () => {
 let attachmentUrl = undefined;
 if (selectedFile) {
 attachmentUrl = await compressAndUpload();
 if (!attachmentUrl) return; 
 }
 await handleSend(attachmentUrl);
 }

 const handleReaction = useCallback(async (messageId: string, emoji: string) => {
 if (!activeThread) return
 const msg = messages.find((m) => m.id === messageId)
 if (!msg) return

 const existingReactions = (msg.reactions as Record<string, string[]>) || {}
 const users = existingReactions[emoji] || []
 const isRemoving = users.includes(profile.id)
 
 let nextUsers = isRemoving 
 ? users.filter(id => id !== profile.id)
 : [...users, profile.id]
 
 const nextReactions = { ...existingReactions }
 if (nextUsers.length > 0) {
 nextReactions[emoji] = nextUsers
 } else {
 delete nextReactions[emoji]
 }

 updateMessage(messageId, { reactions: nextReactions });
 sendBroadcast('reaction', { messageId, reactions: nextReactions })

 try {
 const action = isRemoving ? 'remove' : 'add'
 const res = await fetch(`/api/messages/${activeThread}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ messageId, emoji, action }),
 })

 if (!res.ok) {
 updateMessage(messageId, { reactions: existingReactions });
 }
 } catch (err) {
 console.error('Reaction failed:', err)
 updateMessage(messageId, { reactions: existingReactions });
 } finally {
 setShowReactionPicker(null)
 }
 }, [activeThread, messages, profile.id, updateMessage, sendBroadcast])

 const handleEmojiClick = useCallback((emojiData: any) => {
 setNewMessage((prev) => prev + emojiData.emoji)
 setShowEmojiPicker(false)
 }, [])

 const handleDeleteMessage = useCallback(async (messageId: string) => {
 if (!activeThread) return
 if (!confirm('Are you sure you want to delete this message?')) return

 const messageToDelete = messages.find(m => m.id === messageId)
 if (!messageToDelete) return

 try {
 setMessages(prev => prev.filter(m => m.id !== messageId))
 const res = await fetch(`/api/messages/${activeThread}`, {
 method: 'DELETE',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ messageId }),
 })

 if (!res.ok) {
 setMessages(prev => [...prev, messageToDelete].sort((a, b) => 
 new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
 ))
 toast.error('Failed to delete message')
 }
 } catch (err) {
 setMessages(prev => [...prev, messageToDelete].sort((a, b) => 
 new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
 ))
 toast.error('Error deleting message')
 }
 }, [activeThread, messages, setMessages])

 const handleToggleBlock = async () => {
 if (!activeThread || isBlocking) return
 const thread = threads.find(t => t.id === activeThread)
 if (!thread?.other_user?.id) return

 setIsBlocking(true)
 const action = isBlockedByUs ? 'unblock' : 'block'
 try {
 const res = await fetch('/api/users/block', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ targetUserId: thread.other_user.id, action }),
 })
 if (!res.ok) throw new Error(`Failed to ${action} user`)
 setIsBlockedByUs(!isBlockedByUs)
 setShowMoreMenu(false)
 } catch (err) {
 console.error(err)
 } finally {
 setIsBlocking(false)
 }
 }

 const handleClearChat = async () => {
 if (!activeThread) return
 if (!confirm('Are you sure you want to clear all messages in this chat? This cannot be undone.')) return
 
 setShowMoreMenu(false)
 
 try {
 const res = await fetch(`/api/messages/${activeThread}`, {
 method: 'DELETE',
 })
 if (!res.ok) throw new Error('Failed to clear chat')
 
 // Clear local message cache
 setMessages([])
 await loadThreads()
 } catch (err) {
 console.error(err)
 }
 }

 const getThreadDisplayName = (thread: ConversationThread | null | undefined) =>
 thread?.other_user?.full_name || thread?.other_user?.username || DELETED_USER_LABEL

 const selectedThread = threads.find((t) => t.id === activeThread)
 const counterpartDeleted = !!selectedThread && !selectedThread.other_user
 const filteredThreads = threads.filter((t) => {
 if (threadFilter === 'unread' && t.unread_count === 0) return false
 const name = getThreadDisplayName(t).toLowerCase()
 if (searchConv && !name.includes(searchConv.toLowerCase())) return false
 return true
 })

 return (
 <div className="flex h-full overflow-hidden bg-slate-50">
 <div
 className={cn(
 'w-full lg:w-[380px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col transition-all relative z-20',
 activeThread && 'hidden lg:flex'
 )}
 >
 <div className="px-6 py-6 border-b border-slate-100 bg-white/50 backdrop-blur-3xl">
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-4">
 {onOpenSidebar && (
 <button 
 onClick={onOpenSidebar}
 className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 active:scale-95 transition-all"
 >
 <span className="material-symbols-outlined text-[20px]">menu</span>
 </button>
 )}
 <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">Inbox</h2>
 </div>
 <button 
 onClick={() => {
 setIsNewMessageMode(!isNewMessageMode)
 if (!isNewMessageMode) {
 setSearchUsers('')
 setRemoteUsers([])
 }
 }}
 className={cn(
 "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl sm:rounded-2xl transition-all active:scale-90 shadow-sm",
 isNewMessageMode 
 ? "bg-emerald-600 text-white" 
 : "bg-white border border-slate-200 text-slate-600"
 )}
 >
 <span className="material-symbols-outlined text-[20px] sm:text-[24px]">
 {isNewMessageMode ? 'close' : 'edit_square'}
 </span>
 </button>
 </div>
 
 <div className="relative group">
 {isNewMessageMode ? (
 <input
 autoFocus
 value={searchUsers}
 onChange={(e) => setSearchUsers(e.target.value)}
 className="w-full pl-12 pr-4 py-4 rounded-2xl border border-emerald-500 bg-white text-sm font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-400"
 placeholder="Find student..."
 />
 ) : (
 <input
 value={searchConv}
 onChange={(e) => setSearchConv(e.target.value)}
 className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
 placeholder="Search messages..."
 />
 )}
 <span className={cn(
 "material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl transition-colors",
 isNewMessageMode ? "text-emerald-600" : "text-slate-400"
 )}>
 {isNewMessageMode ? 'person_search' : 'search'}
 </span>
 </div>
 
 <div className="flex gap-2 mt-5">
 {(['all', 'unread'] as const).map((f) => (
 <button
 key={f}
 onClick={() => setThreadFilter(f)}
 className={cn(
 'px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all',
 threadFilter === f
 ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
 : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
 )}
 >
 {f}
 </button>
 ))}
 </div>

 <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
 <span className="material-symbols-outlined text-amber-600 text-sm">history_toggle_off</span>
 <p className="text-[10px] leading-tight text-amber-800 font-medium">
 Maintain hygiene: Messages and threads are automatically deleted after 30 days.
 </p>
 </div>
 </div>

 <div className="flex-1 overflow-y-auto scrollbar-hide">
 {isNewMessageMode ? (
 <div className="flex flex-col p-4 space-y-2">
 {!searchingRemote && remoteUsers.length === 0 && (
 <div className="p-12 text-center">
 <span className="material-symbols-outlined text-5xl text-slate-200 mb-4 block">person_add</span>
 <p className="text-sm font-bold text-slate-400">
 {searchUsers.trim() ? "No students found with that name" : "Search by name or @username"}
 </p>
 </div>
 )}
 {searchingRemote && (
 <div className="p-10 text-center">
 <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
 </div>
 )}
 {remoteUsers.map((user) => (
 <div
 key={user.id}
 className="w-full flex items-center p-4 hover:bg-emerald-50 rounded-3xl transition-all text-left group cursor-pointer"
 onClick={() => handleCreateThread(user.id)}
 >
 <UserLink user={user} size="md" viewerRole={profile.role} />
 </div>
 ))}
 </div>
 ) : (
 <div className="flex-1 overflow-y-auto">
 {filteredThreads.length === 0 && !isNewMessageMode && (
 <div className="px-10 py-20 text-center flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
 <span className="material-symbols-outlined text-4xl">chat_bubble</span>
 </div>
 <div>
 <h5 className="font-black text-xs uppercase tracking-[0.2em] text-slate-900 mb-1">Quiet in here</h5>
 <p className="text-[11px] font-medium text-slate-400 max-w-[160px] mx-auto leading-relaxed">
 Your active conversations will appear here.
 </p>
 </div>
 <button
 onClick={() => setIsNewMessageMode(true)}
 className="mt-2 px-8 py-3.5 rounded-full bg-emerald-600 text-[11px] font-black text-white uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
 >
 Start Chat
 </button>
 </div>
 )}



 {filteredThreads.map((thread) => (
 <ThreadItem
 key={thread.id}
 thread={thread}
 isActive={activeThread === thread.id}
 displayName={getThreadDisplayName(thread)}
 onClick={() => {
 setActiveThread(thread.id)
 setShowMobileList(false)
 }}
 />
 ))}
 </div>
 )}
 </div>
 </div>

 <div
 className={cn(
 'flex-1 flex flex-col bg-slate-50 relative h-full',
 showMobileList && 'hidden lg:flex'
 )}
 >
 {!activeThread ? (
 <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
 <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-sm border border-slate-100">
 <span className="material-symbols-outlined text-5xl text-emerald-600">forum</span>
 </div>
 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Select a thread</h3>
 <p className="text-slate-500 text-sm max-w-xs font-medium">Choose a conversation from the sidebar to continue your discussion.</p>
 </div>
 ) : (
 <>
 <div className="h-20 bg-white/80 backdrop-blur-3xl px-6 border-b border-slate-200 flex items-center gap-4 shrink-0 transition-all z-10">
 <button
 onClick={() => setShowMobileList(true)}
 className="lg:hidden w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-all"
 >
 <span className="material-symbols-outlined font-black">arrow_back</span>
 </button>
 
 {selectedThread?.other_user && (
 <UserLink 
 user={selectedThread.other_user as any} 
 size="md" 
 viewerRole={profile.role}
 className="flex-1 min-w-0 font-black text-slate-900 uppercase tracking-tight" 
 />
 )}
 {!selectedThread?.other_user && (
 <div className="flex items-center gap-4 flex-1 min-w-0 opacity-50">
 <Avatar fallback="U" size="md" />
 <h3 className="text-base font-black text-slate-900 truncate tracking-tight uppercase">{DELETED_USER_LABEL}</h3>
 </div>
 )}

 <div className="relative">
 <button
 onClick={() => setShowMoreMenu(!showMoreMenu)}
 className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all border border-slate-100"
 >
 <span className="material-symbols-outlined">more_vert</span>
 </button>
 {showMoreMenu && (
 <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-3xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
 <button 
 onClick={handleToggleBlock}
 disabled={isBlocking}
 className="w-full text-left px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors"
 >
 <span className="material-symbols-outlined text-[20px]">{isBlockedByUs ? 'lock_open' : 'block'}</span>
 {isBlockedByUs ? 'Unblock Student' : 'Block Student'}
 </button>
 <button 
 onClick={handleClearChat}
 className="w-full text-left px-5 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-3 transition-colors"
 >
 <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
 Clear Chat
 </button>
 <div className="h-px bg-slate-50 my-2 mx-3" />
 <button 
 onClick={() => setShowMoreMenu(false)}
 className="w-full text-left px-5 py-3 text-sm font-bold text-slate-400 hover:bg-slate-50 flex items-center gap-3 transition-colors"
 >
 <span className="material-symbols-outlined text-[20px]">close</span>
 Close Menu
 </button>
 </div>
 )}
 </div>
 </div>

 <div 
 ref={messagesContainerRef} 
 className="flex-1 overflow-y-auto px-6 py-10 space-y-6 scrollbar-hide active:scrollbar-default"
 >
 {loading ? (
 <div className="space-y-6 animate-pulse">
 {[1, 2, 3].map(i => (
 <div key={i} className={cn("flex flex-col gap-2", i % 2 === 0 ? "items-end" : "items-start")}>
 <div className={cn("h-12 w-48 bg-slate-200 rounded-2xl", i % 2 === 0 ? "rounded-tr-md" : "rounded-tl-md")} />
 <div className="h-3 w-20 bg-slate-100 rounded" />
 </div>
 ))}
 </div>
 ) : (
 <>
 {hasMore && (
 <div className="flex justify-center mb-8">
 <button
 onClick={handleLoadOlder}
 disabled={loadingOlder}
 className="px-6 py-2 rounded-full border border-slate-200 bg-white text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:bg-emerald-50 transition-all disabled:opacity-50"
 >
 Load History
 </button>
 </div>
 )}
 
 {messages.map((msg, idx) => {
 const isMine = msg.sender_id === profile.id
 const prevMsg = messages[idx - 1]
 const isSameSenderAsPrev = prevMsg && prevMsg.sender_id === msg.sender_id
 const nextMsg = messages[idx + 1]
 const isSameSenderAsNext = nextMsg && nextMsg.sender_id === msg.sender_id

 return (
 <div
 key={msg.id}
 className={cn(
 'flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300',
 isMine ? 'justify-end' : 'justify-start',
 isSameSenderAsPrev ? '-mt-4' : 'mt-2'
 )}
 >
 <div className={cn(
 'flex flex-col max-w-[85%] sm:max-w-[70%]',
 isMine ? 'items-end' : 'items-start'
 )}>
 {!isMine && !isSameSenderAsPrev && (
 <div className="mb-1.5 ml-1">
 <UserLink user={msg.sender as any} size="xs" isAnonymous={false} viewerRole={profile.role} />
 </div>
 )}
 
 <div className={cn(
 'px-5 py-3 shadow-sm relative group transition-all duration-300 break-words overflow-hidden',
 isMine
 ? 'bg-emerald-600 text-white rounded-t-[20px] rounded-l-[20px]'
 : 'bg-white text-slate-800 border border-slate-100 rounded-t-[20px] rounded-r-[20px]',
 isMine 
 ? (isSameSenderAsPrev ? 'rounded-tr-md' : 'rounded-tr-[20px]')
 : (isSameSenderAsPrev ? 'rounded-tl-md' : 'rounded-tl-[20px]'),
 isMine
 ? (isSameSenderAsNext ? 'rounded-br-md' : 'rounded-br-[20px]')
 : (isSameSenderAsNext ? 'rounded-bl-md' : 'rounded-bl-[20px]')
 )}>
 {msg.parent && (
 <div className={cn(
 "mb-2 p-2 rounded-lg border-l-4 text-xs font-medium bg-black/5 flex flex-col gap-0.5 max-w-full overflow-hidden",
 isMine ? "border-emerald-200" : "border-emerald-500"
 )}>
 <span className={cn(
 "text-xs font-bold uppercase tracking-wider truncate block",
 isMine ? "text-emerald-200" : "text-emerald-700"
 )}>
 {(msg as any).parent?.is_anonymous 
 ? 'Anonymous Student' 
 : (msg.parent.sender?.full_name || msg.parent.sender?.username)}
 </span>
 <p className="truncate opacity-80">{msg.parent.content}</p>
 </div>
 )}
 {msg.attachment_url && (
 <div className="mb-2 -mx-2 bg-slate-100 rounded-lg overflow-hidden border border-slate-200/20 relative aspect-video sm:aspect-auto sm:min-h-[200px] cursor-pointer" onClick={() => window.open(msg.attachment_url!, '_blank')}>
 <NextImage 
 src={msg.attachment_url} 
 alt="Attachment" 
 fill
 className="object-contain"
 sizes="(max-width: 640px) 100vw, 400px"
 />
 </div>
 )}
 {msg.content && <p className="text-sm font-medium leading-relaxed font-[family-name:var(--font-inter)]">{msg.content}</p>}
 
 <div className={cn(
 "text-[9px] font-bold mt-1 self-end opacity-60 flex items-center gap-1",
 isMine ? "text-emerald-50/80" : "text-slate-400"
 )}>
 {formatTime(msg.created_at)}
 {isMine && msg.is_read && (
 <span className="material-symbols-outlined text-[10px] text-emerald-300">done_all</span>
 )}
 {isMine && !msg.is_read && (
 <span className="material-symbols-outlined text-[10px]">check</span>
 )}
 </div>
 
 {msg.reactions && Object.keys(msg.reactions).length > 0 && (
 <div className={cn(
 "absolute -bottom-3 flex flex-wrap gap-0.5 z-10",
 isMine ? "right-2" : "left-2"
 )}>
 <div className="flex bg-white rounded-full px-1 py-0.5 shadow-md border border-slate-100 gap-0.5">
 {Object.entries(msg.reactions).map(([emoji, users]) => (
 <button
 key={emoji}
 onClick={(e) => {
 e.stopPropagation();
 handleReaction(msg.id!, emoji);
 }}
 className={cn(
 "flex items-center gap-1 px-1 rounded-full transition-all hover:bg-slate-50",
 users.includes(profile.id) ? "scale-110" : ""
 )}
 >
 <span className="text-[12px]">{emoji}</span>
 {users.length > 1 && <span className="text-[9px] font-black text-slate-500">{users.length}</span>}
 </button>
 ))}
 </div>
 </div>
 )}
 
 <div className={cn(
 'absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 hidden md:flex',
 isMine ? 'right-full mr-4' : 'left-full ml-4'
 )}>
 <button 
 onClick={() => setReplyingTo(msg)}
 className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 shadow-sm border border-slate-100 transition-all"
 title="Reply"
 >
 <span className="material-symbols-outlined text-[18px]">reply</span>
 </button>
 
 <div className="relative">
 <button 
 onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id!)}
 className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-amber-500 hover:bg-amber-50 shadow-sm border border-slate-100 transition-all"
 title="React"
 >
 <span className="material-symbols-outlined text-[18px]">add_reaction</span>
 </button>

 {showReactionPicker === msg.id && (
 <div className={cn(
 "absolute bottom-full mb-2 bg-white rounded-full shadow-2xl border border-slate-100 p-1 flex gap-0.5 z-50 animate-in zoom-in-50 duration-200",
 isMine ? "right-0" : "left-0"
 )}>
 {REACTION_EMOJIS.map(emoji => (
 <button
 key={emoji}
 onClick={() => handleReaction(msg.id!, emoji)}
 className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 transition-all active:scale-125 text-[18px]"
 >
 {emoji}
 </button>
 ))}
 </div>
 )}
 </div>

 <button 
 onClick={() => handleDeleteMessage(msg.id!)}
 className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-slate-400 hover:text-red-500 shadow-sm border border-slate-100 transition-all"
 title="Delete"
 >
 <span className="material-symbols-outlined text-[18px]">delete</span>
 </button>
 </div>
 </div>
 </div>
 </div>
 )
 })}
 </>
 )}
 <div ref={messagesEndRef} />
 </div>

 <div className="shrink-0 bg-white border-t border-slate-200 px-4 sm:px-8 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sticky bottom-0 z-20">
 <div className="max-w-5xl mx-auto flex items-end gap-3 sm:gap-4">
 <div className="flex-1 flex flex-col gap-2">
 {replyingTo && (
 <div className="relative bg-emerald-50 rounded-xl border border-emerald-100 p-3 flex flex-col gap-1 border-l-4 border-l-emerald-500 animate-in slide-in-from-bottom-2 duration-300">
 <div className="flex justify-between items-center">
 <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
 Replying to {replyingTo.sender_id === profile.id ? 'yourself' : 'them'}
 </span>
 <button 
 onClick={() => setReplyingTo(null)}
 className="text-emerald-500 hover:text-emerald-700 hover:scale-110 transition-all"
 >
 <span className="material-symbols-outlined text-[18px]">close</span>
 </button>
 </div>
 <p className="text-xs text-slate-600 line-clamp-1 italic">&quot;{replyingTo.content}&quot;</p>
 </div>
 )}

 {filePreview && (
 <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-lg group">
 <NextImage src={filePreview} fill className="object-cover" alt="Preview" />
 <button 
 onClick={() => { setSelectedFile(null); setFilePreview(null); }}
 className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
 >
 <span className="material-symbols-outlined text-[20px]">close</span>
 </button>
 </div>
 )}

 <div className="bg-slate-50 border border-slate-200 rounded-[24px] focus-within:ring-4 focus-within:ring-emerald-500/10 focus-within:border-emerald-500 transition-all flex items-end px-3 py-1.5 group">
 <input 
 type="file" 
 ref={fileInputRef} 
 onChange={handleFileSelect} 
 accept="image/*" 
 className="hidden" 
 />
 
 <button 
 onClick={() => fileInputRef.current?.click()}
 className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-emerald-600 transition-all mb-0.5"
 >
 <span className="material-symbols-outlined text-[22px]">attachment</span>
 </button>
 
 <textarea
 rows={1}
 value={newMessage}
 onChange={(e) => {
 setNewMessage(e.target.value)
 e.target.style.height = 'auto'
 e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
 }}
 onKeyDown={(e) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault()
 handleSendWithAttachment()
 }
 }}
 className="flex-1 px-3 py-2.5 bg-transparent text-base md:text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 resize-none min-h-[40px] max-h-[160px] scrollbar-hide"
 placeholder={counterpartDeleted ? 'Read-only context' : isBlockedByUs ? 'User is blocked' : 'Type your message...'}
 disabled={counterpartDeleted || isBlockedByUs}
 />

 <div className="relative">
 <button 
 onClick={() => setShowEmojiPicker(!showEmojiPicker)}
 className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-amber-500 transition-all mb-0.5"
 >
 <span className="material-symbols-outlined text-[22px]">sentiment_satisfied</span>
 </button>



 {showEmojiPicker && (
 <div 
 ref={emojiPickerRef}
 className="absolute bottom-full right-0 mb-4 z-50 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300"
 >
 <EmojiPicker 
 onEmojiClick={handleEmojiClick}
 previewConfig={{ showPreview: false }}
 skinTonesDisabled
 height={350}
 width={300}
 />
 </div>
 )}
 </div>
 </div>
 </div>

 <button
 onClick={handleSendWithAttachment}
 disabled={(!newMessage.trim() && !selectedFile) || sending || isUploading || counterpartDeleted || isBlockedByUs}
 className={cn(
 'w-12 h-12 rounded-[20px] flex items-center justify-center transition-all shadow-sm active:scale-95 shrink-0',
 (newMessage.trim() || selectedFile) && !counterpartDeleted && !isBlockedByUs
 ? 'bg-emerald-600 text-white shadow-emerald-200 hover:scale-105'
 : 'bg-slate-100 text-slate-300'
 )}
 >
 {(isUploading || sending) ? (
 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
 ) : (
 <span className="material-symbols-outlined text-[24px] font-black">send</span>
 )}
 </button>
 </div>
 
 {sendError && (
 <div className="mt-4 text-[10px] font-bold text-rose-500 uppercase tracking-widest text-center">
 {sendError}
 </div>
 )}
 </div>
 </>
 )}
 </div>
 </div>
 )
}
