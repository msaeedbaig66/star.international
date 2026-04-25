import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { postSchema } from '@/lib/validations/post'
import { deliverTargetedNotifications } from '@/lib/notification-delivery'
import { isAllowedPostImageUrl } from '@/lib/security/media-urls'
import { z } from 'zod'

const PUBLIC_AUTHOR_SELECT = 'id, username, full_name, avatar_url'
const communityIdSchema = z.string().uuid()
const POSTS_SELECT = `
 id,
 community_id,
 author_id,
 title,
 content,
 is_question,
 is_pinned,
 is_anonymous,
 moderation,
 rejection_note,
 like_count,
 reply_count,
 is_completed,
 image_url,
 file_url,
 created_at,
 updated_at,
 author:profiles!author_id(${PUBLIC_AUTHOR_SELECT})
`
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

function parsePositiveInteger(value: string | null, fallback: number) {
 const parsed = Number(value)
 if (!Number.isFinite(parsed) || parsed <= 0) return fallback
 return Math.floor(parsed)
}

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

export async function GET(request: Request) {
 try {
 const { searchParams } = new URL(request.url)
 const parsedCommunityId = communityIdSchema.safeParse(searchParams.get('community_id') || '')
 if (!parsedCommunityId.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsedCommunityId.error.format() }, { status: 400 })
 }
 const communityId = parsedCommunityId.data
 const page = parsePositiveInteger(searchParams.get('page'), 1)
 const limit = Math.min(parsePositiveInteger(searchParams.get('limit'), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE)
 const from = (page - 1) * limit
 const to = from + limit - 1
 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()

 const { data: publicCommunity, error: publicCommunityError } = await supabase
 .from('communities')
 .select('id')
 .eq('id', communityId)
 .eq('moderation', 'approved')
 .maybeSingle()
 if (publicCommunityError) throw publicCommunityError

 let queryClient: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient> = supabase
 if (!publicCommunity) {
 if (!user) {
 return NextResponse.json({ error: 'Community not found' }, { status: 404 })
 }

 const { data: ownCommunity, error: ownCommunityError } = await supabase
 .from('communities')
 .select('id')
 .eq('id', communityId)
 .eq('owner_id', user.id)
 .maybeSingle()
 if (ownCommunityError) throw ownCommunityError

 if (!ownCommunity) {
 const role = await getViewerRole(supabase, user.id)
 if (role !== 'admin') {
 return NextResponse.json({ error: 'Community not found' }, { status: 404 })
 }

 const admin = createAdminClient()
 const { data: adminCommunity, error: adminCommunityError } = await admin
 .from('communities')
 .select('id')
 .eq('id', communityId)
 .maybeSingle()
 if (adminCommunityError) throw adminCommunityError
 if (!adminCommunity) {
 return NextResponse.json({ error: 'Community not found' }, { status: 404 })
 }
 queryClient = admin
 }
 }

 const { data, error } = await queryClient
 .from('posts')
 .select(POSTS_SELECT)
 .eq('community_id', communityId)
 .eq('moderation', 'approved')
 .order('is_pinned', { ascending: false })
 .order('created_at', { ascending: false })
  if (error) throw error

  // Get viewer role for admin reveal
  const viewerRole = user ? await getViewerRole(supabase, user.id) : 'guest'

  // Redact anonymous authors for privacy, except for the author themselves or admins
  const redactedData = data.map(post => {
    if (post.is_anonymous) {
      const isAuthor = user?.id === post.author_id
      const isAdmin = viewerRole === 'admin'
      
      if (!isAuthor && !isAdmin) {
        return {
          ...post,
          author_id: 'anonymous', // Mask the ID for others
          author: {
            id: 'anonymous',
            username: 'Anonymous',
            full_name: 'Anonymous Student',
            avatar_url: null
          }
        }
      }
    }
    return post
  })

  return NextResponse.json({ data: redactedData, error: null })
 } catch (error: any) {
 return NextResponse.json({ data: null, error: 'Failed to process post' }, { status: 500 })
 }
}

export async function POST(request: Request) {
 try {
 const supabase = await createClient()
 
 // 1. Authenticate user
 const { data: { user } } = await supabase.auth.getUser()
 if (!user) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }

 // 2. Validate request body
 const body = await request.json()
 const result = postSchema.safeParse(body)
 
 if (!result.success) {
 return NextResponse.json({ error: 'Validation failed', details: result.error.format() }, { status: 400 })
 }

 // Destructure raw data
 const { community_id, title: rawTitle, content: rawContent, is_question, is_anonymous, image_url, file_url } = result.data
 
 // Apply HTML escaping for security
 const { escapeHtml } = await import('@/lib/utils/html-escape')
 const title = escapeHtml(rawTitle)
 const content = escapeHtml(rawContent)

 if (image_url && !isAllowedPostImageUrl(image_url, user.id)) {
 return NextResponse.json({ error: 'Post image must use an approved uploaded media URL.' }, { status: 400 })
 }
 if (file_url && !isAllowedPostImageUrl(file_url, user.id)) {
 return NextResponse.json({ error: 'Post file attachment must use an approved uploaded media URL.' }, { status: 400 })
 }

 const { data: publicCommunity, error: publicCommunityError } = await supabase
 .from('communities')
 .select('id, owner_id')
 .eq('id', community_id)
 .eq('moderation', 'approved')
 .maybeSingle()
 if (publicCommunityError) throw publicCommunityError

 if (publicCommunity) {
 if (publicCommunity.owner_id !== user.id) {
 const { data: membership, error: membershipError } = await supabase
 .from('community_members')
 .select('id')
 .eq('community_id', community_id)
 .eq('user_id', user.id)
 .maybeSingle()
 if (membershipError) throw membershipError
 if (!membership) {
 return NextResponse.json({ error: 'Join the community before posting.' }, { status: 403 })
 }
 }
 } else {
 const { data: ownCommunity, error: ownCommunityError } = await supabase
 .from('communities')
 .select('id')
 .eq('id', community_id)
 .eq('owner_id', user.id)
 .maybeSingle()
 if (ownCommunityError) throw ownCommunityError

 if (!ownCommunity) {
 const role = await getViewerRole(supabase, user.id)
 if (role !== 'admin') {
 return NextResponse.json({ error: 'Community not found' }, { status: 404 })
 }
 const admin = createAdminClient()
 const { data: adminCommunity, error: adminCommunityError } = await admin
 .from('communities')
 .select('id')
 .eq('id', community_id)
 .maybeSingle()
 if (adminCommunityError) throw adminCommunityError
 if (!adminCommunity) {
 return NextResponse.json({ error: 'Community not found' }, { status: 404 })
 }
 }
 }

 // 3. Insert into posts table
 const { data, error } = await supabase
 .from('posts')
 .insert({
 community_id,
 author_id: user.id,
 title,
 content,
 is_question,
 is_anonymous,
 image_url,
 file_url,
 moderation: 'approved',
 like_count: 0,
 reply_count: 0,
 is_completed: false
 })
 .select()
 .single()

 if (error) throw error

 await deliverTargetedNotifications({
 actorId: user.id,
 authorId: user.id,
 type: 'community_update',
 message: is_anonymous ? 'New anonymous post in your community' : `New community post: ${title}`,
 communityId: community_id,
 postId: data.id,
 isAnonymous: is_anonymous
 })

 return NextResponse.json({ data, error: null }, { status: 201 })
 } catch (error: any) {
 console.error('API Error:', error)
 return NextResponse.json({ data: null, error: 'Failed to process post' }, { status: 500 })
 }
}
