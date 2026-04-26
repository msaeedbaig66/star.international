import type { Listing, Profile } from '@/types/database'
import { createClient } from '@/lib/supabase/server'
import { cacheService } from '@/lib/cache-service'

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

type SellerFeedProfile = Pick<
 Profile,
 | 'id'
 | 'username'
 | 'full_name'
 | 'avatar_url'
 | 'institution_id'
 | 'department_id'
 | 'sector_type_id'
 | 'city'
 | 'is_verified'
 | 'rating_avg'
 | 'rating_count'
>

type ListingWithSeller = Listing & { seller?: SellerFeedProfile | null }
type UserAcademicProfile = Pick<
 Profile,
 'id' | 'institution_id' | 'department_id' | 'sector_type_id' | 'city'
>

type RankedCandidate = {
 listing: ListingWithSeller
 finalScore: number
}

const CANDIDATE_FETCH_LIMIT = 240
const DEFAULT_FEED_LIMIT = 20
const FEED_WEIGHTS = {
 interest: 0.35,
 following: 0.15,
 freshness: 0.18,
 trust: 0.10,
 engagement: 0.12,
 random: 0.10,
} as const

const FEED_LISTING_SELECT = `
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
 save_count,
 created_at,
 updated_at,
 is_featured,
 featured_until,
 seller:profiles!listings_seller_id_fkey(
 id,
 username,
 full_name,
 avatar_url,
 institution_id,
 department_id,
 sector_type_id,
 city,
 is_verified,
 rating_avg,
 rating_count,
 university
 )
`

function clamp(value: number, min = 0, max = 1) {
 return Math.max(min, Math.min(max, value))
}

function normalizeCity(city: string | null | undefined) {
 return (city || '').trim().toLowerCase()
}

function hashToUnit(seed: string) {
 let hash = 0
 for (let i = 0; i < seed.length; i += 1) {
 hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
 }
 return (hash % 1000) / 1000
}

function freshnessScore(createdAt: string) {
 const ageMs = Math.max(0, Date.now() - new Date(createdAt).getTime())
 const ageDays = ageMs / (1000 * 60 * 60 * 24)
 return clamp(Math.exp(-ageDays / 14))
}

function getPoolQuotas(limit: number) {
 const sameDepartmentInstitute = Math.floor(limit * 0.45)
 const sameInstituteOtherDepartment = Math.floor(limit * 0.25)
 const nearbyScope = Math.floor(limit * 0.2)
 const explore = Math.max(
 0,
 limit - sameDepartmentInstitute - sameInstituteOtherDepartment - nearbyScope
 )
 return {
 sameDepartmentInstitute,
 sameInstituteOtherDepartment,
 nearbyScope,
 explore,
 }
}

function passesDiversityGuard(candidate: RankedCandidate, selected: RankedCandidate[]) {
 const recentWindow = selected.slice(Math.max(0, selected.length - 9))
 const sellerCount = recentWindow.filter(
 (item) => item.listing.seller_id === candidate.listing.seller_id
 ).length
 const categoryCount = recentWindow.filter(
 (item) => item.listing.category === candidate.listing.category
 ).length

 return sellerCount < 2 && categoryCount < 3
}

function withDiversity(candidates: RankedCandidate[], limit: number) {
 const picked: RankedCandidate[] = []
 const deferred: RankedCandidate[] = []

 for (const candidate of candidates) {
 if (picked.length >= limit) break
 if (passesDiversityGuard(candidate, picked)) picked.push(candidate)
 else deferred.push(candidate)
 }

 if (picked.length < limit) {
 for (const candidate of deferred) {
 if (picked.length >= limit) break
 picked.push(candidate)
 }
 }

 return picked
}

function normalizeSeller(rawSeller: unknown): SellerFeedProfile | null {
 if (!rawSeller) return null
 if (Array.isArray(rawSeller)) return (rawSeller[0] as SellerFeedProfile) || null
 return rawSeller as SellerFeedProfile
}

