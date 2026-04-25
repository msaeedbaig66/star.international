import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function sanitizeNextPath(next: string | null) {
  if (!next) return '/'
  // Security: Only allow internal paths. Block external URLs (Open Redirect protection).
  if (!next.startsWith('/') || next.startsWith('//') || next.toLowerCase().includes('http')) {
    return '/'
  }
  return next
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNextPath(searchParams.get('next'))
  
  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback exchangeCodeForSession error:', error)
      return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
    }

    const user = data?.user
    if (user) {
      // Check if profile is complete (Onboarding Wall)
      const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id, department_id')
        .eq('id', user.id)
        .single()

      // If we are resetting password, we should jump to the next page (usually /forgot-password)
      if (next.includes('forgot-password')) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      // Otherwise, check onboarding
      if (!profile?.institution_id || !profile?.department_id) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  
  // Direct to homepage if everything else fails
  return NextResponse.json({ error: 'Auth code exchange failed' }, { status: 400 })
}
