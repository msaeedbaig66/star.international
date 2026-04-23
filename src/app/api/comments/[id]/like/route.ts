import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const commentIdSchema = z.string().uuid()
type AdminGetter = () => ReturnType<typeof createAdminClient>

type CommentVisibility = {
  id: string
  author_id: string
  moderation: 'pending' | 'approved' | 'rejected' | string
  listing_id: string | null
  blog_id: string | null
  post_id: string | null
}

async function isPublicCommentVisible(
  supabase: Awaited<ReturnType<typeof createClient>>,
  comment: CommentVisibility
) {
  if (comment.moderation !== 'approved') return false

  if (comment.listing_id) {
    const { data: listing, error } = await supabase
      .from('listings')
      .select('id')
      .eq('id', comment.listing_id)
      .eq('moderation', 'approved')
      .eq('status', 'available')
      .maybeSingle()
    if (error) throw error
    return !!listing
  }

  if (comment.blog_id) {
    const { data: blog, error } = await supabase
      .from('blogs')
      .select('id')
      .eq('id', comment.blog_id)
      .eq('moderation', 'approved')
      .maybeSingle()
    if (error) throw error
    return !!blog
  }

  if (comment.post_id) {
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, community_id, moderation')
      .eq('id', comment.post_id)
      .maybeSingle()
    if (postError) throw postError
    if (!post || post.moderation !== 'approved') return false

    if (post.community_id) {
      const { data: community, error: communityError } = await supabase
        .from('communities')
        .select('id')
        .eq('id', post.community_id)
        .eq('moderation', 'approved')
        .maybeSingle()
      if (communityError) throw communityError
      return !!community
    }

    return true
  }

  return false
}

async function canAccessHiddenComment(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  comment: CommentVisibility
) {
  if (comment.author_id === userId) return true

  if (comment.blog_id) {
    const { data: blog, error } = await admin
      .from('blogs')
      .select('author_id')
      .eq('id', comment.blog_id)
      .maybeSingle()
    if (error) throw error
    if (blog?.author_id === userId) return true
  }

  if (comment.listing_id) {
    const { data: listing, error } = await admin
      .from('listings')
      .select('seller_id')
      .eq('id', comment.listing_id)
      .maybeSingle()
    if (error) throw error
    if (listing?.seller_id === userId) return true
  }

  if (comment.post_id) {
    const { data: post, error } = await admin
      .from('posts')
      .select('author_id, community_id')
      .eq('id', comment.post_id)
      .maybeSingle()
    if (error) throw error
    if (post?.author_id === userId) return true

    if (post?.community_id) {
      const { data: community, error: communityError } = await admin
        .from('communities')
        .select('owner_id')
        .eq('id', post.community_id)
        .maybeSingle()
      if (communityError) throw communityError
      if (community?.owner_id === userId) return true
    }
  }

  return false
}

async function resolveCommentAccess(
  commentId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  getAdmin: AdminGetter,
  userId: string
) {
  const { data: viewerProfile, error: viewerError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  if (viewerError) throw viewerError
  const isAdmin = viewerProfile?.role === 'admin'

  const { data: publicComment, error: publicError } = await supabase
    .from('comments')
    .select('id, author_id, moderation, listing_id, blog_id, post_id')
    .eq('id', commentId)
    .eq('moderation', 'approved')
    .maybeSingle()
  if (publicError) throw publicError

  if (publicComment) {
    const visible = await isPublicCommentVisible(supabase, publicComment as CommentVisibility)
    if (visible) {
      return { comment: publicComment as CommentVisibility, useElevatedMutation: false as const }
    }
  }

  const admin = getAdmin()
  const { data: hiddenComment, error: hiddenError } = await admin
    .from('comments')
    .select('id, author_id, moderation, listing_id, blog_id, post_id')
    .eq('id', commentId)
    .maybeSingle()
  if (hiddenError) throw hiddenError
  if (!hiddenComment) return null

  if (isAdmin) {
    return { comment: hiddenComment as CommentVisibility, useElevatedMutation: true as const }
  }

  const canAccess = await canAccessHiddenComment(admin, userId, hiddenComment as CommentVisibility)
  if (!canAccess) return null

  return { comment: hiddenComment as CommentVisibility, useElevatedMutation: true as const }
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {

  try {
    const parsedCommentId = commentIdSchema.safeParse(params.id)
    if (!parsedCommentId.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsedCommentId.error.format() }, { status: 400 })
    }
    const commentId = parsedCommentId.data

    const supabase = await createClient()
    let adminClient: ReturnType<typeof createAdminClient> | null = null
    const getAdmin = () => {
      if (!adminClient) adminClient = createAdminClient()
      return adminClient
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const access = await resolveCommentAccess(commentId, supabase, getAdmin, user.id)
    if (!access) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

    const mutationClient = access.useElevatedMutation ? getAdmin() : supabase
    const { error: likeError } = await mutationClient
      .from('likes')
      .upsert({ user_id: user.id, comment_id: commentId }, { onConflict: 'user_id,comment_id', ignoreDuplicates: true })
    if (likeError && String((likeError as any).code || '') !== '23505') throw likeError

    const admin = getAdmin()
    const { count: likeCount, error: countError } = await admin
      .from('likes')
      .select('user_id', { count: 'exact', head: true })
      .eq('comment_id', commentId)
    if (countError) throw countError

    const { error: updateError } = await admin
      .from('comments')
      .update({ like_count: likeCount || 0, updated_at: new Date().toISOString() })
      .eq('id', commentId)
    if (updateError) throw updateError

    return NextResponse.json({ success: true, error: null })
  } catch (error: any) {
    return NextResponse.json({ data: null, error: 'Failed to process like' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {

  try {
    const parsedCommentId = commentIdSchema.safeParse(params.id)
    if (!parsedCommentId.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsedCommentId.error.format() }, { status: 400 })
    }
    const commentId = parsedCommentId.data

    const supabase = await createClient()
    let adminClient: ReturnType<typeof createAdminClient> | null = null
    const getAdmin = () => {
      if (!adminClient) adminClient = createAdminClient()
      return adminClient
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const access = await resolveCommentAccess(commentId, supabase, getAdmin, user.id)
    if (!access) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

    const mutationClient = access.useElevatedMutation ? getAdmin() : supabase
    const { error: deleteError } = await mutationClient
      .from('likes')
      .delete()
      .eq('user_id', user.id)
      .eq('comment_id', commentId)
    if (deleteError) throw deleteError

    const admin = getAdmin()
    const { count: likeCount, error: countError } = await admin
      .from('likes')
      .select('user_id', { count: 'exact', head: true })
      .eq('comment_id', commentId)
    if (countError) throw countError

    const { error: updateError } = await admin
      .from('comments')
      .update({ like_count: likeCount || 0, updated_at: new Date().toISOString() })
      .eq('id', commentId)
    if (updateError) throw updateError

    return NextResponse.json({ success: true, error: null })
  } catch (error: any) {
    return NextResponse.json({ data: null, error: 'Failed to process like' }, { status: 500 })
  }
}
