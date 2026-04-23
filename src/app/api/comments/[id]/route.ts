import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const commentIdSchema = z.string().uuid()
const commentPatchSchema = z
  .object({
    content: z.string().trim().min(1).max(500),
  })
  .strict()

export async function PATCH(req: Request, { params }: { params: { id: string } }) {

  try {
    const parsedCommentId = commentIdSchema.safeParse(params.id)
    if (!parsedCommentId.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsedCommentId.error.format() }, { status: 400 })
    }
    const commentId = parsedCommentId.data

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const parsed = commentPatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
    }
    const { content } = parsed.data

    const { data, error } = await supabase
      .from('comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('author_id', user.id)
      .select('id, author_id, content, listing_id, blog_id, post_id, moderation, like_count, created_at, updated_at')
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    return NextResponse.json({ data, error: null })
  } catch (error: any) {
    return NextResponse.json({ data: null, error: 'Failed to process comment' }, { status: 500 })
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: ownComment, error: ownReadError } = await supabase
      .from('comments')
      .select('id')
      .eq('id', commentId)
      .eq('author_id', user.id)
      .maybeSingle()
    if (ownReadError) throw ownReadError

    if (ownComment) {
      const { error: ownDeleteError } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('author_id', user.id)
      if (ownDeleteError) throw ownDeleteError
      return NextResponse.json({ success: true, error: null })
    }

    const { data: viewerProfile, error: viewerError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (viewerError) throw viewerError

    const admin = createAdminClient()
    const queryClient = admin || supabase
    const { data: comment, error: findError } = await queryClient
      .from('comments')
      .select('id, author_id, listing_id, blog_id, post_id')
      .eq('id', commentId)
      .maybeSingle()
    if (findError || !comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

    let canDelete = viewerProfile?.role === 'admin'

    if (!canDelete && comment.blog_id) {
      const blogClient = admin || supabase
      const { data: blog } = await blogClient.from('blogs').select('author_id').eq('id', comment.blog_id).single()
      canDelete = blog?.author_id === user.id
    }
    if (!canDelete && comment.post_id) {
      const postClient = admin || supabase
      const { data: post } = await postClient
        .from('posts')
        .select('author_id, community_id')
        .eq('id', comment.post_id)
        .single()
      if (post?.author_id === user.id) {
        canDelete = true
      } else if (post?.community_id) {
        const communityClient = admin || supabase
        const { data: community } = await communityClient
          .from('communities')
          .select('owner_id')
          .eq('id', post.community_id)
          .single()
        canDelete = community?.owner_id === user.id
      }
    }
    if (!canDelete && comment.listing_id) {
      const listingClient = admin || supabase
      const { data: listing } = await listingClient.from('listings').select('seller_id').eq('id', comment.listing_id).single()
      canDelete = listing?.seller_id === user.id
    }

    if (!canDelete) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

    const deleteClient = admin || supabase
    const { error } = await deleteClient.from('comments').delete().eq('id', commentId)
    if (error) throw error

    return NextResponse.json({ success: true, error: null })
  } catch (error: any) {
    return NextResponse.json({ data: null, error: 'Failed to process comment' }, { status: 500 })
  }
}
