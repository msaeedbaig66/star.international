import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import {
  encodeSoftDeleteNote,
  isSoftDeleteRecoverable,
  parseSoftDeleteNote,
  type SoftDeleteActorRole,
} from '@/lib/content-soft-delete'
import { isAllowedCommunityImageUrl } from '@/lib/security/media-urls'

const PUBLIC_OWNER_SELECT = 'id, username, full_name, avatar_url'
const COMMUNITY_SELECT = `*, owner:profiles!owner_id(${PUBLIC_OWNER_SELECT})`
const recoverActionSchema = z
  .object({
    action: z.literal('recover'),
  })
  .strict()

const communityPatchSchema = z
  .object({
    name: z.string().trim().min(3).max(100).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    type: z.enum(['field', 'project']).optional(),
    field: z.string().trim().max(120).nullable().optional(),
    avatar_url: z.union([z.string().trim().url(), z.literal(''), z.null()]).optional(),
    banner_url: z.union([z.string().trim().url(), z.literal(''), z.null()]).optional(),
    rules: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()

async function getViewerRole(client: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await client.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (error) throw error
  return data?.role === 'admin' ? 'admin' : 'user'
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let { data: publicCommunity, error: publicByIdError } = await supabase
      .from('communities')
      .select(COMMUNITY_SELECT)
      .eq('id', params.id)
      .eq('moderation', 'approved')
      .maybeSingle()
    if (publicByIdError) throw publicByIdError

    if (!publicCommunity) {
      const fallback = await supabase
        .from('communities')
        .select(COMMUNITY_SELECT)
        .eq('slug', params.id)
        .eq('moderation', 'approved')
        .maybeSingle()
      if (fallback.error) throw fallback.error
      publicCommunity = fallback.data as any
    }

    if (publicCommunity) return NextResponse.json({ data: publicCommunity, error: null })
    if (!user) return NextResponse.json({ error: 'Community not found' }, { status: 404 })

    const viewerRole = await getViewerRole(supabase, user.id)
    if (viewerRole === 'admin') {
      const admin = createAdminClient()
      let { data: adminCommunity, error: adminByIdError } = await admin
        .from('communities')
        .select(COMMUNITY_SELECT)
        .eq('id', params.id)
        .maybeSingle()
      if (adminByIdError) throw adminByIdError
      if (!adminCommunity) {
        const fallback = await admin
          .from('communities')
          .select(COMMUNITY_SELECT)
          .eq('slug', params.id)
          .maybeSingle()
        if (fallback.error) throw fallback.error
        adminCommunity = fallback.data as any
      }
      if (!adminCommunity) return NextResponse.json({ error: 'Community not found' }, { status: 404 })
      return NextResponse.json({ data: adminCommunity, error: null })
    }

    let { data: ownerCommunity, error: ownerByIdError } = await supabase
      .from('communities')
      .select(COMMUNITY_SELECT)
      .eq('id', params.id)
      .eq('owner_id', user.id)
      .maybeSingle()
    if (ownerByIdError) throw ownerByIdError
    if (!ownerCommunity) {
      const fallback = await supabase
        .from('communities')
        .select(COMMUNITY_SELECT)
        .eq('slug', params.id)
        .eq('owner_id', user.id)
        .maybeSingle()
      if (fallback.error) throw fallback.error
      ownerCommunity = fallback.data as any
    }
    if (!ownerCommunity) return NextResponse.json({ error: 'Community not found' }, { status: 404 })

    return NextResponse.json({ data: ownerCommunity, error: null })
  } catch (error: any) {
    return NextResponse.json({ data: null, error: 'Failed to process community request' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let isAdmin = false
    let queryClient: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient> = supabase

    let { data: existing, error: findError } = await supabase
      .from('communities')
      .select('id, owner_id')
      .eq('id', params.id)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!existing) {
      const role = await getViewerRole(supabase, user.id)
      isAdmin = role === 'admin'
      if (!isAdmin) {
        return NextResponse.json({ error: 'Community not found' }, { status: 404 })
      }

      const admin = createAdminClient()
      queryClient = admin
      const adminLookup = await admin
        .from('communities')
        .select('id, owner_id')
        .eq('id', params.id)
        .maybeSingle()
      existing = adminLookup.data
      findError = adminLookup.error
    }

    if (findError || !existing) return NextResponse.json({ error: 'Community not found' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const parsed = communityPatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
    }

    if (parsed.data.avatar_url && !isAllowedCommunityImageUrl(parsed.data.avatar_url, user.id)) {
      return NextResponse.json({ error: 'Community avatar must use an approved uploaded media URL.' }, { status: 400 })
    }
    if (parsed.data.banner_url && !isAllowedCommunityImageUrl(parsed.data.banner_url, user.id)) {
      return NextResponse.json({ error: 'Community banner must use an approved uploaded media URL.' }, { status: 400 })
    }

    const updateData: Record<string, any> = { ...parsed.data }
    updateData.updated_at = new Date().toISOString()

    if (!isAdmin) {
      updateData.moderation = 'pending'
      updateData.rejection_note = null
    }

    let updateQuery = queryClient
      .from('communities')
      .update(updateData)
      .eq('id', params.id)
    if (!isAdmin) {
      updateQuery = updateQuery.eq('owner_id', user.id)
    }
    const { data, error } = await updateQuery.select().single()
    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (error: any) {
    return NextResponse.json({ data: null, error: 'Failed to process community request' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = await getViewerRole(supabase, user.id)
    const canAdmin = role === 'admin'
    const admin = canAdmin ? createAdminClient() : null
    const queryClient = canAdmin ? admin! : supabase

    let fetchQuery = queryClient
      .from('communities')
      .select('id, name, owner_id, moderation, rejection_note')
      .eq('id', params.id)
    if (!canAdmin) {
      fetchQuery = fetchQuery.eq('owner_id', user.id)
    }
    const { data: existing, error: findError } = await fetchQuery.maybeSingle()
    if (findError || !existing) return NextResponse.json({ error: 'Community not found' }, { status: 404 })

    const currentMeta = parseSoftDeleteNote(existing.rejection_note)
    if (currentMeta && isSoftDeleteRecoverable(currentMeta)) {
      return NextResponse.json({
        success: true,
        already_deleted: true,
        undo_until: currentMeta.undoUntil,
      })
    }

    const now = new Date()
    const undoUntil = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
    const actorRole: SoftDeleteActorRole = canAdmin ? 'admin' : 'owner'

    const note = encodeSoftDeleteNote(
      {
        entity: 'community',
        deletedById: user.id,
        deletedByRole: actorRole,
        deletedAt: now.toISOString(),
        undoUntil,
        prevModeration: existing.moderation ?? 'approved',
        prevRejectionNote: existing.rejection_note ?? null,
      },
      canAdmin
        ? 'Admin deleted this community. It can be restored within 2 days.'
        : 'You deleted this community. It can be restored within 2 days.'
    )

    let deleteQuery = queryClient
      .from('communities')
      .update({
        moderation: 'rejected',
        rejection_note: note,
        updated_at: now.toISOString(),
      })
      .eq('id', params.id)
    if (!canAdmin) {
      deleteQuery = deleteQuery.eq('owner_id', user.id)
    }
    const { data, error } = await deleteQuery
      .select('id, name, moderation, rejection_note, updated_at')
      .single()
    if (error) throw error

    if (canAdmin && existing.owner_id !== user.id) {
      await admin!.from('notifications').insert({
        user_id: existing.owner_id,
        type: 'community_rejected',
        actor_id: user.id,
        community_id: existing.id,
        message: `Admin deleted your community "${existing.name}". You can undo this within 2 days.`,
        is_read: false,
      })
    }

    return NextResponse.json({ success: true, undo_until: undoUntil, data })
  } catch (error: any) {
    return NextResponse.json({ data: null, error: 'Failed to process community request' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const parsedAction = recoverActionSchema.safeParse(body)
    if (!parsedAction.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsedAction.error.format() }, { status: 400 })
    }

    const role = await getViewerRole(supabase, user.id)
    const canAdmin = role === 'admin'
    const admin = canAdmin ? createAdminClient() : null
    const queryClient = canAdmin ? admin! : supabase

    let fetchQuery = queryClient
      .from('communities')
      .select('id, name, owner_id, moderation, rejection_note')
      .eq('id', params.id)
    if (!canAdmin) {
      fetchQuery = fetchQuery.eq('owner_id', user.id)
    }
    const { data: existing, error: findError } = await fetchQuery.maybeSingle()
    if (findError || !existing) return NextResponse.json({ error: 'Community not found' }, { status: 404 })

    const meta = parseSoftDeleteNote(existing.rejection_note)
    if (!meta) return NextResponse.json({ error: 'This community is not recoverable.' }, { status: 400 })
    if (!canAdmin && !isSoftDeleteRecoverable(meta)) {
      return NextResponse.json({ error: 'Recovery window expired (2 days).' }, { status: 400 })
    }

    let restoreQuery = queryClient
      .from('communities')
      .update({
        moderation: meta.prevModeration || 'approved',
        rejection_note: meta.prevRejectionNote ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
    if (!canAdmin) {
      restoreQuery = restoreQuery.eq('owner_id', user.id)
    }
    const { data, error } = await restoreQuery
      .select('id, name, moderation, rejection_note, updated_at')
      .single()
    if (error) throw error

    if (canAdmin && existing.owner_id !== user.id) {
      await admin!.from('notifications').insert({
        user_id: existing.owner_id,
        type: 'community_approved',
        actor_id: user.id,
        community_id: existing.id,
        message: `Admin restored your community "${existing.name}".`,
        is_read: false,
      })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ data: null, error: 'Failed to process community request' }, { status: 500 })
  }
}
