import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { communitySchema } from '@/lib/validations/community'
import { generateSlug } from '@/lib/utils'
import { isAllowedCommunityImageUrl } from '@/lib/security/media-urls'
import { toSafeLikeTerm, toTsQuery } from '@/lib/search-ranking'
import { cacheService } from '@/lib/cache-service'
import { performModeration } from '@/lib/moderation'

const PUBLIC_OWNER_SELECT = 'id, username, full_name, avatar_url'
const COMMUNITY_FEED_SELECT = `
 id,
 owner_id,
 name,
 slug,
 description,
 type,
 field,
 avatar_url,
 banner_url,
 rules,
 member_count,
 post_count,
 is_official,
 moderation,
 rejection_note,
 created_at,
 updated_at,
 is_featured,
 featured_until,
 featured_by,
 featured_note,
 owner:profiles!owner_id(${PUBLIC_OWNER_SELECT})
`
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 24

function parsePositiveInteger(value: string | null, fallback: number) {
 const parsed = Number(value)
 if (!Number.isFinite(parsed) || parsed <= 0) return fallback
 return Math.floor(parsed)
}

export async function GET(request: Request) {
 try {
 const { searchParams } = new URL(request.url)
 const category = searchParams.get('category')
 const q = searchParams.get('q')
 const page = parsePositiveInteger(searchParams.get('page'), 1)
 const limit = Math.min(parsePositiveInteger(searchParams.get('limit'), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE)
 const from = (page - 1) * limit
 const to = from + limit - 1

 const supabase = await createClient()
 let query = supabase
 .from('communities')
 .select(COMMUNITY_FEED_SELECT)
 .eq('moderation', 'approved')

 if (category && category !== 'All') {
 query = query.eq('field', category)
 }
 if (q) {
 query = query.textSearch('search_vector', toTsQuery(q), { config: 'english' })
 }

 const { data, error } = await query
 .order('created_at', { ascending: false })
 .range(from, to)

 if (error) throw error

 return NextResponse.json({ data, error: null })
 } catch (error: any) {
 return NextResponse.json({ data: null, error: 'Failed to process community request' }, { status: 500 })
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
 const result = communitySchema.safeParse(body)
 
 if (!result.success) {
 return NextResponse.json({ error: 'Validation failed', details: result.error.format() }, { status: 400 })
 }

 const { data: profile, error: profileError } = await supabase
 .from('profiles')
 .select('community_slot_limit')
 .eq('id', user.id)
 .single()
 if (profileError) throw profileError

 const communityLimit = Number((profile as any)?.community_slot_limit || 2)
 const { count: communityUsage, error: usageError } = await supabase
 .from('communities')
 .select('id', { count: 'exact', head: true })
 .eq('owner_id', user.id)
 if (usageError) throw usageError

 if ((communityUsage || 0) >= communityLimit) {
 return NextResponse.json(
 {
 error: `Community slot limit reached (${communityLimit}). Request more slots from your dashboard.`,
 code: 'SLOT_LIMIT_REACHED',
 request_type: 'community',
 current_limit: communityLimit,
 },
 { status: 403 }
 )
 }

 const { name, description, type, field, avatar_url, banner_url, rules } = result.data

 if (avatar_url && !isAllowedCommunityImageUrl(avatar_url, user.id)) {
 return NextResponse.json({ error: 'Community avatar must use an approved uploaded media URL.' }, { status: 400 })
 }
 if (banner_url && !isAllowedCommunityImageUrl(banner_url, user.id)) {
 return NextResponse.json({ error: 'Community banner must use an approved uploaded media URL.' }, { status: 400 })
 }

  // 2.5 Moderation Check
  let moderationStatus = 'pending'
  let moderationReason = 'Awaiting review'

  const { data: userProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  
  if (userProfile?.role === 'admin') {
  moderationStatus = 'approved'
  moderationReason = 'Admin bypass'
  } else {
  const modResult = await performModeration(name, description || '')
  moderationStatus = modResult.status
  moderationReason = modResult.reason
  }

  // 3. Generate slug
  const slug = generateSlug(name)

 // 4. Insert into communities table
 const { data, error } = await supabase
 .from('communities')
 .insert({
 owner_id: user.id,
 name,
 slug,
 description,
 type,
 field,
 avatar_url,
 banner_url,
 rules,
 is_official: false, // Always false for user created
  moderation: moderationStatus,
  moderation_reason: moderationReason,
  member_count: 1, // Owner is the first member
  post_count: 0
 })
 .select()
 .single()

 if (error) throw error

 // 5. Add owner to members table too
  if (data) {
    await supabase.from('community_members').insert({
      community_id: data.id,
      user_id: user.id,
      role: 'admin'
    })

    // Invalidate featured communities cache
    try {
      await cacheService.deleteByPattern('home:communities:*')
    } catch (cacheError) {
      console.error('Cache Invalidation Error:', cacheError)
    }
  }

 return NextResponse.json({ data, error: null }, { status: 201 })
 } catch (error: any) {
 console.error('API Error:', error)
 return NextResponse.json({ data: null, error: 'Failed to process community request' }, { status: 500 })
 }
}