function classifyCandidate(
 listing: ListingWithSeller,
 viewer: UserAcademicProfile | null
): 'sameDepartmentInstitute' | 'sameInstituteOtherDepartment' | 'nearbyScope' | 'explore' {
 if (!viewer) return 'explore'
 const seller = listing.seller
 if (!seller) return 'explore'

 const sameInstitution =
 !!viewer.institution_id &&
 !!seller.institution_id &&
 viewer.institution_id === seller.institution_id
 const sameDepartment =
 !!viewer.department_id &&
 !!seller.department_id &&
 viewer.department_id === seller.department_id

 if (sameInstitution && sameDepartment) return 'sameDepartmentInstitute'
 if (sameInstitution) return 'sameInstituteOtherDepartment'

 const sameCity =
 !!viewer.city &&
 !!seller.city &&
 normalizeCity(viewer.city) !== '' &&
 normalizeCity(viewer.city) === normalizeCity(seller.city)

 if (sameCity) return 'nearbyScope'
 return 'explore'
}

function scoreTrust(listing: ListingWithSeller) {
 const seller = listing.seller
 if (!seller) return 0.1

 const verified = seller.is_verified ? 0.45 : 0.1
 const ratingAvg = clamp(Number(seller.rating_avg || 0) / 5)
 const ratingConfidence = clamp(Number(seller.rating_count || 0) / 20)

 return clamp(verified + ratingAvg * 0.35 + ratingConfidence * 0.2)
}

function scoreInterest(params: {
 listing: ListingWithSeller
 behaviorReady: boolean
 categoryStrength: Map<string, number>
 wishlistSignals: Set<string>
 chatSignals: Set<string>
}) {
 if (!params.behaviorReady) return 0.5
 const categoryScore = params.categoryStrength.get(params.listing.category) || 0
 const savedSignal = params.wishlistSignals.has(params.listing.id) ? 1 : 0
 const chatSignal = params.chatSignals.has(params.listing.id) ? 1 : 0
 return clamp(categoryScore * 0.55 + savedSignal * 0.3 + chatSignal * 0.15)
}

function scoreEngagement(params: {
 listingId: string
 listingViews: number
 wishlistCountByListing: Map<string, number>
 chatCountByListing: Map<string, number>
 maxLogViews: number
 maxWishlistCount: number
 maxChatCount: number
}) {
 const viewNorm =
 params.maxLogViews > 0
 ? clamp(Math.log1p(Math.max(0, params.listingViews)) / params.maxLogViews)
 : 0
 const wishlistNorm =
 params.maxWishlistCount > 0
 ? clamp((params.wishlistCountByListing.get(params.listingId) || 0) / params.maxWishlistCount)
 : 0
 const chatNorm =
 params.maxChatCount > 0
 ? clamp((params.chatCountByListing.get(params.listingId) || 0) / params.maxChatCount)
 : 0

 return clamp(wishlistNorm * 0.45 + chatNorm * 0.35 + viewNorm * 0.2)
}

