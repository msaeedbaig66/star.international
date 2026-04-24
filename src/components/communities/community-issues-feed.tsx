'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
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
import { ViewTracker } from '@/components/shared/view-tracker'
import { SafeTime } from '@/components/shared/safe-time'
import { createClient } from '@/lib/supabase/client'

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
 const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  
  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeMenuId && !(e.target as Element).closest('.action-menu-container')) {
        setActiveMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeMenuId])
 const [confirmDeletePostId, setConfirmDeletePostId] = useState<string | null>(null)
 const [userLikedCommentIds, setUserLikedCommentIds] = useState<Set<string>>(
 () => new Set((initialComments || []).filter(c => c.isLiked).map(c => c.id))
 )
 const [userLikedPostIds, setUserLikedPostIds] = useState<Set<string>>(
 () => new Set((initialPosts || []).filter(p => p.isLiked).map(p => p.id))
 )
 const [isAnonymousReply, setIsAnonymousReply] = useState<Record<string, boolean>>({}) // key: postId or parentId
 const [poppedId, setPoppedId] = useState<string | null>(null)
 
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

  // Real-time synchronization
  useEffect(() => {
    const supabase = createClient()
    
    const channel = supabase
      .channel(`community-${communityId}-realtime`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `community_id=eq.${communityId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch post with author profile relations
            const { data: newPost } = await supabase
              .from('posts')
              .select('*, author:profiles!author_id(id,username,full_name,avatar_url,university,bio,follower_count,following_count)')
              .eq('id', payload.new.id)
              .single()
            
            if (newPost) {
              setPosts((prev) => {
                if (prev.some(p => p.id === newPost.id)) return prev
                return [newPost, ...prev]
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            setPosts((prev) => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p))
          } else if (payload.eventType === 'DELETE') {
            setPosts((prev) => prev.filter(p => p.id !== payload.old.id))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the new comment with author data
            const { data: newComment } = await supabase
              .from('comments')
              .select('*, author:profiles!author_id(id,username,full_name,avatar_url)')
              .eq('id', payload.new.id)
              .single()
            
            if (newComment && newComment.post_id) {
              setPosts(prevPosts => {
                const isOurPost = prevPosts.some(p => p.id === newComment.post_id)
                if (isOurPost) {
                  setComments(prev => {
                    if (prev.some(c => c.id === newComment.id)) return prev
                    return [...prev, newComment]
                  })
                  // Increment reply count on the post UI
                  return prevPosts.map(p => p.id === newComment.post_id ? { ...p, reply_count: (p.reply_count || 0) + 1 } : p)
                }
                return prevPosts
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            setComments((prev) => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c))
          } else if (payload.eventType === 'DELETE') {
            setComments((prev) => {
              const comment = prev.find(c => c.id === payload.old.id)
              if (comment) {
                setPosts(currPosts => currPosts.map(p => p.id === comment.post_id ? { ...p, reply_count: Math.max(0, (p.reply_count || 0) - 1) } : p))
              }
              return prev.filter(c => c.id !== payload.old.id)
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [communityId])

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
 // If we are in initialExpandedId (thread view), don't allow closing
 if (initialExpandedId === postId) return

 const next = expandedPostId === postId ? null : postId
 setExpandedPostId(next)
 if (next) {
 
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

 // Optimistic Update
 const tempId = `temp-${Date.now()}`
 const newComment = {
 id: tempId,
 post_id: postId,
 parent_id: parentId || null,
 content,
 created_at: new Date().toISOString(),
 is_anonymous: isAnonymous || false,
 author: {
 full_name: 'You',
 avatar_url: null,
 username: 'me'
 },
 like_count: 0,
 isLiked: false,
 moderation: 'pending'
 }

 setComments(prev => [newComment, ...prev])
 setPosts(prev => prev.map(p => p.id === postId ? { ...p, reply_count: (p.reply_count || 0) + 1 } : p))

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
 } else {
 setPostDrafts((prev) => ({ ...prev, [postId]: '' }))
 }

 const json = await res.json()
 if (json.data) {
 setComments(prev => prev.map(c => c.id === tempId ? json.data : c))
 }
 } catch (error: any) {
 toast.error(error?.message || 'Unable to post')
 setComments(prev => prev.filter(c => c.id !== tempId))
 setPosts(prev => prev.map(p => p.id === postId ? { ...p, reply_count: Math.max(0, (p.reply_count || 0) - 1) } : p))
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
 
 // Calculate how many items are being removed (comment + its replies)
 const itemsToRemove = comments.filter(c => c.id === commentId || c.parent_id === commentId)
 const removedCount = itemsToRemove.length

 // Update local states
 setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId))
 setPosts(prev => prev.map(p => p.id === postId ? { ...p, reply_count: Math.max(0, (p.reply_count || 0) - removedCount) } : p))

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
    setComments(prev => prev.filter(c => c.post_id !== postId))
    setConfirmDeletePostId(null)

    if (initialExpandedId === postId) {
      router.push(ROUTES.communities.detail(communityId))
    }
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

 if (nextLiked) {
 setPoppedId(commentId)
 setTimeout(() => setPoppedId(null), 450)
 }

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

 if (nextLiked) {
 setPoppedId(postId)
 setTimeout(() => setPoppedId(null), 450)
 }

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
 className={`bg-white rounded-[2.5rem] border transition-all duration-500 ${
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
  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] ${post.is_question ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-primary/5 text-primary border border-primary/10'}`}>
  {post.is_question ? 'Support Issue' : 'Discussion'}
  </span>
  {post.is_completed && (
  <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-[0.1em] flex items-center gap-1">
  <span className="material-symbols-outlined text-[12px]">check_circle</span>
  Resolved
  </span>
  )}
 {post.moderation === 'pending' && (
 <span className="px-2.5 md:px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-[9px] md:text-[10px] font-black uppercase tracking-widest animate-pulse">
 Pending
 </span>
 )}
  <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-widest">
  <SafeTime date={post.created_at} />
  <span>ago</span>
  </div>
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

  <div className="flex flex-col items-center gap-2">
  <button
  onClick={(e) => { e.stopPropagation(); togglePostLike(post.id); }}
  className={cn(
  "w-9 h-9 rounded-xl border shadow-sm flex items-center justify-center transition-all active:scale-75",
  userLikedPostIds.has(post.id) 
  ? "bg-rose-500 text-white border-rose-500 shadow-rose-200" 
  : "bg-white text-slate-400 border-border hover:text-rose-500 hover:bg-rose-50",
  poppedId === post.id && "animate-like-pop"
  )}
  title={userLikedPostIds.has(post.id) ? 'Unlike Discussion' : 'Like Discussion'}
  >
  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: userLikedPostIds.has(post.id) ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
  </button>

  {(currentUserId === communityOwnerId || isViewerAdmin) && (
  <button
  onClick={(e) => { e.stopPropagation(); togglePinPost(post.id, post.is_pinned); }}
  className={`w-9 h-9 rounded-xl border shadow-sm flex items-center justify-center transition-all ${
  post.is_pinned ? 'bg-primary text-white border-primary shadow-primary/20' : 'bg-white text-text-muted hover:text-primary border-border'
  }`}
  title={post.is_pinned ? 'Unpin Discussion' : 'Pin Discussion'}
  >
  <span className="material-symbols-outlined text-lg" style={post.is_pinned ? { fontVariationSettings: "'FILL' 1" } : {}}>push_pin</span>
  </button>
  )}
  
  {(currentUserId === communityOwnerId || isViewerAdmin) && (
  <button
  onClick={(e) => { e.stopPropagation(); toggleCompletePost(post.id, post.is_completed); }}
  className={`w-9 h-9 rounded-xl border shadow-sm flex items-center justify-center transition-all ${
  post.is_completed ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-text-muted hover:text-emerald-500 border-border'
  }`}
  title={post.is_completed ? 'Mark as Active' : 'Mark as Completed'}
  >
  <span className="material-symbols-outlined text-lg" style={post.is_completed ? { fontVariationSettings: "'FILL' 1" } : {}}>check_circle</span>
  </button>
  )}
  
   {canDeletePost(post) && (
   <div className="relative action-menu-container">
   <button
   onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === post.id ? null : post.id); }}
   className={cn(
   "w-9 h-9 rounded-xl border shadow-sm flex items-center justify-center transition-all",
   activeMenuId === post.id ? "bg-primary text-white border-primary" : "bg-white text-slate-400 border-border hover:bg-surface"
   )}
   >
   <span className="material-symbols-outlined text-lg">more_vert</span>
   </button>
   
   {activeMenuId === post.id && (
   <div className="absolute left-0 right-auto top-full mt-2 w-48 bg-white border border-border shadow-2xl rounded-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
   <div className="p-2 border-b border-surface">
   <p className="text-[9px] font-black uppercase tracking-widest text-text-muted px-3 py-1">Options</p>
   </div>
   <button
   onClick={(e) => { e.stopPropagation(); removePost(post.id); setActiveMenuId(null); }}
   className="w-full flex items-center gap-3 px-4 py-3 text-rose-600 hover:bg-rose-50 transition-colors text-left"
   >
   <span className="material-symbols-outlined text-lg">delete</span>
   <span className="text-xs font-black uppercase tracking-tight">Delete Issue</span>
   </button>
   </div>
   )}
   </div>
   )}
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
 
  <div className="flex items-center gap-6 md:gap-8 flex-1">
  <div className="flex items-center gap-2 group/stat">
  <span className="material-symbols-outlined text-[16px] md:text-[18px] text-rose-400" style={{ fontVariationSettings: userLikedPostIds.has(post.id) ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
  <div className="flex flex-col">
  <span className="text-[10px] md:text-xs font-black text-text-primary tabular-nums">{post.like_count || 0}</span>
  <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-text-muted">Likes</span>
  </div>
  </div>
  <div className="flex items-center gap-2 group/stat">
  <span className="material-symbols-outlined text-[16px] md:text-[18px] text-primary">chat_bubble</span>
  <div className="flex flex-col">
  <span className="text-[10px] md:text-xs font-black text-text-primary tabular-nums">{topLevel.length}</span>
  <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-text-muted">Replies</span>
  </div>
  </div>
  <div className="flex items-center gap-2 group/stat">
  <span className="material-symbols-outlined text-[16px] md:text-[18px] text-slate-300">visibility</span>
  <div className="flex flex-col">
  <span className="text-[10px] md:text-xs font-black text-text-primary tabular-nums">{post.view_count || 0}</span>
  <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-text-muted">Views</span>
  </div>
  </div>
  </div>
  
  <div className="flex items-center justify-end gap-3 text-primary group-hover:gap-5 transition-all bg-primary/5 px-6 py-2.5 rounded-full hover:bg-primary/10 border border-primary/10">
  <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] ml-1">
  {isExpanded ? 'Minimize' : 'Join Discussion'}
  </span>
  <span className="material-symbols-outlined text-[18px] md:text-xl">
  {isExpanded ? 'keyboard_arrow_up' : 'trending_flat'}
  </span>
  </div>
 </div>
 </div>

 {/* Conversation Feed */}
 {isExpanded && (
 <div className="bg-surface/30 p-8 md:p-10 space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
 <ViewTracker targetId={post.id} type="post" />
 {/* Main Reply Box */}
 <div className="relative bg-white rounded-[2rem] p-6 shadow-sm border border-border group focus-within:ring-4 focus-within:ring-primary/5 transition-all">
 <div className="flex gap-4">
  <div className="shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-surface-muted flex items-center justify-center text-text-muted">
  <span className="material-symbols-outlined text-lg md:text-xl">account_circle</span>
  </div>
 <div className="flex-1 space-y-4">
 <textarea onClick={(e) => e.stopPropagation()}
 value={postDrafts[post.id] || ''}
 onChange={(e) => setPostDrafts((prev) => ({ ...prev, [post.id]: e.target.value.slice(0, 500) }))}
 className="w-full bg-surface border-none rounded-2xl p-4 text-sm focus:ring-0 placeholder:text-text-muted font-medium min-h-[100px] resize-none"
 placeholder={canInteract ? 'Add your perspective or help with this issue...' : 'Please join the community to discuss this issue.'}
 disabled={!canInteract || submittingForPostId === post.id}
 />
   <div className="flex flex-col gap-4">
   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
  <span className="text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-widest">
  {(postDrafts[post.id] || '').length}/500 chars
  </span>
   <div className="flex flex-wrap items-center gap-2">
   {!canInteract && currentUserId && (
   <span className="text-[8px] md:text-[9px] font-black text-rose-500 uppercase tracking-tight bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
   Join Community to Reply
   </span>
   )}
  <div className="flex p-0.5 bg-surface border border-border rounded-lg">
  <button
  onClick={() => setIsAnonymousReply(prev => ({ ...prev, [post.id]: false }))}
  className={cn(
  "px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all flex items-center gap-1.5",
  !isAnonymousReply[post.id] ? "bg-white text-primary shadow-sm border border-primary/10" : "text-text-muted hover:text-text-primary"
  )}
  >
  <span className="material-symbols-outlined text-xs">visibility</span>
  Public
  </button>
  <button
  onClick={() => setIsAnonymousReply(prev => ({ ...prev, [post.id]: true }))}
  className={cn(
  "px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all flex items-center gap-1.5",
  isAnonymousReply[post.id] ? "bg-slate-800 text-white shadow-sm" : "text-text-muted hover:text-text-primary"
  )}
  >
  <span className="material-symbols-outlined text-xs">visibility_off</span>
  Anon
  </button>
  </div>
  </div>
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
 
 <div className="flex-1 bg-white border border-border rounded-2xl md:rounded-[2rem] p-4 md:p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] group-hover/comment:shadow-md transition-all relative">
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center flex-wrap gap-2">
 <UserLink user={comment.author} size="xs" isAnonymous={comment.is_anonymous} viewerRole={isViewerAdmin ? 'admin' : 'user'} />
 <span className="hidden md:block w-1 h-1 rounded-full bg-text-muted/30"></span>
  <div className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-widest">
  <SafeTime date={comment.created_at} />
  <span>ago</span>
  </div>
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
  <div className="relative action-menu-container">
  <button
  onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === comment.id ? null : comment.id); }}
  className={cn(
  "w-7 h-7 rounded-full flex items-center justify-center transition-all",
  activeMenuId === comment.id ? "text-primary bg-primary/10" : "text-text-muted hover:text-primary hover:bg-surface"
  )}
  >
  <span className="material-symbols-outlined text-[14px]">more_vert</span>
  </button>
  
  {activeMenuId === comment.id && (
  <div className="absolute left-0 right-auto top-full mt-1 w-32 bg-white border border-border shadow-2xl rounded-lg z-[100] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
  <button
  onClick={(e) => { e.stopPropagation(); removeComment(post.id, comment.id); setActiveMenuId(null); }}
  className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors text-left"
  >
  <span className="material-symbols-outlined text-sm">delete</span>
  <span className="text-[9px] font-black uppercase tracking-tight">Delete</span>
  </button>
  </div>
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
  className={cn(
  "flex items-center gap-1.5 md:gap-2 transition-all active:scale-90",
  userLikedCommentIds.has(comment.id) ? "text-rose-500" : "text-text-muted hover:text-rose-500",
  poppedId === comment.id && "animate-like-pop"
  )}
  >
  <span className="material-symbols-outlined text-base md:text-lg" style={{ fontVariationSettings: userLikedCommentIds.has(comment.id) ? "'FILL' 1" : "'FILL' 0" }}>
  favorite
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
  <div className="flex items-center gap-1 text-[8px] md:text-[9px] font-bold text-text-muted uppercase tracking-widest whitespace-nowrap">
  <span>•</span>
  <SafeTime date={reply.created_at} />
  <span>ago</span>
  </div>
 </div>
 
 {canDeleteComment(post, reply) && (
  <div className="relative action-menu-container">
  <button
  onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === reply.id ? null : reply.id); }}
  className={cn(
  "w-6 h-6 rounded-full flex items-center justify-center transition-all",
  activeMenuId === reply.id ? "text-primary bg-primary/10" : "text-text-muted hover:text-primary hover:bg-surface"
  )}
  >
  <span className="material-symbols-outlined text-[14px]">more_vert</span>
  </button>
  
  {activeMenuId === reply.id && (
  <div className="absolute left-0 right-auto top-full mt-1 w-32 bg-white border border-border shadow-2xl rounded-lg z-[100] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
  <button
  onClick={(e) => { e.stopPropagation(); removeComment(post.id, reply.id); setActiveMenuId(null); }}
  className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors text-left"
  >
  <span className="material-symbols-outlined text-sm">delete</span>
  <span className="text-[9px] font-black uppercase tracking-tight">Delete</span>
  </button>
  </div>
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
 <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
 <div className="flex gap-3">
 <textarea onClick={(e) => e.stopPropagation()}
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
 onClick={() => createComment({ postId: post.id, parentId: comment.id, isAnonymous: isAnonymousReply[comment.id] })}
 disabled={submittingReplyForCommentId === comment.id || !(replyDrafts[comment.id] || '').trim()}
 className="shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-50"
 >
 <span className="material-symbols-outlined text-lg">send</span>
 </button>
 </div>
 
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
 <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">
 {(replyDrafts[comment.id] || '').length}/500 chars
 </span>
 <div className="flex p-0.5 bg-surface border border-border rounded-lg">
 <button
 onClick={() => setIsAnonymousReply(prev => ({ ...prev, [comment.id]: false }))}
 className={cn(
 "px-2.5 py-1 rounded-md text-[8px] font-black uppercase transition-all flex items-center gap-1",
 !isAnonymousReply[comment.id] ? "bg-white text-primary shadow-sm border border-primary/10" : "text-text-muted hover:text-text-primary"
 )}
 >
 <span className="material-symbols-outlined text-[10px]">visibility</span>
 Public
 </button>
 <button
 onClick={() => setIsAnonymousReply(prev => ({ ...prev, [comment.id]: true }))}
 className={cn(
 "px-2.5 py-1 rounded-md text-[8px] font-black uppercase transition-all flex items-center gap-1",
 isAnonymousReply[comment.id] ? "bg-slate-800 text-white shadow-sm" : "text-text-muted hover:text-text-primary"
 )}
 >
 <span className="material-symbols-outlined text-[10px]">visibility_off</span>
 Anon
 </button>
 </div>
 </div>
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
