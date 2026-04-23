import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const resendSchema = z
  .object({
    email: z.string().trim().email().max(320),
  })
  .strict()

function resolveAuthRedirectUrl(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (envUrl) {
    return `${envUrl.replace(/\/+$/, '')}/api/auth/callback`
  }

  const trustedOrigin = new URL(req.url).origin
  return `${trustedOrigin.replace(/\/+$/, '')}/api/auth/callback`
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const parsed = resendSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
    }
    const email = parsed.data.email.toLowerCase()
    const emailRedirectTo = resolveAuthRedirectUrl(req)

    const supabase = await createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo,
      },
    })

    if (error) {
      return NextResponse.json({ error: 'Failed to resend email' }, { status: 400 })
    }

    return NextResponse.json({ message: 'Verification email resent' }, { status: 200 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
