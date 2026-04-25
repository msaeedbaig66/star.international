import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { commentSchema } from '@/lib/validations/comment'
import { deliverTargetedNotifications } from '@/lib/notification-delivery'
import { performModeration } from '@/lib/moderation'

type AdminClient = ReturnType<typeof createAdminClient>
const PUBLIC_AUTHOR_SELECT = 'id, username, full_name, avatar_url'
const COMMENTS_SELECT = `
 id,
 author_id,
 content,
 parent_id,
 listing_id,
 blog_id,
 post_id,
 moderation,
 rejection_note,
 is_pinned,
 is_anonymous,
 like_count,
 created_at,
 updated_at,
 author:profiles!author_id(${PUBLIC_AUTHOR_SELECT})
`
const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

function parsePositiveInteger(value: string | null, fallback: number) {
 const parsed = Number(value)
 if (!Number.isFinite(parsed) || parsed <= 0) return fallback
 return Math.floor(parsed)
}

async function canCommentOnTarget(
 supabase: Awaited<ReturnType<typeof createClient>>,
 admin: AdminClient | null,
 userId: string,
 target: { listing_id?: string | null; blog_id?: string | null; post_id?: string | null }
) {
 const { listing_id, blog_id, post_id } = target

 if (listing_id) {
 const { data: publicListing, error: publicError } = await supabase
 .from('listings')
 .select('id, seller_id, moderation, status')
 .eq('id', listing_id)
 .in('status', ['available', 'reserved'])
 .maybeSingle()

 if (publicError) console.error('canCommentOnTarget publicListing error:', publicError)
 
 // Listing must be approved to be visible/commentable by public
 if (publicListing && publicListing.moderation === 'approved') return true

 // Non-approved/seller-only listing found? 
 // Check if current user is the owner
 const { data: ownListing, error: ownError } = await supabase
 .from('listings')
 .select('id')
 .eq('id', listing_id)
 .eq('seller_id', userId)
 .maybeSingle()
 
 if (ownError) console.error('canCommentOnTarget ownListing error:', ownError)
 if (ownListing) return true
 
 console.warn(`canCommentOnTarget: Access denied for user ${userId} on listing ${listing_id}. Listing approved: ${publicListing?.moderation === 'approved'}, Is Owner: ${!!ownListing}`)
 return false
 }

 if (blog_id) {
 const { data: publicBlog, error: publicError } = await supabase
 .from('blogs')
 .select('id')
 .eq('id', blog_id)
 .eq('moderation', 'approved')
 .maybeSingle()
 if (publicError) throw publicError
 if (publicBlog) return true

 const { data: ownBlog, error: ownError } = await supabase
 .from('blogs')
 .select('id')
 .eq('id', blog_id)
 .eq('author_id', userId)
 .maybeSingle()
 if (ownError) throw ownError
 if (ownBlog) return true

 if (admin) {
 const { data: adminBlog, error: adminError } = await admin
 .from('blogs')
 .select('id')
 .eq('id', blog_id)
 .maybeSingle()
 if (adminError) throw adminError
 return !!adminBlog
 }

 return false
 }

 if (post_id) {
 const { data: publicPost, error: publicPostError } = await supabase
 .from('posts')
 .select('id, community_id')
 .eq('id', post_id)
 .eq('moderation', 'approved')
 .maybeSingle()
 if (publicPostError) throw publicPostError
 if (publicPost) {
 if (!publicPost.community_id) return true
 const { data: community, error: communityError } = await supabase
 .from('communities')
 .select('id')
 .eq('id', publicPost.community_id)
 .eq('moderation', 'approved')
 .maybeSingle()
 if (communityError) throw communityError
 if (community) return true
 }

 const { data: ownPost, error: ownPostError } = await supabase
 .from('posts')
 .select('id')
 .eq('id', post_id)
 .eq('author_id', userId)
 .maybeSingle()
 if (ownPostError) throw ownPostError
 if (ownPost) return true

 if (admin) {
 const { data: adminPost, error: adminPostError } = await admin
 .from('posts')
 .select('id')
 .eq('id', post_id)
 .maybeSingle()
 if (adminPostError) throw adminPostError
 return !!adminPost
 }
 }

 return false
}

