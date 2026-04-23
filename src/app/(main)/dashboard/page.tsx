import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

const DASHBOARD_PROFILE_SELECT =
  'id, username, first_name, last_name, full_name, email, avatar_url, bio, university, field_of_study, city, role, is_verified, follower_count, following_count, listing_slot_limit, community_slot_limit, rating_avg, rating_count, phone, phone_number, sector_type_id, institution_id, department_id, created_at, updated_at'

export const metadata = {
  title: 'Dashboard | Allpanga',
  description: 'Manage your listings, blogs, communities and messages on Allpanga.',
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { tab?: string; edit?: string; threadId?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let { data: profile } = await supabase
    .from('profiles')
    .select(DASHBOARD_PROFILE_SELECT)
    .eq('id', user.id)
    .single()

  if (!profile) {
    // No profile found for user, creating one...
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || '',
        username: user.email?.split('@')[0] + '_' + user.id.slice(0, 4),
        full_name: user.email?.split('@')[0] || 'User',
      })
      .select(DASHBOARD_PROFILE_SELECT)
      .single()

    if (newProfile) {
      profile = newProfile
    } else {
      console.error("Profile auto-creation failed: ", insertError)
      return (
        <div className="p-10 text-center space-y-4 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-destructive">Dashboard Unavailable</h2>
          <p className="text-text-secondary">
            We could not initialize your profile right now. Please try again in a moment.
          </p>
          <p className="text-sm text-text-muted">If this keeps happening, contact support.</p>
        </div>
      )
    }
  }

  const params = searchParams
  const activeTab = params.tab || 'overview'
  const editId = params.edit || null
  const threadId = params.threadId || null

  return <DashboardShell profile={profile} activeTab={activeTab} editId={editId} threadId={threadId} />
}
