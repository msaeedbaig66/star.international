'use client'

import { useMemo, useState } from 'react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { SafeTime } from '@/components/shared/safe-time'
import { toast } from 'sonner'
import Link from 'next/link'
import { getSafeHref } from '@/lib/security/url-security'

type ModerationFilter = 'all' | 'pending' | 'approved' | 'rejected'
type AdminCommentAction = 'approve' | 'reject' | 'remove'

interface CommentsManagerProps {
  initialComments: any[]
  stats: {
    pending: number
    approved: number
    rejected: number
    total: number
  }
}

export function CommentsManager({ initialComments, stats }: CommentsManagerProps) {
  const [comments, setComments] = useState<any[]>(initialComments || [])
  const [filter, setFilter] = useState<ModerationFilter>('pending')
  const [selectedId, setSelectedId] = useState<string | null>((initialComments?.[0]?.id as string) || null)
  const [adminMessage, setAdminMessage] = useState('')
  const [loadingAction, setLoadingAction] = useState<AdminCommentAction | null>(null)
  const [currentStats, setCurrentStats] = useState(stats)

  const filtered = useMemo(() => {
    return comments.filter((c) => (filter === 'all' ? true : c.moderation === filter))
  }, [comments, filter])

  const selected = useMemo(() => {
    return filtered.find((c) => c.id === selectedId) || filtered[0] || null
  }, [filtered, selectedId])

  async function runAction(action: AdminCommentAction) {
    if (!selected || loadingAction) return

    try {
      setLoadingAction(action)
      const res = await fetch('/api/admin/comments/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment_id: selected.id,
          action,
          admin_message: adminMessage.trim(),
        }),
      })

      if (res.status === 401) {
        window.location.href = '/login'
        return
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Action failed')

      if (action === 'remove') {
        const wasModerated = selected.moderation
        setComments((prev) => prev.filter((c) => c.id !== selected.id))
        setCurrentStats(prev => ({
          ...prev,
          total: prev.total - 1,
          [wasModerated]: prev[wasModerated as keyof typeof prev] - 1
        }))
        toast.success('Comment removed')
      } else {
        const prevModeration = selected.moderation
        const nextModeration = action === 'approve' ? 'approved' : 'rejected'
        
        setComments((prev) =>
          prev.map((c) =>
            c.id === selected.id
              ? {
                  ...c,
                  moderation: nextModeration,
                  rejection_note: action === 'reject' ? (adminMessage.trim() || 'Rejected by admin moderation.') : null,
                }
              : c
          )
        )

        // Update stats
        if (prevModeration !== nextModeration) {
          setCurrentStats(prev => ({
            ...prev,
            [prevModeration]: prev[prevModeration as keyof typeof prev] - 1,
            [nextModeration]: prev[nextModeration as keyof typeof prev] + 1
          }))
        }

        toast.success(action === 'approve' ? 'Comment approved' : 'Comment rejected')
      }

      setAdminMessage('')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update comment')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-black text-text-primary tracking-tight">Comments Queue</h1>
        <p className="text-text-secondary mt-2">Approve, reject, or remove comments. Approved comments become public immediately.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending" value={currentStats.pending} />
        <StatCard label="Approved" value={currentStats.approved} />
        <StatCard label="Rejected" value={currentStats.rejected} />
        <StatCard label="Total" value={currentStats.total} />
      </div>

      <div className="flex gap-2 p-1 rounded-full bg-surface w-full overflow-x-auto hide-scrollbar">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              'px-5 py-2 rounded-full text-sm font-bold transition-colors',
              filter === value ? 'bg-primary text-white' : 'text-text-secondary hover:bg-white'
            )}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px,1fr] gap-6">
        <div className="bg-white border border-border rounded-3xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Incoming Comments</p>
          </div>
          <div className="max-h-[68vh] overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-8 py-20 text-center flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-20 h-20 bg-primary-light/20 rounded-full flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-4xl">task_alt</span>
                </div>
                <div>
                  <h5 className="font-black text-xs uppercase tracking-[0.2em] text-text-primary mb-1">Queue Cleared!</h5>
                  <p className="text-[11px] font-medium text-text-secondary max-w-[200px] mx-auto leading-relaxed">
                    All comments in this category have been moderated. Great work!
                  </p>
                </div>
                <button
                  onClick={() => setFilter('all')}
                  className="mt-2 px-6 py-2 rounded-full bg-surface border border-border text-[10px] font-black text-text-primary uppercase tracking-widest hover:bg-white transition-all"
                >
                  View All History
                </button>
              </div>
            )}
            {filtered.map((comment) => (
              <button
                key={comment.id}
                onClick={() => setSelectedId(comment.id)}
                className={cn(
                  'w-full text-left px-5 py-4 border-l-4 border-transparent hover:bg-surface transition-colors',
                  selected?.id === comment.id && 'border-primary bg-primary-light/30'
                )}
              >
                <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">{comment.target_type} comment</p>
                <p className="text-sm font-bold text-text-primary mt-1 line-clamp-1">
                  {comment.author?.full_name || comment.author?.username || 'Unknown user'}
                </p>
                <p className="text-xs text-text-secondary mt-1 line-clamp-2">{comment.content}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-text-muted uppercase font-black">{comment.moderation}</span>
                  <SafeTime date={comment.created_at} className="text-[10px] text-text-muted" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-border rounded-3xl p-6">
          {!selected ? (
            <p className="text-sm text-text-secondary">Select a comment to moderate.</p>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Comment Details</p>
                <h2 className="text-2xl font-black text-text-primary mt-2">
                  {selected.author?.full_name || selected.author?.username || 'Unknown user'}
                </h2>
                <div className="text-xs text-text-muted mt-1">
                  Posted <SafeTime date={selected.created_at} /> • Status {selected.moderation}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Info label="Target Type" value={selected.target_type} />
                <Info label="Target Title" value={selected.target_title || 'Untitled'} />
              </div>

              <div className="bg-surface border border-border rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Comment Content</p>
                <p className="text-sm text-text-primary mt-2 whitespace-pre-wrap break-words">{selected.content}</p>
              </div>

              {selected.target_href && (
                <div>
                  <Link
                    href={getSafeHref(selected.target_href)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border text-sm font-bold text-text-primary hover:text-primary transition-colors"
                    target="_blank"
                  >
                    Open Target
                    <span className="material-symbols-outlined text-base">open_in_new</span>
                  </Link>
                </div>
              )}

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Admin Note</label>
                  <span className="text-[9px] font-black uppercase text-text-muted tabular-nums">{adminMessage.length}/500</span>
                </div>
                <textarea
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value.slice(0, 500))}
                  rows={4}
                  maxLength={500}
                  className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                  placeholder="Optional note to send user in notification."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ActionBtn
                  label="Approve"
                  onClick={() => runAction('approve')}
                  loading={loadingAction === 'approve'}
                />
                <ActionBtn
                  label="Reject"
                  onClick={() => runAction('reject')}
                  loading={loadingAction === 'reject'}
                  variant="soft"
                />
                <ActionBtn
                  label="Remove"
                  onClick={() => runAction('remove')}
                  loading={loadingAction === 'remove'}
                  variant="danger"
                />
              </div>
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

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">{label}</p>
      <div className="text-sm font-bold text-text-primary mt-1 break-words capitalize">{value}</div>
    </div>
  )
}

function ActionBtn({
  label,
  onClick,
  loading,
  variant = 'primary',
}: {
  label: string
  onClick: () => void
  loading?: boolean
  variant?: 'primary' | 'soft' | 'danger'
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-colors disabled:opacity-60',
        variant === 'primary' && 'bg-primary text-white hover:bg-primary-hover',
        variant === 'soft' && 'bg-surface text-text-primary border border-border hover:bg-white',
        variant === 'danger' && 'bg-destructive text-white hover:bg-destructive/90'
      )}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Working...</span>
        </div>
      ) : label}
    </button>
  )
}
