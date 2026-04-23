import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CommunityCard } from '@/components/shared/community-card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { NetflixRow, NetflixCard } from '@/components/shared/netflix-row'
import type { Community, Profile } from '@/types/database'
import { isFeaturedActive, sortFeaturedFirst } from '@/lib/featured-content'

export const revalidate = 60

const COMMUNITY_LIMIT = 20
const LOCAL_FALLBACK_POOL_LIMIT = 80
const RANDOM_FALLBACK_POOL_LIMIT = 120
const COMMUNITY_SELECT = 'id, name, description, field, member_count, avatar_url, banner_url, is_featured, featured_until, created_at'
const COMMUNITY_SELECT_WITH_OWNER = `${COMMUNITY_SELECT}, owner:profiles!owner_id(institution_id, city)`

type ViewerAcademicContext = Pick<Profile, 'institution_id' | 'city'>
type OwnerAcademicContext = Pick<Profile, 'institution_id' | 'city'>
type HomeCommunityWithOwner = HomeCommunity & {
 owner?: OwnerAcademicContext | OwnerAcademicContext[] | null
}
interface HomeCommunity {
 id: string
 name: string
 description: string | null
 field: string | null
 member_count: number
 avatar_url: string | null
 banner_url: string | null
 is_featured?: boolean | null
 featured_until?: string | null
 created_at: string
}

function normalizeCity(city: string | null | undefined) {
 return (city || '').trim().toLowerCase()
}

function toTimestamp(value?: string | null) {
 const parsed = Date.parse(value || '')
 return Number.isFinite(parsed) ? parsed : 0
}

function hashToUnit(seed: string) {
 let hash = 0
 for (let i = 0; i < seed.length; i += 1) {
 hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
 }
 return (hash % 1000) / 1000
}

function normalizeOwnerContext(owner: HomeCommunityWithOwner['owner']): OwnerAcademicContext | null {
 if (!owner) return null
 if (Array.isArray(owner)) return (owner[0] as OwnerAcademicContext) || null
 return owner as OwnerAcademicContext
}

function compareCommunityPriority(a: HomeCommunity, b: HomeCommunity) {
 const featuredDiff = Number(isFeaturedActive(b)) - Number(isFeaturedActive(a))
 if (featuredDiff !== 0) return featuredDiff

 const featuredUntilDiff = toTimestamp(b.featured_until || null) - toTimestamp(a.featured_until || null)
 if (featuredUntilDiff !== 0) return featuredUntilDiff

 const memberDiff = Number(b.member_count || 0) - Number(a.member_count || 0)
 if (memberDiff !== 0) return memberDiff

 return toTimestamp(b.created_at || null) - toTimestamp(a.created_at || null)
}

function withFeaturedSort(items: HomeCommunity[]) {
 return sortFeaturedFirst(items)
}

async function fetchPreferredCommunities(
 supabase: Awaited<ReturnType<typeof createClient>>,
 limit: number
) {
 const { data, error } = await supabase
 .from('communities')
 .select(COMMUNITY_SELECT)
 .eq('moderation', 'approved')
 .order('is_featured', { ascending: false })
 .order('featured_until', { ascending: false })
 .order('member_count', { ascending: false })
 .order('created_at', { ascending: false })
 .limit(limit)

 if (error) throw error
 return withFeaturedSort(((data || []) as unknown as HomeCommunity[]).slice(0, limit))
}

