import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { isAllowedCommunityImageUrl } from '@/lib/security/media-urls'
import { cacheService } from '@/lib/cache-service'
import { deleteImageByUrl, deleteImagesByUrls } from '@/lib/cloudinary-server'

const PUBLIC_OWNER_SELECT = 'id, username, full_name, avatar_url'
const COMMUNITY_SELECT = `*, owner:profiles!owner_id(${PUBLIC_OWNER_SELECT})`

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

    try {
      await cacheService.deleteByPattern('home:communities:*')
    } catch (cacheError) {
      console.error('Cache Invalidation Error:', cacheError)
    }

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

    // 1. Fetch community to get media URLs for Cloudinary cleanup
    let fetchQuery = queryClient
      .from('communities')
      .select('id, name, owner_id, avatar_url, banner_url')
      .eq('id', params.id)
    if (!canAdmin) {
      fetchQuery = fetchQuery.eq('owner_id', user.id)
    }
    const { data: existing, error: findError } = await fetchQuery.maybeSingle()
    if (findError || !existing) return NextResponse.json({ error: 'Community not found' }, { status: 404 })

    // 2. Fetch all posts in this community to clean up their media
    const { data: communityPosts } = await queryClient
      .from('posts')
      .select('image_url, file_url')
      .eq('community_id', params.id)
    
    // 3. Delete media from Cloudinary permanently
    const mediaToDelete = []
    if (existing.avatar_url) mediaToDelete.push(existing.avatar_url)
    if (existing.banner_url) mediaToDelete.push(existing.banner_url)
    
    // Add post images to the deletion queue
    if (communityPosts && communityPosts.length > 0) {
      communityPosts.forEach(post => {
        if (post.image_url) mediaToDelete.push(post.image_url)
        if (post.file_url) mediaToDelete.push(post.file_url)
      })
    }

    if (mediaToDelete.length > 0) {
      await deleteImagesByUrls(mediaToDelete)
    }

    // 4. Permanent DELETE from database
    let deleteQuery = queryClient
      .from('communities')
      .delete()
      .eq('id', params.id)
    if (!canAdmin) {
      deleteQuery = deleteQuery.eq('owner_id', user.id)
    }
    const { error: deleteError } = await deleteQuery

    if (deleteError) throw deleteError

    try {
      await cacheService.deleteByPattern('home:communities:*')
    } catch (cacheError) {
      console.error('Cache Invalidation Error:', cacheError)
    }

    // 4. Notify owner if admin deleted their community
    if (canAdmin && existing.owner_id !== user.id) {
      await admin!.from('notifications').insert({
        user_id: existing.owner_id,
        type: 'community_rejected',
        actor_id: user.id,
        message: `Admin permanently deleted your community "${existing.name}".`,
        is_read: false,
      })
    }

    return NextResponse.json({ success: true, message: 'Community and associated media permanently deleted.' })
  } catch (error: any) {
    console.error('Community DELETE error:', error)
    return NextResponse.json({ data: null, error: 'Failed to delete community permanently' }, { status: 500 })
  }
}

// Recovery is disabled as per user request for permanent deletion
export async function POST() {
  return NextResponse.json({ error: 'Recovery is no longer supported. Deletions are permanent.' }, { status: 405 })
}
