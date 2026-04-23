import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listingSchema } from '@/lib/validations/listing'
import { z } from 'zod'
import {
 encodeSoftDeleteNote,
 isSoftDeleteRecoverable,
 parseSoftDeleteNote,
 type SoftDeleteActorRole,
} from '@/lib/content-soft-delete'
import { isAllowedListingImageUrl } from '@/lib/security/media-urls'

const ADVANCED_LISTING_COLUMNS = ['listing_type', 'rental_price', 'rental_period', 'rental_deposit', 'contact_preference'] as const
const LISTING_SELECT = '*, seller:profiles!listings_seller_id_fkey(username, avatar_url, full_name)'
const recoverActionSchema = z
 .object({
 action: z.literal('recover'),
 })
 .strict()

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
 // Use baseListingSchema for partial updates to avoid refinement issues
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
 // If update failed due to image security, check if the image already existed in the listing
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

 let fetchQuery = queryClient
 .from('listings')
 .select('id, title, seller_id, moderation, status, rejection_note')
 .eq('id', params.id)
 if (!canAdmin) {
 fetchQuery = fetchQuery.eq('seller_id', user.id)
 }
 const { data: currentListing, error: fetchError } = await fetchQuery.maybeSingle()

 if (fetchError || !currentListing) {
 return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
 }

 const currentMeta = parseSoftDeleteNote(currentListing.rejection_note)
 if (currentMeta && isSoftDeleteRecoverable(currentMeta)) {
 return NextResponse.json({
 success: true,
 already_deleted: true,
 undo_until: currentMeta.undoUntil,
 data: {
 id: currentListing.id,
 status: currentListing.status,
 moderation: currentListing.moderation,
 rejection_note: currentListing.rejection_note,
 },
 })
 }

 const now = new Date()
 const undoUntil = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
 const actorRole: SoftDeleteActorRole = canAdmin ? 'admin' : 'owner'

 const note = encodeSoftDeleteNote(
 {
 entity: 'listing',
 deletedById: user.id,
 deletedByRole: actorRole,
 deletedAt: now.toISOString(),
 undoUntil,
 prevModeration: currentListing.moderation ?? 'approved',
 prevStatus: currentListing.status ?? 'available',
 prevRejectionNote: currentListing.rejection_note ?? null,
 },
 canAdmin ? 'Admin deleted this listing. You can restore it within 2 days.' : 'You deleted this listing. You can restore it within 2 days.'
 )

 let deleteQuery = queryClient
 .from('listings')
 .update({
 status: 'removed',
 moderation: 'rejected',
 rejection_note: note,
 updated_at: now.toISOString(),
 })
 .eq('id', params.id)
 if (!canAdmin) {
 deleteQuery = deleteQuery.eq('seller_id', user.id)
 }
 const { data, error } = await deleteQuery
 .select('id, title, moderation, status, rejection_note, updated_at')
 .single()

 if (error) throw error

 if (canAdmin && currentListing.seller_id !== user.id) {
 const notificationClient = admin || supabase
 await notificationClient.from('notifications').insert({
 user_id: currentListing.seller_id,
 type: 'listing_rejected',
 actor_id: user.id,
 listing_id: currentListing.id,
 message: `Admin deleted your listing "${currentListing.title}". You can undo this within 2 days.`,
 is_read: false,
 })
 }

 return NextResponse.json({ data, success: true, undo_until: undoUntil, error: null })
 } catch (error: any) {
 console.error('Listing DELETE error:', error)
 return NextResponse.json({ data: null, error: 'Failed to delete listing' }, { status: 500 })
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
 .from('listings')
 .select('id, title, seller_id, moderation, status, rejection_note')
 .eq('id', params.id)
 if (!canAdmin) {
 fetchQuery = fetchQuery.eq('seller_id', user.id)
 }
 const { data: currentListing, error: fetchError } = await fetchQuery.maybeSingle()

 if (fetchError || !currentListing) {
 return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
 }

 const meta = parseSoftDeleteNote(currentListing.rejection_note)
 if (!meta) return NextResponse.json({ error: 'This listing is not recoverable.' }, { status: 400 })
 if (!isSoftDeleteRecoverable(meta)) {
 return NextResponse.json({ error: 'Recovery window expired (2 days).' }, { status: 400 })
 }

 const restoreStatus = meta.prevStatus || 'available'
 const restoreModeration = meta.prevModeration || currentListing.moderation || 'approved'

 let restoreQuery = queryClient
 .from('listings')
 .update({
 status: restoreStatus,
 moderation: restoreModeration,
 rejection_note: meta.prevRejectionNote ?? null,
 updated_at: new Date().toISOString(),
 })
 .eq('id', params.id)
 if (!canAdmin) {
 restoreQuery = restoreQuery.eq('seller_id', user.id)
 }
 const { data, error } = await restoreQuery
 .select('id, title, moderation, status, rejection_note, updated_at')
 .single()

 if (error) throw error

 if (canAdmin && currentListing.seller_id !== user.id) {
 const notificationClient = admin || supabase
 await notificationClient.from('notifications').insert({
 user_id: currentListing.seller_id,
 type: 'listing_approved',
 actor_id: user.id,
 listing_id: currentListing.id,
 message: `Admin restored your listing "${currentListing.title}".`,
 is_read: false,
 })
 }

 return NextResponse.json({ success: true, data, error: null })
 } catch (error: any) {
 console.error('Listing recover error:', error)
 return NextResponse.json({ data: null, error: 'Failed to recover listing' }, { status: 500 })
 }
}
