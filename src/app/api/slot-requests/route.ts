import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Profile } from '@/types/database'

export const dynamic = 'force-dynamic'

type RequestType = 'listing' | 'community' | 'blog' | 'blog_image'

const DEFAULT_LIMITS: Record<RequestType, number> = {
 listing: 5,
 community: 2,
 blog: 5,
 blog_image: 5,
}

const slotRequestPostSchema = z
 .object({
 request_type: z.enum(['listing', 'community', 'blog', 'blog_image']),
 requested_limit: z.coerce.number().int().positive(),
 reason: z.string().trim().min(10).max(1000),
 })
 .strict()

function isMissingSlotRequestsSchema(error: any) {
 const msg = String(error?.message || '').toLowerCase()
 const code = String(error?.code || '').toUpperCase()
 return (
 code === '42P01' ||
 code === 'PGRST205' ||
 msg.includes(`could not find the table 'slot_requests'`) ||
 msg.includes('relation "slot_requests" does not exist') ||
 (msg.includes('schema cache') && msg.includes('slot_requests'))
 )
}

function isRequestType(value: string): value is RequestType {
 return value === 'listing' || value === 'community' || value === 'blog' || value === 'blog_image'
}

function isSlotRequestsPermissionError(error: any) {
 const msg = String(error?.message || '').toLowerCase()
 const code = String(error?.code || '').toUpperCase()
 return code === '42501' || (msg.includes('permission denied') && msg.includes('slot_requests'))
}

export async function GET(req: Request) {
 try {
 const auth = await createClient()
 const { data: { user } } = await auth.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 const supabase = auth

 const { searchParams } = new URL(req.url)
 const type = searchParams.get('type')

 let query = supabase
 .from('slot_requests')
 .select('*')
 .eq('user_id', user.id)
 .order('created_at', { ascending: false })
 .limit(100)

 if (type && isRequestType(type)) {
 query = query.eq('request_type', type)
 }

 const { data, error } = await query
 if (error) {
 if (isMissingSlotRequestsSchema(error)) {
 return NextResponse.json(
 { error: 'Slot request system is not activated yet. Please run the latest database migration first.' },
 { status: 503 }
 )
 }
 if (isSlotRequestsPermissionError(error)) {
 return NextResponse.json(
 {
 error:
 'Slot request permissions are missing. Please run GRANT SQL for table "slot_requests" (authenticated + service_role).',
 },
 { status: 503 }
 )
 }
 throw error
 }

 return NextResponse.json({ data: data || [], error: null })
 } catch (error: any) {
 return NextResponse.json({ data: null, error: error?.message || 'Internal server error' }, { status: 500 })
 }
}

export async function POST(req: Request) {
 try {
 const auth = await createClient()
 const { data: { user } } = await auth.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 const supabase = auth

 const body = await req.json().catch(() => ({}))
 const parsed = slotRequestPostSchema.safeParse(body)
 if (!parsed.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
 }

 const requestType = parsed.data.request_type as RequestType
 const requestedLimit = parsed.data.requested_limit
 const reason = parsed.data.reason

 const { data: profile, error: profileError } = await supabase
 .from('profiles')
 .select('listing_slot_limit, community_slot_limit, blog_slot_limit, blog_image_limit')
 .eq('id', user.id)
 .single() as { data: Profile | null, error: any }

 if (profileError) throw profileError

 let currentLimit = 0;
 if (requestType === 'listing') currentLimit = Number(profile?.listing_slot_limit || DEFAULT_LIMITS.listing);
 else if (requestType === 'community') currentLimit = Number(profile?.community_slot_limit || DEFAULT_LIMITS.community);
 else if (requestType === 'blog') currentLimit = Number(profile?.blog_slot_limit || DEFAULT_LIMITS.blog);
 else if (requestType === 'blog_image') currentLimit = Number(profile?.blog_image_limit || DEFAULT_LIMITS.blog_image);

 if (requestedLimit <= currentLimit) {
 return NextResponse.json(
 { error: `Requested limit must be greater than current limit (${currentLimit}).` },
 { status: 400 }
 )
 }

 const { data: pendingReq, error: pendingReqError } = await supabase
 .from('slot_requests')
 .select('id')
 .eq('user_id', user.id)
 .eq('request_type', requestType)
 .eq('status', 'pending')
 .limit(1)
 .maybeSingle()

 if (pendingReqError) {
 if (isMissingSlotRequestsSchema(pendingReqError)) {
 return NextResponse.json(
 { error: 'Slot request system is not activated yet. Please run the latest database migration first.' },
 { status: 503 }
 )
 }
 if (isSlotRequestsPermissionError(pendingReqError)) {
 return NextResponse.json(
 {
 error:
 'Slot request permissions are missing. Please run GRANT SQL for table "slot_requests" (authenticated + service_role).',
 },
 { status: 503 }
 )
 }
 throw pendingReqError
 }

 if (pendingReq?.id) {
 return NextResponse.json({ error: 'You already have a pending request for this slot type.' }, { status: 409 })
 }

 let usageCount = 0;
 if (requestType === 'listing') {
 const { count } = await supabase
 .from('listings')
 .select('id', { count: 'exact', head: true })
 .eq('seller_id', user.id)
 .neq('status', 'removed');
 usageCount = count || 0;
 } else if (requestType === 'community') {
 const { count } = await supabase
 .from('communities')
 .select('id', { count: 'exact', head: true })
 .eq('owner_id', user.id);
 usageCount = count || 0;
 } else if (requestType === 'blog') {
 const { count } = await supabase
 .from('blogs')
 .select('id', { count: 'exact', head: true })
 .eq('author_id', user.id);
 usageCount = count || 0;
 } else if (requestType === 'blog_image') {
 // blog_image limit is per-blog, so we check if they have at least one blog
 const { count } = await supabase
 .from('blogs')
 .select('id', { count: 'exact', head: true })
 .eq('author_id', user.id);
 
 // If they have no blogs, they don't need more image slots yet
 usageCount = (count || 0) > 0 ? currentLimit : 0;
 }

 if (usageCount < currentLimit) {
 return NextResponse.json(
 { error: `You can request more slots after using your current ${currentLimit} ${requestType} slots.` },
 { status: 400 }
 )
 }

 const additionalSlots = requestedLimit - currentLimit
 const now = new Date().toISOString()

 const { data, error } = await supabase
 .from('slot_requests')
 .insert({
 user_id: user.id,
 request_type: requestType,
 current_limit: currentLimit,
 requested_limit: requestedLimit,
 additional_slots: additionalSlots,
 reason,
 status: 'pending',
 created_at: now,
 updated_at: now,
 })
 .select()
 .single()

 if (error) {
 if (isMissingSlotRequestsSchema(error)) {
 return NextResponse.json(
 { error: 'Slot request system is not activated yet. Please run the latest database migration first.' },
 { status: 503 }
 )
 }
 if (isSlotRequestsPermissionError(error)) {
 return NextResponse.json(
 {
 error:
 'Slot request permissions are missing. Please run GRANT SQL for table "slot_requests" (authenticated + service_role).',
 },
 { status: 503 }
 )
 }
 throw error
 }

 return NextResponse.json({ data, error: null }, { status: 201 })
 } catch (error: any) {
 console.error('Slot request API error:', error)
 return NextResponse.json({ data: null, error: error?.message || 'Internal server error' }, { status: 500 })
 }
}
