import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const communityIdSchema = z.string().uuid()
type AdminGetter = () => ReturnType<typeof createAdminClient>

function isPermissionDenied(error: any) {
  const message = String(error?.message || '').toLowerCase()
  const code = String(error?.code || '').toUpperCase()
  return (
    code === '42501' ||
    message.includes('permission denied') ||
    message.includes('row-level security') ||
    message.includes('not allowed')
  )
}

async function updateCommunityMemberCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  getAdmin: AdminGetter,
  communityId: string,
  memberCount: number
) {
  const { error } = await supabase
    .from('communities')
    .update({ member_count: memberCount || 0 })
    .eq('id', communityId)
  if (!error) return
  if (!isPermissionDenied(error)) throw error

  const admin = getAdmin()
  const { error: adminError } = await admin
    .from('communities')
    .update({ member_count: memberCount || 0 })
    .eq('id', communityId)
  if (adminError) throw adminError
}

async function resolveJoinableCommunity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  getAdmin: AdminGetter,
  userId: string,
  communityId: string
) {
  let { data: community, error } = await supabase
    .from('communities')
    .select('id, owner_id')
    .eq('id', communityId)
    .eq('moderation', 'approved')
    .maybeSingle()
  if (error) throw error
  if (community) return community

  const own = await supabase
    .from('communities')
    .select('id, owner_id')
    .eq('id', communityId)
    .eq('owner_id', userId)
    .maybeSingle()
  if (own.error) throw own.error
  if (own.data) return own.data

  const { data: viewerProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  if (profileError) throw profileError
  if (viewerProfile?.role !== 'admin') return null

  const admin = getAdmin()
  const { data: adminCommunity, error: adminError } = await admin
    .from('communities')
    .select('id, owner_id')
    .eq('id', communityId)
    .maybeSingle()
  if (adminError) throw adminError
  return adminCommunity
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {

  try {
    const parsedCommunityId = communityIdSchema.safeParse(params.id)
    if (!parsedCommunityId.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsedCommunityId.error.format() }, { status: 400 })
    }
    const communityId = parsedCommunityId.data

    const supabase = await createClient()
    let adminClient: ReturnType<typeof createAdminClient> | null = null
    const getAdmin = () => {
      if (!adminClient) adminClient = createAdminClient()
      return adminClient
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const community = await resolveJoinableCommunity(supabase, getAdmin, user.id, communityId)
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 })

    const { data: existingMember, error: memberReadError } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (memberReadError) throw memberReadError

    if (!existingMember) {
      const { error: joinError } = await supabase
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: user.id,
          role: 'member',
        })
      if (joinError) throw joinError
    }

    const { count: memberCount, error: memberCountError } = await supabase
      .from('community_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('community_id', communityId)
    if (memberCountError) throw memberCountError
    await updateCommunityMemberCount(supabase, getAdmin, communityId, memberCount || 0)

    const ownerId = community.owner_id
    if (ownerId && ownerId !== user.id) {
      const { data: existingFollow, error: followReadError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', ownerId)
        .maybeSingle()
      if (followReadError) throw followReadError

      if (!existingFollow) {
        const { error: followInsertError } = await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: ownerId })

        if (!followInsertError || String((followInsertError as any).code || '') === '23505') {
          const [{ count: followingCount, error: followingCountError }, { count: followerCount, error: followerCountError }] =
            await Promise.all([
              supabase
                .from('follows')
                .select('following_id', { count: 'exact', head: true })
                .eq('follower_id', user.id),
              supabase
                .from('follows')
                .select('follower_id', { count: 'exact', head: true })
                .eq('following_id', ownerId),
            ])
          if (followingCountError) throw followingCountError
          if (followerCountError) throw followerCountError

          const { error: ownProfileUpdateError } = await supabase
            .from('profiles')
            .update({ following_count: followingCount || 0 })
            .eq('id', user.id)
          if (ownProfileUpdateError && !isPermissionDenied(ownProfileUpdateError)) throw ownProfileUpdateError

          const { error: ownerProfileUpdateError } = await supabase
            .from('profiles')
            .update({ follower_count: followerCount || 0 })
            .eq('id', ownerId)

          if (ownerProfileUpdateError) {
            if (!isPermissionDenied(ownerProfileUpdateError)) throw ownerProfileUpdateError
            const admin = getAdmin()
            const { error: adminOwnerUpdateError } = await admin
              .from('profiles')
              .update({ follower_count: followerCount || 0 })
              .eq('id', ownerId)
            if (adminOwnerUpdateError) throw adminOwnerUpdateError
          }

          const { error: notificationError } = await supabase.from('notifications').insert({
            user_id: ownerId,
            actor_id: user.id,
            type: 'follow',
            community_id: communityId,
            message: 'started following you after joining your community',
          })
          if (notificationError) {
            if (!isPermissionDenied(notificationError)) throw notificationError
            const admin = getAdmin()
            const { error: adminNotificationError } = await admin.from('notifications').insert({
              user_id: ownerId,
              actor_id: user.id,
              type: 'follow',
              community_id: communityId,
              message: 'started following you after joining your community',
            })
            if (adminNotificationError) throw adminNotificationError
          }
        } else {
          throw followInsertError
        }
      }
    }

    return NextResponse.json({ data: { is_member: true, member_count: memberCount || 0 }, error: null })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {

  try {
    const parsedCommunityId = communityIdSchema.safeParse(params.id)
    if (!parsedCommunityId.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsedCommunityId.error.format() }, { status: 400 })
    }
    const communityId = parsedCommunityId.data

    const supabase = await createClient()
    let adminClient: ReturnType<typeof createAdminClient> | null = null
    const getAdmin = () => {
      if (!adminClient) adminClient = createAdminClient()
      return adminClient
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('owner_id')
      .eq('id', communityId)
      .maybeSingle()
    if (communityError) throw communityError
    if (community?.owner_id === user.id) {
      return NextResponse.json({ error: 'Owner cannot leave their own community' }, { status: 400 })
    }

    const { error: leaveError } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', user.id)
    if (leaveError) throw leaveError

    const { count: memberCount, error: memberCountError } = await supabase
      .from('community_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('community_id', communityId)
    if (memberCountError) throw memberCountError
    await updateCommunityMemberCount(supabase, getAdmin, communityId, memberCount || 0)

    return NextResponse.json({ data: { is_member: false, member_count: memberCount || 0 }, error: null })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  }
}
