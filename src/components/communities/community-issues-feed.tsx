'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import Image from 'next/image'
import { getOptimizedImageUrl } from '@/lib/cloudinary'
import { getSafeHref } from '@/lib/security/url-security'
import { ROUTES } from '@/lib/routes'
import { UserLink } from '@/components/shared/navigation-links'
import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { cn } from '@/lib/utils'

interface CommunityIssuesFeedProps {
  initialPosts: any[]
  initialComments: any[]
  canInteract: boolean
  currentUserId?: string
  communityOwnerId: string
  communityId: string
  isViewerAdmin?: boolean
  initialExpandedId?: string | null
}

export function CommunityIssuesFeed({
  initialPosts,
  initialComments,
  canInteract,
  currentUserId,
  communityOwnerId,
  communityId,
  isViewerAdmin,
  initialExpandedId = null,
}: CommunityIssuesFeedProps) {
  const router = useRouter()
  const [posts, setPosts] = useState<any[]>(initialPosts || [])
  const [hasMore, setHasMore] = useState(initialPosts?.length === 10)
  const [offset, setOffset] = useState(initialPosts?.length || 0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [expandedPostId, setExpandedPostId] = useState<string | null>(initialExpandedId)
  const [comments, setComments] = useState<any[]>(initialComments || [])
  const [postDrafts, setPostDrafts] = useState<Record<string, string>>({})
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null)
  const [loadingPostId, setLoadingPostId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'issue' | 'discussion'>('all')
  const [submittingForPostId, setSubmittingForPostId] = useState<string | null>(null)
  const [submittingReplyForCommentId, setSubmittingReplyForCommentId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<string | null>(null)
  const [userLikedCommentIds, setUserLikedCommentIds] = useState<Set<string>>(
    () => new Set((initialComments || []).filter(c => c.isLiked).map(c => c.id))
  )
  const [userLikedPostIds, setUserLikedPostIds] = useState<Set<string>>(
    () => new Set((initialPosts || []).filter(p => p.isLiked).map(p => p.id))
  )
  const [isAnonymousReply, setIsAnonymousReply] = useState<Record<string, boolean>>({}) // key: postId or parentId
  
  // Track ground truth for net-zero optimization
  const serverStateCommentsRef = useRef<Record<string, { liked: boolean, count: number }>>({})
  const serverStatePostsRef = useRef<Record<string, { liked: boolean, count: number }>>({})
  const debounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({})

  // Sync with server data on refresh
  useEffect(() => {
    setPosts(initialPosts || [])
    setHasMore((initialPosts?.length || 0) >= 10)
    setOffset(initialPosts?.length || 0)
    setUserLikedCommentIds(new Set((initialComments || []).filter(c => c.isLiked).map(c => c.id)))
  }, [initialPosts, initialComments])

  const loadMorePosts = async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const res = await fetch(`/api/posts/feed?community_id=${communityId}&offset=${offset}&limit=10`)
      if (!res.ok) throw new Error('Failed to load more posts')
      const json = await res.json()
      const newPosts = json?.data || []
      
      if (newPosts.length < 10) setHasMore(false)
      
      setPosts(prev => [...prev, ...newPosts])
      setOffset(prev => prev + newPosts.length)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load more')
    } finally {
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    setComments(initialComments || [])
  }, [initialComments])

  const commentsByPost = useMemo(() => {
    return comments.reduce((acc: Record<string, any[]>, comment: any) => {
      const key = comment.post_id
      if (!key) return acc
      if (!acc[key]) acc[key] = []
      acc[key].push(comment)
      return acc
    }, {})
  }, [comments])

  const loadPostComments = async (postId: string) => {
    try {
      setLoadingPostId(postId)
      const res = await fetch(`/api/comments?post_id=${postId}`)
      if (!res.ok) throw new Error('Failed to load comments')
      const json = await res.json()
      const postComments = json?.data || []
      setComments((prev) => [...prev.filter((c) => c.post_id !== postId), ...postComments])
    } catch (error: any) {
      toast.error(error?.message || 'Unable to load discussion')
    } finally {
      setLoadingPostId(null)
    }
  }

  const openThread = async (postId: string) => {
    const next = expandedPostId === postId ? null : postId
    setExpandedPostId(next)
    if (next) {
      await loadPostComments(postId)
    }
  }

  const createComment = async ({ postId, parentId, isAnonymous }: { postId: string; parentId?: string; isAnonymous?: boolean }) => {
    if (!currentUserId) {
      router.push(ROUTES.auth.login())
      return
    }
    if (!canInteract) {
      toast.error('Please join the community to discuss this issue.')
      return
    }

    const content = parentId
      ? (replyDrafts[parentId] || '').trim()
      : (postDrafts[postId] || '').trim()

    if (!content) return

    try {
      if (parentId) setSubmittingReplyForCommentId(parentId)
      else setSubmittingForPostId(postId)

      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          post_id: postId,
          parent_id: parentId || null,
          is_anonymous: isAnonymous || false
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error || 'Failed to post')
      }

      if (parentId) {
        setReplyDrafts((prev) => ({ ...prev, [parentId]: '' }))
        setReplyingToCommentId(null)
        toast.success('Reply posted')
      } else {
        setPostDrafts((prev) => ({ ...prev, [postId]: '' }))
        toast.success('Comment posted')
      }

      await loadPostComments(postId)
    } catch (error: any) {
      toast.error(error?.message || 'Unable to post')
    } finally {
      if (parentId) setSubmittingReplyForCommentId(null)
      else setSubmittingForPostId(null)
    }
  }

  const removeComment = async (postId: string, commentId: string) => {
    try {
      setSubmittingReplyForCommentId(commentId) // Reuse for loading state

      const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete comment')
      toast.success('Comment deleted')
      await loadPostComments(postId)
      setConfirmDeleteId(null)
    } catch (error: any) {
      toast.error(error?.message || 'Unable to delete')
    } finally {
      setSubmittingReplyForCommentId(null)
    }
  }

  const removePost = async (postId: string) => {
    if (!currentUserId && !isViewerAdmin) return;
    try {
      setSubmittingForPostId(postId)

      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete discussion')
      
      toast.success('Discussion deleted')
      setPosts(prev => prev.filter(p => p.id !== postId))
      setConfirmDeletePostId(null)
    } catch (error: any) {
      toast.error(error?.message || 'Unable to delete')
    } finally {
      setSubmittingForPostId(null)
    }
  }

  const canDeleteComment = (post: any, comment: any) => {
    if (!currentUserId) return false
    return (
      currentUserId === comment.author_id ||
      currentUserId === post.author_id ||
      currentUserId === communityOwnerId ||
      isViewerAdmin
    )
  }

  const canDeletePost = (post: any) => {
    if (!currentUserId) return false
    return (
      currentUserId === post.author_id ||
      currentUserId === communityOwnerId ||
      isViewerAdmin
    )
  }

  const toggleLike = (commentId: string) => {
    if (!currentUserId) {
      router.push(ROUTES.auth.login())
      return
    }
    if (!canInteract) {
      toast.error('Please join the community to interact.')
      return
    }

    const comment = comments.find(c => c.id === commentId)
    if (!comment) return

    // Initialize server state if not exists
    if (!serverStateCommentsRef.current[commentId]) {
      serverStateCommentsRef.current[commentId] = { 
        liked: userLikedCommentIds.has(commentId), 
        count: comment.like_count || 0 
      }
    }

    const isCurrentlyLiked = userLikedCommentIds.has(commentId)
    const nextLiked = !isCurrentlyLiked
    const nextCount = Math.max((comment.like_count || 0) + (nextLiked ? 1 : -1), 0)
    
    // 1. Optimistic Update
    setUserLikedCommentIds(prev => {
      const next = new Set(prev)
      if (nextLiked) next.add(commentId)
      else next.delete(commentId)
      return next
    })

    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, like_count: nextCount } : c
    ))

    // 2. Debounced API Sync
    if (debounceTimersRef.current[commentId]) clearTimeout(debounceTimersRef.current[commentId])
    
    debounceTimersRef.current[commentId] = setTimeout(async () => {
      // Net-zero optimization
      if (nextLiked === serverStateCommentsRef.current[commentId].liked) return

      try {
        const res = await fetch(`/api/comments/${commentId}/like`, {
          method: nextLiked ? 'POST' : 'DELETE'
        })
        if (!res.ok) throw new Error('Failed to update like')
        serverStateCommentsRef.current[commentId] = { liked: nextLiked, count: nextCount }
      } catch (error: any) {
        console.error('Like Sync Error:', error)
        // Rollback
        setUserLikedCommentIds(prev => {
          const next = new Set(prev)
          if (serverStateCommentsRef.current[commentId].liked) next.add(commentId)
          else next.delete(commentId)
          return next
        })
        setComments(prev => prev.map(c => 
          c.id === commentId ? { ...c, like_count: serverStateCommentsRef.current[commentId].count } : c
        ))
      }
    }, 1000)
  }

  const togglePostLike = (postId: string) => {
    if (!currentUserId) {
      router.push(ROUTES.auth.login())
      return
    }
    if (!canInteract) {
      toast.error('Please join the community to interact.')
      return
    }

    const post = posts.find(p => p.id === postId)
    if (!post) return

    if (!serverStatePostsRef.current[postId]) {
      serverStatePostsRef.current[postId] = { 
        liked: userLikedPostIds.has(postId), 
        count: post.like_count || 0 
      }
    }

    const isCurrentlyLiked = userLikedPostIds.has(postId)
    const nextLiked = !isCurrentlyLiked
    const nextCount = Math.max((post.like_count || 0) + (nextLiked ? 1 : -1), 0)
    
    // 1. Optimistic Update
    setUserLikedPostIds(prev => {
      const next = new Set(prev)
      if (nextLiked) next.add(postId)
      else next.delete(postId)
      return next
    })

    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, like_count: nextCount } : p
    ))

    // 2. Debounced API Sync
    const timerKey = `post_${postId}`
    if (debounceTimersRef.current[timerKey]) clearTimeout(debounceTimersRef.current[timerKey])
    
    debounceTimersRef.current[timerKey] = setTimeout(async () => {
      if (nextLiked === serverStatePostsRef.current[postId].liked) return

      try {
        const res = await fetch(`/api/posts/${postId}/like`, {
          method: nextLiked ? 'POST' : 'DELETE'
        })
        if (!res.ok) throw new Error('Failed to update like')
        serverStatePostsRef.current[postId] = { liked: nextLiked, count: nextCount }
      } catch (error: any) {
        console.error('Post Like Sync Error:', error)
        setUserLikedPostIds(prev => {
          const next = new Set(prev)
          if (serverStatePostsRef.current[postId].liked) next.add(postId)
          else next.delete(postId)
          return next
        })
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, like_count: serverStatePostsRef.current[postId].count } : p
        ))
      }
    }, 1000)
  }

  const togglePinPost = async (postId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/posts/${postId}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !currentStatus })
      })
      if (!res.ok) throw new Error('Failed to update pin status')
      
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, is_pinned: !currentStatus } : p
      ))
      toast.success(!currentStatus ? 'Post pinned' : 'Post unpinned')
    } catch (error: any) {
      toast.error(error?.message || 'Unable to update pin status')
    }
  }

  const togglePinComment = async (postId: string, commentId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !currentStatus })
      })
      if (!res.ok) throw new Error('Failed to update pin status')
      
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, is_pinned: !currentStatus } : c
      ))
      toast.success(!currentStatus ? 'Comment pinned' : 'Comment unpinned')
    } catch (error: any) {
      toast.error(error?.message || 'Unable to update pin status')
    }
  }

  const toggleCompletePost = async (postId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: !currentStatus })
      })
      if (!res.ok) throw new Error('Failed to update status')
      
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, is_completed: !currentStatus } : p
      ))
      toast.success(!currentStatus ? 'Marked as completed' : 'Marked as active')
    } catch (error: any) {
      toast.error(error?.message || 'Unable to update status')
    }
  }

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1
      if (!a.is_pinned && b.is_pinned) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [posts])

  const filteredPosts = useMemo(() => {
    return sortedPosts.filter((post: any) => {
      if (activeFilter === 'all') return true
      if (activeFilter === 'issue') return post.is_question
      if (activeFilter === 'discussion') return !post.is_question
      return true
    })
  }, [sortedPosts, activeFilter])

  return (
    <div className="space-y-8">
      {/* Feed Filters */}
      <div className="flex items-center gap-2 md:gap-3 bg-white p-1.5 md:p-2 rounded-full border border-border shadow-sm w-full md:w-fit mx-auto mb-8 md:mb-10 overflow-x-auto scrollbar-hide no-scrollbar">
        {[
          { label: 'All Signal', id: 'all', icon: 'dvr' },
          { label: 'Issues', id: 'issue', icon: 'error_outline' },
          { label: 'Discussions', id: 'discussion', icon: 'chat' },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setActiveFilter(btn.id as any)}
            className={`flex items-center shrink-0 gap-2 px-4 md:px-6 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
              activeFilter === btn.id
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-text-muted hover:bg-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[14px] md:text-sm">{btn.icon}</span>
            <span className="whitespace-nowrap">{btn.label}</span>
          </button>
        ))}
      </div>

      {filteredPosts.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-border">
          <div className="w-20 h-20 rounded-full bg-surface-muted flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-text-muted opacity-30">feed</span>
          </div>
          <h3 className="text-xl font-black text-text-primary uppercase tracking-tight mb-2">No Activations Found</h3>
          <p className="text-sm font-bold text-text-muted uppercase tracking-widest px-10">Try a different filter or be the first to start a conversation</p>
        </div>
      ) : (
        filteredPosts.map((post: any) => {
        const postComments = (commentsByPost[post.id] || []).sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1
          if (!a.is_pinned && b.is_pinned) return 1
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        const topLevel = postComments.filter((c: any) => !c.parent_id)
        const repliesByParent = postComments.reduce((acc: Record<string, any[]>, c: any) => {
          if (!c.parent_id) return acc
          if (!acc[c.parent_id]) acc[c.parent_id] = []
          acc[c.parent_id].push(c)
          return acc
        }, {})
        const isExpanded = expandedPostId === post.id

        return (
          <article
            key={post.id}
            className={`bg-white rounded-[2.5rem] border overflow-hidden transition-all duration-500 ${
              isExpanded ? 'border-primary/40 shadow-2xl ring-1 ring-primary/5' : 'border-border hover:border-primary/25 hover:shadow-xl'
            }`}
          >
            {/* Header / Trigger */}
            <div
              onClick={() => openThread(post.id)}
              className="w-full text-left p-8 md:p-10 cursor-pointer group"
            >
              <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-6">
                <div className="flex-1 w-full text-left">
                  <div className="flex items-center flex-wrap gap-2 md:gap-3 mb-4">
                    <span className={`px-2.5 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest ${post.is_question ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'}`}>
                      {post.is_question ? 'Support Issue' : 'Discussion'}
                    </span>
                    {post.is_completed && (
                      <span className="px-2.5 md:px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                        <span className="material-symbols-outlined text-[11px] md:text-[12px]">check_circle</span>
                        Done
                      </span>
                    )}
                    {post.moderation === 'pending' && (
                      <span className="px-2.5 md:px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-[9px] md:text-[10px] font-black uppercase tracking-widest animate-pulse">
                        Pending
                      </span>
                    )}
                    <span className="text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      {formatDistanceToNow(new Date(post.created_at))} ago
                    </span>
                  </div>
                  <h3 className="text-xl md:text-3xl font-black tracking-tight text-text-primary leading-[1.2] md:leading-[1.15]">
                    {post.title}
                  </h3>
                  <p className="text-text-secondary mt-3 md:mt-4 text-sm md:text-base font-medium line-clamp-3 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                    {post.content}
                  </p>
                  
                  {/* Post Attachments */}
                  {(post.image_url || post.file_url) && (
                    <div className="mt-4 md:mt-6 flex flex-wrap gap-3 md:gap-4">
                      {post.image_url && (
                        <div className="relative w-full max-w-sm aspect-video rounded-2xl md:rounded-3xl overflow-hidden border border-border shadow-md">
                          <Image src={getOptimizedImageUrl(post.image_url, 800, 450)} alt="Post image" fill className="object-cover" unoptimized />
                        </div>
                      )}
                      {post.file_url && (
                        <a 
                          href={getSafeHref(post.file_url)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 md:gap-3 px-4 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl bg-surface border border-border text-text-primary hover:border-primary/50 transition-all group/file"
                        >
                          <span className="material-symbols-outlined text-primary group-hover/file:scale-110 transition-transform text-lg">description</span>
                          <div className="text-left">
                            <p className="text-[10px] md:text-xs font-black uppercase tracking-tight">View Attachment</p>
                            <p className="text-[8px] md:text-[9px] font-bold text-text-muted uppercase tracking-widest">Download File</p>
                          </div>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex md:flex-col items-center justify-between md:justify-center p-3 md:p-4 bg-surface rounded-2xl md:rounded-3xl w-full md:min-w-[100px] border border-border/50 relative">
                  <div className="flex flex-row md:flex-col items-center gap-2 md:absolute md:-top-3 md:-right-3 z-20 order-2 md:order-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePostLike(post.id); }}
                      className={cn(
                        "w-7 h-7 md:w-8 md:h-8 rounded-full border shadow-lg flex items-center justify-center transition-all active:scale-75",
                        userLikedPostIds.has(post.id) 
                          ? "bg-rose-500 text-white border-rose-500 shadow-rose-200" 
                          : "bg-white text-slate-400 border-border hover:text-rose-500 hover:bg-rose-50"
                      )}
                      title={userLikedPostIds.has(post.id) ? 'Unlike Discussion' : 'Like Discussion'}
                    >
                      <span className="material-symbols-outlined text-[14px] md:text-[16px]" style={{ fontVariationSettings: userLikedPostIds.has(post.id) ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                    </button>

                    {(currentUserId === communityOwnerId || isViewerAdmin) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePinPost(post.id, post.is_pinned); }}
                        className={`w-7 h-7 md:w-8 md:h-8 rounded-full border shadow-lg flex items-center justify-center transition-all ${
                          post.is_pinned ? 'bg-primary text-white border-primary shadow-primary/20' : 'bg-white text-text-muted hover:text-primary border-border'
                        }`}
                        title={post.is_pinned ? 'Unpin Discussion' : 'Pin Discussion'}
                      >
                        <span className="material-symbols-outlined text-sm" style={post.is_pinned ? { fontVariationSettings: "'FILL' 1" } : {}}>push_pin</span>
                      </button>
                    )}
                    
                    {(currentUserId === communityOwnerId || isViewerAdmin) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCompletePost(post.id, post.is_completed); }}
                        className={`w-7 h-7 md:w-8 md:h-8 rounded-full border shadow-lg flex items-center justify-center transition-all ${
                          post.is_completed ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-text-muted hover:text-emerald-500 border-border'
                        }`}
                        title={post.is_completed ? 'Mark as Active' : 'Mark as Completed'}
                      >
                        <span className="material-symbols-outlined text-sm" style={post.is_completed ? { fontVariationSettings: "'FILL' 1" } : {}}>check_circle</span>
                      </button>
                    )}
                    
                    {canDeletePost(post) && (
                      <div className="relative">
                        {confirmDeletePostId === post.id ? (
                          <div className="flex items-center gap-2 bg-white shadow-xl border border-border p-1 md:p-1.5 px-2 md:px-3 rounded-full absolute right-0 top-0 whitespace-nowrap animate-in slide-in-from-right-2 fade-in duration-200 z-50">
                            <span className="text-[8px] md:text-[9px] font-black text-text-primary uppercase mr-1">Delete?</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); removePost(post.id); }}
                              className="text-[8px] md:text-[9px] font-black text-white bg-destructive px-2 md:px-3 py-1 rounded-full uppercase hover:bg-destructive/90 transition-all"
                            >
                              Yes
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeletePostId(null); }}
                              className="text-[8px] md:text-[9px] font-black text-text-muted uppercase px-1 hover:text-text-primary transition-all"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeletePostId(post.id); }}
                            className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white text-rose-500 border border-border/50 shadow-lg flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all group/trash"
                            title="Delete Discussion"
                          >
                            <span className="material-symbols-outlined text-sm group-hover/trash:scale-110 transition-transform">delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 md:flex-col md:gap-0 order-1 md:order-2">
                    <div className="flex flex-col items-center">
                      <span className="text-lg md:text-2xl font-black text-text-primary leading-tight">{post.like_count || 0}</span>
                      <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-text-muted">Likes</span>
                    </div>
                    <div className="hidden md:block w-8 h-px bg-border/50 my-2" />
                    <div className="flex flex-col items-center">
                      <span className="text-base md:text-xl font-black text-text-primary/60 leading-tight">{topLevel.length}</span>
                      <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-text-muted">Replies</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {post.is_pinned && (
                <div className="flex items-center gap-2 mb-6 px-4 py-2 bg-primary/5 border border-primary/10 rounded-2xl w-fit animate-in fade-in slide-in-from-left duration-300">
                  <span className="material-symbols-outlined text-sm text-primary fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>push_pin</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Pinned by Community Owner</span>
                </div>
              )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-6 md:pt-6 border-t border-surface">
                  <div className="flex items-center gap-3">
                    <UserLink user={post.author} size="sm" className="font-black text-text-primary" isAnonymous={post.is_anonymous} viewerRole={isViewerAdmin ? 'admin' : 'user'} />
                    <p className="text-[8px] md:text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      in {post.community?.name || 'Community'}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-end gap-2 text-primary group-hover:gap-4 transition-all">
                    <span className="text-[10px] md:text-sm font-black uppercase tracking-widest">
                      {isExpanded ? 'Hide' : 'Join Discussion'}
                    </span>
                    <span className="material-symbols-outlined text-[16px] md:text-lg">
                      {isExpanded ? 'keyboard_arrow_up' : 'trending_flat'}
                    </span>
                  </div>
                </div>
            </div>

            {/* Conversation Feed */}
            {isExpanded && (
              <div className="bg-surface/30 p-8 md:p-10 space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
                {/* Main Reply Box */}
                <div className="relative bg-white rounded-[2rem] p-6 shadow-sm border border-border group focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                  <div className="flex gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center text-text-muted">
                      <span className="material-symbols-outlined text-xl">account_circle</span>
                    </div>
                    <div className="flex-1 space-y-4">
                      <textarea
                        value={postDrafts[post.id] || ''}
                        onChange={(e) => setPostDrafts((prev) => ({ ...prev, [post.id]: e.target.value.slice(0, 500) }))}
                        className="w-full bg-surface border-none rounded-2xl p-4 text-sm focus:ring-0 placeholder:text-text-muted font-medium min-h-[100px] resize-none"
                        placeholder={canInteract ? 'Add your perspective or help with this issue...' : 'Please join the community to discuss this issue.'}
                        disabled={!canInteract || submittingForPostId === post.id}
                      />
                      <div className="flex flex-col gap-4 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-widest">
                            {(postDrafts[post.id] || '').length}/500 chars
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsAnonymousReply(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                            className={cn(
                              "flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border transition-all",
                              isAnonymousReply[post.id] ? "bg-slate-800 text-white border-slate-800" : "bg-white text-text-muted border-border"
                            )}
                          >
                            <span className="material-symbols-outlined text-[12px] md:text-[14px]">
                              {isAnonymousReply[post.id] ? 'visibility_off' : 'visibility'}
                            </span>
                            {isAnonymousReply[post.id] ? 'Anon' : 'Public'}
                          </button>
                        </div>
                        <button
                          onClick={() => createComment({ postId: post.id, isAnonymous: isAnonymousReply[post.id] })}
                          disabled={submittingForPostId === post.id || !(postDrafts[post.id] || '').trim()}
                          className="w-full px-8 py-3 rounded-full bg-primary text-white text-[10px] md:text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {submittingForPostId === post.id ? 'Sending...' : 'Post Reply'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-8 relative">
                  {loadingPostId === post.id ? (
                    <div className="py-10 text-center">
                      <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-4"></div>
                      <p className="text-sm font-bold text-text-secondary uppercase tracking-widest">Loading Discussion...</p>
                    </div>
                  ) : topLevel.length === 0 ? (
                    <div className="py-12 px-6 rounded-[2.5rem] border-2 border-dashed border-border bg-white text-center">
                      <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-text-muted opacity-40">chat_bubble</span>
                      </div>
                      <h4 className="text-sm font-black text-text-primary uppercase tracking-tight mb-1">Be the first to reply</h4>
                      <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Help the community by sharing your knowledge</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {topLevel.map((comment: any) => (
                        <div key={comment.id} className="group/comment relative">
                          <div className="flex items-start gap-2 md:gap-4">
                            <div className="hidden md:block shrink-0">
                              <UserLink user={comment.author} size="sm" showName={false} isAnonymous={comment.is_anonymous} viewerRole={isViewerAdmin ? 'admin' : 'user'} />
                            </div>
                            
                            <div className="flex-1 bg-white border border-border rounded-2xl md:rounded-[2rem] p-4 md:p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] group-hover/comment:shadow-md transition-all overflow-hidden">
                              <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center flex-wrap gap-2">
                                    <UserLink user={comment.author} size="xs" isAnonymous={comment.is_anonymous} viewerRole={isViewerAdmin ? 'admin' : 'user'} />
                                    <span className="hidden md:block w-1 h-1 rounded-full bg-text-muted/30"></span>
                                    <span className="text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                      {formatDistanceToNow(new Date(comment.created_at))} ago
                                    </span>
                                    {comment.is_pinned && (
                                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] md:text-[9px] font-black uppercase tracking-tighter">
                                        <span className="material-symbols-outlined text-[10px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>push_pin</span>
                                        Pinned
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    {currentUserId === communityOwnerId && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); togglePinComment(post.id, comment.id, comment.is_pinned); }}
                                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                          comment.is_pinned ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-primary hover:bg-primary/10'
                                        }`}
                                        title={comment.is_pinned ? 'Unpin comment' : 'Pin comment'}
                                      >
                                        <span className="material-symbols-outlined text-[14px] md:text-sm" style={comment.is_pinned ? { fontVariationSettings: "'FILL' 1" } : {}}>push_pin</span>
                                      </button>
                                    )}
                                    
                                    {canDeleteComment(post, comment) && (
                                      <div className="relative flex items-center gap-2">
                                        {confirmDeleteId === comment.id ? (
                                          <div className="flex items-center gap-2 bg-destructive/5 p-1 px-3 rounded-full border border-destructive/20 animate-in fade-in zoom-in duration-300 z-50 absolute right-0 top-0 bg-white shadow-xl whitespace-nowrap">
                                            <span className="text-[8px] md:text-[9px] font-black text-destructive uppercase tracking-tighter">Delete?</span>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); removeComment(post.id, comment.id); }}
                                              className="text-[8px] md:text-[9px] font-black text-white bg-destructive px-2 md:px-3 py-1 rounded-full uppercase hover:bg-destructive/90 transition-all"
                                            >
                                              Yes
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                              className="text-[8px] md:text-[9px] font-black text-text-muted hover:text-text-primary uppercase"
                                            >
                                              No
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(comment.id); }}
                                            className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all shadow-sm group/trash"
                                            title="Delete comment"
                                          >
                                            <span className="material-symbols-outlined text-[14px] md:text-sm group-hover/trash:scale-110 transition-transform">delete</span>
                                          </button>
                                        )}
                                      </div>
                                    )}
                                </div>
                              </div>
                              
                              <p className="text-xs md:text-sm font-medium text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
                                {comment.content}
                              </p>
                              
                              <div className="mt-4 md:mt-6 flex items-center gap-4 md:gap-6">
                                <button
                                  onClick={() => toggleLike(comment.id)}
                                  className={`flex items-center gap-1.5 md:gap-2 transition-all active:scale-90 ${
                                    userLikedCommentIds.has(comment.id) ? 'text-primary' : 'text-text-muted hover:text-primary'
                                  }`}
                                >
                                  <span className={`material-symbols-outlined text-base md:text-lg ${userLikedCommentIds.has(comment.id) ? 'fill' : ''}`} style={userLikedCommentIds.has(comment.id) ? { fontVariationSettings: "'FILL' 1" } : {}}>
                                    thumb_up
                                  </span>
                                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">{comment.like_count || 0}</span>
                                </button>
                                <button
                                  onClick={() => setReplyingToCommentId((prev) => (prev === comment.id ? null : comment.id))}
                                  className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
                                    replyingToCommentId === comment.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface text-text-muted hover:bg-primary/10 hover:text-primary'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[14px] md:text-sm">reply</span>
                                  {replyingToCommentId === comment.id ? 'Cancel' : 'Reply'}
                                </button>
                              </div>

                              {/* Nested Replies Rendering */}
                              {(repliesByParent[comment.id] || []).length > 0 && (
                                <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-surface space-y-4 md:space-y-6">
                                  {repliesByParent[comment.id].map((reply: any) => (
                                    <div key={reply.id} className="group/reply flex gap-2 md:gap-3 px-2 md:px-4 py-2 md:py-3 rounded-xl md:rounded-2xl bg-surface/50 border border-surface transition-all hover:bg-surface overflow-hidden">
                                      <div className="shrink-0">
                                        <UserLink user={reply.author} size="xs" isAnonymous={reply.is_anonymous} viewerRole={isViewerAdmin ? 'admin' : 'user'} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-1 gap-2">
                                          <div className="flex items-center flex-wrap gap-1.5 md:gap-2">
                                            <p className="text-[10px] md:text-xs font-black text-text-primary uppercase tracking-tight truncate max-w-[80px] md:max-w-none">
                                              {reply.is_anonymous ? 'Member' : (reply.author?.full_name || 'Alumni')}
                                            </p>
                                            <span className="text-[8px] md:text-[9px] font-bold text-text-muted uppercase tracking-widest whitespace-nowrap">
                                              • {formatDistanceToNow(new Date(reply.created_at))} ago
                                            </span>
                                          </div>
                                          
                                          {canDeleteComment(post, reply) && (
                                            <div className="relative">
                                              {confirmDeleteId === reply.id ? (
                                                <div className="flex items-center gap-1.5 bg-white shadow-xl border border-border p-1 px-2 rounded-full absolute right-0 top-0 z-50 animate-in slide-in-from-right-1 fade-in duration-200 whitespace-nowrap">
                                                  <button
                                                    onClick={(e) => { e.stopPropagation(); removeComment(post.id, reply.id); }}
                                                    className="text-[8px] font-black text-white bg-destructive px-2 py-0.5 rounded-full uppercase"
                                                  >
                                                    Del
                                                  </button>
                                                  <button
                                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                                    className="text-[8px] font-black text-text-muted uppercase px-1"
                                                  >
                                                    X
                                                  </button>
                                                </div>
                                              ) : (
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(reply.id); }}
                                                  className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-all"
                                                  title="Delete reply"
                                                >
                                                  <span className="material-symbols-outlined text-[12px] md:text-[14px]">delete</span>
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        <p className="text-[11px] md:text-xs font-medium text-text-secondary leading-normal break-words">
                                          {reply.content}
                                        </p>
                                        <div className="mt-2 flex items-center gap-3 md:gap-4">
                                          <button
                                            onClick={() => toggleLike(reply.id)}
                                            className={`flex items-center gap-1 transition-all active:scale-95 ${
                                              userLikedCommentIds.has(reply.id) ? 'text-primary' : 'text-text-muted hover:text-primary'
                                            }`}
                                          >
                                            <span className={`material-symbols-outlined text-[14px] md:text-base ${userLikedCommentIds.has(reply.id) ? 'fill' : ''}`} style={userLikedCommentIds.has(reply.id) ? { fontVariationSettings: "'FILL' 1" } : {}}>
                                              thumb_up
                                            </span>
                                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">{reply.like_count || 0}</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Inline Reply Form */}
                              {replyingToCommentId === comment.id && (
                                <div className="mt-6 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                  <textarea
                                    value={replyDrafts[comment.id] || ''}
                                    onChange={(e) =>
                                      setReplyDrafts((prev) => ({ ...prev, [comment.id]: e.target.value.slice(0, 500) }))
                                    }
                                    autoFocus
                                    className="flex-1 bg-surface border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 min-h-[60px] resize-none"
                                    placeholder={canInteract ? "Write a nested response..." : "Please join the community to discuss this issue."}
                                    disabled={!canInteract || submittingReplyForCommentId === comment.id}
                                  />
                                  <button
                                    onClick={() => createComment({ postId: post.id, parentId: comment.id })}
                                    disabled={submittingReplyForCommentId === comment.id || !(replyDrafts[comment.id] || '').trim()}
                                    className="shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-50"
                                  >
                                    <span className="material-symbols-outlined text-lg">send</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </article>
        )
      }))}

      {/* Infinite Scroll Load More Trigger */}
      {hasMore && (
        <div className="pt-10 flex justify-center">
          <button
            onClick={loadMorePosts}
            disabled={isLoadingMore}
            className="group relative flex items-center gap-3 px-10 py-5 bg-white border border-border rounded-[2rem] hover:border-primary/50 hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <span className="text-xs font-black uppercase tracking-widest text-text-primary">Synchronizing...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-primary group-hover:rotate-180 transition-transform duration-500">expand_more</span>
                <span className="text-xs font-black uppercase tracking-widest text-text-primary">Load More Discussions</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
