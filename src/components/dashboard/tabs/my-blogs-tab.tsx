'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { formatDate } from '@/lib/utils'
import { FIELDS } from '@/lib/constants'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { isSoftDeleteRecoverable, parseSoftDeleteNote } from '@/lib/content-soft-delete'
import { HydratedOnly } from '@/components/shared/safe-time'

interface MyBlogsTabProps {
 profile: any
}

type BlogFilter = 'all' | 'published' | 'pending' | 'rejected' | 'deleted' | 'draft'

function isFeatureActive(featuredUntil?: string | null) {
 if (!featuredUntil) return false
 const time = Date.parse(featuredUntil)
 return Number.isFinite(time) && time > Date.now()
}

export function MyBlogsTab({ profile }: MyBlogsTabProps) {
 const router = useRouter()
 const [blogs, setBlogs] = useState<any[]>([])
 const [filter, setFilter] = useState<BlogFilter>('all')
 const [loading, setLoading] = useState(true)
 const [expandedRejections, setExpandedRejections] = useState<Set<string>>(new Set())
 const [stats, setStats] = useState({ total: 0, published: 0, pending: 0, totalLikes: 0 })
 const [deletingBlogId, setDeletingBlogId] = useState<string | null>(null)
 const [pendingFeatureByEntity, setPendingFeatureByEntity] = useState<Record<string, any>>({})
 const [showFeatureModal, setShowFeatureModal] = useState(false)
 const [featureTarget, setFeatureTarget] = useState<any | null>(null)
 const [requestedFeatureDays, setRequestedFeatureDays] = useState(7)
 const [featureReason, setFeatureReason] = useState('')
 const [featureSubmitting, setFeatureSubmitting] = useState(false)
 const [currentPage, setCurrentPage] = useState(1)
 const ITEMS_PER_PAGE = 5

 const loadBlogs = useCallback(async () => {
 const supabase = createClient()
 setLoading(true)

 try {
 let query = supabase
 .from('blogs')
 .select('id, title, field, excerpt, moderation, rejection_note, like_count, comment_count, view_count, created_at, cover_image, is_featured, featured_until')
 .eq('author_id', profile.id)
 .order('created_at', { ascending: false })

 if (filter === 'published') query = query.eq('moderation', 'approved')
 if (filter === 'pending') query = query.eq('moderation', 'pending')

 const { data, error } = await query
 if (error) throw error
 
 const nextBlogs = (data || []).filter((blog: any) => {
 const isDeleted = !!parseSoftDeleteNote(blog.rejection_note)
 if (filter === 'rejected') return blog.moderation === 'rejected' && !isDeleted
 if (filter === 'deleted') return isDeleted
 return true
 })
 setBlogs(nextBlogs)

 // Stats
 const [totalRes, pubRes, pendRes, featureReqResponse] = await Promise.all([
 supabase.from('blogs').select('id', { count: 'exact', head: true }).eq('author_id', profile.id),
 supabase.from('blogs').select('id', { count: 'exact', head: true }).eq('author_id', profile.id).eq('moderation', 'approved'),
 supabase.from('blogs').select('id', { count: 'exact', head: true }).eq('author_id', profile.id).eq('moderation', 'pending'),
 fetch('/api/feature-requests?entity_type=blog&status=pending')
 .then((res) => (res.ok ? res.json() : null))
 .catch(() => null),
 ])

 const totalLikes = (nextBlogs || []).reduce((sum: number, b: any) => sum + (b.like_count || 0), 0)
 const nextPendingFeatureByEntity: Record<string, any> = {}
 for (const row of featureReqResponse?.data || []) {
 if (row?.entity_id) nextPendingFeatureByEntity[row.entity_id] = row
 }
 setPendingFeatureByEntity(nextPendingFeatureByEntity)

 setStats({
 total: totalRes.count || 0,
 published: pubRes.count || 0,
 pending: pendRes.count || 0,
 totalLikes,
 })
 } catch (error) {
 console.error('Failed to load blogs tab:', error)
 } finally {
 setLoading(false)
 }
 }, [filter, profile.id])

 useEffect(() => {
 loadBlogs()
 }, [loadBlogs])

 useEffect(() => {
 setCurrentPage(1)
 }, [filter])

 const totalPages = Math.ceil(blogs.length / ITEMS_PER_PAGE)
 const paginatedBlogs = blogs.slice(
 (currentPage - 1) * ITEMS_PER_PAGE,
 currentPage * ITEMS_PER_PAGE
 )

 const getStatusBadge = (blog: any) => {
 const isDeleted = !!parseSoftDeleteNote(blog.rejection_note)
 if (isDeleted)
 return (
 <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-500 border border-rose-100">
 Deleted
 </span>
 )
 const mod = blog.moderation
 if (mod === 'approved')
 return (
 <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
 Published
 </span>
 )
 if (mod === 'pending')
 return (
 <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100">
 Pending
 </span>
 )
 if (mod === 'rejected')
 return (
 <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-100">
 Rejected
 </span>
 )
 return null
 }

 const handleDeleteBlog = async (blogId: string, blogTitle: string) => {
 const shouldDelete = window.confirm(`Delete "${blogTitle}" now? You can recover it within 2 days.`)
 if (!shouldDelete) return

 setDeletingBlogId(blogId)
 try {
 const response = await fetch(`/api/blogs/${blogId}`, { method: 'DELETE' })
 const result = await response.json().catch(() => ({}))
 if (!response.ok) {
 throw new Error(result?.error || 'Failed to delete blog')
 }

 toast.success('Blog deleted. You can recover it within 2 days.')
 await loadBlogs()
 } catch (err: any) {
 toast.error(err?.message || 'Failed to delete blog')
 } finally {
 setDeletingBlogId(null)
 }
 }

 const handleRecoverBlog = async (blogId: string) => {
 setDeletingBlogId(blogId)
 try {
 const response = await fetch(`/api/blogs/${blogId}`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ action: 'recover' }),
 })
 if (!response.ok) throw new Error('Failed to recover blog')
 toast.success('Blog recovered successfully')
 await loadBlogs()
 } catch (err: any) {
 toast.error(err?.message || 'Failed to recover blog')
 } finally {
 setDeletingBlogId(null)
 }
 }

 const openFeatureModal = (blog: any) => {
 setFeatureTarget(blog)
 setRequestedFeatureDays(7)
 setFeatureReason('')
 setShowFeatureModal(true)
 }

 const submitFeatureRequest = async () => {
 if (!featureTarget?.id) return
 try {
 setFeatureSubmitting(true)
 const response = await fetch('/api/feature-requests', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 entity_type: 'blog',
 entity_id: featureTarget.id,
 requested_days: requestedFeatureDays,
 reason: featureReason.trim(),
 }),
 })
 if (!response.ok) throw new Error('Failed')
 toast.success('Feature request sent.')
 setShowFeatureModal(false)
 await loadBlogs()
 } catch (error: any) {
 toast.error('Unable to send feature request')
 } finally {
 setFeatureSubmitting(false)
 }
 }

 const filterTabs: { label: string; value: BlogFilter }[] = [
 { label: 'All', value: 'all' },
 { label: 'Published', value: 'published' },
 { label: 'Pending', value: 'pending' },
 { label: 'Rejected', value: 'rejected' },
 { label: 'Deleted', value: 'deleted' },
 ]

 const statCards = [
 { label: 'Portfolio', value: stats.total, icon: 'article', borderColor: 'border-emerald-500' },
 { label: 'Live', value: stats.published, icon: 'check_circle', borderColor: 'border-blue-500' },
 { label: 'In Review', value: stats.pending, icon: 'hourglass_empty', borderColor: 'border-amber-500' },
 { label: 'Claps', value: stats.totalLikes, icon: 'favorite', borderColor: 'border-rose-500' },
 ]

 return (
 <Fragment>
 <div className="space-y-8 pb-10">
 {/* Header Section */}
 <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
 <div>
 <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">My Content</h1>
 <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium italic">
 &quot;Your ideas are the seeds of campus innovation.&quot;
 </p>
 </div>
 <Button
 onClick={() => router.push('/dashboard?tab=blog-studio')}
 className="w-full sm:w-auto shadow-lg shadow-emerald-500/20 py-6 sm:py-3 rounded-[24px] bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[11px]"
 >
 <span className="material-symbols-outlined text-[20px] mr-2">add</span>
 New Blog Post
 </Button>
 </div>

 {/* Dynamic Stats Row */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
 {statCards.map((stat) => (
 <Card
 key={stat.label}
 className={cn(
 'p-4 sm:p-6 flex flex-col sm:flex-row items-center sm:justify-between border-b-4 bg-white rounded-3xl transition-all hover:translate-y-[-4px]',
 stat.borderColor
 )}
 >
 <div className="text-center sm:text-left mb-3 sm:mb-0">
 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
 <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">{stat.value}</h3>
 </div>
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
 <span className="material-symbols-outlined">{stat.icon}</span>
 </div>
 </Card>
 ))}
 </div>

 {/* Content Management Card */}
 <Card className="p-4 sm:p-8 rounded-[40px] border-none bg-white shadow-[0_20px_50px_rgba(0,0,0,0.02)]">
 {/* Enhanced Filter Tabs */}
 <div className="flex gap-2 mb-8 border-b border-slate-50 pb-4 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
 {filterTabs.map((tab) => (
 <button
 key={tab.value}
 onClick={() => setFilter(tab.value)}
 className={cn(
 'px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
 filter === tab.value
 ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
 : 'text-slate-300 hover:bg-slate-50 hover:text-slate-600'
 )}
 >
 {tab.label}
 </button>
 ))}
 </div>

 {loading ? (
 <div className="space-y-6">
 {Array.from({ length: 3 }).map((_, i) => (
 <div key={i} className="h-32 bg-slate-50 rounded-[32px] animate-pulse" />
 ))}
 </div>
 ) : blogs.length === 0 ? (
 <div className="py-24 text-center animate-in fade-in duration-700">
 <span className="material-symbols-outlined text-6xl text-slate-100 mb-4 block">auto_stories</span>
 <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Silence in the library</p>
 <p className="text-xs text-slate-300 mt-2">Publish your first blog to break the quiet.</p>
 </div>
 ) : (
 <div className="space-y-6">
 {/* Mobile Card Grid (2x2) */}
 <div className="grid grid-cols-2 gap-3 sm:gap-4 md:hidden">
 {paginatedBlogs.map((blog) => (
 <div
 key={blog.id}
 className="flex flex-col rounded-[32px] bg-white border border-slate-100 relative group transition-all active:scale-[0.98] overflow-hidden"
 >
 {/* Cover Image Header */}
 <div className="aspect-[4/3] w-full relative overflow-hidden bg-slate-50 border-b border-slate-100">
 {blog.cover_image ? (
 <Image
 src={blog.cover_image}
 alt={blog.title}
 className="w-full h-full object-cover"
 width={200}
 height={150}
 />
 ) : (
 <div className="w-full h-full flex items-center justify-center text-slate-200">
 <span className="material-symbols-outlined text-3xl">auto_stories</span>
 </div>
 )}
 
 {/* Overlays */}
 <div className="absolute top-2 left-2 flex flex-col gap-1.5 transform scale-75 origin-top-left">
 {getStatusBadge(blog)}
 {blog.field && (
 <span className="px-2 py-0.5 rounded-lg bg-white/90 backdrop-blur-sm text-emerald-600 text-[8px] font-black uppercase tracking-widest border border-emerald-100">
 {blog.field}
 </span>
 )}
 </div>
 </div>

 {/* Content Section */}
 <div className="p-3 flex flex-col flex-1">
 <h4 className="text-[11px] font-black text-slate-900 leading-tight line-clamp-2 h-7 mb-3">
 {blog.title}
 </h4>
 
 {/* Interaction Stats */}
 <div className="flex items-center gap-3 text-slate-400 mb-3 grayscale opacity-70">
 <div className="flex items-center gap-1">
 <span className="material-symbols-outlined text-[12px]">favorite</span>
 <span className="text-[9px] font-bold">{blog.like_count || 0}</span>
 </div>
 <div className="flex items-center gap-1">
 <span className="material-symbols-outlined text-[12px]">visibility</span>
 <span className="text-[9px] font-bold">{blog.view_count || 0}</span>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="mt-auto grid grid-cols-2 gap-1.5 pt-3 border-t border-slate-50">
 <button 
 onClick={() => router.push(`/dashboard?tab=blog-studio&edit=${blog.id}`)}
 className="flex items-center justify-center h-9 rounded-xl bg-slate-50 border border-slate-100 text-slate-500"
 >
 <span className="material-symbols-outlined text-[18px]">edit</span>
 </button>
 <button 
 onClick={() => handleDeleteBlog(blog.id, blog.title)}
 disabled={deletingBlogId === blog.id}
 className="flex items-center justify-center h-9 rounded-xl bg-rose-50 border border-rose-100 text-rose-500"
 >
 <span className="material-symbols-outlined text-[18px]">
 {deletingBlogId === blog.id ? 'sync' : 'delete'}
 </span>
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>

 {/* Desktop View - Simplified Elegant List */}
 <div className="hidden md:block overflow-hidden rounded-[32px] border border-slate-50">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-slate-50/30">
 <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Publication</th>
 <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
 <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Engagement</th>
 <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-50">
 {paginatedBlogs.map((blog) => (
 <tr key={blog.id} className="hover:bg-slate-50/20 transition-colors group">
 <td className="px-8 py-6">
 <div className="flex items-center gap-5">
 <div className="w-16 h-12 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0 ring-1 ring-slate-100">
 {blog.cover_image ? (
 <Image src={blog.cover_image} alt={blog.title} className="w-full h-full object-cover" width={64} height={48} />
 ) : (
 <div className="w-full h-full flex items-center justify-center text-slate-200">
 <span className="material-symbols-outlined">auto_stories</span>
 </div>
 )}
 </div>
 <div>
 <h4 className="text-sm font-black text-slate-900 leading-tight line-clamp-1">{blog.title}</h4>
 <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{blog.field || 'General'}</p>
 </div>
 </div>
 </td>
 <td className="px-8 py-6">
 <div className="flex flex-col gap-1.5 items-start">
 {getStatusBadge(blog)}
 {blog.is_featured && isFeatureActive(blog.featured_until) && (
 <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">In Spotlight</span>
 )}
 </div>
 </td>
 <td className="px-8 py-6">
 <div className="flex items-center justify-center gap-6 text-slate-400">
 <div className="flex flex-col items-center gap-1">
 <span className="material-symbols-outlined text-[16px]">favorite</span>
 <span className="text-[11px] font-black text-slate-900">{blog.like_count || 0}</span>
 </div>
 <div className="flex flex-col items-center gap-1">
 <span className="material-symbols-outlined text-[16px]">visibility</span>
 <span className="text-[11px] font-black text-slate-900">{blog.view_count || 0}</span>
 </div>
 </div>
 </td>
 <td className="px-8 py-6 text-right">
 <div className="flex items-center justify-end gap-3 translate-x-2 opacity-100 md:opacity-40 group-hover:opacity-100 transition-all">
 {blog.moderation === 'approved' && !isFeatureActive(blog.featured_until) && (
 <button
 onClick={() => openFeatureModal(blog)}
 className="px-4 py-2 rounded-xl border border-amber-200 text-[10px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-50 transition-all"
 >
 Spotlight
 </button>
 )}
 <button 
 onClick={() => router.push(`/dashboard?tab=blog-studio&edit=${blog.id}`)}
 className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-all"
 >
 <span className="material-symbols-outlined text-[20px]">edit</span>
 </button>
 <button 
 onClick={() => handleDeleteBlog(blog.id, blog.title)}
 className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all"
 >
 <span className="material-symbols-outlined text-[20px]">delete</span>
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Enhanced Pagination Bar */}
 {totalPages > 1 && (
 <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-50 pt-8">
 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest order-2 sm:order-1">
 Entry <span className="text-slate-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> — <span className="text-slate-900">{Math.min(currentPage * ITEMS_PER_PAGE, blogs.length)}</span> of <span className="text-slate-900">{blogs.length}</span>
 </p>
 <div className="flex items-center gap-4 w-full sm:w-auto order-1 sm:order-2">
 <Button
 variant="outline"
 className="flex-1 sm:flex-none border-slate-200 text-slate-600 rounded-2xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest gap-2"
 onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
 disabled={currentPage === 1}
 >
 <span className="material-symbols-outlined text-[16px]">west</span>
 Prev
 </Button>
 <div className="flex items-center justify-center gap-2 min-w-[80px]">
 <span className="text-[12px] font-black text-emerald-600 ring-2 ring-emerald-50 w-8 h-8 rounded-lg flex items-center justify-center">{currentPage}</span>
 <span className="text-[11px] font-black text-slate-400">{totalPages}</span>
 </div>
 <Button
 variant="outline"
 className="flex-1 sm:flex-none border-slate-200 text-slate-600 rounded-2xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest gap-2"
 onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
 disabled={currentPage === totalPages}
 >
 Next
 <span className="material-symbols-outlined text-[16px]">east</span>
 </Button>
 </div>
 </div>
 )}
 </div>
 )}
 </Card>

 {/* Feature Request Modal */}
 <Modal
 open={showFeatureModal}
 onClose={() => setShowFeatureModal(false)}
 title="Spotlight Application"
 size="lg"
 >
 <div className="space-y-6 pt-4">
 <div className="p-6 rounded-[32px] bg-emerald-50/50 border border-emerald-100/50">
 <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2 opacity-60">Candidate Blog</p>
 <h4 className="text-sm font-black text-slate-900 leading-snug">{featureTarget?.title}</h4>
 </div>

 <div className="space-y-5">
 <div className="space-y-2">
 <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1">Duration (1-60 Days)</label>
 <input
 type="number"
 min={1}
 max={60}
 value={requestedFeatureDays}
 onChange={(e) => setRequestedFeatureDays(Number(e.target.value))}
 className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-black text-slate-900 focus:bg-white focus:border-emerald-500 outline-none transition-all"
 />
 </div>

 <div className="space-y-2">
 <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1">Pitch / Justification</label>
 <textarea
 rows={4}
 value={featureReason}
 onChange={(e) => setFeatureReason(e.target.value)}
 className="w-full px-6 py-4 rounded-[32px] bg-slate-50 border border-slate-100 text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none transition-all resize-none"
 placeholder="Tell us why this content deserves campus-wide visibility..."
 />
 </div>
 </div>

 <div className="flex gap-4 pt-4 pb-2">
 <Button variant="outline" fullWidth className="rounded-2xl py-6 uppercase font-black tracking-widest text-[10px] border-slate-200" onClick={() => setShowFeatureModal(false)}>
 Cancel
 </Button>
 <Button 
 fullWidth 
 className="rounded-2xl py-6 bg-emerald-600 hover:bg-emerald-700 text-white uppercase font-black tracking-widest text-[10px] shadow-lg shadow-emerald-500/20"
 loading={featureSubmitting} 
 onClick={submitFeatureRequest}
 >
 Submit Pitch
 </Button>
 </div>
 </div>
 </Modal>
 </div>
 </Fragment>
 )
}

