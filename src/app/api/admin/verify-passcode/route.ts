import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const ADMIN_PASSCODE = process.env.ADMIN_PANEL_PASSCODE

export async function POST(req: Request) {
  try {
    const { passcode } = await req.json().catch(() => ({}))

    if (typeof passcode !== 'string' || !passcode) {
      return NextResponse.json({ error: 'Passcode is required' }, { status: 400 })
    }

    if (!ADMIN_PASSCODE) {
      return NextResponse.json({ error: 'Admin panel is not configured' }, { status: 503 })
    }
    
    // Constant time comparison for the passcode itself
    const encoder = new TextEncoder()
    const inputData = encoder.encode(passcode)
    const adminData = encoder.encode(ADMIN_PASSCODE)
    
    if (inputData.length !== adminData.length) {
      return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 })
    }

    let diff = 0
    for (let i = 0; i < inputData.length; i++) {
      diff |= inputData[i] ^ adminData[i]
    }

    if (diff === 0) {
      const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!secret) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
      }

      // Generate HMAC signature for the cookie
      const keyData = encoder.encode(secret)
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
      const signature = await crypto.subtle.sign('HMAC', cryptoKey, adminData)
      const token = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      // Set the session cookie (no maxAge = expires when browser closes)
      // This satisfies the requirement "when open any tab it agin ask for password" (for new sessions)
      const cookieStore = await cookies()
      cookieStore.set('admin_unlocked', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        // maxAge is intentionally omitted to make it a session cookie
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 })
  } catch (error) {
    console.error('Admin verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_unlocked')
  return NextResponse.json({ success: true })
}
