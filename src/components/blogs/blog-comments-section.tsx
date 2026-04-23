'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import { ROUTES } from '@/lib/routes'
import { UserLink } from '@/components/shared/navigation-links'

interface BlogCommentsSectionProps {
 blogId: string
 blogAuthorId: string
 comments: any[]
 canComment: boolean
 currentUserId?: string
 currentUserRole?: string
}

export function BlogCommentsSection({ blogId, blogAuthorId, comments, canComment, currentUserId, currentUserRole }: BlogCommentsSectionProps) {
 const [content, setContent] = useState('')
 const [submitting, setSubmitting] = useState(false)
 const [replyingToId, setReplyingToId] = useState<string | null>(null)
 const [replyContentByParent, setReplyContentByParent] = useState<Record<string, string>>({})
 const [submittingReplyToId, setSubmittingReplyToId] = useState<string | null>(null)
 const [isAnonymous, setIsAnonymous] = useState(false)
 const [isAnonymousReply, setIsAnonymousReply] = useState<Record<string, boolean>>({})
 const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(
 () => new Set(comments.filter(c => c.isLiked).map(c => c.id))
 )
 const [likeCounts, setLikeCounts] = useState<Record<string, number>>(
 () => comments.reduce((acc, comment) => ({ ...acc, [comment.id]: comment.like_count || 0 }), {})
 )
 const debounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({})
 const router = useRouter()

 // Sync if props change
 useEffect(() => {
 setLikedCommentIds(new Set(comments.filter(c => c.isLiked).map(c => c.id)))
 setLikeCounts(comments.reduce((acc, comment) => ({ ...acc, [comment.id]: comment.like_count || 0 }), {}))
 }, [comments])

 const handlePostComment = async () => {
 if (!canComment) {
 window.location.href = ROUTES.auth.login()
 return
 }

 const trimmed = content.trim()
 if (!trimmed) return

 setSubmitting(true)
 try {
 const res = await fetch('/api/comments', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 content: trimmed,
 blog_id: blogId,
 is_anonymous: isAnonymous
 }),
 })

 if (!res.ok) {
 if (res.status === 401) {
 window.location.href = ROUTES.auth.login()
 return
 }
 const data = await res.json().catch(() => ({}))
 throw new Error(data?.error || 'Failed to post comment')
 }

 toast.success('Comment posted')
 setContent('')
 router.refresh()
 } catch (error: any) {
 toast.error(error?.message || 'Unable to post comment')
 } finally {
 setSubmitting(false)
 }
 }

 const topLevelComments = (comments || []).filter((c: any) => !c.parent_id)
 const repliesByParent = (comments || []).reduce((acc: Record<string, any[]>, comment: any) => {
 if (!comment.parent_id) return acc
 if (!acc[comment.parent_id]) acc[comment.parent_id] = []
 acc[comment.parent_id].push(comment)
 return acc
 }, {})

 const handlePostReply = async (parentId: string) => {
 if (!canComment) {
 window.location.href = ROUTES.auth.login()
 return
 }

 const replyContent = (replyContentByParent[parentId] || '').trim()
 if (!replyContent) return

 setSubmittingReplyToId(parentId)
 try {
 const res = await fetch('/api/comments', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 content: replyContent,
 blog_id: blogId,
 parent_id: parentId,
 is_anonymous: !!isAnonymousReply[parentId]
 }),
 })

 if (!res.ok) {
 if (res.status === 401) {
 window.location.href = ROUTES.auth.login()
 return
 }
 const data = await res.json().catch(() => ({}))
 throw new Error(data?.error || 'Failed to post reply')
 }

 toast.success('Reply posted')
 setReplyContentByParent((prev) => ({ ...prev, [parentId]: '' }))
 setReplyingToId(null)
 router.refresh()
 } catch (error: any) {
 toast.error(error?.message || 'Unable to post reply')
 } finally {
 setSubmittingReplyToId(null)
 }
 }

 return (
 <section className="bg-surface-container-lowest rounded-xl p-8 shadow-[0px_12px_32px_rgba(0,100,101,0.06)]">
 <h2 className="text-xl font-bold text-on-surface mb-8">Comments ({comments?.length || 0})</h2>

 <div className="flex gap-4 mb-12">
 <Avatar fallback="U" size="md" />
 <div className="flex-1">
 <textarea
 className="w-full bg-surface border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary h-24 text-sm"
 placeholder={canComment ? 'Add to the discussion...' : 'Log in to post a comment'}
 value={content}
 onChange={(e) => setContent(e.target.value.slice(0, 500))}
 disabled={!canComment || submitting}
 />
 <div className="mt-3 flex items-center justify-between">
 {currentUserRole === 'admin' && (
 <button
 type="button"
 onClick={() => setIsAnonymous(!isAnonymous)}
 className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
 isAnonymous ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-text-muted border-border'
 }`}
 >
 <span className="material-symbols-outlined text-[14px]">{isAnonymous ? 'visibility_off' : 'visibility'}</span>
 {isAnonymous ? 'Anonymous' : 'Public'}
 </button>
 )}
 <button
 onClick={handlePostComment}
 disabled={submitting || !content.trim()}
 className="px-6 py-2 bg-primary text-white rounded-full text-sm font-bold active:scale-95 transition-all disabled:opacity-50"
 >
 {submitting ? 'Posting...' : 'Post Comment'}
 </button>
 </div>
 </div>
 </div>

 <div className="space-y-10">
 {topLevelComments && topLevelComments.length > 0 ? topLevelComments.map((comment: any) => (
 <div key={comment.id} className="flex gap-4">
 <UserLink user={comment.author} size="md" showName={false} isAnonymous={comment.is_anonymous} viewerRole={currentUserRole} />
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <UserLink user={comment.author} size="sm" isAnonymous={comment.is_anonymous} viewerRole={currentUserRole} />
 {comment.author_id === blogAuthorId && (
 <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-bold uppercase">Author</span>
 )}
 <span className="text-xs text-on-surface-variant">• {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
 </div>
 <p className="text-sm text-on-surface-variant leading-relaxed">{comment.content}</p>
 <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-primary">
 <button
 onClick={() => {
 if (!canComment) {
 window.location.href = ROUTES.auth.login()
 return
 }
 setReplyingToId((prev) => (prev === comment.id ? null : comment.id))
 }}
 className="hover:underline"
 >
 {replyingToId === comment.id ? 'Cancel' : 'Reply'}
 </button>
 <button
 onClick={() => {
 if (!canComment) {
 window.location.href = ROUTES.auth.login()
 return
 }

 const isCurrentlyLiked = likedCommentIds.has(comment.id)
 const nextLiked = !isCurrentlyLiked
 const nextCount = Math.max((likeCounts[comment.id] ?? comment.like_count ?? 0) + (nextLiked ? 1 : -1), 0)

 // 1. Optimistic UI
 setLikedCommentIds(prev => {
 const next = new Set(prev)
 if (nextLiked) next.add(comment.id)
 else next.delete(comment.id)
 return next
 })
 setLikeCounts(prev => ({ ...prev, [comment.id]: nextCount }))

 // 2. Debounced API Sync
 if (debounceTimersRef.current[comment.id]) clearTimeout(debounceTimersRef.current[comment.id])
 
 debounceTimersRef.current[comment.id] = setTimeout(async () => {
 try {
 await fetch(`/api/comments/${comment.id}/like`, { 
 method: nextLiked ? 'POST' : 'DELETE' 
 })
 } catch (e) {
 console.error('Comment Like Sync Error:', e)
 }
 }, 1000)
 }}
 className="flex items-center gap-1 group"
 >
 <span className="material-symbols-outlined text-[14px] transition-transform active:scale-125" style={{ fontVariationSettings: likedCommentIds.has(comment.id) ? "'FILL' 1" : "'FILL' 0" }}>thumb_up</span> {(likeCounts[comment.id] ?? comment.like_count) || 0}
 </button>
 {(currentUserId === comment.author_id || currentUserId === blogAuthorId) && (
 <button
 onClick={async () => {
 const ok = window.confirm('Delete this comment?')
 if (!ok) return
 const res = await fetch(`/api/comments/${comment.id}`, { method: 'DELETE' })
 if (!res.ok) {
 toast.error('Unable to delete comment')
 return
 }
 toast.success('Comment deleted')
 router.refresh()
 }}
 className="hover:underline"
 >
 Delete
 </button>
 )}
 </div>

 {replyingToId === comment.id && (
 <div className="mt-4 bg-surface rounded-2xl border border-outline-variant/30 p-3">
 <textarea
 className="w-full bg-transparent border-none rounded-xl p-2 focus:ring-2 focus:ring-primary text-sm min-h-[72px]"
 placeholder={canComment ? 'Write your reply...' : 'Log in to reply'}
 value={replyContentByParent[comment.id] || ''}
 onChange={(e) =>
 setReplyContentByParent((prev) => ({ ...prev, [comment.id]: e.target.value.slice(0, 500) }))
 }
 disabled={!canComment || submittingReplyToId === comment.id}
 />
 <div className="mt-2 flex items-center justify-between gap-2">
 <div className="flex items-center gap-2">
 {currentUserRole === 'admin' && (
 <button
 type="button"
 onClick={() => setIsAnonymousReply(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
 className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${
 isAnonymousReply[comment.id] ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-text-muted border-border'
 }`}
 >
 <span className="material-symbols-outlined text-[14px]">{isAnonymousReply[comment.id] ? 'visibility_off' : 'visibility'}</span>
 {isAnonymousReply[comment.id] ? 'Anonymous' : 'Public'}
 </button>
 )}
 <button
 onClick={() => setReplyingToId(null)}
 className="px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest text-on-surface-variant border border-outline-variant/30"
 >
 Cancel
 </button>
 </div>
 <button
 onClick={() => handlePostReply(comment.id)}
 disabled={submittingReplyToId === comment.id || !(replyContentByParent[comment.id] || '').trim()}
 className="px-5 py-2 bg-primary text-white rounded-full text-xs font-bold disabled:opacity-50"
 >
 {submittingReplyToId === comment.id ? 'Posting...' : 'Post Reply'}
 </button>
 </div>
 </div>
 )}

 {(repliesByParent[comment.id] || []).length > 0 && (
 <div className="mt-6 pl-4 border-l-2 border-outline-variant/30 space-y-6">
 {repliesByParent[comment.id].map((reply: any) => (
 <div key={reply.id} className="flex gap-4">
 <UserLink user={reply.author} size="sm" showName={false} isAnonymous={reply.is_anonymous} viewerRole={currentUserRole} />
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <UserLink user={reply.author} size="sm" isAnonymous={reply.is_anonymous} viewerRole={currentUserRole} />
 {reply.author_id === blogAuthorId && (
 <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-bold uppercase">Author</span>
 )}
 </div>
 <p className="text-sm text-on-surface-variant leading-relaxed">{reply.content}</p>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 )) : (
 <div className="text-center py-16 bg-surface/50 rounded-2xl border-2 border-dashed border-border">
 <span className="material-symbols-outlined text-text-muted text-5xl mb-4">chat_bubble</span>
 <p className="text-text-secondary font-semibold">No comments yet. Be the first to start the discussion.</p>
 </div>
 )}
 </div>
 </section>
 )
}