export async function GET(request: Request) {
 try {
 const { searchParams } = new URL(request.url)
 const listingId = searchParams.get('listing_id')
 const blogId = searchParams.get('blog_id')
 const postId = searchParams.get('post_id')
 const cursor = searchParams.get('cursor')
 const limit = Math.min(parsePositiveInteger(searchParams.get('limit'), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE)
 
 const targetCount = [listingId, blogId, postId].filter(Boolean).length
 if (targetCount !== 1) {
 return NextResponse.json({ error: 'Exactly one of listing_id, blog_id, or post_id is required.' }, { status: 400 })
 }

 const supabase = await createClient()
 let query = supabase
 .from('comments')
 .select(COMMENTS_SELECT)
 .eq('moderation', 'approved')

 if (listingId) query = query.eq('listing_id', listingId)
 if (blogId) query = query.eq('blog_id', blogId)
 if (postId) query = query.eq('post_id', postId)

 // Cursor Pagination
 if (cursor) {
 query = query.lt('created_at', cursor)
 }

  const { data, error } = await query
  .order('is_pinned', { ascending: false })
  .order('created_at', { ascending: false })
  .limit(limit)

  if (error) throw error

  // Get viewer identity and role
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  let viewerRole = 'guest'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    viewerRole = profile?.role || 'user'
  }

  // Redact anonymous authors for privacy
  const redactedData = data.map(comment => {
    if (comment.is_anonymous) {
      const isAuthor = user?.id === comment.author_id
      const isAdmin = viewerRole === 'admin'

      if (!isAuthor && !isAdmin) {
        return {
          ...comment,
          author_id: 'anonymous',
          author: {
            id: 'anonymous',
            username: 'Anonymous',
            full_name: 'Anonymous Student',
            avatar_url: null
          }
        }
      }
    }
    return comment
  })

  const nextCursor = data.length === limit ? data[data.length - 1].created_at : null

  return NextResponse.json({ 
    data: redactedData, 
    nextCursor,
    count: redactedData.length,
    error: null 
  })
 } catch (error: any) {
 console.error('Comment GET API Error:', error)
 return NextResponse.json({ data: null, error: 'Failed to process comment' }, { status: 500 })
 }
}

export async function POST(request: Request) {
 try {
 const supabase = await createClient()
 const {
 data: { user },
 } = await supabase.auth.getUser()
 if (!user) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }

 const body = await request.json().catch(() => ({}))
 const parsed = commentSchema.safeParse(body)
 if (!parsed.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
 }

 const { listing_id, blog_id, post_id } = parsed.data
 const targetCount = [listing_id, blog_id, post_id].filter(Boolean).length
 if (targetCount !== 1) {
 return NextResponse.json({ error: 'Exactly one of listing_id, blog_id, or post_id is required.' }, { status: 400 })
 }

 const { data: viewerProfile, error: viewerError } = await supabase
 .from('profiles')
 .select('role')
 .eq('id', user.id)
 .maybeSingle()
 if (viewerError) throw viewerError
 const admin = viewerProfile?.role === 'admin' ? createAdminClient() : null

 const hasAccess = await canCommentOnTarget(supabase, admin, user.id, { listing_id, blog_id, post_id })
 if (!hasAccess) {
 console.warn('Comment POST: User has no access to target', { listing_id, blog_id, post_id, userId: user.id })
 return NextResponse.json({ error: 'Target not found or access denied' }, { status: 404 })
 }

 const isAdmin = viewerProfile?.role === 'admin';
 const finalIsAnonymous = (post_id || isAdmin) ? (parsed.data.is_anonymous || false) : false;

  // 3. Moderation Shield
  let moderationStatus = listing_id ? 'pending' : 'approved'
  let moderationReason = 'Standard auto-approve'

  if (isAdmin) {
  moderationStatus = 'approved'
  moderationReason = 'Admin bypass'
  } else {
  const modResult = await performModeration('Comment Content', parsed.data.content)
  // If AI flags it, it MUST be pending. If AI approves, we keep the default (listing=pending, others=approved)
  if (modResult.status === 'pending') {
  moderationStatus = 'pending'
  moderationReason = modResult.reason
  }
  }

  const { data: commentData, error: insertError } = await supabase
  .from('comments')
  .insert({
  author_id: user.id,
  content: parsed.data.content,
  parent_id: parsed.data.parent_id,
  listing_id: parsed.data.listing_id,
  blog_id: parsed.data.blog_id,
  post_id: parsed.data.post_id,
  is_anonymous: finalIsAnonymous,
  moderation: moderationStatus,
  moderation_reason: moderationReason,
  like_count: 0,
  })
 .select()
 .single()

 if (insertError) {
 console.error('Comment POST: Insert failed:', insertError)
 return NextResponse.json({ error: 'Failed to save comment', details: insertError.message }, { status: 500 })
 }

 // Note: Parent count updates (blog.comment_count, post.reply_count) are 
 // now handled automatically by the 'tr_on_comment_change' trigger in Postgres.
 
 return NextResponse.json({ data: commentData, error: null }, { status: 201 })
 } catch (error: any) {
 console.error('API Error:', error)
 return NextResponse.json({ data: null, error: 'Failed to process comment' }, { status: 500 })
 }
}
