import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

type SlotAction = 'approve' | 'reject'
type SlotRequestType = 'listing' | 'community' | 'blog' | 'blog_image'

const slotRequestActionSchema = z.object({
 request_id: z.string().min(1),
 action: z.enum(['approve', 'reject']),
 admin_note: z.string().trim().max(1000).optional(),
 approved_limit: z.coerce.number().int().positive().optional(),
})

export async function POST(req: Request) {
 try {
 const auth = await createClient()
 const { data: { user } } = await auth.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const { data: profile } = await auth.from('profiles').select('role').eq('id', user.id).single()
 if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

 const body = await req.json().catch(() => ({}))
 const parsed = slotRequestActionSchema.safeParse(body)
 if (!parsed.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
 }
 const requestId = parsed.data.request_id
 const action = parsed.data.action as SlotAction
 const adminNote = parsed.data.admin_note || ''
 const approvedLimit = Number(parsed.data.approved_limit || 0)

 if (action === 'approve' && (!Number.isFinite(approvedLimit) || approvedLimit <= 0)) {
 return NextResponse.json({ error: 'Invalid approved_limit' }, { status: 400 })
 }

 const supabase = createAdminClient()

 const { data: slotRequest, error: reqError } = await supabase
 .from('slot_requests')
 .select('*')
 .eq('id', requestId)
 .single()

 if (reqError || !slotRequest) {
 return NextResponse.json({ error: 'Slot request not found' }, { status: 404 })
 }

 if (slotRequest.status !== 'pending') {
 return NextResponse.json({ error: 'This slot request is already processed.' }, { status: 400 })
 }

 const now = new Date().toISOString()

 if (action === 'approve') {
 const requestTypeToField: Record<SlotRequestType, 'listing_slot_limit' | 'community_slot_limit' | 'blog_slot_limit' | 'blog_image_limit'> = {
 listing: 'listing_slot_limit',
 community: 'community_slot_limit',
 blog: 'blog_slot_limit',
 blog_image: 'blog_image_limit',
 }
 const requestType = (slotRequest.request_type as SlotRequestType) || 'listing'
 const profileField = requestTypeToField[requestType] ?? 'listing_slot_limit'

 const { data: currentProfile } = await supabase
 .from('profiles')
 .select(profileField)
 .eq('id', slotRequest.user_id)
 .single();

 const currentProfileRecord = (currentProfile ?? {}) as Record<string, unknown>
 const realCurrentLimit = Number(currentProfileRecord[profileField] || 0)
 const safeApprovedLimit = Math.max(realCurrentLimit + 1, approvedLimit)

 const { error: profileUpdateError } = await supabase
 .from('profiles')
 .update({ [profileField]: safeApprovedLimit })
 .eq('id', slotRequest.user_id)

 if (profileUpdateError) throw profileUpdateError

 const { error: reqUpdateError } = await supabase
 .from('slot_requests')
 .update({
 status: 'approved',
 requested_limit: safeApprovedLimit,
 additional_slots: safeApprovedLimit - realCurrentLimit,
 admin_note: adminNote || null,
 reviewed_by: user.id,
 reviewed_at: now,
 updated_at: now,
 })
 .eq('id', slotRequest.id)

 if (reqUpdateError) throw reqUpdateError

 await supabase.from('notifications').insert({
 user_id: slotRequest.user_id,
 actor_id: user.id,
 type: 'message',
 message: `Your ${slotRequest.request_type} slots were approved. New limit: ${safeApprovedLimit}.${adminNote ? ` Note: ${adminNote}` : ''}`,
 is_read: false,
 })

 return NextResponse.json({ success: true })
 }

 const { error: rejectError } = await supabase
 .from('slot_requests')
 .update({
 status: 'rejected',
 admin_note: adminNote || null,
 reviewed_by: user.id,
 reviewed_at: now,
 updated_at: now,
 })
 .eq('id', slotRequest.id)

 if (rejectError) throw rejectError

 await supabase.from('notifications').insert({
 user_id: slotRequest.user_id,
 actor_id: user.id,
 type: 'message',
 message: `Your ${slotRequest.request_type} slot request was rejected.${adminNote ? ` Note: ${adminNote}` : ''}`,
 is_read: false,
 })

 return NextResponse.json({ success: true })
 } catch (error: any) {
 console.error('Admin slot request action error:', error)
 return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
 }
}
