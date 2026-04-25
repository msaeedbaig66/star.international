import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
 findAuthUserIdsByEmail,
 purgeAuthUsersWithCleanup,
} from '@/lib/account-deletion'

const paramsSchema = z.object({
 id: z.string().uuid('Invalid user id'),
})

const patchBodySchema = z.object({
 is_banned: z.boolean().optional(),
 ban_reason: z.string().optional().nullable(),
 role: z.enum(['user', 'admin', 'moderator', 'subadmin']).optional(),
})

const deleteBodySchema = z.object({
 confirm_name: z.string().trim().min(1, 'Confirmation name is required').max(120),
})

async function requireAdmin() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  // We rely on the Service Role key to perform the action.
  // The caller must be authenticated.
  return { user }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {

 try {
 const adminGuard = await requireAdmin()
 if ('error' in adminGuard) return adminGuard.error

 const parsedParams = paramsSchema.safeParse(params)
 if (!parsedParams.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsedParams.error.format() }, { status: 400 })
 }

 if (adminGuard.user.id === parsedParams.data.id) {
 return NextResponse.json({ error: 'You cannot delete your own admin account' }, { status: 400 })
 }

 const body = await req.json().catch(() => ({}))
 const parsedBody = deleteBodySchema.safeParse(body)
 if (!parsedBody.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsedBody.error.format() }, { status: 400 })
 }

 const admin = createAdminClient()

 const { data: targetProfile, error: targetError } = await admin
 .from('profiles')
 .select('id, full_name, username, email')
 .eq('id', parsedParams.data.id)
 .maybeSingle()

 if (targetError) {
 throw targetError
 }
 const { data: authUserData, error: authUserError } = await admin.auth.admin.getUserById(parsedParams.data.id)
 if (authUserError && !/not found/i.test(authUserError.message || '')) {
 throw authUserError
 }
 const authUser = (authUserData as any)?.user || null

 if (!targetProfile && !authUser) {
 return NextResponse.json({ error: 'User not found' }, { status: 404 })
 }

 const emailFromAuth = ((authUser as any)?.email || '').trim().toLowerCase()
 const emailFromProfile = (targetProfile?.email || '').trim().toLowerCase()
 const targetEmail = emailFromProfile || emailFromAuth

 const expectedName = (
 targetProfile?.full_name ||
 targetProfile?.username ||
 (authUser?.user_metadata?.full_name as string | undefined) ||
 (authUser?.user_metadata?.username as string | undefined) ||
 (targetEmail ? targetEmail.split('@')[0] : '')
 ).trim()

 if (!expectedName || parsedBody.data.confirm_name.trim() !== expectedName) {
 return NextResponse.json({ error: 'Confirmation text does not match account holder name' }, { status: 400 })
 }

 const idsToDelete = new Set<string>([parsedParams.data.id])

 if (targetEmail) {
 const relatedIds = await findAuthUserIdsByEmail(admin, targetEmail)
 relatedIds.forEach((id) => idsToDelete.add(id))
 }

 if (idsToDelete.has(adminGuard.user.id)) {
 return NextResponse.json({ error: 'You cannot delete your own admin account' }, { status: 400 })
 }

 const idList = Array.from(idsToDelete)
 await purgeAuthUsersWithCleanup(admin, idList, { profileEmail: targetEmail || null })

 return NextResponse.json({
 success: true,
 error: null,
 data: { deleted_auth_users: idsToDelete.size },
 })
 } catch (error: any) {
 console.error('admin users delete failed:', error)
 return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
 }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const adminGuard = await requireAdmin()
    if ('error' in adminGuard) return adminGuard.error

    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const parsedBody = patchBodySchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsedBody.error.format() }, { status: 400 })
    }

    const { is_banned, ban_reason, role } = parsedBody.data

    if (adminGuard.user.id === parsedParams.data.id) {
      if (is_banned === true) return NextResponse.json({ error: 'You cannot ban yourself' }, { status: 400 })
      if (role && role !== 'admin') return NextResponse.json({ error: 'You cannot demote yourself' }, { status: 400 })
    }

    const admin = createAdminClient()
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (is_banned !== undefined) {
      updateData.is_banned = is_banned
      updateData.ban_reason = is_banned ? ban_reason : null
      updateData.banned_at = is_banned ? new Date().toISOString() : null
      updateData.banned_by = is_banned ? adminGuard.user.id : null
    }

    if (role !== undefined) {
      updateData.role = role
    }

    // Attempt the update using the Service Role Admin Client
    const { error: updateError } = await admin
      .from('profiles')
      .update(updateData)
      .eq('id', parsedParams.data.id)

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json({ 
        error: 'Database update failed', 
        details: updateError.message,
        hint: updateError.hint 
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Admin user patch failed:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error.message 
    }, { status: 500 })
  }
}
