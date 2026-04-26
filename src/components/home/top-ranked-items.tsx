import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ListingCard } from '@/components/shared/listing-card'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { NetflixRow, NetflixCard } from '@/components/shared/netflix-row'
import type { Listing, Profile } from '@/types/database'
import { sortFeaturedFirst } from '@/lib/featured-content'
import { getHomeFeedListingsV1 } from '@/lib/home-feed-v1'

export const revalidate = 60

type ListingWithSeller = Omit<Listing, 'seller'> & { seller?: Pick<Profile, 'username'> & { avatar_url?: string | null; full_name?: string | null; follower_count?: number | null; university?: string | null } | null }
const ADVANCED_LISTING_COLUMNS = ['listing_type', 'rental_price', 'rental_period'] as const
const HOME_LISTING_SELECT = `
 id,
 seller_id,
 title,
 price,
 listing_type,
 rental_price,
 rental_period,
 condition,
 category,
 campus,
 images,
 status,
 moderation,
 view_count,
 created_at,
 updated_at,
 is_featured,
 featured_until,
 seller:profiles!listings_seller_id_fkey(username, avatar_url, full_name, follower_count, university),
 wishlist_count:wishlist(count)
`
const HOME_LISTING_SELECT_FALLBACK = `
 id,
 seller_id,
 title,
 price,
 condition,
 category,
 campus,
 images,
 status,
 moderation,
 view_count,
 created_at,
 updated_at,
 is_featured,
 featured_until,
 seller:profiles!listings_seller_id_fkey(username, avatar_url, full_name, follower_count, university),
 wishlist_count:wishlist(count)
`

interface TopRankedItemsProps {
 user?: { id: string } | null
 savedIds?: Set<string>
}

function isMissingAdvancedColumnError(error: any) {
 const message = String(error?.message || '').toLowerCase()
 return ADVANCED_LISTING_COLUMNS.some((column) => message.includes(column) && message.includes('column'))
}

function normalizeListings(listings: Record<string, unknown>[] | null | undefined) {
 return sortFeaturedFirst(
 ((listings || []) as Record<string, unknown>[]).map((l: Record<string, unknown>) => ({
 ...l,
 seller: Array.isArray(l.seller) ? l.seller[0] : l.seller,
 })) as ListingWithSeller[]
 )
}

async function fetchGenericFallbackListings(
 supabase: Awaited<ReturnType<typeof createClient>>,
 mode: 'approved_available' | 'approved_non_removed',
 limit: number
) {
 const applyVisibility = (query: any) => {
 if (mode === 'approved_available') return query.eq('status', 'available')
 return query.neq('status', 'removed')
 }

 const runQuery = (selectClause: string) =>
 applyVisibility(
 supabase
 .from('listings')
 .select(selectClause)
 .eq('moderation', 'approved')
 .or('is_official.eq.false,is_official.is.null')
 )
 .order('is_featured', { ascending: false })
 .order('created_at', { ascending: false })
 .order('view_count', { ascending: false })
 .limit(limit)

 let { data, error } = await runQuery(HOME_LISTING_SELECT)
 if (error && isMissingAdvancedColumnError(error)) {
 ;({ data, error } = await runQuery(HOME_LISTING_SELECT_FALLBACK))
 }
 if (error) throw error
 return normalizeListings(data as Record<string, unknown>[] | null | undefined)
}

export async function TopRankedItems({ user, savedIds = new Set() }: TopRankedItemsProps) {
 const supabase = await createClient()

 let items: ListingWithSeller[] = []
 let usedPath: 'algorithm' | 'fallback_approved_available' | 'fallback_approved_non_removed' | 'empty' = 'empty'
 try {
 items = (await getHomeFeedListingsV1({
 supabase,
 userId: user?.id || null,
 limit: 20,
 })) as ListingWithSeller[]
 if (items.length > 0) {
 usedPath = 'algorithm'
 }
 } catch (feedError) {
 console.error('TopRankedItems feed v1 failed, using fallback:', feedError)
 }

 if (items.length === 0) {
 items = await fetchGenericFallbackListings(supabase, 'approved_available', 20)
 if (items.length > 0) {
 usedPath = 'fallback_approved_available'
 }
 }

 if (items.length === 0) {
 items = await fetchGenericFallbackListings(supabase, 'approved_non_removed', 20)
 if (items.length > 0) {
 usedPath = 'fallback_approved_non_removed'
 }
 }

 if (process.env.NODE_ENV !== 'production') {
 console.info(`TopRankedItems feed path: ${usedPath}`)
 }

 if (items.length === 0) {
 return (
 <section className='py-6'>
 <h2 className='text-xl font-bold text-text-primary flex items-center gap-2 mb-4 px-1'>
 <span className='text-2xl'>🔥</span> Top Ranked Items
 </h2>
 <EmptyState
 title='No items yet'
 description='Be the first to sell something!'
 action={
 <Link href='/dashboard'>
 <Button variant='primary' size='sm'>Sell Item</Button>
 </Link>
 }
 />
 </section>
 )
 }

 const cards = items.map((listing) => (
 <NetflixCard key={listing.id}>
 <ListingCard listing={listing} isSaved={savedIds.has(listing.id)} />
 </NetflixCard>
 ))

 return (
 <NetflixRow
 title="Top Ranked Items"
 icon="🔥"
 seeAllContent={cards}
 showExpandToggle={false}
 >
 {cards}
 </NetflixRow>
 )
}
