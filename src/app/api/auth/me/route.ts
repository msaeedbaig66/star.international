import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const AUTH_ME_PROFILE_SELECT =
  'id, username, first_name, last_name, full_name, email, avatar_url, bio, university, field_of_study, city, role, is_verified, follower_count, following_count, listing_slot_limit, community_slot_limit, rating_avg, rating_count, phone, phone_number, sector_type_id, institution_id, department_id, created_at, updated_at'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(AUTH_ME_PROFILE_SELECT)
      .eq('id', user.id)
      .single()
    if (error) throw error

    return NextResponse.json({ data: { user, profile }, error: null })
  } catch (error) {
    console.error('auth/me GET failed:', error)
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}
