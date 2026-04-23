import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function resolveAuthRedirectUrl(req: Request) {
 const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
 const baseOrigin = envUrl ? envUrl.replace(/\/+$/, '') : new URL(req.url).origin
 return `${baseOrigin}/api/auth/callback`
}

export async function POST(req: Request) {
 try {
 const { email } = await req.json()
 if (!email) {
 return NextResponse.json({ error: 'Email is required' }, { status: 400 })
 }
 
 const supabase = await createClient()
 const { error } = await supabase.auth.signInWithOtp({
 email,
 options: {
 emailRedirectTo: resolveAuthRedirectUrl(req),
 },
 })
 
 if (error) {
 return NextResponse.json({ error: 'Failed to send magic link' }, { status: 400 })
 }
 
 return NextResponse.json({ success: true })
 } catch (err: any) {
 return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
 }
}
