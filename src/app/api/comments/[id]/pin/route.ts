import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if comment exists and get post info
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id, post_id')
      .eq('id', params.id)
      .single()

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (!comment.post_id) {
      return NextResponse.json({ error: 'Only community discussion comments can be pinned' }, { status: 400 })
    }

    // Check community ownership
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('community_id')
      .eq('id', comment.post_id)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Parent post not found' }, { status: 404 })
    }

    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('owner_id')
      .eq('id', post.community_id)
      .single()

    if (communityError || !community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isOwner = community.owner_id === user.id
    const isAdmin = profile?.role === 'admin'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { is_pinned } = await request.json()

    const admin = createAdminClient()
    const { error: updateError } = await admin
      .from('comments')
      .update({ is_pinned, updated_at: new Date().toISOString() })
      .eq('id', params.id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to pin comment' }, { status: 500 })
  }
}
