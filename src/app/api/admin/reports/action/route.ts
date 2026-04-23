import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import {
 encodeAdminActionNote,
 parseAdminActionNote,
 isUndoWindowOpen,
 type AdminModerationAction,
} from '@/lib/admin-report-action'

type TargetType = 'listing' | 'blog' | 'community'
type ActionType = AdminModerationAction | 'notify' | 'undo' | 'clear_report'

const adminReportActionSchema = z.object({
 report_id: z.string().min(1),
 action: z.enum(['warn', 'freeze', 'remove', 'notify', 'undo', 'clear_report']),
 admin_message: z.string().trim().max(2000).optional(),
})

function getTargetConfig(targetType: TargetType) {
 if (targetType === 'listing') {
 return { table: 'listings', ownerField: 'seller_id' }
 }
 if (targetType === 'blog') {
 return { table: 'blogs', ownerField: 'author_id' }
 }
 return { table: 'communities', ownerField: 'owner_id' }
}

export async function POST(req: Request) {
 try {
 const auth = await createClient()
 const { data: { user } } = await auth.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const { data: adminProfile } = await auth.from('profiles').select('role').eq('id', user.id).single()
 if (adminProfile?.role !== 'admin') {
 return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
 }

 const body = await req.json().catch(() => ({}))
 const parsed = adminReportActionSchema.safeParse(body)
 if (!parsed.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
 }
 const reportId = parsed.data.report_id
 const action = parsed.data.action as ActionType
 const adminMessage = parsed.data.admin_message || ''

 const supabase = createAdminClient()

 const { data: report, error: reportError } = await supabase
 .from('reports')
 .select('*')
 .eq('id', reportId)
 .single()
 if (reportError || !report) {
 return NextResponse.json({ error: 'Report not found' }, { status: 404 })
 }

 const targetType = report.target_type as TargetType
 if (!['listing', 'blog', 'community'].includes(targetType)) {
 if (action === 'clear_report') {
 const { error: delErr } = await supabase.from('reports').delete().eq('id', reportId)
 if (delErr) throw delErr
 return NextResponse.json({ success: true })
 }
 return NextResponse.json({ error: 'Target type not supported for this action' }, { status: 400 })
 }

 const { table, ownerField } = getTargetConfig(targetType)
 const { data: target, error: targetErr } = await supabase
 .from(table)
 .select('*')
 .eq('id', report.target_id)
 .single()
 if (targetErr || !target) {
 return NextResponse.json({ error: 'Target not found' }, { status: 404 })
 }

 const ownerId = target?.[ownerField] as string | undefined
 const now = new Date()
 const undoUntil = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()

 if (action === 'clear_report') {
 const { error: delErr } = await supabase.from('reports').delete().eq('id', reportId)
 if (delErr) throw delErr
 return NextResponse.json({ success: true })
 }

 if (action === 'notify') {
 if (ownerId) {
 await supabase.from('notifications').insert({
 user_id: ownerId,
 type: 'report_received',
 actor_id: user.id,
 listing_id: targetType === 'listing' ? target.id : null,
 blog_id: targetType === 'blog' ? target.id : null,
 community_id: targetType === 'community' ? target.id : null,
 message: adminMessage || 'Your content was reported and is under admin review.',
 is_read: false,
 })
 }

 await supabase
 .from('reports')
 .update({
 status: 'reviewing',
 resolved_by: user.id,
 resolved_at: now.toISOString(),
 })
 .eq('id', reportId)

 return NextResponse.json({ success: true })
 }

 if (action === 'undo') {
 const meta = parseAdminActionNote(target.rejection_note)
 if (!meta || meta.reportId !== reportId || !isUndoWindowOpen(meta)) {
 return NextResponse.json({ error: 'Undo window expired or action not found' }, { status: 400 })
 }

 const restorePayload: Record<string, any> = {
 moderation: meta.prevModeration ?? target.moderation,
 rejection_note: meta.prevRejectionNote ?? null,
 updated_at: now.toISOString(),
 }

 if (targetType === 'listing' && meta.prevStatus !== undefined) {
 restorePayload.status = meta.prevStatus
 }

 const { error: restoreErr } = await supabase
 .from(table)
 .update(restorePayload)
 .eq('id', target.id)
 if (restoreErr) throw restoreErr

 await supabase
 .from('reports')
 .update({
 status: 'open',
 resolved_by: null,
 resolved_at: null,
 })
 .eq('id', reportId)

 if (ownerId) {
 await supabase.from('notifications').insert({
 user_id: ownerId,
 type: 'report_received',
 actor_id: user.id,
 listing_id: targetType === 'listing' ? target.id : null,
 blog_id: targetType === 'blog' ? target.id : null,
 community_id: targetType === 'community' ? target.id : null,
 message: 'Admin reverted a previous moderation action on your content.',
 is_read: false,
 })
 }

 return NextResponse.json({ success: true })
 }

 const moderationAction = action as AdminModerationAction
 const actionNote = encodeAdminActionNote({
 reportId,
 action: moderationAction,
 adminMessage: adminMessage || `Admin action (${moderationAction}) applied due to report.`,
 createdAt: now.toISOString(),
 undoUntil,
 prevModeration: target.moderation ?? null,
 prevStatus: targetType === 'listing' ? target.status ?? null : null,
 prevRejectionNote: target.rejection_note ?? null,
 })

 const updatePayload: Record<string, any> = {
 rejection_note: actionNote,
 updated_at: now.toISOString(),
 }

 if (action === 'warn') {
 // Keep content visible but add warning banner using encoded note.
 updatePayload.moderation = target.moderation || 'approved'
 if (targetType === 'listing' && target.status) updatePayload.status = target.status
 } else if (action === 'freeze') {
 updatePayload.moderation = 'rejected'
 if (targetType === 'listing') updatePayload.status = 'reserved'
 } else if (action === 'remove') {
 updatePayload.moderation = 'rejected'
 if (targetType === 'listing') updatePayload.status = 'removed'
 }

 const { error: updateErr } = await supabase
 .from(table)
 .update(updatePayload)
 .eq('id', target.id)
 if (updateErr) throw updateErr

 await supabase
 .from('reports')
 .update({
 status: 'reviewing',
 resolved_by: user.id,
 resolved_at: now.toISOString(),
 })
 .eq('id', reportId)

 if (ownerId) {
 await supabase.from('notifications').insert({
 user_id: ownerId,
 type: 'report_received',
 actor_id: user.id,
 listing_id: targetType === 'listing' ? target.id : null,
 blog_id: targetType === 'blog' ? target.id : null,
 community_id: targetType === 'community' ? target.id : null,
 message: adminMessage || `Admin applied "${action}" action to your content after report review.`,
 is_read: false,
 })
 }

 return NextResponse.json({ success: true })
 } catch (error: any) {
 console.error('Admin report action error:', error)
 return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
 }
}
