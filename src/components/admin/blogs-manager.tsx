'use client';

import { useState, useMemo } from 'react';
import { formatRelativeTime, cn } from '@/lib/utils';
import { SafeTime, SafeDate, HydratedOnly } from '@/components/shared/safe-time';
import Image from 'next/image';
import { ApproveButton } from './approve-button';
import { RejectModal } from './reject-modal';
import { DetailPanel } from './detail-panel';
import { BulkActionBar } from './bulk-action-bar';
import { toast } from 'sonner';
import { isSoftDeleteRecoverable, parseSoftDeleteNote } from '@/lib/content-soft-delete';
import { sanitizeBlogHtml } from '@/lib/security/blog-html';

interface Blog {
 id: string;
 title: string;
 content: string;
 excerpt: string;
 cover_image: string;
 tags: string[];
 rejection_note?: string | null;
 moderation: 'pending' | 'approved' | 'rejected';
 created_at: string;
 author: {
 id: string;
 username: string;
 full_name: string;
 avatar_url?: string | null;
 university?: string | null;
 };
}

interface BlogsManagerProps {
 initialBlogs: any[];
 stats: {
 pending: number;
 approved: number;
 rejected: number;
 total: number;
 };
}

export function BlogsManager({ initialBlogs, stats }: BlogsManagerProps) {
 const [blogs, setBlogs] = useState<Blog[]>(initialBlogs);
 const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'deleted'>('all');
 const [search, setSearch] = useState('');
 const [selectedIds, setSelectedIds] = useState<string[]>([]);
 
 const [selectedItem, setSelectedItem] = useState<Blog | null>(null);
 const [isPanelOpen, setIsPanelOpen] = useState(false);
 const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
 const [itemToReject, setItemToReject] = useState<string | null>(null);

 const filteredBlogs = useMemo(() => {
 return blogs.filter(item => {
 const query = search.toLowerCase();
 const title = (item.title || '').toLowerCase();
 const authorName = (item.author?.full_name || '').toLowerCase();
 const university = (item.author?.university || '').toLowerCase();
 const isDeleted = !!parseSoftDeleteNote(item.rejection_note);
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
 title.includes(query) ||
 authorName.includes(query) ||
 university.includes(query);
 return matchesFilter && matchesSearch;
 });
 }, [blogs, filter, search]);

 const selectedContentHtml = useMemo(
 () => sanitizeBlogHtml(selectedItem?.content || ''),
 [selectedItem?.content]
 );

 const updateModerationLocally = (id: string, status: 'approved' | 'rejected') => {
 setBlogs(prev => prev.map(item => 
 item.id === id ? { ...item, moderation: status } : item
 ));
 if (id === selectedItem?.id) {
 setSelectedItem(prev => prev ? { ...prev, moderation: status } : null);
 }
 };

 const updateBlogLocally = (id: string, payload: Partial<Blog>) => {
 setBlogs((prev) => prev.map((item) => (item.id === id ? { ...item, ...payload } : item)));
 if (id === selectedItem?.id) {
 setSelectedItem((prev) => (prev ? { ...prev, ...payload } : null));
 }
 };

 const handleAdminDelete = async (id: string) => {
 try {
 const response = await fetch(`/api/blogs/${id}`, { method: 'DELETE' });
 const result = await response.json().catch(() => ({}));
 if (!response.ok) throw new Error(result?.error || 'Failed to delete blog');
 const next = result?.data || {};
 const current = blogs.find((item) => item.id === id);
 updateBlogLocally(id, {
 moderation: next.moderation || current?.moderation || 'rejected',
 rejection_note: next.rejection_note ?? current?.rejection_note ?? null,
 });
 toast.success(result?.already_deleted ? 'Already deleted. Undo is still available.' : 'Blog deleted. Undo available for 2 days.');
 } catch (error: any) {
 toast.error(error?.message || 'Unable to delete blog');
 }
 };

 const handleAdminRecover = async (id: string) => {
 try {
 const response = await fetch(`/api/blogs/${id}`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ action: 'recover' }),
 });
 const result = await response.json().catch(() => ({}));
 if (!response.ok) throw new Error(result?.error || 'Failed to recover blog');
 const next = result?.data || {};
 updateBlogLocally(id, {
 moderation: next.moderation || 'approved',
 rejection_note: next.rejection_note || null,
 });
 toast.success('Blog recovered successfully');
 } catch (error: any) {
 toast.error(error?.message || 'Unable to recover blog');
 }
 };

 const selectedDeleteMeta = parseSoftDeleteNote(selectedItem?.rejection_note);

 return (
 <div className="space-y-8 pb-32">
 {/* Heading */}
 <div>
 <h2 className="text-3xl font-extrabold text-text-primary tracking-tight">Blog Content Queue</h2>
 <p className="text-text-secondary mt-1 text-lg">Review and validate platform articles and community updates</p>
 </div>

 {/* Stats Bar (Same as Listings) */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="bg-white p-6 rounded-xl shadow-sm border border-border border-l-4 border-l-amber-500">
 <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Pending Review</p>
 <h3 className="text-3xl font-black text-text-primary mt-2">{stats.pending}</h3>
 </div>
 <div className="bg-white p-6 rounded-xl shadow-sm border border-border border-l-4 border-l-primary">
 <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Approved Today</p>
 <h3 className="text-3xl font-black text-text-primary mt-2">{stats.approved}</h3>
 </div>
 <div className="bg-white p-6 rounded-xl shadow-sm border border-border border-l-4 border-l-destructive">
 <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Rejected Today</p>
 <h3 className="text-3xl font-black text-text-primary mt-2">{stats.rejected}</h3>
 </div>
 <div className="bg-white p-6 rounded-xl shadow-sm border border-border border-l-4 border-l-blue-500">
 <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Total Created</p>
 <h3 className="text-3xl font-black text-text-primary mt-2">{stats.total}</h3>
 </div>
 </div>

 {/* Filter Row */}
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
 placeholder="Search blogs by title or author..." 
 type="text"
 />
 </div>
 </div>

 {/* Table */}
 <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-surface border-b border-border">
 <th className="p-4 pl-6 w-12">
 <input type="checkbox" className="rounded border-border text-primary" />
 </th>
 <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-secondary">Blog Post</th>
 <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-secondary">Author</th>
 <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-secondary">Tags</th>
 <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-secondary">Submitted</th>
 <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-secondary">Status</th>
 <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-secondary text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {filteredBlogs.map((blog) => {
 const deleteMeta = parseSoftDeleteNote(blog.rejection_note);
 const isDeleted = !!deleteMeta;
 const canRecover = isDeleted;
 const recoverable = canRecover && isSoftDeleteRecoverable(deleteMeta);
 return (
 <tr 
 key={blog.id} 
 className="hover:bg-primary/[0.02] transition-colors cursor-pointer group"
 onClick={() => { setSelectedItem(blog); setIsPanelOpen(true); }}
 >
 <td className="p-4 pl-6" onClick={(e) => e.stopPropagation()}>
 <input type="checkbox" className="rounded border-border text-primary" />
 </td>
 <td className="p-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-lg bg-surface overflow-hidden flex-shrink-0 border border-border">
 <Image 
 className="w-full h-full object-cover" 
 src={blog.cover_image || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=100&h=100&fit=crop'} 
 alt={blog.title} 
 width={48}
 height={48}
 />
 </div>
 <div className="max-w-[220px]">
 <div className="font-bold text-text-primary text-sm truncate">{blog.title}</div>
 <div className="text-[10px] text-text-muted truncate mt-0.5">{blog.excerpt}</div>
 </div>
 </div>
 </td>
 <td className="p-4 text-sm font-bold text-text-primary">
 <div className="flex items-center gap-2">
 <Image src={blog.author?.avatar_url || '/images/default-avatar.svg'} className="w-6 h-6 rounded-full" alt="" width={24} height={24} unoptimized />
 <span>{blog.author?.full_name || 'Unknown Author'}</span>
 </div>
 </td>
 <td className="p-4">
 <div className="flex gap-1 flex-wrap">
 {blog.tags?.slice(0, 2).map((tag, i) => (
 <span key={i} className="px-2 py-0.5 bg-surface text-text-secondary text-[8px] font-black uppercase rounded border border-border">
 {tag}
 </span>
 ))}
 {blog.tags?.length > 2 && <span className="text-[8px] font-bold text-text-muted">+{blog.tags.length - 2}</span>}
 </div>
 </td>
 <td className="p-4 text-[11px] text-text-secondary font-bold uppercase whitespace-nowrap">
 <SafeTime date={blog.created_at} />
 </td>
 <td className="p-4">
 <div className={cn(
 "flex items-center gap-1.5 font-bold text-[10px] uppercase",
 isDeleted && "text-text-muted",
 blog.moderation === 'pending' && "text-amber-600",
 blog.moderation === 'approved' && "text-primary",
 blog.moderation === 'rejected' && "text-destructive",
 )}>
 {isDeleted ? 'deleted' : blog.moderation}
 </div>
 </td>
 <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
 <div className="flex justify-end gap-2">
 <HydratedOnly>
 {canRecover ? (
 <button
 onClick={() => handleAdminRecover(blog.id)}
 disabled={!recoverable}
 className="text-primary font-bold text-xs hover:underline disabled:opacity-50 disabled:no-underline"
 >
 Recover
 </button>
 ) : (
 <>
 <ApproveButton 
 id={blog.id} 
 type="blog" 
 variant="text" 
 onSuccess={() => updateModerationLocally(blog.id, 'approved')}
 />
 <button 
 onClick={() => { setItemToReject(blog.id); setIsRejectModalOpen(true); }}
 className="text-destructive font-bold text-xs hover:underline"
 >
 Reject
 </button>
 <button onClick={() => handleAdminDelete(blog.id)} className="text-text-secondary font-bold text-xs hover:underline">
 Delete
 </button>
 </>
 )}
 </HydratedOnly>
 </div>
 </td>
 </tr>
 );
 })}
 {filteredBlogs.length === 0 && (
 <tr>
 <td colSpan={7} className="p-10 text-center text-sm text-text-secondary">
 No blog posts found for this filter.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* Detail Panel */}
 <DetailPanel
 isOpen={isPanelOpen}
 onClose={() => setIsPanelOpen(false)}
 title="Article Validation"
 width="w-[800px]"
 footer={(
 <div className="flex gap-4">
 {!selectedDeleteMeta && (
 <>
 <ApproveButton 
 id={selectedItem?.id || ''} 
 type="blog" 
 variant="full" 
 label="Approve & Publish Article"
 className="flex-1"
 onSuccess={() => { updateModerationLocally(selectedItem!.id, 'approved'); setIsPanelOpen(false); }}
 />
 <button 
 onClick={() => { setItemToReject(selectedItem?.id || ''); setIsRejectModalOpen(true); }}
 className="px-10 py-4 bg-destructive/10 text-destructive rounded-xl font-bold text-sm hover:bg-destructive/20 transition-all leading-none"
 >
 Reject Content
 </button>
 </>
 )}
 <HydratedOnly>
 {selectedDeleteMeta ? (
 <button
 onClick={() => handleAdminRecover(selectedItem!.id)}
 disabled={!isSoftDeleteRecoverable(selectedDeleteMeta)}
 className="px-10 py-4 bg-primary/10 text-primary rounded-xl font-bold text-sm hover:bg-primary/20 transition-all leading-none disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Undo Delete
 </button>
 ) : (
 <button
 onClick={() => handleAdminDelete(selectedItem!.id)}
 className="px-10 py-4 bg-surface text-text-secondary rounded-xl font-bold text-sm hover:bg-border transition-all leading-none"
 >
 Delete (2d Undo)
 </button>
 )}
 </HydratedOnly>
 </div>
 )}
 >
 {selectedItem && (
 <article className="space-y-10">
 <header className="space-y-6">
 <Image src={selectedItem.cover_image} className="w-full aspect-video object-cover rounded-3xl" alt="" width={800} height={450} />
 <h1 className="text-4xl font-black text-text-primary leading-[1.1] tracking-tight">{selectedItem.title}</h1>
 <div className="flex items-center justify-between p-6 bg-surface rounded-2xl border border-border">
 <div className="flex items-center gap-3">
 <Image src={selectedItem.author?.avatar_url || '/images/default-avatar.svg'} className="w-10 h-10 rounded-full" alt="" width={40} height={40} unoptimized />
 <div>
 <p className="font-bold text-text-primary leading-none">{selectedItem.author?.full_name || 'Unknown Author'}</p>
 <p className="text-xs text-text-secondary mt-1">{selectedItem.author?.university || 'N/A'}</p>
 </div>
 </div>
 <div className="text-right">
 <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Submitted On</p>
 <div className="text-xs font-bold text-text-primary mt-1"><SafeDate date={selectedItem.created_at} /></div>
 </div>
 </div>
 </header>

 <div className="prose prose-slate max-w-none text-text-primary leading-relaxed space-y-6">
 <p className="text-lg font-bold text-text-secondary bg-surface p-6 rounded-2xl border-l-4 border-l-primary italic">
 {selectedItem.excerpt}
 </p>
 <div dangerouslySetInnerHTML={{ __html: selectedContentHtml }} />
 </div>

 <div className="pt-10 border-t border-border">
 <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4">Meta Tags & Topics</p>
 <div className="flex flex-wrap gap-2">
 {selectedItem.tags?.map((tag, i) => (
 <span key={i} className="px-4 py-2 bg-surface text-text-primary text-xs font-bold rounded-full border border-border">
 #{tag}
 </span>
 ))}
 </div>
 </div>
 </article>
 )}
 </DetailPanel>

 {/* Reject Modal */}
 <RejectModal
 isOpen={isRejectModalOpen}
 onClose={() => setIsRejectModalOpen(false)}
 id={itemToReject || ''}
 type="blog"
 onSuccess={() => {
 if (itemToReject) updateModerationLocally(itemToReject, 'rejected');
 if (itemToReject === selectedItem?.id) setIsPanelOpen(false);
 setIsRejectModalOpen(false);
 }}
 />
 </div>
 );
}
