import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type EntityType = 'listing' | 'blog' | 'community'
type RequestStatus = 'pending' | 'approved' | 'rejected'

const MIN_DAYS = 1
const MAX_DAYS = 60

const featureRequestPostSchema = z
 .object({
 entity_type: z.enum(['listing', 'blog', 'community']),
 entity_id: z.string().uuid(),
 requested_days: z.coerce.number().int().min(MIN_DAYS).max(MAX_DAYS),
 reason: z.string().trim().min(10).max(1000),
 })
 .strict()

function isEntityType(value: string): value is EntityType {
 return value === 'listing' || value === 'blog' || value === 'community'
}

function isRequestStatus(value: string): value is RequestStatus {
 return value === 'pending' || value === 'approved' || value === 'rejected'
}

function isMissingFeatureRequestsSchema(error: any) {
 const message = String(error?.message || '').toLowerCase()
 const code = String(error?.code || '').toUpperCase()
 return (
 code === '42P01' ||
 code === 'PGRST205' ||
 message.includes(`could not find the table 'feature_requests'`) ||
 message.includes('relation "feature_requests" does not exist') ||
 (message.includes('schema cache') && message.includes('feature_requests'))
 )
}

function isFeatureRequestsPermissionError(error: any) {
 const message = String(error?.message || '').toLowerCase()
 const code = String(error?.code || '').toUpperCase()
 return (
 code === '42501' ||
 (message.includes('permission denied') && message.includes('feature_requests'))
 )
}

async function loadEntity(
 supabase: Awaited<ReturnType<typeof createClient>>,
 entityType: EntityType,
 entityId: string
) {
 if (entityType === 'listing') {
 return supabase
 .from('listings')
 .select('id, title, seller_id, moderation, status')
 .eq('id', entityId)
 .single()
 }

 if (entityType === 'blog') {
 return supabase
 .from('blogs')
 .select('id, title, author_id, moderation')
 .eq('id', entityId)
 .single()
 }

 return supabase
 .from('communities')
 .select('id, name, owner_id, moderation')
 .eq('id', entityId)
 .single()
}

export async function GET(req: Request) {
 try {
 const auth = await createClient()
 const {
 data: { user },
 } = await auth.auth.getUser()

 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const supabase = auth
 const { searchParams } = new URL(req.url)
 const type = String(searchParams.get('entity_type') || '')
 const status = String(searchParams.get('status') || '')

 let query = supabase
 .from('feature_requests')
 .select('*')
 .eq('user_id', user.id)
 .order('created_at', { ascending: false })
 .limit(100)

 if (type && isEntityType(type)) query = query.eq('entity_type', type)
 if (status && isRequestStatus(status)) query = query.eq('status', status)

 const { data: requests, error } = await query
 if (error) {
 if (isMissingFeatureRequestsSchema(error)) {
 return NextResponse.json(
 { error: 'Feature request system is not activated yet. Please run the latest database migration first.' },
 { status: 503 }
 )
 }
 if (isFeatureRequestsPermissionError(error)) {
 return NextResponse.json(
 {
 error:
 'Feature request permissions are missing. Please run GRANT SQL for table "feature_requests" (authenticated + service_role).',
 },
 { status: 503 }
 )
 }
 throw error
 }

 const safeRequests = requests || []
 const listingIds = safeRequests.filter((r: any) => r.entity_type === 'listing').map((r: any) => r.entity_id)
 const blogIds = safeRequests.filter((r: any) => r.entity_type === 'blog').map((r: any) => r.entity_id)
 const communityIds = safeRequests.filter((r: any) => r.entity_type === 'community').map((r: any) => r.entity_id)

 const [listingState, blogState, communityState] = await Promise.all([
 listingIds.length
 ? supabase.from('listings').select('id, is_featured, featured_until').in('id', listingIds)
 : Promise.resolve({ data: [], error: null } as any),
 blogIds.length
 ? supabase.from('blogs').select('id, is_featured, featured_until').in('id', blogIds)
 : Promise.resolve({ data: [], error: null } as any),
 communityIds.length
 ? supabase.from('communities').select('id, is_featured, featured_until').in('id', communityIds)
 : Promise.resolve({ data: [], error: null } as any),
 ])

 const featureMap = new Map<string, { is_featured: boolean; featured_until: string | null }>()
 for (const row of listingState.data || []) {
 featureMap.set(`listing:${row.id}`, {
 is_featured: !!row.is_featured,
 featured_until: row.featured_until || null,
 })
 }
 for (const row of blogState.data || []) {
 featureMap.set(`blog:${row.id}`, {
 is_featured: !!row.is_featured,
 featured_until: row.featured_until || null,
 })
 }
 for (const row of communityState.data || []) {
 featureMap.set(`community:${row.id}`, {
 is_featured: !!row.is_featured,
 featured_until: row.featured_until || null,
 })
 }

 const nowTime = Date.now()
 const enriched = safeRequests.map((entry: any) => {
 const key = `${entry.entity_type}:${entry.entity_id}`
 const state = featureMap.get(key) || { is_featured: false, featured_until: null }
 const untilTime = state.featured_until ? Date.parse(state.featured_until) : NaN
 return {
 ...entry,
 entity_is_featured: state.is_featured && Number.isFinite(untilTime) && untilTime > nowTime,
 entity_featured_until: state.featured_until,
 }
 })

 return NextResponse.json({ data: enriched, error: null })
 } catch (error: any) {
 return NextResponse.json({ data: null, error: error?.message || 'Internal server error' }, { status: 500 })
 }
}

