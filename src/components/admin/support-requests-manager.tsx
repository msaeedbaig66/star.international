'use client'

import Link from 'next/link'

import { useMemo, useState } from 'react'
import { formatRelativeTime, cn } from '@/lib/utils'
import { SafeTime } from '@/components/shared/safe-time'
import { toast } from 'sonner'

interface SupportRequestsManagerProps {
  initialRequests: any[]
  stats: {
    open: number
    replied: number
    closed: number
    total: number
  }
  totalCount: number
  currentPage: number
  itemsPerPage: number
}

export function SupportRequestsManager({ 
  initialRequests, 
  stats,
  totalCount,
  currentPage,
  itemsPerPage
}: SupportRequestsManagerProps) {
  const [requests, setRequests] = useState<any[]>(initialRequests || [])
  const [filter, setFilter] = useState<'all' | 'open' | 'replied' | 'closed'>('open')
  const [selectedId, setSelectedId] = useState<string | null>((initialRequests?.[0]?.id as string) || null)
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(false)
  const [markClosed, setMarkClosed] = useState(false)

  const filtered = useMemo(() => {
    return requests.filter((r) => (filter === 'all' ? true : r.status === filter))
  }, [requests, filter])

  const selected = filtered.find((r) => r.id === selectedId) || filtered[0] || null

  const submitReply = async () => {
    if (!selected || !replyText.trim()) return
    try {
      setLoading(true)
      const res = await fetch('/api/admin/support-requests/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: selected.id,
          reply: replyText.trim(),
          mark_closed: markClosed,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to send reply')

      const now = new Date().toISOString()
      setRequests((prev) =>
        prev.map((r) =>
          r.id === selected.id
            ? {
                ...r,
                status: markClosed ? 'closed' : 'replied',
                admin_reply: replyText.trim(),
                replied_at: now,
              }
            : r
        )
      )
      setReplyText('')
      setMarkClosed(false)
      toast.success('Reply sent and notification delivered')
    } catch (error: any) {
      toast.error(error?.message || 'Reply failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-black text-text-primary tracking-tight">Support Inbox</h1>
        <p className="text-text-secondary mt-2">Questions submitted from Contact page. Reply once and user gets notification.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Open" value={stats.open} />
        <StatCard label="Replied" value={stats.replied} />
        <StatCard label="Closed" value={stats.closed} />
        <StatCard label="Total" value={stats.total} />
      </div>

      <div className="flex gap-2 p-1 rounded-full bg-surface w-fit">
        {(['open', 'replied', 'closed', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-5 py-2 rounded-full text-sm font-bold transition-colors',
              filter === f ? 'bg-primary text-white' : 'text-text-secondary hover:bg-white'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[400px,1fr] gap-6">
        <div className="bg-white border border-border rounded-3xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Incoming Questions</p>
          </div>
          <div className="max-h-[55vh] overflow-y-auto">
            {filtered.length === 0 && <div className="p-8 text-sm text-text-secondary text-center">No support requests in this filter.</div>}
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={cn(
                  'w-full text-left px-5 py-4 border-l-4 border-transparent hover:bg-surface transition-colors',
                  selected?.id === r.id && 'border-primary bg-primary-light/30'
                )}
              >
                <div className="text-xs font-black uppercase tracking-wider text-text-muted">{r.subject}</div>
                <div className="text-sm font-bold text-text-primary mt-1 line-clamp-1">{r.name}</div>
                <div className="text-xs text-text-secondary line-clamp-1">{r.email}</div>
                <div className="mt-2 flex justify-between text-[10px] text-text-muted">
                  <span className="uppercase font-black">{r.status}</span>
                  <SafeTime date={r.created_at} />
                </div>
              </button>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalCount > itemsPerPage && (
            <div className="p-4 border-t border-border flex items-center justify-between bg-surface/50">
              <Link
                href={`?page=${currentPage - 1}`}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                  currentPage > 1 ? "bg-white border-border text-text-primary hover:border-primary" : "opacity-40 pointer-events-none"
                )}
              >
                Prev
              </Link>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                {currentPage} / {Math.ceil(totalCount / itemsPerPage)}
              </p>
              <Link
                href={`?page=${currentPage + 1}`}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                  currentPage < Math.ceil(totalCount / itemsPerPage) ? "bg-white border-border text-text-primary hover:border-primary" : "opacity-40 pointer-events-none"
                )}
              >
                Next
              </Link>
            </div>
          )}
        </div>

        <div className="bg-white border border-border rounded-3xl p-6">
          {!selected ? (
            <div className="text-sm text-text-secondary">Select a request to reply.</div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Request Details</p>
                <h2 className="text-2xl font-black text-text-primary mt-2">{selected.subject}</h2>
                <p className="text-sm text-text-secondary mt-1">
                  {selected.name} ({selected.email})
                </p>
                <div className="text-xs text-text-muted mt-1">
                  Submitted <SafeTime date={selected.created_at} />
                </div>
              </div>

              <div className="bg-surface border border-border rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">User Message</p>
                <p className="text-sm text-text-primary mt-2 whitespace-pre-wrap">{selected.message}</p>
              </div>

              {selected.admin_reply && (
                <div className="bg-primary-light/30 border border-primary/20 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Last Reply</p>
                  <p className="text-sm text-text-primary mt-2 whitespace-pre-wrap">{selected.admin_reply}</p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-2">Reply Message</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={6}
                  className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                  placeholder="Write your response. User will receive this in notifications."
                />
              </div>

              <label className="flex items-center gap-3 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={markClosed}
                  onChange={(e) => setMarkClosed(e.target.checked)}
                  className="rounded border-border"
                />
                Mark ticket as closed after reply
              </label>

              <button
                onClick={submitReply}
                disabled={loading || !replyText.trim()}
                className="w-full py-3.5 rounded-full bg-primary text-white font-black uppercase tracking-[0.2em] text-xs disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">{label}</p>
      <p className="text-3xl font-black text-text-primary mt-2">{value}</p>
    </div>
  )
}

