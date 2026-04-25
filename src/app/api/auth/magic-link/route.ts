import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const magicLinkSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
})

function resolveAuthRedirectUrl(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const baseOrigin = envUrl ? envUrl.replace(/\/+$/, '') : new URL(req.url).origin
  return `${baseOrigin}/auth/callback`
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const parsed = magicLinkSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }
    
    const { email } = parsed.data
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
    console.error('Magic Link Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
