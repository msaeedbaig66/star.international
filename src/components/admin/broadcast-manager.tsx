'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatRelativeTime, cn } from '@/lib/utils'
import { toast } from 'sonner'

type BroadcastKind = 'announcement' | 'launch' | 'advertisement' | 'message'

type BroadcastHistoryItem = {
 message: string
 created_at: string
 delivered: number
}

const kindOptions: Array<{ value: BroadcastKind; label: string; hint: string }> = [
 { value: 'announcement', label: 'Announcement', hint: 'General update for all users' },
 { value: 'launch', label: 'Launch', hint: 'New feature or release notice' },
 { value: 'advertisement', label: 'Ad Campaign', hint: 'Promotional or sponsored push' },
 { value: 'message', label: 'Message', hint: 'Direct message blast to all users' },
]

export function BroadcastManager() {
 const [kind, setKind] = useState<BroadcastKind>('announcement')
 const [title, setTitle] = useState('')
 const [message, setMessage] = useState('')
 const [ctaUrl, setCtaUrl] = useState('')
 const [loading, setLoading] = useState(false)
 const [refreshing, setRefreshing] = useState(true)
 const [audienceCount, setAudienceCount] = useState(0)
 const [sentToday, setSentToday] = useState(0)
 const [history, setHistory] = useState<BroadcastHistoryItem[]>([])

 const selectedKind = useMemo(() => kindOptions.find((item) => item.value === kind), [kind])

 const preview = useMemo(() => {
 const kindLabel = kind.toUpperCase()
 const lines = [`[BROADCAST] [${kindLabel}] ${title || 'Your title here'}`, message || 'Write your broadcast message here.']
 if (ctaUrl) lines.push(`Learn more: ${ctaUrl}`)
 return lines.join('\n')
 }, [kind, title, message, ctaUrl])

 const loadSnapshot = async () => {
 setRefreshing(true)
 try {
 const response = await fetch('/api/admin/broadcast', { cache: 'no-store' })
 const result = await response.json().catch(() => ({}))
 if (!response.ok) throw new Error(result?.error || 'Failed to load broadcast data')

 setAudienceCount(Number(result?.data?.audienceCount || 0))
 setSentToday(Number(result?.data?.sentToday || 0))
 setHistory(Array.isArray(result?.data?.history) ? result.data.history : [])
 } catch (error: any) {
 toast.error(error?.message || 'Unable to load broadcast data')
 } finally {
 setRefreshing(false)
 }
 }

 useEffect(() => {
 loadSnapshot()
 }, [])

 const handleSend = async () => {
 if (title.trim().length < 3) {
 toast.error('Title must be at least 3 characters')
 return
 }
 if (message.trim().length < 8) {
 toast.error('Message must be at least 8 characters')
 return
 }
 if (ctaUrl.trim() && !/^https?:\/\//i.test(ctaUrl.trim())) {
 toast.error('CTA URL must start with http:// or https://')
 return
 }

 setLoading(true)
 try {
 const response = await fetch('/api/admin/broadcast', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 kind,
 title: title.trim(),
 message: message.trim(),
 cta_url: ctaUrl.trim() || null,
 }),
 })
 const result = await response.json().catch(() => ({}))
 if (!response.ok) throw new Error(result?.error || 'Failed to send broadcast')

 toast.success(`Broadcast delivered to ${result?.data?.delivered || 0} users`)
 setTitle('')
 setMessage('')
 setCtaUrl('')
 await loadSnapshot()
 } catch (error: any) {
 toast.error(error?.message || 'Unable to send broadcast')
 } finally {
 setLoading(false)
 }
 }

 return (
 <div className="space-y-8 pb-32">
 <div className="space-y-2">
 <p className="text-[11px] font-black uppercase tracking-[0.24em] text-text-muted">Admin Messaging</p>
 <h2 className="text-3xl font-extrabold text-text-primary tracking-tight">Broadcast Center</h2>
 <p className="text-text-secondary text-base">Send launches, advertisements, announcements, or direct messages to every user notification inbox.</p>
 </div>

 <section className="rounded-3xl border border-border bg-white overflow-hidden shadow-sm">
 <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
 <div className="p-8 border-b lg:border-b-0 lg:border-r border-border space-y-7">
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
 {kindOptions.map((option) => (
 <button
 key={option.value}
 onClick={() => setKind(option.value)}
 className={cn(
 'text-left rounded-2xl px-4 py-4 border transition-all',
 kind === option.value
 ? 'border-primary bg-primary/5 shadow-sm'
 : 'border-border hover:border-primary/30 hover:bg-surface'
 )}
 >
 <p className="text-sm font-black text-text-primary">{option.label}</p>
 <p className="text-xs text-text-secondary mt-1">{option.hint}</p>
 </button>
 ))}
 </div>

 <div className="space-y-2">
 <label className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">Title</label>
 <input
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary focus:ring-2 focus:ring-primary/20 outline-none"
 placeholder="Feature launch, platform notice, or ad headline"
 />
 </div>

 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <label className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">Message</label>
 <span className="text-xs text-text-muted">{message.length} chars</span>
 </div>
 <textarea
 value={message}
 onChange={(e) => setMessage(e.target.value)}
 rows={6}
 className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
 placeholder="Write exactly what users should see in notifications."
 />
 </div>

 <div className="space-y-2">
 <label className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">Optional CTA URL</label>
 <input
 value={ctaUrl}
 onChange={(e) => setCtaUrl(e.target.value)}
 className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary focus:ring-2 focus:ring-primary/20 outline-none"
 placeholder="https://..."
 />
 </div>

 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
 <div className="text-sm text-text-secondary">
 Audience: <span className="font-black text-text-primary">{audienceCount}</span> users
 </div>
 <button
 onClick={handleSend}
 disabled={loading || refreshing}
 className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 bg-primary text-white font-black text-sm tracking-[0.08em] uppercase shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <span className="material-symbols-outlined text-[18px]">{loading ? 'hourglass_top' : 'send'}</span>
 {loading ? 'Sending...' : 'Send Broadcast'}
 </button>
 </div>
 </div>

 <div className="p-8 bg-gradient-to-b from-surface to-white space-y-6">
 <div className="rounded-2xl border border-border bg-white p-5">
 <p className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted mb-3">Live Preview</p>
 <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-text-primary">{preview}</pre>
 <div className="mt-3 text-xs text-text-secondary">
 Type: <span className="font-bold text-text-primary">{selectedKind?.label || 'Announcement'}</span>
 </div>
 </div>

 <div className="rounded-2xl border border-border bg-white p-5">
 <p className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">Sent Today</p>
 <p className="text-3xl font-black text-text-primary">{refreshing ? '...' : sentToday}</p>
 </div>

 <div className="rounded-2xl border border-border bg-white p-5">
 <div className="flex items-center justify-between mb-4">
 <p className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">Recent Broadcasts</p>
 <button onClick={loadSnapshot} className="text-xs font-bold text-primary hover:underline">
 Refresh
 </button>
 </div>
 <div className="max-h-[280px] overflow-y-auto space-y-3 pr-1">
 {history.length === 0 ? (
 <p className="text-sm text-text-secondary">No broadcast sent yet.</p>
 ) : (
 history.map((entry, index) => (
 <div key={`${entry.created_at}-${index}`} className="rounded-xl border border-border bg-surface p-3">
 <p className="text-sm font-semibold text-text-primary whitespace-pre-line line-clamp-3">{entry.message}</p>
 <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
 <span>{entry.delivered} users</span>
 <span>{formatRelativeTime(entry.created_at)}</span>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 </div>
 </section>
 </div>
 )
}
