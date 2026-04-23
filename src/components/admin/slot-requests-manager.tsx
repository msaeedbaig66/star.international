'use client'

import Link from 'next/link'

import { useMemo, useState, useEffect } from 'react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { toast } from 'sonner'

interface SlotRequestsManagerProps {
  initialRequests: any[]
  stats: {
    pending: number
    approved: number
    rejected: number
    total: number
  }
  totalCount: number
  currentPage: number
  itemsPerPage: number
}

type FilterType = 'all' | 'pending' | 'approved' | 'rejected'

export function SlotRequestsManager({ 
  initialRequests, 
  stats,
  totalCount,
  currentPage,
  itemsPerPage
}: SlotRequestsManagerProps) {
  const [requests, setRequests] = useState<any[]>(initialRequests || [])
  const [filter, setFilter] = useState<FilterType>('pending')
  const [selectedId, setSelectedId] = useState<string | null>((initialRequests?.[0]?.id as string) || null)
  const [adminNote, setAdminNote] = useState('')
  const [approvedLimit, setApprovedLimit] = useState<number>(0)
  const [loadingAction, setLoadingAction] = useState<'approve' | 'reject' | null>(null)

  const filtered = useMemo(() => {
    return requests.filter((r) => (filter === 'all' ? true : r.status === filter))
  }, [requests, filter])

  const selected = filtered.find((r) => r.id === selectedId) || filtered[0] || null

  useEffect(() => {
    if (!selected) return
    setApprovedLimit(Number(selected.requested_limit || selected.current_limit || 0))
  }, [selected])

  async function runAction(action: 'approve' | 'reject') {
    if (!selected) return
    if (action === 'approve' && (!Number.isFinite(approvedLimit) || approvedLimit <= Number(selected.current_limit || 0))) {
      toast.error(`Approved limit must be greater than ${selected.current_limit}`)
      return
    }

    try {
      setLoadingAction(action)
      const res = await fetch('/api/admin/slot-requests/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: selected.id,
          action,
          admin_note: adminNote.trim(),
          approved_limit: action === 'approve' ? approvedLimit : undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Action failed')

      setRequests((prev) =>
        prev.map((r) =>
          r.id === selected.id
            ? {
                ...r,
                status: action === 'approve' ? 'approved' : 'rejected',
                requested_limit: action === 'approve' ? approvedLimit : r.requested_limit,
                additional_slots: action === 'approve'
                  ? Math.max(approvedLimit - Number(r.current_limit || 0), 1)
                  : r.additional_slots,
                admin_note: adminNote.trim() || null,
                reviewed_at: new Date().toISOString(),
              }
            : r
        )
      )
      setAdminNote('')
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'}`)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to process request')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="space-y-8 pb-24">
      <div>
        <h2 className="text-3xl font-black text-text-primary tracking-tight">Slot Requests Desk</h2>
        <p className="text-text-secondary mt-2">Review user requests for additional listing/community slots and apply quota changes.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending" value={stats.pending} />
        <StatCard label="Approved" value={stats.approved} />
        <StatCard label="Rejected" value={stats.rejected} />
        <StatCard label="Total" value={stats.total} />
      </div>

      <div className="flex gap-2 p-1 bg-surface rounded-full w-fit">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
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

      <div className="grid grid-cols-1 xl:grid-cols-[430px,1fr] gap-6">
        <div className="bg-white rounded-3xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Incoming Requests</p>
          </div>
          <div className="max-h-[55vh] overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-8 text-sm text-text-secondary text-center">No slot requests in this filter.</div>
            )}
            {filtered.map((req) => (
              <button
                key={req.id}
                onClick={() => setSelectedId(req.id)}
                className={cn(
                  'w-full text-left px-5 py-4 border-l-4 border-transparent hover:bg-surface transition-colors',
                  selected?.id === req.id && 'border-primary bg-primary-light/30'
                )}
              >
                <p className="text-xs font-black uppercase tracking-wider text-text-muted">{req.request_type} slots</p>
                <p className="text-sm font-bold text-text-primary mt-1 line-clamp-1">
                  {req.user?.full_name || req.user?.username || 'Unknown User'}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  {req.current_limit} to {req.requested_limit}
                </p>
                <div className="mt-2 flex justify-between text-[10px] text-text-muted">
                  <span className="uppercase font-black">{req.status}</span>
                  <span>{formatRelativeTime(req.created_at)}</span>
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

        <div className="bg-white rounded-3xl border border-border p-6">
          {!selected ? (
            <p className="text-sm text-text-secondary">Select a slot request to review.</p>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Request Context</p>
                <h3 className="text-2xl font-black text-text-primary mt-2 capitalize">{selected.request_type} slots</h3>
                <p className="text-sm text-text-secondary mt-2">
                  User: <span className="font-bold">{selected.user?.full_name || selected.user?.username || '-'}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InfoCard label="Current Limit" value={String(selected.current_limit || 0)} />
                <InfoCard label="Requested Limit" value={String(selected.requested_limit || 0)} />
                <InfoCard label="Additional Slots" value={String(selected.additional_slots || 0)} />
                <InfoCard label="Status" value={String(selected.status || '-')} />
              </div>

              <div className="bg-surface rounded-2xl p-4 border border-border">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">User Reason</p>
                <p className="text-sm text-text-primary mt-2 whitespace-pre-wrap">{selected.reason || 'No reason provided.'}</p>
              </div>

              {selected.admin_note && (
                <div className="bg-primary-light/30 border border-primary/20 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Previous Admin Note</p>
                  <p className="text-sm text-text-primary mt-2 whitespace-pre-wrap">{selected.admin_note}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-2">
                    Approved Limit
                  </label>
                  <input
                    type="number"
                    min={Number(selected.current_limit || 0) + 1}
                    value={approvedLimit || ''}
                    onChange={(e) => setApprovedLimit(Number(e.target.value || 0))}
                    className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                    disabled={selected.status !== 'pending'}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-2">
                    Admin Note
                  </label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="Optional note to include in user notification"
                    disabled={selected.status !== 'pending'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => runAction('approve')}
                  disabled={selected.status !== 'pending' || loadingAction !== null}
                  className={cn(
                    'py-3.5 rounded-xl text-sm font-black uppercase tracking-[0.2em] transition-colors',
                    selected.status !== 'pending'
                      ? 'bg-surface text-text-muted cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary-hover'
                  )}
                >
                  {loadingAction === 'approve' ? 'Approving...' : 'Approve Request'}
                </button>
                <button
                  onClick={() => runAction('reject')}
                  disabled={selected.status !== 'pending' || loadingAction !== null}
                  className={cn(
                    'py-3.5 rounded-xl text-sm font-black uppercase tracking-[0.2em] transition-colors',
                    selected.status !== 'pending'
                      ? 'bg-surface text-text-muted cursor-not-allowed'
                      : 'bg-destructive text-white hover:bg-destructive/90'
                  )}
                >
                  {loadingAction === 'reject' ? 'Rejecting...' : 'Reject Request'}
                </button>
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface rounded-xl p-3 border border-border">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">{label}</p>
      <p className="text-sm font-bold text-text-primary mt-1">{value}</p>
    </div>
  )
}
