import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { sendTransactionalEmail } from '@/lib/email/resend'

const contactRequestSchema = z
 .object({
 name: z.string().trim().min(1).max(120),
 email: z.string().trim().email().max(320),
 subject: z.string().trim().min(1).max(200),
 message: z.string().trim().min(1).max(5000),
 })
 .strict()

export async function POST(req: Request) {
 try {
 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()

 if (!user) {
 return NextResponse.json({ error: 'Please log in before sending support request.' }, { status: 401 })
 }

 const body = await req.json().catch(() => ({}))
 const parsed = contactRequestSchema.safeParse(body)
 if (!parsed.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
 }
 const { name, email, subject, message } = parsed.data
 const { escapeHtml } = await import('@/lib/utils/html-escape')

 const { data, error } = await supabase
 .from('support_requests')
 .insert({
 user_id: user.id,
 name,
 email,
 subject,
 message,
 status: 'open',
 })
 .select()
 .single()

 if (error) throw error
 
 // Send confirmation email via Resend
 await sendTransactionalEmail({
 to: email,
 subject: `Received: ${subject}`,
 html: `
 <div style="font-family: sans-serif; padding: 20px; color: #111;">
 <h2 style="color: #0070f3;">Support Request Received</h2>
 <p>Hi ${escapeHtml(name)},</p>
 <p>We've received your message regarding <strong>"${escapeHtml(subject)}"</strong>. Our team will get back to you shortly.</p>
 <hr style="border: 1px solid #eee; margin: 20px 0;" />
 <p style="font-size: 0.9em; color: #666;"><strong>Your message:</strong></p>
 <p style="font-style: italic; color: #666;">${escapeHtml(message)}</p>
 <hr style="border: 1px solid #eee; margin: 20px 0;" />
 <p style="font-size: 0.8em; color: #999;">This is an automated acknowledgment. Please do not reply to this email.</p>
 </div>
 `
 })

 return NextResponse.json({ data, error: null }, { status: 201 })
 } catch (error: any) {
 console.error('Contact request API error:', error)
 return NextResponse.json({ data: null, error: error?.message || 'Internal server error' }, { status: 500 })
 }
}
