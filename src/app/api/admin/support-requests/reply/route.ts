import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { escapeHtml } from '@/lib/utils'
import { sendTransactionalEmail } from '@/lib/email/resend'

const supportReplySchema = z.object({
 request_id: z.string().min(1),
 reply: z.string().trim().min(1).max(5000),
 mark_closed: z.boolean().optional(),
})

export async function POST(req: Request) {
 try {
 const auth = await createClient()
 const { data: { user } } = await auth.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const { data: profile } = await auth.from('profiles').select('role').eq('id', user.id).single()
 if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

 const body = await req.json().catch(() => ({}))
 const parsed = supportReplySchema.safeParse(body)
 if (!parsed.success) {
 return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
 }
 const requestId = parsed.data.request_id
 const reply = parsed.data.reply
 const markClosed = Boolean(parsed.data.mark_closed)

 const supabase = createAdminClient()
 const now = new Date().toISOString()

 const { data: supportReq, error: reqErr } = await supabase
 .from('support_requests')
 .select('*')
 .eq('id', requestId)
 .single()
 if (reqErr || !supportReq) {
 return NextResponse.json({ error: 'Support request not found' }, { status: 404 })
 }

 const newStatus = markClosed ? 'closed' : 'replied'
 const { error: updateErr } = await supabase
 .from('support_requests')
 .update({
 admin_reply: reply,
 replied_by: user.id,
 replied_at: now,
 status: newStatus,
 updated_at: now,
 })
 .eq('id', requestId)
 if (updateErr) throw updateErr

 if (supportReq.user_id) {
 const { error: notifErr } = await supabase.from('notifications').insert({
 user_id: supportReq.user_id,
 actor_id: user.id,
 type: 'message',
 message: `Support reply on "${supportReq.subject}": ${reply}`,
 is_read: false,
 })
 if (notifErr) throw notifErr
 }

 // Sanitize user content for HTML context
 const safeName = escapeHtml(supportReq.name || 'there')
 const safeSubject = escapeHtml(supportReq.subject)
 const safeMsg = escapeHtml(supportReq.message)
 const safeReply = escapeHtml(reply).replace(/\n/g, '<br/>')

 // Send the reply via email using Resend
 await sendTransactionalEmail({
 to: supportReq.email,
 subject: `Re: ${supportReq.subject}`,
 html: `
 <div style="font-family: sans-serif; padding: 20px; color: #111;">
 <h2 style="color: #0070f3;">Support Team Reply</h2>
 <p>Hi ${safeName},</p>
 <p>An administrator has replied to your support request <strong>"${safeSubject}"</strong>:</p>
 
 <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #0070f3; margin: 20px 0; border-radius: 4px;">
 <p style="margin: 0;">${safeReply}</p>
 </div>

 <p style="font-size: 0.9em; color: #666;"><strong>Your original message:</strong></p>
 <p style="font-style: italic; color: #999; border-left: 2px solid #eee; padding-left: 10px;">${safeMsg}</p>
 
 <hr style="border: 1px solid #eee; margin: 20px 0;" />
 <p style="font-size: 0.8em; color: #999;">This email was sent from Allpanga Support. You can view this and other notifications in your dashboard.</p>
 </div>
 `
 })

 return NextResponse.json({ success: true })
 } catch (error: any) {
 console.error('Admin support reply error:', error)
 return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
 }
}
