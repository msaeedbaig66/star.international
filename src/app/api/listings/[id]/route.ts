import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { isAllowedListingImageUrl } from '@/lib/security/media-urls'
import { deleteImagesByUrls } from '@/lib/cloudinary-server'

const ADVANCED_LISTING_COLUMNS = ['listing_type', 'rental_price', 'rental_period', 'rental_deposit', 'contact_preference'] as const
const LISTING_SELECT = '*, seller:profiles!listings_seller_id_fkey(username, avatar_url, full_name)'

function isMissingAdvancedColumnError(error: any) {
  const message = String(error?.message || '').toLowerCase()
  return ADVANCED_LISTING_COLUMNS.some((column) => message.includes(column) && message.includes('column'))
}

function stripAdvancedListingFields(payload: Record<string, any>) {
  const cloned = { ...payload }
  for (const column of ADVANCED_LISTING_COLUMNS) {
    delete cloned[column]
  }
  return cloned
}

async function getViewerRole(client: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await client.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (error) throw error
  return data?.role === 'admin' ? 'admin' : 'user'
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: publicListing, error: publicError } = await supabase
      .from('listings')
      .select(LISTING_SELECT)
      .eq('id', params.id)
      .eq('moderation', 'approved')
      .eq('status', 'available')
      .maybeSingle()

    if (publicError) throw publicError
    if (publicListing) {
      return NextResponse.json({ data: publicListing, error: null })
    }

    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const ownRole = await getViewerRole(supabase, user.id)

    if (ownRole === 'admin') {
      const admin = createAdminClient()
      const queryClient = admin || supabase
      const { data: adminListing, error: adminError } = await queryClient
        .from('listings')
        .select(LISTING_SELECT)
        .eq('id', params.id)
        .maybeSingle()
      if (adminError) throw adminError
      if (adminListing) {
        return NextResponse.json({ data: adminListing, error: null })
      }
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: ownerListing, error: ownerError } = await supabase
      .from('listings')
      .select(LISTING_SELECT)
      .eq('id', params.id)
      .eq('seller_id', user.id)
      .maybeSingle()
    if (ownerError) throw ownerError
    if (!ownerListing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ data: ownerListing, error: null })
  } catch (error: any) {
    console.error('Listing GET error:', error)
    return NextResponse.json({ data: null, error: 'Failed to fetch listing' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let isAdmin = false
    let queryClient: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient> = supabase
    let { data: currentListing, error: fetchError } = await supabase
      .from('listings')
      .select('id, seller_id, images')
      .eq('id', params.id)
      .eq('seller_id', user.id)
      .maybeSingle()

    if (!currentListing) {
      const role = await getViewerRole(supabase, user.id)
      isAdmin = role === 'admin'
      if (!isAdmin) {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }

      const admin = createAdminClient()
      queryClient = admin || supabase
      const adminLookup = await queryClient
        .from('listings')
        .select('id, seller_id, images')
        .eq('id', params.id)
        .maybeSingle()
      currentListing = adminLookup.data
      fetchError = adminLookup.error
    }

    if (fetchError || !currentListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const body = await request.json()
    const { baseListingSchema } = await import('@/lib/validations/listing')
    const result = baseListingSchema.partial().safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed', details: result.error.format() }, { status: 400 })
    }

    const updatePayload = {
      ...result.data,
      updated_at: new Date().toISOString(),
      moderation: 'pending',
      rejection_note: null,
    }
    if (Array.isArray(updatePayload.images)) {
      const invalidImage = updatePayload.images.find((url) => !isAllowedListingImageUrl(url, user.id))
      if (invalidImage) {
        const isExisting = currentListing.images?.includes(invalidImage)
        if (!isExisting) {
          return NextResponse.json(
            { error: 'Listing images must use approved uploaded media URLs.' },
            { status: 400 }
          )
        }
      }
    }

    let updateQuery = queryClient
      .from('listings')
      .update(updatePayload)
      .eq('id', params.id)
    if (!isAdmin) {
      updateQuery = updateQuery.eq('seller_id', user.id)
    }
    let { data, error } = await updateQuery.select().single()

    if (error && isMissingAdvancedColumnError(error)) {
      const fallbackPayload = stripAdvancedListingFields(updatePayload)
      let fallbackQuery = queryClient
        .from('listings')
        .update(fallbackPayload)
        .eq('id', params.id)
      if (!isAdmin) {
        fallbackQuery = fallbackQuery.eq('seller_id', user.id)
      }
      ;({ data, error } = await fallbackQuery.select().single())
    }

    if (error) {
      console.error('Listing Update DB Error:', error)
      return NextResponse.json({ 
        error: 'Failed to update listing due to a database error'
      }, { status: 500 })
    }

    return NextResponse.json({ data, error: null })
  } catch (error: any) {
    console.error('Listing PATCH Application Error:', error)
    return NextResponse.json({ 
      data: null, 
      error: 'An internal error occurred while updating the listing'
    }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = await getViewerRole(supabase, user.id)
    const canAdmin = role === 'admin'
    const admin = canAdmin ? createAdminClient() : null
    const queryClient = canAdmin ? admin! : supabase

    // 1. Fetch listing to get image URLs for Cloudinary cleanup
    let fetchQuery = queryClient
      .from('listings')
      .select('id, title, seller_id, images')
      .eq('id', params.id)
    if (!canAdmin) {
      fetchQuery = fetchQuery.eq('seller_id', user.id)
    }
    const { data: currentListing, error: fetchError } = await fetchQuery.maybeSingle()

    if (fetchError || !currentListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // 2. Delete images from Cloudinary permanently
    if (currentListing.images && currentListing.images.length > 0) {
      await deleteImagesByUrls(currentListing.images)
    }

    // 3. Permanent DELETE from database
    let deleteQuery = queryClient
      .from('listings')
      .delete()
      .eq('id', params.id)
    if (!canAdmin) {
      deleteQuery = deleteQuery.eq('seller_id', user.id)
    }
    const { error: deleteError } = await deleteQuery

    if (deleteError) throw deleteError

    // 4. Notify seller if admin deleted their listing
    if (canAdmin && currentListing.seller_id !== user.id) {
      const notificationClient = admin || supabase
      await notificationClient.from('notifications').insert({
        user_id: currentListing.seller_id,
        type: 'listing_rejected',
        actor_id: user.id,
        message: `Admin permanently deleted your listing "${currentListing.title}".`,
        is_read: false,
      })
    }

    return NextResponse.json({ success: true, message: 'Listing and associated images permanently deleted.' })
  } catch (error: any) {
    console.error('Listing DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete listing permanently' }, { status: 500 })
  }
}

// Recovery is disabled as per user request for permanent deletion
export async function POST() {
  return NextResponse.json({ error: 'Recovery is no longer supported. Deletions are permanent.' }, { status: 405 })
}
