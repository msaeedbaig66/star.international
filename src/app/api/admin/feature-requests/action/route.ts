import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

type AdminAction = 'approve' | 'reject'
type EntityType = 'listing' | 'blog' | 'community'

const featureRequestActionSchema = z.object({
 request_id: z.string().min(1),
 action: z.enum(['approve', 'reject']),
 admin_note: z.string().trim().max(1000).optional(),
 approved_days: z.coerce.number().int().optional(),
})

const MIN_DAYS = 1
const MAX_DAYS = 60

function isFeatureRequestsPermissionError(error: any) {
 const message = String(error?.message || '').toLowerCase()
 const code = String(error?.code || '').toUpperCase()
 return (
 code === '42501' ||
 (message.includes('permission denied') && message.includes('feature_requests'))
 )
}

function isValidDays(value: number) {
 return Number.isInteger(value) && value >= MIN_DAYS && value <= MAX_DAYS
}

async function setFeaturedState(
 supabase: ReturnType<typeof createAdminClient>,
 entityType: EntityType,
 entityId: string,
 values: Record<string, any>
) {
 if (entityType === 'listing') {
 return supabase.from('listings').update(values).eq('id', entityId)
 }
 if (entityType === 'blog') {
 return supabase.from('blogs').update(values).eq('id', entityId)
 }
 return supabase.from('communities').update(values).eq('id', entityId)
}

export async function POST(req: Request) {
 try {
 const auth = await createClient()
 const {
 data: { user },
 } = await auth.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const { data: me } = await auth.from('profiles').select('role').eq('id', user.id).single()
 if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

 const body = await req.json().catch(() => ({}))
 const parsed = featureRequestActionSchema.safeParse(body)
 if (!parsed.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
 }
 const requestId = parsed.data.request_id
 const action = parsed.data.action as AdminAction
 const adminNote = parsed.data.admin_note || ''
 const approvedDaysInput = Number(parsed.data.approved_days || 0)

 const supabase = createAdminClient()
 const { data: requestData, error: requestError } = await supabase
 .from('feature_requests')
 .select('*')
 .eq('id', requestId)
 .single()

 if (requestError) {
 if (isFeatureRequestsPermissionError(requestError)) {
 return NextResponse.json(
 { error: 'Feature request permissions missing. Run GRANT on feature_requests for authenticated and service_role.' },
 { status: 503 }
 )
 }
 }

 if (requestError || !requestData) {
 return NextResponse.json({ error: 'Feature request not found' }, { status: 404 })
 }

 if (requestData.status !== 'pending') {
 return NextResponse.json({ error: 'This feature request is already processed.' }, { status: 400 })
 }

 const entityType = String(requestData.entity_type || '') as EntityType
 const entityId = String(requestData.entity_id || '')
 const now = new Date()
 const nowIso = now.toISOString()

 if (action === 'approve') {
 const targetDays = approvedDaysInput > 0 ? approvedDaysInput : Number(requestData.requested_days || 0)
 if (!isValidDays(targetDays)) {
 return NextResponse.json({ error: `Approved days must be between ${MIN_DAYS} and ${MAX_DAYS}.` }, { status: 400 })
 }

 const featuredUntilDate = new Date(now.getTime() + targetDays * 24 * 60 * 60 * 1000)
 const featuredUntil = featuredUntilDate.toISOString()

 const { error: featureUpdateError } = await setFeaturedState(supabase, entityType, entityId, {
 is_featured: true,
 featured_until: featuredUntil,
 featured_by: user.id,
 featured_note: adminNote || null,
 updated_at: nowIso,
 })

 if (featureUpdateError) {
 return NextResponse.json({ error: featureUpdateError.message || 'Failed to update target content.' }, { status: 400 })
 }

 const { error: reqUpdateError } = await supabase
 .from('feature_requests')
 .update({
 status: 'approved',
 approved_days: targetDays,
 featured_until: featuredUntil,
 admin_note: adminNote || null,
 reviewed_by: user.id,
 reviewed_at: nowIso,
 updated_at: nowIso,
 })
 .eq('id', requestId)

 if (reqUpdateError) throw reqUpdateError

 await supabase.from('notifications').insert({
 user_id: requestData.user_id,
 actor_id: user.id,
 type: 'message',
 message: `Your feature request for ${requestData.entity_type} "${requestData.entity_title}" was approved for ${targetDays} days.${adminNote ? ` Note: ${adminNote}` : ''}`,
 is_read: false,
 })

 return NextResponse.json({
 success: true,
 status: 'approved',
 approved_days: targetDays,
 featured_until: featuredUntil,
 })
 }

 const { error: rejectError } = await supabase
 .from('feature_requests')
 .update({
 status: 'rejected',
 admin_note: adminNote || null,
 reviewed_by: user.id,
 reviewed_at: nowIso,
 updated_at: nowIso,
 })
 .eq('id', requestId)

 if (rejectError) throw rejectError

 await supabase.from('notifications').insert({
 user_id: requestData.user_id,
 actor_id: user.id,
 type: 'message',
 message: `Your feature request for ${requestData.entity_type} "${requestData.entity_title}" was rejected.${adminNote ? ` Note: ${adminNote}` : ''}`,
 is_read: false,
 })

 return NextResponse.json({ success: true, status: 'rejected' })
 } catch (error: any) {
 console.error('Admin feature request action error:', error)
 return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
 }
}
