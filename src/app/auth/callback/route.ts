import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function sanitizeNextPath(next: string | null) {
  if (!next) return '/'
  if (!next.startsWith('/')) return '/'
  if (next.startsWith('//')) return '/'
  return next
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNextPath(searchParams.get('next'))
  
  if (code) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code)

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
  return NextResponse.redirect(`${origin}/`)
}
