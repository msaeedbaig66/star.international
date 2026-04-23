import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const followPayloadSchema = z
  .object({
    targetType: z.enum(['blog', 'community']),
    targetId: z.string().uuid(),
  })
  .strict()

async function getViewerRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: viewerProfile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return viewerProfile?.role === 'admin' ? 'admin' : 'user'
}

async function resolveBlogAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetId: string,
  userId: string,
  role: 'admin' | 'user',
  getAdmin: (() => ReturnType<typeof createAdminClient>) | null
) {
  const { data: publicBlog, error: publicError } = await supabase
    .from('blogs')
    .select('id, author_id')
    .eq('id', targetId)
    .eq('moderation', 'approved')
    .maybeSingle()
  if (publicError) throw publicError
  if (publicBlog) return publicBlog

  const { data: ownBlog, error: ownError } = await supabase
    .from('blogs')
    .select('id, author_id')
    .eq('id', targetId)
    .eq('author_id', userId)
    .maybeSingle()
  if (ownError) throw ownError
  if (ownBlog) return ownBlog

  if (role !== 'admin' || !getAdmin) return null
  const admin = getAdmin()
  const { data: adminBlog, error: adminError } = await admin
    .from('blogs')
    .select('id, author_id')
    .eq('id', targetId)
    .maybeSingle()
  if (adminError) throw adminError
  return adminBlog
}

async function resolveCommunityAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetId: string,
  userId: string,
  role: 'admin' | 'user',
  getAdmin: (() => ReturnType<typeof createAdminClient>) | null
) {
  const { data: publicCommunity, error: publicError } = await supabase
    .from('communities')
    .select('id, owner_id')
    .eq('id', targetId)
    .eq('moderation', 'approved')
    .maybeSingle()
  if (publicError) throw publicError
  if (publicCommunity) return publicCommunity

  const { data: ownCommunity, error: ownError } = await supabase
    .from('communities')
    .select('id, owner_id')
    .eq('id', targetId)
    .eq('owner_id', userId)
    .maybeSingle()
  if (ownError) throw ownError
  if (ownCommunity) return ownCommunity

  if (role !== 'admin' || !getAdmin) return null
  const admin = getAdmin()
  const { data: adminCommunity, error: adminError } = await admin
    .from('communities')
    .select('id, owner_id')
    .eq('id', targetId)
    .maybeSingle()
  if (adminError) throw adminError
  return adminCommunity
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const parsed = followPayloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
    }

    const { targetType, targetId } = parsed.data
    const role = await getViewerRole(supabase, user.id)
    let adminClient: ReturnType<typeof createAdminClient> | null = null
    const getAdmin =
      role === 'admin'
        ? () => {
            if (!adminClient) adminClient = createAdminClient()
            return adminClient
          }
        : null

    if (targetType === 'blog') {
      const blog = await resolveBlogAccess(supabase, targetId, user.id, role, getAdmin)
      if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 })
      if (blog.author_id === user.id) return NextResponse.json({ error: 'Cannot follow your own blog' }, { status: 400 })

      const { error: followError } = await supabase
        .from('blog_follows')
        .upsert({ follower_id: user.id, blog_id: targetId }, { onConflict: 'follower_id,blog_id', ignoreDuplicates: true })
      if (followError) throw followError

      const { count } = await supabase
        .from('blog_follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('blog_id', targetId)
      return NextResponse.json({ success: true, isFollowing: true, count: count || 0, error: null })
    }

    const community = await resolveCommunityAccess(supabase, targetId, user.id, role, getAdmin)
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 })
    if (community.owner_id === user.id) return NextResponse.json({ error: 'Cannot follow your own community' }, { status: 400 })

    const { error: followError } = await supabase
      .from('community_follows')
      .upsert({ follower_id: user.id, community_id: targetId }, { onConflict: 'follower_id,community_id', ignoreDuplicates: true })
    if (followError) throw followError

    const { count } = await supabase
      .from('community_follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('community_id', targetId)
    return NextResponse.json({ success: true, isFollowing: true, count: count || 0, error: null })
  } catch (error: any) {
    console.error('content follows POST error', error)
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const parsed = followPayloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
    }

    const { targetType, targetId } = parsed.data
    const role = await getViewerRole(supabase, user.id)
    let adminClient: ReturnType<typeof createAdminClient> | null = null
    const getAdmin =
      role === 'admin'
        ? () => {
            if (!adminClient) adminClient = createAdminClient()
            return adminClient
          }
        : null

    if (targetType === 'blog') {
      const blog = await resolveBlogAccess(supabase, targetId, user.id, role, getAdmin)
      if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 })

      const { error: unfollowError } = await supabase
        .from('blog_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('blog_id', targetId)
      if (unfollowError) throw unfollowError

      const { count } = await supabase
        .from('blog_follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('blog_id', targetId)
      return NextResponse.json({ success: true, isFollowing: false, count: count || 0, error: null })
    }

    const community = await resolveCommunityAccess(supabase, targetId, user.id, role, getAdmin)
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 })

    const { error: unfollowError } = await supabase
      .from('community_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('community_id', targetId)
    if (unfollowError) throw unfollowError

    const { count } = await supabase
      .from('community_follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('community_id', targetId)
    return NextResponse.json({ success: true, isFollowing: false, count: count || 0, error: null })
  } catch (error: any) {
    console.error('content follows DELETE error', error)
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 })
  }
}
