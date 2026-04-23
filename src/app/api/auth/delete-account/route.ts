import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  findAuthUserIdsByEmail,
  purgeAuthUsersWithCleanup,
} from '@/lib/account-deletion'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await createAdminClient()
    const idsToDelete = new Set<string>([user.id])

    // Find other instances of this email (e.g. if multiple providers used)
    const accountEmail = (user.email || '').trim().toLowerCase()
    if (accountEmail) {
      const relatedIds = await findAuthUserIdsByEmail(admin, accountEmail).catch(() => [])
      relatedIds.forEach((id) => idsToDelete.add(id))
    }

    // Execute unified cleanup logic
    await purgeAuthUsersWithCleanup(admin, Array.from(idsToDelete), {
      profileEmail: accountEmail || null,
    })

    return NextResponse.json({ success: true, message: 'Account and associated data deleted successfully' })
  } catch (error: any) {
    console.error('Delete Account Error:', error)
    return NextResponse.json({ error: 'An internal error occurred while deleting the account' }, { status: 500 })
  }
}
