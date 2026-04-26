import { createClient } from '@/lib/supabase/server'
import { NetflixRow, NetflixCard } from '@/components/shared/netflix-row'
import { CATEGORIES } from '@/lib/constants'
import { ListingCard } from '@/components/shared/listing-card'
import type { Listing, Profile } from '@/types/database'
import { sortFeaturedFirst } from '@/lib/featured-content'

export const revalidate = 60

type ListingWithSeller = Listing & { seller?: Pick<Profile, 'username' | 'avatar_url' | 'full_name'> }
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

const CATEGORY_ICONS: Record<string, string> = {
 'Books': '📚',
 'Notes': '📝',
 'Electronics': '💻',
 'Tools': '🔧',
 'Project Components': '⚙️',
 'Lab Equipment': '🔬',
 'Fashion': '👗',
 'Stationery': '✏️',
 'Other': '📦',
}

interface CategoryRowsProps {
 user?: { id: string } | null
 savedIds?: Set<string>
}

export async function CategoryRows({ user, savedIds = new Set() }: CategoryRowsProps) {
 const supabase = await createClient()

 // ONE query instead of 9 — fetch all approved listings at once
 const { data: allData } = await supabase
 .from('listings')
 .select(HOME_LISTING_SELECT)
 .eq('moderation', 'approved')
 .eq('status', 'available')
 .or('is_official.eq.false,is_official.is.null')
 .order('is_featured', { ascending: false })
 .order('created_at', { ascending: false })
 .limit(200)

 const allListings: ListingWithSeller[] = (allData || []).map((l: Record<string, unknown>) => ({
 ...l,
 seller: Array.isArray(l.seller) ? l.seller[0] : l.seller,
 })) as ListingWithSeller[]

 // Group by category in JavaScript — zero extra DB calls
 const categoryMap = CATEGORIES.reduce((acc, category) => {
 // Skip Electronics row on homepage as requested
 if (category === 'Electronics') return acc;
 
 const items = sortFeaturedFirst(
 allListings.filter((l) => l.category === category).slice(0, 20)
 )
 if (items.length > 0) acc.push({ category, items })
 return acc
 }, [] as { category: string; items: ListingWithSeller[] }[])

 if (categoryMap.length === 0) return null

 return (
 <section className="space-y-12">
 {categoryMap.map(({ category, items }) => {
 const cards = items.map((listing) => (
 <NetflixCard key={listing.id}>
 <ListingCard listing={listing} isSaved={savedIds.has(listing.id)} />
 </NetflixCard>
 ))

 return (
 <NetflixRow
 key={category}
 title={category}
 icon={CATEGORY_ICONS[category] || '📦'}
 seeAllContent={cards}
 showExpandToggle={false}
 >
 {cards}
 </NetflixRow>
 )
 })}
 </section>
 )
}
