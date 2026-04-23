'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { toast } from 'sonner'

interface FeatureRequestsManagerProps {
 initialRequests: any[]
 stats: {
 pending: number
 approved: number
 rejected: number
 total: number
 }
}

type FilterType = 'all' | 'pending' | 'approved' | 'rejected'

export function FeatureRequestsManager({ initialRequests, stats }: FeatureRequestsManagerProps) {
 const [requests, setRequests] = useState<any[]>(initialRequests || [])
 const [filter, setFilter] = useState<FilterType>('pending')
 const [selectedId, setSelectedId] = useState<string | null>((initialRequests?.[0]?.id as string) || null)
 const [adminNote, setAdminNote] = useState('')
 const [approvedDays, setApprovedDays] = useState<number>(0)
 const [loadingAction, setLoadingAction] = useState<'approve' | 'reject' | null>(null)

 const filtered = useMemo(() => {
 return requests.filter((row) => (filter === 'all' ? true : row.status === filter))
 }, [requests, filter])

 const selected = filtered.find((row) => row.id === selectedId) || filtered[0] || null

 useEffect(() => {
 if (!selected) return
 setApprovedDays(Number(selected.requested_days || 7))
 }, [selected])

 async function runAction(action: 'approve' | 'reject') {
 if (!selected) return
 if (action === 'approve' && (!Number.isInteger(approvedDays) || approvedDays < 1 || approvedDays > 60)) {
 toast.error('Approved days must be between 1 and 60.')
 return
 }

 try {
 setLoadingAction(action)
 const response = await fetch('/api/admin/feature-requests/action', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 request_id: selected.id,
 action,
 admin_note: adminNote.trim(),
 approved_days: action === 'approve' ? approvedDays : undefined,
 }),
 })

 const result = await response.json().catch(() => ({}))
 if (!response.ok) throw new Error(result?.error || 'Action failed')

 setRequests((prev) =>
 prev.map((row) => {
 if (row.id !== selected.id) return row

 const featuredUntil = action === 'approve' ? result?.featured_until || row.featured_until : row.featured_until
 return {
 ...row,
 status: action === 'approve' ? 'approved' : 'rejected',
 approved_days: action === 'approve' ? (result?.approved_days || approvedDays) : row.approved_days,
 featured_until: featuredUntil,
 admin_note: adminNote.trim() || null,
 reviewed_at: new Date().toISOString(),
 entity: row.entity
 ? {
 ...row.entity,
 is_featured: action === 'approve',
 featured_until: action === 'approve' ? featuredUntil : row.entity.featured_until,
 }
 : row.entity,
 }
 })
 )

 setAdminNote('')
 toast.success(action === 'approve' ? 'Feature request approved' : 'Feature request rejected')
 } catch (error: any) {
 toast.error(error?.message || 'Failed to process feature request')
 } finally {
 setLoadingAction(null)
 }
 }

 const statCards = [
 { label: 'Pending', value: stats.pending },
 { label: 'Approved', value: stats.approved },
 { label: 'Rejected', value: stats.rejected },
 { label: 'Total', value: stats.total },
 ]

 return (
 <div className="space-y-8 pb-24">
 <div>
 <h2 className="text-3xl font-black text-text-primary tracking-tight">Feature Requests Desk</h2>
 <p className="text-text-secondary mt-2">
 Review item, blog, and community spotlight requests. Set final featured days before approval.
 </p>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {statCards.map((card) => (
 <div key={card.label} className="bg-white border border-border rounded-2xl p-5">
 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">{card.label}</p>
 <p className="text-3xl font-black text-text-primary mt-2">{card.value}</p>
 </div>
 ))}
 </div>

 <div className="flex gap-2 p-1 bg-surface rounded-full w-fit">
 {(['pending', 'approved', 'rejected', 'all'] as const).map((value) => (
 <button
 key={value}
 onClick={() => setFilter(value)}
 className={cn(
 'px-5 py-2 rounded-full text-sm font-bold transition-colors capitalize',
 filter === value ? 'bg-primary text-white' : 'text-text-secondary hover:bg-white'
 )}
 >
 {value}
 </button>
 ))}
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-[430px,1fr] gap-6">
 <div className="bg-white rounded-3xl border border-border overflow-hidden">
 <div className="px-5 py-4 border-b border-border">
 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Incoming Feature Requests</p>
 </div>
 <div className="max-h-[66vh] overflow-y-auto">
 {filtered.length === 0 && (
 <div className="p-8 text-sm text-text-secondary text-center">No feature requests in this filter.</div>
 )}
 {filtered.map((row) => (
 <button
 key={row.id}
 onClick={() => setSelectedId(row.id)}
 className={cn(
 'w-full text-left px-5 py-4 border-l-4 border-transparent hover:bg-surface transition-colors',
 selected?.id === row.id && 'border-primary bg-primary-light/30'
 )}
 >
 <p className="text-xs font-black uppercase tracking-wider text-text-muted">{row.entity_type} spotlight</p>
 <p className="text-sm font-bold text-text-primary mt-1 line-clamp-1">{row.entity_title}</p>
 <p className="text-xs text-text-secondary mt-1">
 by {row.user?.full_name || row.user?.username || 'Unknown user'} • {row.requested_days} days requested
 </p>
 <div className="mt-2 flex justify-between text-[10px] text-text-muted">
 <span className="uppercase font-black">{row.status}</span>
 <span>{formatRelativeTime(row.created_at)}</span>
 </div>
 </button>
 ))}
 </div>
 </div>

 <div className="bg-white rounded-3xl border border-border p-6">
 {!selected ? (
 <p className="text-sm text-text-secondary">Select a feature request to review.</p>
 ) : (
 <div className="space-y-6">
 <div>
 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Request Context</p>
 <h3 className="text-2xl font-black text-text-primary mt-2">{selected.entity_title}</h3>
 <p className="text-sm text-text-secondary mt-2 capitalize">
 Type: <span className="font-bold">{selected.entity_type}</span>
 </p>
 <p className="text-sm text-text-secondary mt-1">
 User: <span className="font-bold">{selected.user?.full_name || selected.user?.username || '-'}</span>
 </p>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <InfoCard label="Requested Days" value={String(selected.requested_days || 0)} />
 <InfoCard label="Approved Days" value={String(selected.approved_days || 0)} />
 <InfoCard label="Status" value={String(selected.status || '-')} />
 <InfoCard
 label="Live Feature"
 value={selected.entity?.is_featured && selected.entity?.featured_until ? 'Active' : 'Inactive'}
 />
 </div>

 <div className="bg-surface rounded-2xl p-4 border border-border">
 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">User Reason</p>
 <p className="text-sm text-text-primary mt-2 whitespace-pre-wrap">{selected.reason || 'No reason provided.'}</p>
 </div>

 {selected.featured_until && (
 <div className="bg-primary-light/30 border border-primary/20 rounded-2xl p-4">
 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Feature Window</p>
 <p className="text-sm text-text-primary mt-2">
 Featured until: <span className="font-bold">{new Date(selected.featured_until).toLocaleString()}</span>
 </p>
 </div>
 )}

 {selected.admin_note && (
 <div className="bg-surface rounded-2xl p-4 border border-border">
 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Previous Admin Note</p>
 <p className="text-sm text-text-primary mt-2 whitespace-pre-wrap">{selected.admin_note}</p>
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-2">
 Approve For Days
 </label>
 <input
 type="number"
 min={1}
 max={60}
 value={approvedDays || ''}
 onChange={(e) => setApprovedDays(Number(e.target.value || 0))}
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
 placeholder="Optional note shown in user notification"
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

function InfoCard({ label, value }: { label: string; value: string }) {
 return (
 <div className="bg-surface rounded-xl p-3 border border-border">
 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">{label}</p>
 <p className="text-sm font-bold text-text-primary mt-1">{value}</p>
 </div>
 )
}
