import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { loginSchema } from '@/lib/validations/auth'

export async function POST(req: Request) {
 try {
 const body = await req.json()
 const parsed = loginSchema.safeParse(body)
 if (!parsed.success) {
 return NextResponse.json({ data: null, error: { message: parsed.error.issues[0].message } }, { status: 400 })
 }
 
 const { email, password, remember_me } = parsed.data
 const shouldRemember = remember_me ?? true
 const supabase = await createClient({
 sessionCookieMode: shouldRemember ? 'persistent' : 'session',
 })
 
 const { data, error } = await supabase.auth.signInWithPassword({ email, password })
 if (error) {
 const message = error.message || 'Login failed'
 const lowered = message.toLowerCase()
 if (lowered.includes('email not confirmed') || lowered.includes('email_not_confirmed')) {
 return NextResponse.json(
 {
 data: null,
 error: {
 code: 'EMAIL_NOT_CONFIRMED',
 message: 'Please verify your email before logging in.',
 },
 },
 { status: 401 }
 )
 }
 return NextResponse.json({ data: null, error: { message: error.message } }, { status: 401 })
 }

 const { data: profile } = await supabase
 .from('profiles')
 .select('id,username,full_name,avatar_url')
 .eq('id', data.user.id)
 .single()
 
 return NextResponse.json({ data: { user: data.user, profile }, error: null })
 } catch (error: any) {
 console.error('API Error:', error)
 return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
 }
}
