import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/constants'
import { cacheService } from '@/lib/cache-service'
import { MarketplaceInfiniteFeed } from '@/components/marketplace/marketplace-infinite-feed'
import { MarketplaceViewShell } from '@/components/marketplace/marketplace-view-shell'
import { SourcingBanner } from '@/components/marketplace/sourcing-banner'
import type { Listing, Blog, Community } from '@/types/database'

/** Fisher-Yates shuffle — truly random per visit */
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** Lightweight marketplace ranking — featured + freshness + engagement */
function rankByEngagement(items: any[]): any[] {
  const now = Date.now()
  return [...items]
    .map(item => {
      let score = 0
      // Featured boost
      if (item.is_featured) {
        const until = Date.parse(item.featured_until || '')
        score += (Number.isFinite(until) && until > now) ? 200 : 100
      }
      // Freshness: exponential decay over 14 days
      const created = new Date(item.created_at).getTime()
      if (Number.isFinite(created)) {
        score += Math.exp(-Math.max(0, now - created) / (14 * 86_400_000)) * 50
      }
      // Engagement: views + saves
      score += Math.min(30, Math.log1p(Number(item.view_count || 0)) * 5)
      score += Math.min(20, Number(item.save_count || 0) * 3)
      return { item, score }
    })
    .sort((a, b) => b.score - a.score)
    .map(e => e.item)
}

type MarketplaceSearchParams = {
  view?: 'items' | 'blogs' | 'communities'
  source?: 'store' | 'market'
  q?: string
  category?: string
  campus?: string
  sort?: string
  page?: string
  condition?: string
  listing_type?: string
  min?: string
  max?: string
}

const ITEMS_PER_PAGE = 20

const LISTING_TYPE_OPTIONS = [
  { value: 'sell', label: 'For Sale' },
  { value: 'rent', label: 'For Rent' },
  { value: 'both', label: 'Sale + Rent' },
]

export const revalidate = 60 // Revalidate every minute
export const dynamic = 'force-dynamic' // But allow search params to work

