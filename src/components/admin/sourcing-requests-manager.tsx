'use client'

import { useMemo, useState } from 'react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { toast } from 'sonner'

interface SourcingRequestsManagerProps {
  initialRequests: any[]
}

type FilterType = 'all' | 'pending' | 'processing' | 'completed' | 'unavailable'

export function SourcingRequestsManager({ initialRequests }: SourcingRequestsManagerProps) {
  const [requests, setRequests] = useState<any[]>(initialRequests || [])
  const [filter, setFilter] = useState<FilterType>('pending')
  const [selectedId, setSelectedId] = useState<string | null>((initialRequests?.[0]?.id as string) || null)
  const [adminNote, setAdminNote] = useState('')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return requests.filter((r) => (filter === 'all' ? true : r.status === filter))
  }, [requests, filter])

  const selected = filtered.find((r) => r.id === selectedId) || filtered[0] || null

  async function runAction(status: FilterType) {
    if (!selected) return

    try {
      setLoadingAction(status)
      const res = await fetch('/api/admin/sourcing-requests/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: selected.id,
          status,
          admin_note: adminNote.trim(),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Action failed')

      setRequests((prev) =>
        prev.map((r) =>
          r.id === selected.id
            ? {
                ...r,
                status,
                admin_note: adminNote.trim() || null,
                updated_at: new Date().toISOString(),
              }
            : r
        )
      )
      setAdminNote('')
      toast.success(`Request marked as ${status}`)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to process request')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="space-y-8 pb-24">
      <div>
        <h2 className="text-3xl font-black text-text-primary tracking-tight">Sourcing Desk</h2>
        <p className="text-text-secondary mt-2">Manage special requests for items from Lahore, Karachi, and China.</p>
      </div>

      <div className="flex flex-wrap gap-2 p-1 bg-surface rounded-2xl w-fit">
        {(['pending', 'processing', 'completed', 'unavailable', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-5 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider',
              filter === f ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-secondary hover:bg-white'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[400px,1fr] gap-6 items-start">
        {/* Sidebar List */}
        <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border bg-slate-50/50">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Requests Queue</p>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-12 text-sm text-text-secondary text-center">
                <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-slate-300">schedule</span>
                </div>
                No requests found.
              </div>
            )}
            {filtered.map((req) => (
              <button
                key={req.id}
                onClick={() => setSelectedId(req.id)}
                className={cn(
                  'w-full text-left px-6 py-5 border-l-4 border-transparent hover:bg-surface transition-all border-b border-border/50 last:border-0',
                  selected?.id === req.id && 'border-primary bg-primary/5'
                )}
              >
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm font-bold text-text-primary line-clamp-1">{req.product_name}</p>
                  <StatusBadge status={req.status} />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[12px] text-slate-400">person</span>
                  </div>
                  <p className="text-xs text-text-secondary font-medium">
                    {req.user?.full_name || req.user?.username || 'Unknown'}
                  </p>
                </div>
                <p className="text-[10px] text-text-muted mt-3 font-bold uppercase tracking-wider">
                  {formatRelativeTime(req.created_at)}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="bg-white rounded-3xl border border-border p-8 shadow-sm">
          {!selected ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-6xl text-slate-100 mb-4">package_2</span>
              <p className="text-text-secondary font-medium">Select a request from the queue to view details.</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={selected.status} className="px-3 py-1" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                      Request ID: {selected.id.slice(0, 8)}
                    </span>
                  </div>
                  <h3 className="text-3xl font-black text-text-primary tracking-tight">{selected.product_name}</h3>
                  <div className="flex items-center gap-2 text-text-muted mt-2">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span className="text-xs font-medium">Submitted {formatRelativeTime(selected.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">User Profile</p>
                  <div className="bg-surface rounded-2xl p-5 border border-border space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                        {(selected.user?.full_name || 'U')[0]}
                      </div>
                      <div>
                        <p className="font-bold text-text-primary">{selected.user?.full_name || 'User'}</p>
                        <p className="text-xs text-text-muted">@{selected.user?.username || 'unknown'}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="material-symbols-outlined text-slate-400 text-lg">mail</span>
                        <span className="text-text-primary">{selected.user?.email || 'No email'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="material-symbols-outlined text-slate-400 text-lg">call</span>
                        <span className="text-text-primary font-mono">{selected.user?.phone_number || selected.user?.phone || 'No phone number'}</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Product Specifications</p>
                  <div className="bg-surface rounded-2xl p-5 border border-border h-full">
                    <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                      {selected.product_details || 'No additional details provided.'}
                    </p>
                  </div>
                </section>
              </div>

              {selected.admin_note && (
                <section className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Admin Resolution Note</p>
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
                    <p className="text-sm text-text-primary whitespace-pre-wrap italic">&quot;{selected.admin_note}&quot;</p>
                  </div>
                </section>
              )}

              <section className="pt-6 border-t border-border space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-3">
                    Administrative Actions & Notes
                  </label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-border bg-surface px-5 py-4 text-sm focus:ring-2 focus:ring-primary transition-all"
                    placeholder="Enter notes about availability, pricing, or shipping updates..."
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <ActionButton 
                    onClick={() => runAction('processing')}
                    loading={loadingAction === 'processing'}
                    disabled={loadingAction !== null}
                    variant="primary"
                    icon={<span className="material-symbols-outlined text-lg">schedule</span>}
                    label="Mark Processing"
                  />
                  <ActionButton 
                    onClick={() => runAction('completed')}
                    loading={loadingAction === 'completed'}
                    disabled={loadingAction !== null}
                    variant="success"
                    icon={<span className="material-symbols-outlined text-lg">check_circle</span>}
                    label="Mark Completed"
                  />
                  <ActionButton 
                    onClick={() => runAction('unavailable')}
                    loading={loadingAction === 'unavailable'}
                    disabled={loadingAction !== null}
                    variant="destructive"
                    icon={<span className="material-symbols-outlined text-lg">cancel</span>}
                    label="Mark Unavailable"
                  />
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status, className }: { status: string; className?: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    unavailable: 'bg-slate-100 text-slate-700 border-slate-200',
  }

  return (
    <span className={cn(
      'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border',
      styles[status] || styles.pending,
      className
    )}>
      {status}
    </span>
  )
}

function ActionButton({ onClick, loading, disabled, variant, icon, label }: any) {
  const variants: Record<string, string> = {
    primary: 'bg-primary text-white hover:bg-primary-hover',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    destructive: 'bg-destructive text-white hover:bg-destructive/90',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant]
      )}
    >
      {loading ? '...' : icon}
      <span>{loading ? 'Processing...' : label}</span>
    </button>
  )
}
