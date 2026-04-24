'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { BlogShareActions } from './blog-share-actions'
import { BlogLikeButton } from './blog-like-button'

interface BlogSidebarEngagementProps {
 blogId: string
 canComment: boolean
 title: string
 initialIsLiked: boolean
 initialLikeCount: number
}

export function BlogSidebarEngagement({ 
 blogId, 
 canComment, 
 title, 
 initialIsLiked, 
 initialLikeCount 
}: BlogSidebarEngagementProps) {
 const [content, setContent] = useState('')
 const [submitting, setSubmitting] = useState(false)
 const router = useRouter()

 const handlePostComment = async () => {
 if (!canComment) {
 window.location.href = '/login'
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
 is_anonymous: false
 }),
 })

 if (!res.ok) {
 if (res.status === 401) {
 window.location.href = '/login'
 return
 }
 const data = await res.json().catch(() => ({}))
 throw new Error(data?.error || 'Failed to post comment')
 }

 toast.success('Comment posted')
 setContent('')
 router.refresh()
 
 const commentsSection = document.getElementById('comments')
 if (commentsSection) {
 commentsSection.scrollIntoView({ behavior: 'smooth' })
 }
 } catch (error: any) {
 toast.error(error?.message || 'Unable to post comment')
 } finally {
 setSubmitting(false)
 }
 }

 return (
 <div className="space-y-6 hidden lg:block">
 {/* Interaction Card (Like & Share) */}
 <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_12px_32px_rgba(0,100,101,0.06)] border border-outline-variant/10 space-y-6">
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">Appreciate work</span>
 <BlogLikeButton 
 blogId={blogId} 
 initialIsLiked={initialIsLiked} 
 initialLikeCount={initialLikeCount} 
 variant="floating" 
 />
 </div>
 
 <div className="h-px bg-outline-variant/10" />

 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">Share project</span>
 <BlogShareActions title={title} />
 </div>
 </div>

 {/* Quick Comment Box */}
 <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_12px_32px_rgba(0,100,101,0.06)] border border-outline-variant/10">
 <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-4">Quick discussion</p>
 <textarea
 className="w-full bg-surface border-none rounded-xl p-3 focus:ring-2 focus:ring-primary h-24 text-sm resize-none"
 placeholder={canComment ? 'Share your thoughts...' : 'Log in to comment'}
 value={content}
 onChange={(e) => setContent(e.target.value.slice(0, 500))}
 disabled={!canComment || submitting}
 />
 <div className="flex items-center justify-between mt-3 gap-2">

 <button
 onClick={handlePostComment}
 disabled={submitting || !content.trim()}
 className="flex-1 py-2 bg-primary text-white rounded-full text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
 >
 {submitting ? 'Posting...' : 'Post'}
 </button>
 </div>
 </div>
 </div>
 )
}
