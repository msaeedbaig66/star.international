'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export function OrderStatusBadge({ status }: { status: string }) {
 const styles: Record<string, string> = {
 pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
 approved: 'bg-primary/10 text-primary border-primary/20',
 processing: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
 packed: 'bg-emerald-600/10 text-emerald-700 border-emerald-600/20',
 shipped: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
 delivered: 'bg-emerald-700/10 text-emerald-800 border-emerald-700/20',
 cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
 }

 return (
 <span className={cn(
 "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
 styles[status] || 'bg-slate-100 text-slate-500 border-slate-200'
 )}>
 {status}
 </span>
 )
}

export function OrderActions({ orderId, currentStatus }: { orderId: string, currentStatus: string }) {
 const router = useRouter()
 const [loading, setLoading] = useState(false)
 const [showShipDialog, setShowShipDialog] = useState(false)
 const [trackingNo, setTrackingNo] = useState('')

 const updateStatus = async (newStatus: string, trackNo?: string) => {
 setLoading(true)
 try {
 const res = await fetch(`/api/admin/orders/${orderId}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ status: newStatus, trackingNumber: trackNo })
 })
 if (res.ok) router.refresh()
 } catch (e) {
 console.error(e)
 } finally {
 setLoading(false)
 setShowShipDialog(false)
 }
 }

 if (currentStatus === 'delivered' || currentStatus === 'cancelled') return null

 return (
 <div className="flex items-center gap-2">
 {currentStatus === 'pending' && (
 <button onClick={() => updateStatus('approved')} disabled={loading} className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all">
 <span className="material-symbols-outlined text-sm">check_circle</span>
 </button>
 )}
 
 {currentStatus === 'approved' && (
 <button onClick={() => updateStatus('packed')} disabled={loading} className="p-2 bg-emerald-600/10 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition-all">
 <span className="material-symbols-outlined text-sm">inventory_2</span>
 </button>
 )}

 {currentStatus === 'packed' && (
 <button onClick={() => setShowShipDialog(true)} disabled={loading} className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">
 <span className="material-symbols-outlined text-sm">local_shipping</span>
 </button>
 )}

 {currentStatus === 'shipped' && (
 <button onClick={() => updateStatus('delivered')} disabled={loading} className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">
 <span className="material-symbols-outlined text-sm">task_alt</span>
 </button>
 )}

 <button onClick={() => updateStatus('cancelled')} disabled={loading} className="p-2 bg-destructive/5 text-destructive rounded-lg hover:bg-destructive hover:text-white transition-all">
 <span className="material-symbols-outlined text-sm">cancel</span>
 </button>

 {showShipDialog && (
 <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
 <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-border">
 <h3 className="text-xl font-black text-text-primary uppercase tracking-tight mb-2">Mark as Shipped</h3>
 <p className="text-sm text-text-secondary mb-6 italic">Enter the courier tracking number for the student.</p>
 
 <input 
 autoFocus
 value={trackingNo}
 onChange={(e) => setTrackingNo(e.target.value)}
 placeholder="e.g. TCS-73829283"
 className="w-full p-4 bg-surface rounded-2xl border border-border font-mono text-sm focus:ring-2 focus:ring-primary outline-none mb-6"
 />

 <div className="flex gap-3">
 <button onClick={() => setShowShipDialog(false)} className="flex-1 py-3 bg-surface text-text-secondary font-bold rounded-xl hover:bg-slate-100 transition-all uppercase text-[10px] tracking-widest">Cancel</button>
 <button 
 onClick={() => updateStatus('shipped', trackingNo)} 
 disabled={!trackingNo || loading}
 className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all uppercase text-[10px] tracking-widest disabled:opacity-50"
 >
 Confirm Ship
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}
