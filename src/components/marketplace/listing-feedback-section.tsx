'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatRelativeTime } from '@/lib/utils'
import { SafeTime } from '@/components/shared/safe-time'
import { Avatar } from '@/components/ui/avatar'
import { ROUTES } from '@/lib/routes'
import { UserLink } from '@/components/shared/navigation-links'

interface ListingFeedbackSectionProps {
  listingId: string
  canComment: boolean
  ratings: any[]
  comments: any[]
  viewerRole?: string
  currentUser?: any
}

export function ListingFeedbackSection({
  listingId,
  canComment,
  ratings,
  comments,
  viewerRole,
  currentUser,
}: ListingFeedbackSectionProps) {
  const router = useRouter()
  const [localComments, setLocalComments] = useState<any[]>(comments)
  const [comment, setComment] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Sync with prop updates
  useMemo(() => {
    setLocalComments(comments)
  }, [comments])

  const ratingStats = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>
    for (const r of ratings) {
      const score = Number(r.score || 0)
      if (score >= 1 && score <= 5) counts[score] += 1
    }
    const total = ratings.length
    const avg = total > 0
      ? (ratings.reduce((sum, r) => sum + Number(r.score || 0), 0) / total).toFixed(1)
      : '0.0'

    return { counts, total, avg }
  }, [ratings])

  const handleSubmitComment = async () => {
    if (!canComment) {
      window.location.href = ROUTES.auth.login()
      return
    }

    const content = comment.trim()
    if (!content) return

    setSubmitting(true)
    
    // Create optimistic comment
    const optimisticComment = {
      id: `temp-${Date.now()}`,
      content,
      created_at: new Date().toISOString(),
      is_anonymous: isAnonymous,
      author: currentUser || { 
        full_name: 'You', 
        avatar_url: null, 
        username: 'me' 
      },
      moderation: 'pending' // Visual indicator or just show it
    }

    // Add to local state immediately
    setLocalComments(prev => [optimisticComment, ...prev])
    setComment('')

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          listing_id: listingId,
          is_anonymous: isAnonymous
        }),
      })

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = ROUTES.auth.login()
          return
        }
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to submit comment')
      }

      toast.success('Comment submitted for review')
      // router.refresh() // No refresh needed, we have it locally
    } catch (error: any) {
      toast.error(error?.message || 'Unable to submit comment')
      // Rollback optimistic update
      setLocalComments(prev => prev.filter(c => c.id !== optimisticComment.id))
      setComment(content) // Restore text
    } finally {
      setSubmitting(false)
    }
  }

 return (
 <section className="space-y-10">
 <div>
 <h3 className="text-2xl font-bold text-on-surface mb-5">Ratings</h3>
 <div className="bg-surface-container-lowest border border-border rounded-xl p-6">
 <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6">
 <div>
 <div className="text-5xl font-black text-on-surface leading-none">{ratingStats.avg}</div>
 <div className="text-sm text-on-surface-variant mt-2">{ratingStats.total} rating{ratingStats.total === 1 ? '' : 's'}</div>
 </div>

 <div className="space-y-2">
 {[5, 4, 3, 2, 1].map((star) => {
 const count = ratingStats.counts[star]
 const pct = ratingStats.total > 0 ? (count / ratingStats.total) * 100 : 0
 return (
 <div key={star} className="grid grid-cols-[20px_1fr_32px] gap-3 items-center">
 <span className="text-xs font-bold text-on-surface">{star}</span>
 <div className="h-2 bg-surface rounded-full overflow-hidden">
 <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
 </div>
 <span className="text-xs text-on-surface-variant text-right">{count}</span>
 </div>
 )
 })}
 </div>
 </div>
 </div>
 </div>

 <div>
 <h3 className="text-2xl font-bold text-on-surface mb-5">Comments</h3>
 <div className="bg-surface-container-lowest border border-border rounded-xl p-6 space-y-6">
 <div className="space-y-3">
 <textarea
 value={comment}
 onChange={(e) => setComment(e.target.value.slice(0, 500))}
 className="w-full min-h-[110px] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/40"
 placeholder={canComment ? 'Write a comment about this item...' : 'Log in to add a comment'}
 disabled={!canComment || submitting}
 />
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <p className="text-xs text-on-surface-variant">{comment.length}/500</p>
 {viewerRole === 'admin' && (
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
 </div>
 <button
 onClick={handleSubmitComment}
 disabled={submitting || !comment.trim()}
 className="px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold disabled:opacity-50"
 >
 {submitting ? 'Posting...' : 'Post Comment'}
 </button>
 </div>
 <p className="text-xs text-on-surface-variant">Comments are reviewed before public display.</p>
 </div>

 <div className="space-y-3">
 {localComments.length === 0 ? (
 <p className="text-sm text-on-surface-variant">No comments yet.</p>
 ) : (
 localComments.slice(0, 20).map((c) => (
 <div key={c.id} className="border border-border rounded-lg p-4 bg-white">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <UserLink user={c.author} size="sm" showName={false} isAnonymous={c.is_anonymous} viewerRole={viewerRole} />
 <div>
 <UserLink user={c.author} showAvatar={false} size="sm" isAnonymous={c.is_anonymous} className="font-bold text-sm text-on-surface hover:text-primary transition-colors" viewerRole={viewerRole} />
 <SafeTime date={c.created_at} className="block text-[11px] text-on-surface-variant font-medium uppercase tracking-wider mt-0.5" />
 </div>
 </div>
 {c.moderation === 'pending' && (
 <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 animate-pulse">
 Pending Review
 </span>
 )}
 </div>
 <p className="text-sm text-on-surface-variant mt-3 whitespace-pre-wrap">{c.content}</p>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 </section>
 )
}
