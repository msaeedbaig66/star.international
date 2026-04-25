import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/constants'
import { cacheService } from '@/lib/cache-service'
import { MarketplaceInfiniteFeed } from '@/components/marketplace/marketplace-infinite-feed'
import { MarketplaceViewShell } from '@/components/marketplace/marketplace-view-shell'
import { SourcingBanner } from '@/components/marketplace/sourcing-banner'
import type { Listing, Blog, Community } from '@/types/database'

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
    
    if (currentSource === 'store') query = query.eq('seller.role', 'admin')
    else query = query.neq('seller.role', 'admin')

    if (searchParams.q) query = query.textSearch('search_vector', searchParams.q, { config: 'english', type: 'websearch' })
    if (currentCategory !== 'All') query = query.eq('category', currentCategory)
    if (currentCampus !== 'All') query = query.eq('campus', currentCampus)
    if (currentCondition !== 'all') query = query.eq('condition', currentCondition)
    if (currentMin) query = query.gte('price', Number(currentMin))
    if (currentMax) query = query.lte('price', Number(currentMax))
    
    if (sort === 'recommended') {
      query = query
        .order('is_featured', { ascending: false })
        .order('view_count', { ascending: false })
        .order('created_at', { ascending: false })
    } else if (sort === 'random') {
      const sortFields = ['id', 'created_at', 'price', 'view_count', 'title']
      const randomField = sortFields[Math.floor(Math.random() * sortFields.length)]
      const randomAsc = Math.random() > 0.5
      query = query.order(randomField, { ascending: randomAsc })
    } else if (sort === 'price_low') {
      query = query.order('price', { ascending: true })
    } else if (sort === 'price_high') {
      query = query.order('price', { ascending: false })
    } else {
      query = query
        .order('is_featured', { ascending: false })
        .order('featured_until', { ascending: false })
        .order('created_at', { ascending: false })
    }

    const { data: itemsData, count: itemsCount } = await query.range(from, to)
    dbResults = itemsData || []
    totalCount = itemsCount || 0
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

    if (sort === 'recommended') {
      query = query
        .order('is_featured', { ascending: false })
        .order('view_count', { ascending: false })
        .order('like_count', { ascending: false })
        .order('created_at', { ascending: false })
    } else if (sort === 'random') {
      const blogFields = ['id', 'created_at', 'view_count', 'like_count', 'title']
      const randomField = blogFields[Math.floor(Math.random() * blogFields.length)]
      const randomAsc = Math.random() > 0.5
      query = query.order(randomField, { ascending: randomAsc })
    } else {
      query = query
        .order('is_featured', { ascending: false })
        .order('featured_until', { ascending: false })
        .order('created_at', { ascending: false })
    }

    const { data: blogsData, count: blogsCount } = await query.range(from, to)

    dbResults = blogsData || []
    totalCount = blogsCount || 0
  } else if (currentView === 'communities') {
    const COMMUNITY_SELECT = `
    *,
    owner:profiles!owner_id!inner(username, full_name, avatar_url, role)
    `
    let query = supabase.from('communities').select(COMMUNITY_SELECT, { count: 'exact' }).eq('moderation', 'approved')
    
    if (searchParams.q) query = query.textSearch('search_vector', searchParams.q, { config: 'english', type: 'websearch' })
    if (currentCategory !== 'All') query = query.eq('field', currentCategory)

    if (sort === 'recommended') {
      query = query
        .order('is_featured', { ascending: false })
        .order('member_count', { ascending: false })
        .order('created_at', { ascending: false })
    } else if (sort === 'random') {
      const commFields = ['id', 'created_at', 'member_count', 'name']
      const randomField = commFields[Math.floor(Math.random() * commFields.length)]
      const randomAsc = Math.random() > 0.5
      query = query.order(randomField, { ascending: randomAsc })
    } else {
      query = query
        .order('is_featured', { ascending: false })
        .order('featured_until', { ascending: false })
        .order('member_count', { ascending: false })
    }

    const { data: commData, count: commCount } = await query.range(from, to)

    dbResults = commData || []
    totalCount = commCount || 0
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
      <section className="bg-primary/5 border-b border-border py-6 sm:py-12 px-4 sm:px-8">
        <div className="max-w-[1440px] mx-auto flex flex-col gap-4 sm:gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-4xl font-black text-primary tracking-tight mb-1 sm:mb-3">
                {currentView === 'items' ? 'Student Marketplace' : currentView === 'blogs' ? 'Academic Publications' : 'Student Communities'}
              </h1>
              <nav className="flex text-[9px] sm:text-sm font-bold text-text-muted gap-1.5 sm:gap-2 uppercase tracking-widest">
                <Link className="hover:text-primary transition-colors" href="/">Home</Link>
                <span>{'>'}</span>
                <Link className="hover:text-primary transition-colors" href="/marketplace">Marketplace</Link>
                {currentCategory !== 'All' && (
                  <><span>{'>'}</span><span className="text-primary">{currentCategory}</span></>
                )}
              </nav>
            </div>
            
            <Link href={currentView === 'items' ? "/dashboard?tab=sell" : currentView === 'blogs' ? "/dashboard?tab=blogs" : "/communities"}>
              <button className="flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-8 sm:py-4 rounded-full bg-primary text-white font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-lg sm:gap-2 active:scale-95 transition-all">
                <span className="material-symbols-outlined font-black text-xl sm:text-lg">add_circle</span>
                <span className="hidden sm:inline">{currentView === 'items' ? 'Post Item' : currentView === 'blogs' ? 'Write Blog' : 'Create Hub'}</span>
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
          <aside className="w-full xl:sticky xl:top-24 rounded-3xl border border-slate-200/60 bg-white shadow-xl shadow-slate-200/20 overflow-visible mb-8 xl:mb-0">
            <div className="px-8 py-7 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Filters</h3>
                <Link href="/marketplace" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary transition-colors">
                  Reset All
                </Link>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-bold uppercase tracking-widest">Discovery Matrix</p>
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
