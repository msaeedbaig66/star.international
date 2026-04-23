import { createAdminClient } from '@/lib/supabase/admin'
import { CommentsManager } from '@/components/admin/comments-manager'
import { ROUTES } from '@/lib/routes'

export const dynamic = 'force-dynamic';

export default async function AdminCommentsPage() {
  const supabase = createAdminClient()

  const { data: comments } = await supabase
    .from('comments')
    .select('id, author_id, content, listing_id, blog_id, post_id, moderation, rejection_note, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(400)

  const safeComments = comments || []
  const authorIds = Array.from(new Set(safeComments.map((c: any) => c.author_id).filter(Boolean)))
  const listingIds = Array.from(new Set(safeComments.map((c: any) => c.listing_id).filter(Boolean)))
  const blogIds = Array.from(new Set(safeComments.map((c: any) => c.blog_id).filter(Boolean)))
  const postIds = Array.from(new Set(safeComments.map((c: any) => c.post_id).filter(Boolean)))

  const [{ data: authors }, { data: listings }, { data: blogs }, { data: posts }] = await Promise.all([
    authorIds.length
      ? supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', authorIds)
      : Promise.resolve({ data: [] as any[] }),
    listingIds.length
      ? supabase.from('listings').select('id, title').in('id', listingIds)
      : Promise.resolve({ data: [] as any[] }),
    blogIds.length
      ? supabase.from('blogs').select('id, title').in('id', blogIds)
      : Promise.resolve({ data: [] as any[] }),
    postIds.length
      ? supabase.from('posts').select('id, title, community_id').in('id', postIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const authorById = new Map((authors || []).map((a: any) => [a.id, a]))
  const listingById = new Map((listings || []).map((l: any) => [l.id, l]))
  const blogById = new Map((blogs || []).map((b: any) => [b.id, b]))
  const postById = new Map((posts || []).map((p: any) => [p.id, p]))

  const enriched = safeComments.map((comment: any) => {
    let targetType = 'unknown'
    let targetTitle = 'Unknown'
    let targetHref: string | null = null

    if (comment.listing_id) {
      targetType = 'listing'
      const listing = listingById.get(comment.listing_id)
      targetTitle = listing?.title || 'Listing'
      targetHref = ROUTES.marketplace.detail(comment.listing_id)
    } else if (comment.blog_id) {
      targetType = 'blog'
      const blog = blogById.get(comment.blog_id)
      targetTitle = blog?.title || 'Blog'
      targetHref = ROUTES.blog.detail(comment.blog_id)
    } else if (comment.post_id) {
      targetType = 'community'
      const post = postById.get(comment.post_id)
      targetTitle = post?.title || 'Community post'
      targetHref = post?.community_id ? ROUTES.communities.detail(post.community_id) : null
    }

    return {
      ...comment,
      author: authorById.get(comment.author_id) || null,
      target_type: targetType,
      target_title: targetTitle,
      target_href: targetHref,
    }
  })

  const stats = {
    pending: enriched.filter((c: any) => c.moderation === 'pending').length,
    approved: enriched.filter((c: any) => c.moderation === 'approved').length,
    rejected: enriched.filter((c: any) => c.moderation === 'rejected').length,
    total: enriched.length,
  }

  return <CommentsManager initialComments={enriched} stats={stats} />
}
