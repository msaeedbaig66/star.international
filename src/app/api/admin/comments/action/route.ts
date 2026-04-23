import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

type CommentAction = 'approve' | 'reject' | 'remove'

const commentActionSchema = z.object({
  comment_id: z.string().min(1),
  action: z.enum(['approve', 'reject', 'remove']),
  admin_message: z.string().trim().max(2000).optional(),
})

export async function POST(req: Request) {
  try {
    const auth = await createClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await auth.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = commentActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
    }
    const commentId = parsed.data.comment_id
    const action = parsed.data.action as CommentAction
    const adminMessage = parsed.data.admin_message || ''

    const admin = createAdminClient()
    const { data: existing, error: findError } = await admin
      .from('comments')
      .select('id, author_id, listing_id, blog_id, post_id, moderation')
      .eq('id', commentId)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (action === 'remove') {
      const { error: deleteError } = await admin.from('comments').delete().eq('id', commentId)
      if (deleteError) throw deleteError

      await admin.from('notifications').insert({
        user_id: existing.author_id,
        actor_id: user.id,
        type: 'comment_approved',
        message: adminMessage || 'Your comment was removed by admin moderation.',
        listing_id: existing.listing_id,
        blog_id: existing.blog_id,
        post_id: existing.post_id,
        comment_id: commentId,
        is_read: false,
      })

      return NextResponse.json({ success: true, deleted: true })
    }

    const moderation = action === 'approve' ? 'approved' : 'rejected'
    const rejectionNote = action === 'reject'
      ? (adminMessage || 'Comment rejected by admin moderation.')
      : null

    const { data: updated, error: updateError } = await admin
      .from('comments')
      .update({
        moderation,
        rejection_note: rejectionNote,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select('id, moderation, rejection_note')
      .single()

    if (updateError) throw updateError

    await admin.from('notifications').insert({
      user_id: existing.author_id,
      actor_id: user.id,
      type: 'comment_approved',
      message:
        action === 'approve'
          ? (adminMessage || 'Your comment is approved and now visible.')
          : (adminMessage || 'Your comment was rejected by admin moderation.'),
      listing_id: existing.listing_id,
      blog_id: existing.blog_id,
      post_id: existing.post_id,
      comment_id: commentId,
      is_read: false,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('Admin comment action error:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