async function fetchViewerAcademicContext(
 supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ViewerAcademicContext | null> {
 const {
 data: { user },
 } = await supabase.auth.getUser()
 if (!user) return null

 const { data, error } = await supabase
 .from('profiles')
 .select('institution_id, city')
 .eq('id', user.id)
 .maybeSingle()

 if (error) throw error
 return (data || null) as ViewerAcademicContext | null
}

function getLocalityRank(
 viewer: ViewerAcademicContext | null,
 owner: OwnerAcademicContext | null
) {
 if (!viewer || !owner) return 2

 const sameInstitution =
 !!viewer.institution_id &&
 !!owner.institution_id &&
 viewer.institution_id === owner.institution_id
 if (sameInstitution) return 0

 const viewerCity = normalizeCity(viewer.city)
 const ownerCity = normalizeCity(owner.city)
 if (viewerCity && ownerCity && viewerCity === ownerCity) return 1

 return 2
}

async function fetchLocalFallbackCommunities(
 supabase: Awaited<ReturnType<typeof createClient>>,
 limit: number
) {
 const { data, error } = await supabase
 .from('communities')
 .select(COMMUNITY_SELECT_WITH_OWNER)
 .eq('moderation', 'approved')
 .order('member_count', { ascending: false })
 .order('created_at', { ascending: false })
 .limit(LOCAL_FALLBACK_POOL_LIMIT)

 if (error) throw error
 const rows = ((data || []) as unknown as HomeCommunityWithOwner[])
 if (rows.length === 0) return []

 const viewerContext = await fetchViewerAcademicContext(supabase)
 const ranked = rows
 .map((community) => {
 const owner = normalizeOwnerContext(community.owner)
 const { owner: _owner, ...communityData } = community
 return {
 localityRank: getLocalityRank(viewerContext, owner),
 community: communityData as HomeCommunity,
 }
 })
 .sort(
 (a, b) =>
 a.localityRank - b.localityRank ||
 compareCommunityPriority(a.community, b.community)
 )
 .map((entry) => entry.community)
 .slice(0, limit)

 return withFeaturedSort(ranked)
}

async function fetchRandomFallbackCommunities(
 supabase: Awaited<ReturnType<typeof createClient>>,
 limit: number
) {
 const { data, error } = await supabase
 .from('communities')
 .select(COMMUNITY_SELECT)
 .eq('moderation', 'approved')
 .order('created_at', { ascending: false })
 .limit(RANDOM_FALLBACK_POOL_LIMIT)

 if (error) throw error
 const rows = ((data || []) as unknown as HomeCommunity[])
 if (rows.length === 0) return []

 const daySeed = new Date().toISOString().slice(0, 10)
 const randomized = [...rows]
 .sort((a, b) => hashToUnit(`${daySeed}:${a.id}`) - hashToUnit(`${daySeed}:${b.id}`))
 .slice(0, limit)

 return withFeaturedSort(randomized)
}

import { cacheService } from '@/lib/cache-service'

interface FeaturedCommunitiesProps {
 user?: any | null
}

export async function FeaturedCommunities({ user }: FeaturedCommunitiesProps) {
 const cacheKey = `home:communities:${user?.id || 'guest'}`
 const cached = await cacheService.get<HomeCommunity[]>(cacheKey)
 
 if (cached) {
 const cards = cached.map((c) => (
 <NetflixCard key={c.id}>
 <CommunityCard community={c as unknown as Community} />
 </NetflixCard>
 ))
 return <NetflixRow title="Nexus Hub" icon="🌏" seeAllContent={cards} showExpandToggle={false}>{cards}</NetflixRow>
 }

 const supabase = await createClient()
 let items: HomeCommunity[] = []
 let usedPath: 'algorithm' | 'fallback_local' | 'fallback_random' | 'empty' = 'empty'

 try {
 // ── Optimized: Get viewer context only once if available ──
 const viewerContext = user ? await supabase
 .from('profiles')
 .select('institution_id, city')
 .eq('id', user.id)
 .maybeSingle()
 .then(res => res.data) : null

 // Attempt preferred algorithm
 items = await fetchPreferredCommunities(supabase, COMMUNITY_LIMIT)
 
 if (items.length === 0) {
 items = await fetchLocalFallbackCommunities(supabase, COMMUNITY_LIMIT)
 usedPath = 'fallback_local'
 } else {
 usedPath = 'algorithm'
 }

 if (items.length === 0) {
 items = await fetchRandomFallbackCommunities(supabase, COMMUNITY_LIMIT)
 usedPath = 'fallback_random'
 }

 // Cache the result for 5 minutes
 if (items.length > 0) {
 await cacheService.set(cacheKey, items, 300)
 }

 } catch (error) {
 console.error('FeaturedCommunities assembly failed:', error)
 }

 if (items.length === 0) {
 return (
 <section className='py-6'>
 <h2 className='text-xl font-bold text-text-primary flex items-center gap-2 mb-4 px-1'>
 <span className='text-2xl'>🌏</span> Nexus Hub
 </h2>
 <EmptyState
 title='No active Hubs'
 description='Start a new trend by launching a Nexus Hub today.'
 action={
 <Link href='/marketplace?view=communities'>
 <Button variant='primary' size='sm'>Explore Hubs</Button>
 </Link>
 }
 />
 </section>
 )
 }

 const cards = items.map((c) => (
 <NetflixCard key={c.id}>
 <CommunityCard community={c as unknown as Community} />
 </NetflixCard>
 ))

 return (
 <NetflixRow
 title="Nexus Hub"
 icon="🌏"
 seeAllContent={cards}
 showExpandToggle={false}
 >
 {cards}
 </NetflixRow>
 )
}
