import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type ListingRow = { id: string; title: string | null }
type BlogRow = { id: string; title: string | null; slug: string | null }
type PostRow = { id: string; title: string | null; community_id: string | null }
type CommunityRow = { id: string; slug: string | null; name: string | null }

function safeRouteKey(value: string | null | undefined, fallback: string) {
  const key = String(value || '').trim()
  if (!key || key === 'null' || key === 'undefined') return fallback
  return encodeURIComponent(key)
}

function isPermissionDenied(error: any) {
  const message = String(error?.message || '').toLowerCase()
  const code = String(error?.code || '').toUpperCase()
  return (
    code === '42501' ||
    message.includes('permission denied') ||
    message.includes('row-level security') ||
    message.includes('not allowed')
  )
}

export async function GET() {
  try {
    const auth = await createClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let adminClient: ReturnType<typeof createAdminClient> | null = null
    const getAdmin = () => {
      if (!adminClient) adminClient = createAdminClient()
      return adminClient
    }

    const queryWithAdminFallback = async <T>(
      runAuth: () => PromiseLike<{ data: T | null; error: any }>,
      runAdmin: ((admin: ReturnType<typeof createAdminClient>) => PromiseLike<{ data: T | null; error: any }>) | null = null
    ) => {
      const authRes = await runAuth()
      if (!authRes.error) return authRes.data
      if (!runAdmin || !isPermissionDenied(authRes.error)) throw authRes.error
      const adminRes = await runAdmin(getAdmin())
      if (adminRes.error) throw adminRes.error
      return adminRes.data
    }

    const [listings, blogs, posts] = await Promise.all([
      queryWithAdminFallback(
        () =>
          auth
            .from('listings')
            .select('id, title')
            .eq('seller_id', user.id)
            .limit(300),
        (admin) =>
          admin
            .from('listings')
            .select('id, title')
            .eq('seller_id', user.id)
            .limit(300)
      ),
      queryWithAdminFallback(
        () =>
          auth
            .from('blogs')
            .select('id, title, slug')
            .eq('author_id', user.id)
            .limit(300),
        (admin) =>
          admin
            .from('blogs')
            .select('id, title, slug')
            .eq('author_id', user.id)
            .limit(300)
      ),
      queryWithAdminFallback(
        () =>
          auth
            .from('posts')
            .select('id, title, community_id')
            .eq('author_id', user.id)
            .limit(300),
        (admin) =>
          admin
            .from('posts')
            .select('id, title, community_id')
            .eq('author_id', user.id)
            .limit(300)
      ),
    ])

    const listingRows = (listings || []) as ListingRow[]
    const blogRows = (blogs || []) as BlogRow[]
    const postRows = (posts || []) as PostRow[]

    const listingIds = listingRows.map((row) => row.id)
    const blogIds = blogRows.map((row) => row.id)
    const postIds = postRows.map((row) => row.id)
    const postCommunityIds = Array.from(new Set(postRows.map((row) => row.community_id).filter(Boolean))) as string[]

    const [listingComments, blogComments, postComments, communityRows] = await Promise.all([
      listingIds.length
        ? queryWithAdminFallback(
            () =>
              auth
                .from('comments')
                .select('id, content, created_at, moderation, listing_id, author:profiles!author_id(full_name, username, avatar_url)')
                .in('listing_id', listingIds)
                .order('created_at', { ascending: false })
                .limit(20),
            (admin) =>
              admin
                .from('comments')
                .select('id, content, created_at, moderation, listing_id, author:profiles!author_id(full_name, username, avatar_url)')
                .in('listing_id', listingIds)
                .order('created_at', { ascending: false })
                .limit(20)
          )
        : Promise.resolve([] as any[]),
      blogIds.length
        ? queryWithAdminFallback(
            () =>
              auth
                .from('comments')
                .select('id, content, created_at, moderation, blog_id, author:profiles!author_id(full_name, username, avatar_url)')
                .in('blog_id', blogIds)
                .order('created_at', { ascending: false })
                .limit(20),
            (admin) =>
              admin
                .from('comments')
                .select('id, content, created_at, moderation, blog_id, author:profiles!author_id(full_name, username, avatar_url)')
                .in('blog_id', blogIds)
                .order('created_at', { ascending: false })
                .limit(20)
          )
        : Promise.resolve([] as any[]),
      postIds.length
        ? queryWithAdminFallback(
            () =>
              auth
                .from('comments')
                .select('id, content, created_at, moderation, post_id, author:profiles!author_id(full_name, username, avatar_url)')
                .in('post_id', postIds)
                .order('created_at', { ascending: false })
                .limit(20),
            (admin) =>
              admin
                .from('comments')
                .select('id, content, created_at, moderation, post_id, author:profiles!author_id(full_name, username, avatar_url)')
                .in('post_id', postIds)
                .order('created_at', { ascending: false })
                .limit(20)
          )
        : Promise.resolve([] as any[]),
      postCommunityIds.length
        ? queryWithAdminFallback(
            () =>
              auth
                .from('communities')
                .select('id, slug, name')
                .in('id', postCommunityIds),
            (admin) =>
              admin
                .from('communities')
                .select('id, slug, name')
                .in('id', postCommunityIds)
          )
        : Promise.resolve([] as any[]),
    ])

    const listingById = new Map(listingRows.map((row) => [row.id, row]))
    const blogById = new Map(blogRows.map((row) => [row.id, row]))
    const postById = new Map(postRows.map((row) => [row.id, row]))
    const communityById = new Map(((communityRows || []) as CommunityRow[]).map((row) => [row.id, row]))
    const safeListingComments = (listingComments || []) as any[]
    const safeBlogComments = (blogComments || []) as any[]
    const safePostComments = (postComments || []) as any[]

    const events = [
      ...safeListingComments.map((comment) => {
        const listing = listingById.get(comment.listing_id)
        return {
          id: `listing-${comment.id}`,
          type: 'listing_comment',
          title: 'Comment on your item',
          message: `${comment.author?.full_name || comment.author?.username || 'Someone'}: ${comment.content || ''}`,
          created_at: comment.created_at,
          href: `/marketplace/${comment.listing_id}`,
          context_title: listing?.title || 'Listing',
          moderation: comment.moderation,
          actor: comment.author || null,
        }
      }),
      ...safeBlogComments.map((comment) => {
        const blog = blogById.get(comment.blog_id)
        const routeKey = safeRouteKey(blog?.slug, comment.blog_id)
        return {
          id: `blog-${comment.id}`,
          type: 'blog_comment',
          title: 'Comment on your blog',
          message: `${comment.author?.full_name || comment.author?.username || 'Someone'}: ${comment.content || ''}`,
          created_at: comment.created_at,
          href: `/blogs/${routeKey}`,
          context_title: blog?.title || 'Blog',
          moderation: comment.moderation,
          actor: comment.author || null,
        }
      }),
      ...safePostComments.map((comment) => {
        const post = postById.get(comment.post_id)
        const community = post?.community_id ? communityById.get(post.community_id) : null
        const communityKey = safeRouteKey(community?.slug, post?.community_id || '')
        return {
          id: `community-${comment.id}`,
          type: 'community_comment',
          title: 'Reply on your discussion',
          message: `${comment.author?.full_name || comment.author?.username || 'Someone'}: ${comment.content || ''}`,
          created_at: comment.created_at,
          href: post?.community_id ? `/communities/${communityKey}` : '/communities',
          context_title: post?.title || community?.name || 'Community discussion',
          moderation: comment.moderation,
          actor: comment.author || null,
        }
      }),
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 12)

    return NextResponse.json({ data: events, error: null })
  } catch (error: any) {
    console.error('Dashboard recent activity error:', error)
    return NextResponse.json({ data: null, error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
