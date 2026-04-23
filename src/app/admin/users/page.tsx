import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { UsersManager } from '@/components/admin/users-manager'

type AdminUserRow = {
  id: string
  username: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  role: 'user' | 'admin' | 'moderator' | null
  is_verified: boolean | null
  created_at: string
  is_banned: boolean | null
  ban_reason: string | null
  banned_at: string | null
}

type AuthUserRow = {
  id: string
  email?: string | null
  created_at?: string
  email_confirmed_at?: string | null
  user_metadata?: Record<string, any> | null
}

function fallbackUsernameFromEmail(email: string | null | undefined) {
  if (!email) return ''
  return email.split('@')[0] || ''
}

async function loadAllAuthUsers(supabase: ReturnType<typeof createAdminClient>) {
  const users: AuthUserRow[] = []
  const perPage = 200
  const maxPages = 100

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const batch = (data?.users || []) as AuthUserRow[]
    users.push(...batch)
    if (batch.length < perPage) break
  }

  return users
}

async function loadProfilesForAuthIds(
  supabase: ReturnType<typeof createAdminClient>,
  authIds: string[]
) {
  if (authIds.length === 0) return [] as AdminUserRow[]

  const pageSize = 500
  const rows: AdminUserRow[] = []
  for (let from = 0; from < authIds.length; from += pageSize) {
    const chunk = authIds.slice(from, from + pageSize)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, email, avatar_url, role, is_verified, created_at, is_banned, ban_reason, banned_at')
      .in('id', chunk)

    if (error) {
      throw error
    }

    rows.push(...((data || []) as AdminUserRow[]))
  }

  return rows
}

async function loadAllUsers() {
  const supabase = createAdminClient()
  const authUsers = await loadAllAuthUsers(supabase)
  const profiles = await loadProfilesForAuthIds(
    supabase,
    authUsers.map((user) => user.id)
  )

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))

  return authUsers
    .map((authUser) => {
      const profile = profileById.get(authUser.id)
      const metadata = authUser.user_metadata || {}
      const email = (authUser.email || profile?.email || null) as string | null

      return {
        id: authUser.id,
        username:
          profile?.username ||
          (typeof metadata.username === 'string' ? metadata.username : '') ||
          fallbackUsernameFromEmail(email) ||
          `user_${authUser.id.slice(0, 8)}`,
        full_name:
          profile?.full_name ||
          (typeof metadata.full_name === 'string' ? metadata.full_name : null),
        email,
        avatar_url:
          profile?.avatar_url ||
          (typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null),
        role: profile?.role || 'user',
        is_verified: profile?.is_verified ?? Boolean(authUser.email_confirmed_at),
        created_at: profile?.created_at || authUser.created_at || new Date().toISOString(),
        is_banned: profile?.is_banned ?? false,
        ban_reason: profile?.ban_reason || null,
        banned_at: profile?.banned_at || null,
      } as AdminUserRow
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export default async function AdminUsersPage() {
  const authClient = await createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  const users = await loadAllUsers()

  return <UsersManager initialUsers={users} currentAdminId={user?.id || null} />
}