export async function POST(req: Request) {
 try {
 const auth = await createClient()
 const {
 data: { user },
 } = await auth.auth.getUser()

 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 const supabase = auth

 const body = await req.json().catch(() => ({}))
 const parsed = featureRequestPostSchema.safeParse(body)
 if (!parsed.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
 }

 const entityType = parsed.data.entity_type as EntityType
 const entityId = parsed.data.entity_id
 const requestedDays = parsed.data.requested_days
 const reason = parsed.data.reason

 const { data: entity, error: entityError } = await loadEntity(supabase, entityType, entityId)
 if (entityError || !entity) {
 return NextResponse.json({ error: `${entityType} not found` }, { status: 404 })
 }

 const ownerId =
 entityType === 'listing'
 ? (entity as any).seller_id
 : entityType === 'blog'
 ? (entity as any).author_id
 : (entity as any).owner_id

 if (ownerId !== user.id) {
 return NextResponse.json({ error: 'You can only request featuring for your own content.' }, { status: 403 })
 }

 const moderation = String((entity as any).moderation || '')
 if (moderation !== 'approved') {
 return NextResponse.json({ error: `Only approved ${entityType}s can be featured.` }, { status: 400 })
 }

 if (entityType === 'listing' && String((entity as any).status || '') === 'removed') {
 return NextResponse.json({ error: 'Deleted listings cannot be featured.' }, { status: 400 })
 }

 const { data: pendingRequest, error: pendingError } = await supabase
 .from('feature_requests')
 .select('id')
 .eq('entity_type', entityType)
 .eq('entity_id', entityId)
 .eq('status', 'pending')
 .limit(1)
 .maybeSingle()

 if (pendingError) {
 if (isMissingFeatureRequestsSchema(pendingError)) {
 return NextResponse.json(
 { error: 'Feature request system is not activated yet. Please run the latest database migration first.' },
 { status: 503 }
 )
 }
 if (isFeatureRequestsPermissionError(pendingError)) {
 return NextResponse.json(
 {
 error:
 'Feature request permissions are missing. Please run GRANT SQL for table "feature_requests" (authenticated + service_role).',
 },
 { status: 503 }
 )
 }
 throw pendingError
 }

 if (pendingRequest?.id) {
 return NextResponse.json({ error: 'There is already a pending feature request for this content.' }, { status: 409 })
 }

 const entityTitle = entityType === 'community' ? String((entity as any).name || 'Untitled community') : String((entity as any).title || `Untitled ${entityType}`)
 const now = new Date().toISOString()

 const { data, error } = await supabase
 .from('feature_requests')
 .insert({
 user_id: user.id,
 entity_type: entityType,
 entity_id: entityId,
 entity_title: entityTitle,
 requested_days: requestedDays,
 reason,
 status: 'pending',
 created_at: now,
 updated_at: now,
 })
 .select()
 .single()

 if (error) {
 if (isMissingFeatureRequestsSchema(error)) {
 return NextResponse.json(
 { error: 'Feature request system is not activated yet. Please run the latest database migration first.' },
 { status: 503 }
 )
 }
 if (isFeatureRequestsPermissionError(error)) {
 return NextResponse.json(
 {
 error:
 'Feature request permissions are missing. Please run GRANT SQL for table "feature_requests" (authenticated + service_role).',
 },
 { status: 503 }
 )
 }
 throw error
 }

 return NextResponse.json({ data, error: null }, { status: 201 })
 } catch (error: any) {
 console.error('Feature request API error:', error)
 return NextResponse.json({ data: null, error: error?.message || 'Internal server error' }, { status: 500 })
 }
}
