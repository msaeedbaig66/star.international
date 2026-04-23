'use client'

import { useMemo, useState } from 'react'
import { formatRelativeTime, cn } from '@/lib/utils'
import { SafeTime, SafeDate, HydratedOnly } from '@/components/shared/safe-time'
import { parseAdminActionNote, isUndoWindowOpen } from '@/lib/admin-report-action'
import { toast } from 'sonner'
import type { ReportStats, ReportView } from '@/types/admin-reports'

type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed'

import Link from 'next/link'

interface ReportsManagerProps {
 initialReports: ReportView[]
 stats: ReportStats
 totalCount: number
 currentPage: number
 itemsPerPage: number
}

export function ReportsManager({ 
 initialReports, 
 stats,
 totalCount,
 currentPage,
 itemsPerPage
}: ReportsManagerProps) {
 const [reports, setReports] = useState<ReportView[]>(initialReports || [])
 const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all')
 const [selectedId, setSelectedId] = useState<string | null>((initialReports?.[0]?.id as string) || null)
 const [adminMessage, setAdminMessage] = useState('')
 const [loadingAction, setLoadingAction] = useState<string | null>(null)

 const filteredReports = useMemo(() => {
 return reports.filter((r) => (statusFilter === 'all' ? true : r.status === statusFilter))
 }, [reports, statusFilter])

 const selected = filteredReports.find((r) => r.id === selectedId) || filteredReports[0] || null

 const selectedActionMeta = selected?.target?.rejection_note
 ? parseAdminActionNote(selected.target.rejection_note)
 : null
 const canUndo = isUndoWindowOpen(selectedActionMeta) && selectedActionMeta?.reportId === selected?.id

 async function runAction(action: 'freeze' | 'remove' | 'warn' | 'notify' | 'undo' | 'clear_report') {
 if (!selected) return
 try {
 setLoadingAction(action)
 const res = await fetch('/api/admin/reports/action', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 report_id: selected.id,
 action,
 admin_message: adminMessage.trim(),
 }),
 })
 const data = await res.json().catch(() => ({}))
 if (!res.ok) throw new Error(data?.error || 'Action failed')

 if (action === 'clear_report') {
 setReports((prev) => prev.filter((r) => r.id !== selected.id))
 } else if (action === 'undo') {
 setReports((prev) =>
 prev.map((r) => {
 if (r.id !== selected.id) return r
 const target: ReportView['target'] = r.target
 ? { ...r.target, rejection_note: null }
 : r.target
 return { ...r, status: 'open', target }
 })
 )
 } else {
 setReports((prev) => prev.map((r) => (r.id === selected.id ? { ...r, status: 'reviewing' } : r)))
 }

 toast.success('Action completed')
 setAdminMessage('')
 } catch (error: unknown) {
 const errorMessage = error instanceof Error ? error.message : 'Failed to perform action'
 toast.error(errorMessage)
 } finally {
 setLoadingAction(null)
 }
 }

 return (
 <div className="space-y-8 pb-24">
 <div>
 <h2 className="text-3xl font-black text-text-primary tracking-tight">Reports Resolution Desk</h2>
 <p className="text-text-secondary mt-2">Review reports, apply moderation actions, notify users, and undo within 48 hours.</p>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <Stat label="Open" value={stats.open} />
 <Stat label="Reviewing" value={stats.reviewing} />
 <Stat label="Resolved" value={stats.resolved} />
 <Stat label="Total" value={stats.total} />
 </div>

 <div className="flex gap-2 p-1 bg-surface rounded-full w-fit">
 {(['all', 'open', 'reviewing', 'resolved', 'dismissed'] as const).map((f) => (
 <button
 key={f}
 onClick={() => setStatusFilter(f)}
 className={cn(
 'px-5 py-2 rounded-full text-sm font-bold transition-all',
 statusFilter === f ? 'bg-primary text-white' : 'text-text-secondary hover:bg-white'
 )}
 >
 {f}
 </button>
 ))}
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-[430px,1fr] gap-6">
 <div className="bg-white rounded-3xl border border-border overflow-hidden">
 <div className="px-5 py-4 border-b border-border">
 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Incoming Reports</p>
 </div>
 <div className="max-h-[55vh] overflow-y-auto">
 {filteredReports.length === 0 && (
 <div className="p-8 text-sm text-text-secondary text-center">No reports in this filter.</div>
 )}
 {filteredReports.map((r) => (
 <button
 key={r.id}
 onClick={() => setSelectedId(r.id)}
 className={cn(
 'w-full text-left px-5 py-4 border-l-4 border-transparent hover:bg-surface transition-colors',
 selected?.id === r.id && 'border-primary bg-primary-light/30'
 )}
 >
 <p className="text-xs font-black uppercase tracking-wider text-text-muted">{r.target_type}</p>
 <p className="text-sm font-bold text-text-primary mt-1 line-clamp-1">{r.target_title}</p>
 <p className="text-xs text-text-secondary mt-1 line-clamp-1">
 Reporter: {r.reporter?.full_name || r.reporter?.username || 'Unknown'}
 </p>
 <div className="mt-2 flex items-center justify-between">
 <span className="text-[10px] text-text-muted uppercase font-black">{r.status}</span>
 <SafeTime date={r.created_at} className="text-[10px] text-text-muted" />
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
 <p className="text-sm text-text-secondary">Select a report to review actions.</p>
 ) : (
 <div className="space-y-6">
 <div>
 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Report Context</p>
 <h3 className="text-2xl font-black text-text-primary mt-2">{selected.target_title}</h3>
 <p className="text-sm text-text-secondary mt-2">
 Category: <span className="font-bold">{selected.category}</span> • Status: <span className="font-bold capitalize">{selected.status}</span>
 </p>
 <div className="mt-4">
 <Link 
 href={selected.target_type === 'listing' ? `/marketplace/${selected.target_id}` : 
 selected.target_type === 'blog' ? `/blogs/${selected.target_id}` : 
 selected.target_type === 'community' ? `/communities/${selected.target_id}` : '#'}
 target="_blank"
 className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:underline"
 >
 View Reported Content
 <span className="material-symbols-outlined text-sm">open_in_new</span>
 </Link>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <Info label="Reporter" value={selected.reporter?.full_name || selected.reporter?.username || '-'} />
 <Info label="Content Owner" value={selected.owner?.full_name || selected.owner?.username || '-'} />
 <Info label="Reported" value={<SafeTime date={selected.created_at} />} />
 <Info label="Target ID" value={selected.target_id} />
 </div>

 <div className="bg-surface rounded-2xl p-4 border border-border">
 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Report Description</p>
 <p className="text-sm text-text-primary mt-2 whitespace-pre-wrap">
 {selected.description || 'No description provided.'}
 </p>
 </div>

 {selectedActionMeta && (
 <div className="bg-primary-light/30 border border-primary/20 rounded-2xl p-4">
 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Last Admin Action</p>
 <p className="text-sm text-text-primary mt-1">
 {selectedActionMeta.action.toUpperCase()} • Undo until <SafeDate date={selectedActionMeta.undoUntil} />
 </p>
 </div>
 )}

 <div>
 <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-2">
 Admin Message (Sent in Notification)
 </label>
 <textarea
 value={adminMessage}
 onChange={(e) => setAdminMessage(e.target.value)}
 rows={4}
 className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm focus:ring-2 focus:ring-primary"
 placeholder="Explain action and what user should do to resolve issue..."
 />
 </div>

 <HydratedOnly>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
 <ActionBtn label="Warn" onClick={() => runAction('warn')} loading={loadingAction === 'warn'} />
 <ActionBtn label="Freeze" onClick={() => runAction('freeze')} loading={loadingAction === 'freeze'} />
 <ActionBtn label="Remove" onClick={() => runAction('remove')} loading={loadingAction === 'remove'} />
 <ActionBtn label="Notify User" onClick={() => runAction('notify')} loading={loadingAction === 'notify'} />
 <ActionBtn
 label="Undo (48h)"
 onClick={() => runAction('undo')}
 disabled={!canUndo}
 loading={loadingAction === 'undo'}
 />
 <ActionBtn
 label="Clear Report"
 onClick={() => runAction('clear_report')}
 loading={loadingAction === 'clear_report'}
 />
 </div>
 </HydratedOnly>
 </div>
 )}
 </div>
 </div>
 </div>
 )
}

function Stat({ label, value }: { label: string; value: number }) {
 return (
 <div className="bg-white rounded-2xl border border-border p-5">
 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">{label}</p>
 <p className="text-3xl font-black text-text-primary mt-2">{value}</p>
 </div>
 )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
 return (
 <div className="bg-surface rounded-xl p-3 border border-border">
 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">{label}</p>
 <div className="text-sm font-bold text-text-primary mt-1 break-all">{value}</div>
 </div>
 )
}

function ActionBtn({
 label,
 onClick,
 loading,
 disabled,
}: {
 label: string
 onClick: () => void
 loading?: boolean
 disabled?: boolean
}) {
 return (
 <button
 onClick={onClick}
 disabled={disabled || loading}
 className={cn(
 'py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-colors',
 disabled ? 'bg-surface text-text-muted cursor-not-allowed' : 'bg-primary text-white hover:bg-primary-hover'
 )}
 >
 {loading ? 'Working...' : label}
 </button>
 )
}