function uniqueStrings(values: Array<string | null | undefined>) {
 return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

export async function getHomeFeedListingsV1({
 supabase,
 userId,
 limit = DEFAULT_FEED_LIMIT,
}: {
 supabase: ServerSupabaseClient
 userId?: string | null
 limit?: number
}): Promise<ListingWithSeller[]> {
 const fetchLimit = Math.max(limit * 8, CANDIDATE_FETCH_LIMIT)
 const { data: listingRows, error: listingsError } = await supabase
 .from('listings')
 .select(FEED_LISTING_SELECT)
 .eq('moderation', 'approved')
 .eq('status', 'available')
 .or('is_official.eq.false,is_official.is.null')
 .order('created_at', { ascending: false })
 .limit(fetchLimit)

 if (listingsError) throw listingsError

 const listings = ((listingRows || []) as Record<string, unknown>[]).map((row) => ({
 ...(row as unknown as Listing),
 seller: normalizeSeller((row as any).seller),
 })) as ListingWithSeller[]
 if (listings.length === 0) return []

 const listingIds = listings.map((item) => item.id)
 const daySeed = new Date().toISOString().slice(0, 10)

 // PERFORMANCE: Use save_count from the listings table directly (maintained by trigger)
 // instead of fetching every wishlist row. Only fetch chat thread counts.
 const wishlistCountByListing = new Map<string, number>()
 const chatCountByListing = new Map<string, number>()

 for (const listing of listings) {
 wishlistCountByListing.set(listing.id, Number((listing as any).save_count || 0))
 }

 // Chat counts: use cached data when available
 const chatCacheKey = `feed:chat-counts:${daySeed}`
 let cachedChatCounts = await cacheService.get<Record<string, number>>(chatCacheKey)

 if (cachedChatCounts) {
 for (const [id, count] of Object.entries(cachedChatCounts)) {
 chatCountByListing.set(id, count)
 }
 } else {
 const { data: chatGlobalData, error: chatGlobalError } = await supabase
 .from('message_threads')
 .select('listing_id')
 .in('listing_id', listingIds)
 if (chatGlobalError) throw chatGlobalError

 for (const row of (chatGlobalData || []) as Array<{ listing_id?: string | null }>) {
 const listingId = row.listing_id
 if (!listingId) continue
 chatCountByListing.set(listingId, (chatCountByListing.get(listingId) || 0) + 1)
 }

 // Cache chat counts for 10 minutes (not real-time sensitive)
 const chatCountsObj: Record<string, number> = {}
 chatCountByListing.forEach((v, k) => { chatCountsObj[k] = v })
 await cacheService.set(chatCacheKey, chatCountsObj, 600)
 }

 const maxLogViews = Math.max(...listings.map((item) => Math.log1p(Math.max(0, Number(item.view_count || 0)))), 0)
 const maxWishlistCount = Math.max(...Array.from(wishlistCountByListing.values()), 0)
 const maxChatCount = Math.max(...Array.from(chatCountByListing.values()), 0)

 let viewerProfile: UserAcademicProfile | null = null
 let followedCreators = new Set<string>()
 let wishlistSignals = new Set<string>()
 let chatSignals = new Set<string>()
 let categoryStrength = new Map<string, number>()

 if (userId) {
 const [profileRes, followsRes, userWishlistRes, threadPartsRes] = await Promise.all([
 supabase
 .from('profiles')
 .select('id, institution_id, department_id, sector_type_id, city')
 .eq('id', userId)
 .maybeSingle(),
 supabase.from('follows').select('following_id').eq('follower_id', userId),
 supabase.from('wishlist').select('listing_id').eq('user_id', userId),
 supabase.from('thread_participants').select('thread_id').eq('user_id', userId),
 ])

 if (profileRes.error) throw profileRes.error
 if (followsRes.error) throw followsRes.error
 if (userWishlistRes.error) throw userWishlistRes.error
 if (threadPartsRes.error) throw threadPartsRes.error

 viewerProfile = (profileRes.data || null) as UserAcademicProfile | null
 followedCreators = new Set(
 ((followsRes.data || []) as Array<{ following_id?: string | null }>)
 .map((row) => row.following_id || null)
 .filter((value): value is string => Boolean(value))
 )
 wishlistSignals = new Set(
 ((userWishlistRes.data || []) as Array<{ listing_id?: string | null }>)
 .map((row) => row.listing_id || null)
 .filter((value): value is string => Boolean(value))
 )

 const threadIds = uniqueStrings(
 ((threadPartsRes.data || []) as Array<{ thread_id?: string | null }>).map(
 (row) => row.thread_id || null
 )
 )
 if (threadIds.length > 0) {
 const { data: userThreads, error: userThreadsError } = await supabase
 .from('message_threads')
 .select('listing_id')
 .in('id', threadIds)
 if (userThreadsError) throw userThreadsError
 chatSignals = new Set(
 ((userThreads || []) as Array<{ listing_id?: string | null }>)
 .map((row) => row.listing_id || null)
 .filter((value): value is string => Boolean(value))
 )
 }

 const behaviorListingIds = uniqueStrings([
 ...Array.from(wishlistSignals),
 ...Array.from(chatSignals),
 ])
 if (behaviorListingIds.length > 0) {
 const { data: behaviorListings, error: behaviorError } = await supabase
 .from('listings')
 .select('id, category')
 .in('id', behaviorListingIds)
 if (behaviorError) throw behaviorError

 const categoryCount = new Map<string, number>()
 for (const row of (behaviorListings || []) as Array<{ category?: string | null }>) {
 const category = row.category || ''
 if (!category) continue
 categoryCount.set(category, (categoryCount.get(category) || 0) + 1)
 }
 const maxCount = Math.max(...Array.from(categoryCount.values()), 0)
 if (maxCount > 0) {
 categoryStrength = new Map(
 Array.from(categoryCount.entries()).map(([category, count]) => [category, count / maxCount])
 )
 }
 }
 }

 const behaviorReady = wishlistSignals.size > 0 || chatSignals.size > 0 || categoryStrength.size > 0
 const userSeed = userId || 'guest'

 const scored = listings
 .map((listing) => {
 const interestScore = scoreInterest({
 listing,
 behaviorReady,
 categoryStrength,
 wishlistSignals,
 chatSignals,
 })
 const followingScore = followedCreators.has(listing.seller_id) ? 1 : 0
 const freshness = freshnessScore(listing.created_at)
 const trust = scoreTrust(listing)
 const engagement = scoreEngagement({
 listingId: listing.id,
 listingViews: Number(listing.view_count || 0),
 wishlistCountByListing,
 chatCountByListing,
 maxLogViews,
 maxWishlistCount,
 maxChatCount,
 })
 const random = hashToUnit(`${userSeed}:${listing.id}:${daySeed}`)

 const finalScore =
 interestScore * FEED_WEIGHTS.interest +
 followingScore * FEED_WEIGHTS.following +
 freshness * FEED_WEIGHTS.freshness +
 trust * FEED_WEIGHTS.trust +
 engagement * FEED_WEIGHTS.engagement +
 random * FEED_WEIGHTS.random

 return {
 listing,
 finalScore,
 pool: classifyCandidate(listing, viewerProfile),
 }
 })
 .sort((a, b) => b.finalScore - a.finalScore)

 const sameDepartmentInstitute = scored.filter((item) => item.pool === 'sameDepartmentInstitute')
 const sameInstituteOtherDepartment = scored.filter(
 (item) => item.pool === 'sameInstituteOtherDepartment'
 )
 const nearbyScope = scored.filter((item) => item.pool === 'nearbyScope')
 const explore = scored.filter((item) => item.pool === 'explore')

 const quotas = getPoolQuotas(limit)
 const seeded = [
 ...sameDepartmentInstitute.slice(0, quotas.sameDepartmentInstitute),
 ...sameInstituteOtherDepartment.slice(0, quotas.sameInstituteOtherDepartment),
 ...nearbyScope.slice(0, quotas.nearbyScope),
 ...explore.slice(0, quotas.explore),
 ]

 const seededIds = new Set(seeded.map((item) => item.listing.id))
 const leftovers = scored.filter((item) => !seededIds.has(item.listing.id))
 const quotaFilled = [...seeded, ...leftovers].slice(0, Math.max(limit, scored.length))
 const diversified = withDiversity(quotaFilled, limit)

 const diversifiedIds = new Set(diversified.map((item) => item.listing.id))
 if (diversified.length < limit) {
 for (const candidate of scored) {
 if (diversified.length >= limit) break
 if (diversifiedIds.has(candidate.listing.id)) continue
 diversified.push(candidate)
 diversifiedIds.add(candidate.listing.id)
 }
 }

 return diversified.slice(0, limit).map((item) => item.listing)
}
