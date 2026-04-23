import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { blogSchema } from '@/lib/validations/blog'
import { generateSlug } from '@/lib/utils'
import { buildBlogExcerpt, sanitizeBlogHtml, stripHtmlToText } from '@/lib/security/blog-html'
import { isAllowedBlogImageUrl } from '@/lib/security/media-urls'

const PUBLIC_AUTHOR_SELECT = 'id, username, full_name, avatar_url'
const BLOG_FEED_SELECT = `
 id,
 author_id,
 title,
 slug,
 excerpt,
 cover_image,
 images,
 tags,
 field,
 community_id,
 moderation,
 like_count,
 comment_count,
 view_count,
 created_at,
 is_featured,
 author:profiles!author_id(${PUBLIC_AUTHOR_SELECT})
`

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

function parsePositiveInteger(value: string | null, fallback: number) {
 const parsed = Number(value)
 if (!Number.isFinite(parsed) || parsed <= 0) return fallback
 return Math.floor(parsed)
}

export async function GET(request: Request) {
 try {
 const { searchParams } = new URL(request.url)
 const field = searchParams.get('field')
 const q = searchParams.get('q')
 const cursor = searchParams.get('cursor') // Expected: ISO Date String
 const limit = Math.min(parsePositiveInteger(searchParams.get('limit'), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE)

 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()

 let query = supabase
 .from('blogs')
 .select(BLOG_FEED_SELECT)

 if (user) {
 // Show approved blogs OR blogs owned by the current user (allows previewing pending content)
 query = query.or(`moderation.eq.approved,author_id.eq.${user.id}`)
 } else {
 // Anonymous users only see approved content
 query = query.eq('moderation', 'approved')
 }

 if (field && field !== 'All') {
 query = query.eq('field', field)
 }
 if (q) {
 query = query.textSearch('search_vector', q, { config: 'english' })
 }

 // Cursor-based Pagination
 if (cursor) {
 query = query.lt('created_at', cursor)
 }

 const { data, error } = await query
 .order('created_at', { ascending: false })
 .limit(limit)

 if (error) throw error

 // Determine next cursor
 const nextCursor = data.length === limit ? data[data.length - 1].created_at : null

 return NextResponse.json({ 
 data, 
 nextCursor,
 count: data.length, 
 error: null 
 })
 } catch (error: any) {
 console.error('Blog GET API Error:', error)
 return NextResponse.json({ data: null, error: error.message || 'Failed to process blog request' }, { status: 500 })
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
 const result = blogSchema.safeParse(body)
 
 if (!result.success) {
 console.error('Validation Error Details:', JSON.stringify(result.error.format(), null, 2))
 return NextResponse.json({ error: 'Validation failed', details: result.error.format() }, { status: 400 })
 }

 const { title, content, excerpt, cover_image, images, tags, field, community_id, is_official } = result.data

 // 2.5 Check Blog Usage & Image Limits
 const { data: profile, error: profileError } = await supabase
 .from('profiles')
 .select('blog_slot_limit, blog_image_limit, role')
 .eq('id', user.id)
 .single()

 if (profileError) throw profileError

 const blogLimit = Number(profile?.blog_slot_limit || 5)
 const imageLimit = Number(profile?.blog_image_limit || 5)

 // Check Total Blogs
 const { count: blogUsage, error: usageError } = await supabase
 .from('blogs')
 .select('id', { count: 'exact', head: true })
 .eq('author_id', user.id)

 if (usageError) throw usageError
 if ((blogUsage || 0) >= blogLimit) {
 return NextResponse.json(
 {
 error: `Blog slot limit reached (${blogLimit}). Request more slots from your dashboard.`,
 code: 'SLOT_LIMIT_REACHED',
 request_type: 'blog',
 current_limit: blogLimit,
 },
 { status: 403 }
 )
 }

 // Check Image Count in this blog
 if ((images?.length || 0) > imageLimit) {
 return NextResponse.json(
 {
 error: `Max ${imageLimit} images allowed per blog for your current plan.`,
 code: 'IMAGE_LIMIT_REACHED',
 current_limit: imageLimit,
 },
 { status: 403 }
 )
 }

 if (cover_image && !isAllowedBlogImageUrl(cover_image, user.id)) {
 return NextResponse.json(
 { error: `Blog cover image must use an approved uploaded media URL.` },
 { status: 400 }
 )
 }
 const invalidImage = (images || []).find((url) => !isAllowedBlogImageUrl(url, user.id))
 if (invalidImage) {
 return NextResponse.json(
 { error: `Blog images must use approved uploaded media URLs.` },
 { status: 400 }
 )
 }

 const sanitizedContent = sanitizeBlogHtml(content)
 const sanitizedExcerpt = buildBlogExcerpt(excerpt, sanitizedContent)

 if (stripHtmlToText(sanitizedContent).length < 50) {
 return NextResponse.json({ error: 'Blog content must be at least 50 characters after sanitization.' }, { status: 400 })
 }

 // 3. Generate slug
 const slug = `${generateSlug(title)}-${Date.now().toString().slice(-4)}`

 // 4. Insert
 const { data, error } = await supabase
 .from('blogs')
 .insert({
 author_id: user.id,
 title,
 slug,
 content: sanitizedContent,
 excerpt: sanitizedExcerpt,
 cover_image,
 images,
 tags,
 field,
 community_id,
 moderation: (profile as any)?.role === 'admin' ? 'approved' : 'pending',
 view_count: 0,
 like_count: 0,
 comment_count: 0, is_official: (profile as any)?.role === 'admin' ? is_official : false
 })
 .select()
 .single()

 if (error) throw error

 return NextResponse.json({ data, error: null }, { status: 201 })
 } catch (error: any) {
 console.error('API Error:', error)
 return NextResponse.json({ data: null, error: error.message || 'Failed to process blog request' }, { status: 500 })
 }
}