export default async function MarketplacePage({ searchParams }: { searchParams: MarketplaceSearchParams }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const currentView = searchParams.view || 'items'
  const currentSource = searchParams.source || 'market'
  const page = Number(searchParams.page) > 0 ? Number(searchParams.page) : 1
  const sort = searchParams.sort || 'latest'

  const currentCategory = searchParams.category || 'All'
  const currentCampus = searchParams.campus || 'All'
  const currentCondition = searchParams.condition || 'all'
  const currentListingType = searchParams.listing_type || 'all'
  const currentMin = searchParams.min || ''
  const currentMax = searchParams.max || ''

  const MARKETPLACE_LISTING_FEED_SELECT = `
  id, seller_id, title, price, listing_type, rental_price, rental_period,
  condition, category, campus, images, status, moderation, view_count, save_count,
  created_at, is_featured, featured_until,
  seller:profiles!seller_id!inner(id,username,full_name,avatar_url,follower_count,role)
  `

  const limit = ITEMS_PER_PAGE
  const from = (page - 1) * limit
  const to = from + limit - 1

  // ── Data Fetching Logic (Parallelized) ──────────────────────────────
  const statsCacheKey = 'marketplace:stats:global'
  const [statsCached, userWishlistRaw, userLikesRaw] = await Promise.all([
    cacheService.get<any>(statsCacheKey),
    user ? supabase.from('wishlist').select('listing_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
    user ? supabase.from('likes').select('blog_id, post_id').eq('user_id', user.id) : Promise.resolve({ data: [] })
  ])

  let catCountMap: Record<string, number> = {}

  if (statsCached) {
    catCountMap = statsCached.categories || {}
  } else if (currentView === 'items') {
    const { data: statsData } = await supabase.rpc('get_marketplace_stats')
    if (statsData) {
      catCountMap = (statsData as any).categories || {}
      await cacheService.set(statsCacheKey, statsData, 600)
    }
  }

  const userWishlist = new Set<string>((userWishlistRaw.data as any[] || []).map((w) => w.listing_id))
  const userLikes = new Set<string>((userLikesRaw.data as any[] || []).map((l) => l.blog_id || l.post_id).filter(Boolean))

  let dbResults: any[] = []
  let totalCount = 0

  if (currentView === 'items') {
    let query = supabase.from('listings').select(MARKETPLACE_LISTING_FEED_SELECT, { count: 'exact' })
    query = query.eq('moderation', 'approved').eq('status', 'available')
    
    if (currentSource === 'store') query = query.eq('is_official', true)
    else query = query.or('is_official.eq.false,is_official.is.null')

    if (searchParams.q) query = query.textSearch('search_vector', searchParams.q, { config: 'english', type: 'websearch' })
    if (currentCategory !== 'All') query = query.eq('category', currentCategory)
    if (currentCampus !== 'All') query = query.eq('campus', currentCampus)
    if (currentCondition !== 'all') query = query.eq('condition', currentCondition)
    if (currentMin) query = query.gte('price', Number(currentMin))
    if (currentMax) query = query.lte('price', Number(currentMax))
    
    // ── Algorithm + True Random Engine ──
    const useAlgorithm = page === 1 && (sort === 'latest' || sort === 'recommended')
    const useRandom = sort === 'random'

    if (useAlgorithm) {
      // Page 1: Fetch larger pool → rank by engagement → return top N
      const ALGO_POOL = 100
      const { data: poolData, count: poolCount } = await query
        .order('created_at', { ascending: false })
        .range(0, ALGO_POOL - 1)
      dbResults = rankByEngagement(poolData || []).slice(0, limit)
      totalCount = poolCount || 0
    } else if (useRandom) {
      // True random: fetch page chronologically then Fisher-Yates shuffle
      const { data: pageData, count: pageCount } = await query
        .order('created_at', { ascending: false })
        .range(from, to)
      dbResults = shuffleArray(pageData || [])
      totalCount = pageCount || 0
    } else if (sort === 'price_low') {
      const { data: itemsData, count: itemsCount } = await query
        .order('price', { ascending: true }).range(from, to)
      dbResults = itemsData || []
      totalCount = itemsCount || 0
    } else if (sort === 'price_high') {
      const { data: itemsData, count: itemsCount } = await query
        .order('price', { ascending: false }).range(from, to)
      dbResults = itemsData || []
      totalCount = itemsCount || 0
    } else {
      // Page 2+ default: featured first, then chronological
      const { data: itemsData, count: itemsCount } = await query
        .order('is_featured', { ascending: false })
        .order('featured_until', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to)
      dbResults = itemsData || []
      totalCount = itemsCount || 0
    }
  } else if (currentView === 'blogs') {
    const BLOG_SELECT = `
    id, author_id, title, excerpt, cover_image, field, 
    moderation, like_count, comment_count, view_count, created_at, is_featured, featured_until,
    author:profiles!author_id!inner(username, full_name, avatar_url, role)
    `
    let query = supabase.from('blogs').select(BLOG_SELECT, { count: 'exact' })
    if (currentSource === 'store') query = query.eq('author.role', 'admin')
    else query = query.neq('author.role', 'admin')

    if (user) query = query.or(`moderation.eq.approved,author_id.eq.${user.id}`)
    else query = query.eq('moderation', 'approved')

    if (searchParams.q) query = query.textSearch('search_vector', searchParams.q, { config: 'english', type: 'websearch' })
    if (currentCategory !== 'All') query = query.eq('field', currentCategory)

    if (sort === 'random') {
      // True random: fetch page then Fisher-Yates shuffle
      const { data: blogsData, count: blogsCount } = await query
        .order('created_at', { ascending: false }).range(from, to)
      dbResults = shuffleArray(blogsData || [])
      totalCount = blogsCount || 0
    } else if (sort === 'recommended') {
      const { data: blogsData, count: blogsCount } = await query
        .order('is_featured', { ascending: false })
        .order('view_count', { ascending: false })
        .order('like_count', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to)
      dbResults = blogsData || []
      totalCount = blogsCount || 0
    } else {
      const { data: blogsData, count: blogsCount } = await query
        .order('is_featured', { ascending: false })
        .order('featured_until', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to)
      dbResults = blogsData || []
      totalCount = blogsCount || 0
    }
  } else if (currentView === 'communities') {
    const COMMUNITY_SELECT = `
    *,
    owner:profiles!owner_id!inner(username, full_name, avatar_url, role)
    `
    let query = supabase.from('communities').select(COMMUNITY_SELECT, { count: 'exact' }).eq('moderation', 'approved')
    
    if (searchParams.q) query = query.textSearch('search_vector', searchParams.q, { config: 'english', type: 'websearch' })
    if (currentCategory !== 'All') query = query.eq('field', currentCategory)

    if (sort === 'random') {
      // True random: fetch page then Fisher-Yates shuffle
      const { data: commData, count: commCount } = await query
        .order('created_at', { ascending: false }).range(from, to)
      dbResults = shuffleArray(commData || [])
      totalCount = commCount || 0
    } else if (sort === 'recommended') {
      const { data: commData, count: commCount } = await query
        .order('is_featured', { ascending: false })
        .order('member_count', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to)
      dbResults = commData || []
      totalCount = commCount || 0
    } else {
      const { data: commData, count: commCount } = await query
        .order('is_featured', { ascending: false })
        .order('featured_until', { ascending: false })
        .order('member_count', { ascending: false })
        .range(from, to)
      dbResults = commData || []
      totalCount = commCount || 0
    }
  }

  const categories = CATEGORIES.map((name) => ({
    name,
    count: catCountMap[name] || 0,
  })).sort((a, b) => b.count - a.count)

  const makeHref = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams()
    if (currentView !== 'items') params.set('view', currentView)
    if (currentSource !== 'market') params.set('source', currentSource)
    if (searchParams.q) params.set('q', searchParams.q)
    if (currentCategory !== 'All') params.set('category', currentCategory)
    if (currentCampus !== 'All') params.set('campus', currentCampus)
    if (currentCondition !== 'all') params.set('condition', currentCondition)
    if (currentListingType !== 'all') params.set('listing_type', currentListingType)
    if (currentMin) params.set('min', currentMin)
    if (currentMax) params.set('max', currentMax)
    if (sort !== 'latest') params.set('sort', sort)
    if (page > 1) params.set('page', String(page))

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') params.delete(key)
      else params.set(key, value)
    }
    const qs = params.toString()
    return `/marketplace${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="bg-background min-h-screen">
      <section className="relative bg-[#0a0f1d] border-b border-white/5 py-12 sm:py-20 px-4 sm:px-8 overflow-hidden">
        {/* Mesh Gradient Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse delay-700" />
          <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-teal-500/10 rounded-full blur-[100px] animate-float" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
        </div>

        <div className="max-w-[1440px] mx-auto relative z-10 flex flex-col gap-6 sm:gap-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-6">
              <nav className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-white/40">
                <Link className="hover:text-primary transition-colors" href="/">Home</Link>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <Link className="hover:text-primary transition-colors" href="/marketplace">Marketplace</Link>
                {currentCategory !== 'All' && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-primary">{currentCategory}</span>
                  </>
                )}
              </nav>
              
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-7xl font-black text-white tracking-tighter leading-[0.9] uppercase">
                  {currentView === 'items' ? (
                    <>Student <span className="text-primary block sm:inline">Marketplace</span></>
                  ) : currentView === 'blogs' ? (
                    <>Academic <span className="text-primary block sm:inline">Journal</span></>
                  ) : (
                    <>Discovery <span className="text-primary block sm:inline">Hubs</span></>
                  )}
                </h1>
                <p className="text-sm sm:text-lg text-white/40 font-bold max-w-xl leading-relaxed uppercase tracking-wider">
                  The central nexus for university trade, knowledge sharing, and peer collaboration. 
                  <span className="text-white/60"> Powered by intelligent discovery matrix v1.0.</span>
                </p>
              </div>
            </div>
            
            <Link href={currentView === 'items' ? "/dashboard?tab=sell" : currentView === 'blogs' ? "/dashboard?tab=blogs" : "/communities"}>
              <button className="group relative flex items-center justify-center px-10 py-5 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs shadow-[0_20px_50px_rgba(16,185,129,0.3)] active:scale-95 transition-all overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative flex items-center gap-3">
                  <span className="material-symbols-outlined font-black text-xl">add_circle</span>
                  <span>{currentView === 'items' ? 'Post New Listing' : currentView === 'blogs' ? 'Publish Article' : 'Initialize Hub'}</span>
                </span>
              </button>
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-8">
        <SourcingBanner />
      </div>

      <MarketplaceViewShell
        totalCount={totalCount}
        currentSource={currentSource}
        currentView={currentView}
        sort={sort}
        hideSourceToggles={currentView === 'communities'}
        filters={
          <aside className="w-full xl:sticky xl:top-24 rounded-[2.5rem] border border-slate-200/60 glass-lumina shadow-2xl shadow-slate-200/20 overflow-hidden mb-8 xl:mb-0">
            <div className="px-8 py-8 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Matrix Filters</h3>
                <Link href="/marketplace" className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 hover:text-primary transition-colors">
                  Reset Matrix
                </Link>
              </div>
              <p className="text-[10px] text-primary mt-1.5 font-black uppercase tracking-[0.3em] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Discovery Parameters
              </p>
            </div>

            <div className="p-8 space-y-9">
              {currentView === 'items' && (
                <section className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Listing Context</p>
                  <div className="grid grid-cols-2 gap-2">
                    {LISTING_TYPE_OPTIONS.map(opt => (
                      <Link
                        key={opt.value}
                        href={makeHref({ listing_type: opt.value })}
                        className={`px-4 py-3 rounded-xl text-center text-[10px] font-black uppercase tracking-widest transition-all border ${currentListingType === opt.value ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-200 hover:bg-white'}`}
                      >
                        {opt.label}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-5">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Category Selection</p>
                <div className="space-y-1 pr-3">
                  {categories.map((cat) => (
                    <Link 
                      href={makeHref({ category: cat.name })} 
                      key={cat.name} 
                      className={`flex items-center justify-between rounded-xl px-4 py-3.5 text-[12px] font-black transition-all group ${currentCategory === cat.name ? 'bg-primary/5 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      <span className="truncate pr-2 uppercase tracking-wider">{cat.name}</span>
                      <span className={`text-[10px] tabular-nums font-black px-2 py-1 rounded-md ${currentCategory === cat.name ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400 group-hover:bg-white transition-colors'}`}>{cat.count}</span>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </aside>
        }
      >
        <MarketplaceInfiniteFeed 
          initialItems={dbResults} 
          totalItems={totalCount}
          itemsPerPage={ITEMS_PER_PAGE}
          view={currentView}
          userWishlist={userWishlist}
          userLikes={userLikes}
        />
      </MarketplaceViewShell>
    </div>
  )
}
