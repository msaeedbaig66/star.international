'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { formatRelativeTime, formatPrice, cn } from '@/lib/utils';
import { SafeTime, HydratedOnly } from '@/components/shared/safe-time';
import Image from 'next/image';
import Link from 'next/link';
import { StatCard } from './stat-card';
import { ApproveButton } from './approve-button';
import { RejectModal } from './reject-modal';
import { BulkActionBar } from './bulk-action-bar';
import { toast } from 'sonner';
import { isSoftDeleteRecoverable, parseSoftDeleteNote } from '@/lib/content-soft-delete';

interface Listing {
 id: string;
 title: string;
 description: string;
 price: number;
 category: string;
 images: string[];
 status?: string;
 rejection_note?: string | null;
 moderation: 'pending' | 'approved' | 'rejected';
 created_at: string;
 campus?: string;
 seller: {
 id: string;
 username: string;
 full_name: string;
 avatar_url: string;
 university: string;
 created_at: string;
 rating_avg?: number;
 };
}

interface ListingsManagerProps {
 initialListings: any[];
 stats: {
 pending: number;
 approved: number;
 rejected: number;
 total: number;
 };
}

export function ListingsManager({ initialListings, stats }: ListingsManagerProps) {
 const [listings, setListings] = useState<Listing[]>(initialListings);
 const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'deleted'>('all');
 const [search, setSearch] = useState('');
 const [selectedIds, setSelectedIds] = useState<string[]>([]);
 
 const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
 const [itemToReject, setItemToReject] = useState<string | null>(null);
 const [loading, setLoading] = useState(false);
 const [currentPage, setCurrentPage] = useState(1);
 const ITEMS_PER_PAGE = 10;
 const tableRef = useRef<HTMLDivElement>(null);

 // Reset to first page when filter or search changes
 useEffect(() => {
 setCurrentPage(1);
 }, [filter, search]);

 // Scroll to top of table on page change
 const handlePageChange = (page: number) => {
 setCurrentPage(page);
 tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
 };

 // Computed
 const filteredListings = useMemo(() => {
 return listings.filter(item => {
 const isDeleted = item.status === 'removed';
 const matchesFilter =
 filter === 'all'
 ? true
 : filter === 'pending'
 ? item.moderation === 'pending' && !isDeleted
 : filter === 'approved'
 ? item.moderation === 'approved' && !isDeleted
 : filter === 'rejected'
 ? item.moderation === 'rejected' && !isDeleted
 : isDeleted;
 const matchesSearch = 
 item.title.toLowerCase().includes(search.toLowerCase()) || 
 item.seller?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
 item.seller?.university?.toLowerCase().includes(search.toLowerCase());
 return matchesFilter && matchesSearch;
 });
 }, [listings, filter, search]);

 const totalPages = Math.ceil(filteredListings.length / ITEMS_PER_PAGE);
 const paginatedListings = useMemo(() => {
 const start = (currentPage - 1) * ITEMS_PER_PAGE;
 return filteredListings.slice(start, start + ITEMS_PER_PAGE);
 }, [filteredListings, currentPage]);

 // Actions
 const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.checked) {
 setSelectedIds(filteredListings.map(l => l.id));
 } else {
 setSelectedIds([]);
 }
 };

 const handleSelectRow = (id: string) => {
 setSelectedIds(prev => 
 prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
 );
 };

 const openRejectModal = (id: string) => {
 setItemToReject(id);
 setIsRejectModalOpen(true);
 };

 const updateModerationLocally = (id: string, status: 'approved' | 'rejected') => {
 setListings(prev => prev.map(item => 
 item.id === id ? { ...item, moderation: status } : item
 ));
 };

 const updateListingLocally = (id: string, payload: Partial<Listing>) => {
 setListings((prev) => prev.map((item) => (item.id === id ? { ...item, ...payload } : item)));
 };

 const handleAdminDelete = async (id: string) => {
 try {
 const response = await fetch(`/api/listings/${id}`, { method: 'DELETE' });
 const result = await response.json().catch(() => ({}));
 if (!response.ok) throw new Error(result?.error || 'Failed to delete listing');
 const next = result?.data || {};
 const current = listings.find((item) => item.id === id);
 updateListingLocally(id, {
 status: next.status || current?.status || 'removed',
 moderation: next.moderation || current?.moderation || 'rejected',
 rejection_note: next.rejection_note ?? current?.rejection_note ?? null,
 });
 toast.success(result?.already_deleted ? 'Already deleted. Undo is still available.' : 'Listing deleted. Undo available for 2 days.');
 } catch (error: any) {
 toast.error(error?.message || 'Unable to delete listing');
 }
 };

 const handleAdminRecover = async (id: string) => {
 try {
 const response = await fetch(`/api/listings/${id}`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ action: 'recover' }),
 });
 const result = await response.json().catch(() => ({}));
 if (!response.ok) throw new Error(result?.error || 'Failed to recover listing');
 const next = result?.data || {};
 updateListingLocally(id, {
 status: next.status || 'available',
 moderation: next.moderation || 'approved',
 rejection_note: next.rejection_note || null,
 });
 toast.success('Listing recovered successfully');
 } catch (error: any) {
 toast.error(error?.message || 'Unable to recover listing');
 }
 };

 const handleBulkApprove = async () => {
 try {
 setLoading(true);
 const results = await Promise.all(
 selectedIds.map(id => 
 fetch('/api/admin/approve', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ id, type: 'listing' }),
 })
 )
 );

 toast.success(`Successfully approved ${selectedIds.length} listings`);
 selectedIds.forEach(id => updateModerationLocally(id, 'approved'));
 setSelectedIds([]);
 } catch (error) {
 toast.error('Failed to preform bulk approval');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="space-y-8 pb-32">
 {/* Heading */}
 <div>
 <h2 className="text-3xl font-extrabold text-text-primary tracking-tight">Listings Approval Queue</h2>
 <p className="text-text-secondary mt-1 text-lg">Review and approve student item listings</p>
 </div>

 {/* Stats Bar */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-amber-500">
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Review</p>
 <h3 className="text-3xl font-black text-slate-900 mt-2">{stats.pending}</h3>
 </div>
 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-emerald-600">
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Approved Today</p>
 <h3 className="text-3xl font-black text-slate-900 mt-2">{stats.approved}</h3>
 </div>
 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-rose-500">
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rejected Today</p>
 <h3 className="text-3xl font-black text-slate-900 mt-2">{stats.rejected}</h3>
 </div>
 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-emerald-500">
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Today</p>
 <h3 className="text-3xl font-black text-slate-900 mt-2">{stats.total}</h3>
 </div>
 </div>

 {/* Filter and Action Row */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="flex items-center gap-2 p-1 bg-surface rounded-full w-fit">
 {['all', 'pending', 'approved', 'rejected', 'deleted'].map(f => (
 <button
 key={f}
 onClick={() => setFilter(f as any)}
 className={cn(
 "px-6 py-2 rounded-full text-sm font-bold transition-all",
 filter === f ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:bg-white"
 )}
 >
 {f.charAt(0).toUpperCase() + f.slice(1)}
 </button>
 ))}
 </div>
 
 <div className="flex-1 max-w-md relative">
 <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">search</span>
 <input 
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full pl-12 pr-4 py-3 bg-white border-none rounded-full text-sm shadow-sm focus:ring-2 focus:ring-primary/20" 
 placeholder="Search listings by title or seller..." 
 type="text"
 />
 </div>
 
 <div className="flex items-center gap-3">
 <button className="px-6 py-3 border border-border text-text-secondary rounded-full text-sm font-bold hover:bg-surface transition-colors flex items-center gap-2">
 <span className="material-symbols-outlined text-lg">ios_share</span>
 Export
 </button>
 </div>
 </div>

 {/* Table */}
 <div ref={tableRef} className="bg-white rounded-xl shadow-sm border border-border overflow-hidden scroll-mt-24">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-surface border-b border-border">
 <th className="p-4 pl-6 w-12">
 <input 
 type="checkbox" 
 onChange={handleSelectAll}
 checked={selectedIds.length > 0 && selectedIds.length === filteredListings.length}
 className="rounded border-border text-primary focus:ring-primary"
 />
 </th>
 <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-secondary">Item</th>
 <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-secondary">Seller</th>
 <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-secondary">Category</th>
 <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-secondary">Price</th>
 <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-secondary">Submitted</th>
 <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-secondary">Status</th>
 <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-secondary text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {paginatedListings.map((item) => {
 const deleteMeta = parseSoftDeleteNote(item.rejection_note);
 const canRecover = item.status === 'removed' && !!deleteMeta;
 const recoverable = canRecover && isSoftDeleteRecoverable(deleteMeta);
 return (
 <tr
 key={item.id}
 className={cn(
 "transition-colors group",
 selectedIds.includes(item.id) && "bg-primary/[0.05]"
 )}
 >
 <td className="p-4 pl-6" onClick={(e) => e.stopPropagation()}>
 <input 
 type="checkbox" 
 className="rounded border-border text-primary focus:ring-primary"
 checked={selectedIds.includes(item.id)}
 onChange={() => handleSelectRow(item.id)}
 />
 </td>
 <td className="p-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-lg bg-surface overflow-hidden flex-shrink-0 border border-border">
 <Image 
 className="w-full h-full object-cover" 
 src={item.images?.[0] || 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?w=100&h=100&fit=crop'} 
 alt={item.title} 
 width={48}
 height={48}
 />
 </div>
 <Link href={`/marketplace/${item.id}`} className="max-w-[180px] group/title">
 <div className="font-bold text-text-primary text-sm truncate group-hover/title:text-primary transition-colors">{item.title}</div>
 <div className="text-[10px] text-text-muted font-black uppercase mt-0.5 group-hover/title:text-primary/70">#{item.id.slice(0, 8)}</div>
 </Link>
 </div>
 </td>
 <td className="p-4">
 <Link href={`/profile/${item.seller?.username || item.seller?.id}`} className="flex items-center gap-2 group/seller">
 <Image src={item.seller?.avatar_url || '/images/default-avatar.svg'} className="w-6 h-6 rounded-full group-hover/seller:ring-2 ring-primary transition-all" alt="" width={24} height={24} unoptimized />
 <div className="text-sm">
 <p className="font-bold text-text-primary leading-none group-hover/seller:text-primary transition-colors">{item.seller?.full_name || 'Unknown'}</p>
 <p className="text-[10px] text-text-secondary mt-0.5">{item.seller?.university || 'University'}</p>
 </div>
 </Link>
 </td>
 <td className="p-4">
 <span className="px-3 py-1 bg-surface text-text-secondary text-[10px] font-bold rounded-full uppercase">
 {item.category}
 </span>
 </td>
 <td className="p-4 font-bold text-sm text-primary">
 {formatPrice(item.price)}
 </td>
 <td className="p-4 text-[11px] text-text-secondary font-bold uppercase whitespace-nowrap">
 <SafeTime date={item.created_at} />
 </td>
 <td className="p-4">
 <div className={cn(
 "flex items-center gap-1.5 font-bold text-[10px] uppercase",
 item.status === 'removed' && "text-text-muted",
 item.moderation === 'pending' && "text-amber-600",
 item.moderation === 'approved' && "text-primary",
 item.moderation === 'rejected' && "text-destructive",
 )}>
 <span className={cn(
 "w-2 h-2 rounded-full",
 item.status === 'removed' && "bg-text-muted",
 item.moderation === 'pending' && "bg-amber-600 animate-pulse",
 item.moderation === 'approved' && "bg-primary",
 item.moderation === 'rejected' && "bg-destructive",
 )} />
 {item.status === 'removed' ? 'deleted' : item.moderation}
 </div>
 </td>
 <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
 <HydratedOnly>
 <div className="flex justify-end gap-2">
 {canRecover ? (
 <button
 onClick={() => handleAdminRecover(item.id)}
 disabled={!recoverable}
 className="text-primary font-bold text-xs hover:underline disabled:opacity-50 disabled:no-underline"
 >
 Recover
 </button>
 ) : (
 <>
 <ApproveButton 
 id={item.id} 
 type="listing" 
 variant="text" 
 onSuccess={() => updateModerationLocally(item.id, 'approved')}
 />
 <button 
 onClick={() => openRejectModal(item.id)}
 className="text-destructive font-bold text-xs hover:underline"
 >
 Reject
 </button>
 <button onClick={() => handleAdminDelete(item.id)} className="text-text-secondary font-bold text-xs hover:underline">
 Delete
 </button>
 </>
 )}
 </div>
 </HydratedOnly>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>

 {/* Pagination Controls */}
 {totalPages > 1 && (
 <div className="px-6 py-4 bg-surface border-t border-border flex items-center justify-between">
 <p className="text-xs text-text-secondary font-medium">
 Showing <span className="font-bold text-text-primary">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-bold text-text-primary">{Math.min(currentPage * ITEMS_PER_PAGE, filteredListings.length)}</span> of <span className="font-bold text-text-primary">{filteredListings.length}</span> items
 </p>
 <div className="flex items-center gap-1">
 <button
 onClick={() => handlePageChange(currentPage - 1)}
 disabled={currentPage === 1}
 className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-text-secondary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
 >
 <span className="material-symbols-outlined text-lg">chevron_left</span>
 </button>

 {Array.from({ length: totalPages }, (_, i) => i + 1)
 .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
 .map((p, i, arr) => {
 const showEllipsis = i > 0 && p - arr[i-1] > 1;
 return (
 <div key={p} className="flex items-center gap-1">
 {showEllipsis && <span className="text-text-muted text-xs px-1">...</span>}
 <button
 onClick={() => handlePageChange(p)}
 className={cn(
 "w-8 h-8 rounded-lg text-xs font-bold transition-all",
 currentPage === p 
 ? "bg-primary text-white shadow-sm" 
 : "text-text-secondary hover:bg-white"
 )}
 >
 {p}
 </button>
 </div>
 );
 })}

 <button
 onClick={() => handlePageChange(currentPage + 1)}
 disabled={currentPage === totalPages}
 className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-text-secondary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
 >
 <span className="material-symbols-outlined text-lg">chevron_right</span>
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Bulk Action Bar */}
 <BulkActionBar 
 loading={loading}
 selectedCount={selectedIds.length} 
 onApproveAll={handleBulkApprove} 
 onRejectAll={async () => {
 if (selectedIds.length === 0) return
 try {
 setLoading(true)
 await Promise.all(
 selectedIds.map((id) =>
 fetch('/api/admin/reject', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 id,
 type: 'listing',
 reason: 'Other',
 message: 'Bulk moderation action by admin',
 }),
 })
 )
 )
 selectedIds.forEach((id) => updateModerationLocally(id, 'rejected'))
 toast.success(`Rejected ${selectedIds.length} listings`)
 setSelectedIds([])
 } catch {
 toast.error('Failed to perform bulk reject')
 } finally {
 setLoading(false)
 }
 }} 
 onClear={() => setSelectedIds([])}
 />

 {/* Reject Modal */}
 <RejectModal
 isOpen={isRejectModalOpen}
 onClose={() => setIsRejectModalOpen(false)}
 id={itemToReject || ''}
 type="listing"
 onSuccess={() => {
 if (itemToReject) updateModerationLocally(itemToReject, 'rejected');
 setIsRejectModalOpen(false);
 }}
 />
 </div>
 );
}

