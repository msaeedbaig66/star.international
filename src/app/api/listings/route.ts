import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listingSchema } from '@/lib/validations/listing'
import { isAllowedListingImageUrl } from '@/lib/security/media-urls'

const ADVANCED_LISTING_COLUMNS = ['listing_type', 'rental_price', 'rental_period', 'rental_deposit', 'contact_preference'] as const
const LISTING_FEED_SELECT = `
 id,
 seller_id,
 title,
 price,
 condition,
 category,
 campus,
 images,
 status,
 moderation,
 view_count,
 created_at,
 listing_type,
 rental_price,
 rental_period,
 is_official,
 seller:profiles!listings_seller_id_fkey(username, avatar_url, full_name, role)
`
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 24

function parsePositiveInteger(value: string | null, fallback: number) {
 const parsed = Number(value)
 if (!Number.isFinite(parsed) || parsed <= 0) return fallback
 return Math.floor(parsed)
}

function isMissingAdvancedColumnError(error: any) {
 const message = String(error?.message || '').toLowerCase()
 return ADVANCED_LISTING_COLUMNS.some((column) => message.includes(column) && message.includes('column'))
}

function stripAdvancedListingFields(payload: Record<string, any>) {
 const cloned = { ...payload }
 for (const column of ADVANCED_LISTING_COLUMNS) {
 delete cloned[column]
 }
 return cloned
}

export async function GET(request: Request) {
 try {
 const { searchParams } = new URL(request.url)
 const category = searchParams.get('category')
 const campus = searchParams.get('campus')
 const q = searchParams.get('q')
 const condition = searchParams.get('condition')
 const listingType = searchParams.get('listing_type')
 const minPriceRaw = searchParams.get('min_price') || searchParams.get('min')
 const maxPriceRaw = searchParams.get('max_price') || searchParams.get('max')
 const cursor = searchParams.get('cursor')
 const limit = Math.min(parsePositiveInteger(searchParams.get('limit'), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE)
 
 const minPrice = minPriceRaw && minPriceRaw.trim() !== '' ? Number(minPriceRaw) : null
 const maxPrice = maxPriceRaw && maxPriceRaw.trim() !== '' ? Number(maxPriceRaw) : null

 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()

 let query = supabase
 .from('listings')
 .select(LISTING_FEED_SELECT)
 .eq('status', 'available')

 if (user) {
 // Show approved listings OR listings owned by the current user
 query = query.or(`moderation.eq.approved,seller_id.eq.${user.id}`)
 } else {
 // Anonymous users only see approved content
 query = query.eq('moderation', 'approved')
 }

 if (category && category !== 'All') query = query.eq('category', category)
 if (campus && campus !== 'All') query = query.eq('campus', campus)
 if (condition && condition !== 'all') query = query.eq('condition', condition)
 if (listingType && listingType !== 'all') query = query.eq('listing_type', listingType)
 if (minPrice !== null) query = query.gte('price', minPrice)
 if (maxPrice !== null) query = query.lte('price', maxPrice)

 if (q) {
 query = query.textSearch('search_vector', q, { config: 'english' })
 }

 if (cursor) {
 query = query.lt('created_at', cursor)
 }

 const { data, error } = await query
 .order('created_at', { ascending: false })
 .limit(limit)

 if (error) throw error

 const nextCursor = data.length === limit ? data[data.length - 1].created_at : null

 return NextResponse.json({ 
 data, 
 nextCursor,
 count: data.length,
 error: null 
 })
 } catch (error: any) {
 console.error('Listings GET error:', error)
 return NextResponse.json({ data: null, error: 'Failed to fetch listings' }, { status: 500 })
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
 const result = listingSchema.safeParse(body)
 
 if (!result.success) {
 return NextResponse.json({ error: 'Validation failed', details: result.error.format() }, { status: 400 })
 }

 const [profileRes, usageRes] = await Promise.all([
 supabase.from('profiles').select('listing_slot_limit, role').eq('id', user.id).single(),
 supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', user.id).neq('status', 'removed')
 ])

 if (profileRes.error) throw profileRes.error
 if (usageRes.error) throw usageRes.error

 const profile = profileRes.data
 const listingUsage = usageRes.count
 const userRole = profile?.role || 'user'
 const isAdmin = userRole === 'admin'
 const isPrivileged = isAdmin || userRole === 'subadmin'

 const listingLimit = Number((profile as any)?.listing_slot_limit || 5)
 if ((listingUsage || 0) >= listingLimit && !isPrivileged) {
 return NextResponse.json(
 {
 error: `Listing slot limit reached (${listingLimit}). Request more slots from your dashboard.`,
 code: 'SLOT_LIMIT_REACHED',
 request_type: 'listing',
 current_limit: listingLimit,
 },
 { status: 403 }
 )
 }

 const { 
 title, description, price, category, condition, campus, images, 
 listing_type, rental_price, rental_period, rental_deposit, 
 contact_preference, is_official 
 } = result.data

 const invalidImage = images.find((url) => !isAllowedListingImageUrl(url, user.id))
 if (invalidImage) {
 return NextResponse.json(
 { error: 'Listing images must use approved uploaded media URLs.' },
 { status: 400 }
 )
 }

 const finalIsOfficial = is_official && isPrivileged

 // Only full Admins get auto-approval. Sub-admins must have their "Official" posts approved.
 const autoApprove = isAdmin

 const payload = {
 seller_id: user.id,
 title,
 description,
 price,
 category,
 condition,
 campus,
 images,
 listing_type,
 rental_price: rental_price ?? null,
 rental_period: rental_period ?? null,
 rental_deposit: rental_deposit ?? null,
 contact_preference,
 moderation: autoApprove ? 'approved' : 'pending',
 is_official: finalIsOfficial,
 view_count: 0,
 status: 'available',
 }

 let { data, error } = await supabase
 .from('listings')
 .insert(payload)
 .select()
 .single()

 if (error && isMissingAdvancedColumnError(error)) {
 const fallbackPayload = stripAdvancedListingFields(payload)
 ;({ data, error } = await supabase
 .from('listings')
 .insert(fallbackPayload)
 .select()
 .single())
 }

 if (error) throw error

 return NextResponse.json({ data, error: null }, { status: 201 })
 } catch (error: any) {
 console.error('Listings POST error:', error)
 return NextResponse.json({ data: null, error: 'Failed to create listing' }, { status: 500 })
 }
}
