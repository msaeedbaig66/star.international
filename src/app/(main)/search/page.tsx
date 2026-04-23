import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ListingCard } from '@/components/shared/listing-card'
import Image from 'next/image'
import { ROUTES } from '@/lib/routes'
import { UserLink } from '@/components/shared/navigation-links'
import {
  buildSearchOrFilter,
  parseSearchQuery,
  rankSearchResults,
  scoreSearchDocument,
  SearchType,
  toSafeLikeTerm,
} from '@/lib/search-ranking'

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; type?: string }
}) {
  const supabase = await createClient()

  const parsed = parseSearchQuery(searchParams.q || '', searchParams.type)
  const query = parsed.cleanQuery
  const rawQuery = parsed.rawQuery
  const type = parsed.resolvedType
  const showResults =
    Boolean(query) ||
    Boolean(parsed.operators.category) ||
    Boolean(parsed.operators.campus) ||
    Boolean(parsed.operators.field)

  const searchTerms = Array.from(
    new Set([query, ...parsed.tokens].map(toSafeLikeTerm).filter(Boolean))
  ).slice(0, 6)

  const shouldFetch = {
    items: type === 'all' || type === 'items',
    blogs: type === 'all' || type === 'blogs',
    communities: type === 'all' || type === 'communities',
    users: type === 'all' || type === 'users',
  }

  const listingsPromise = (async () => {
    if (!showResults || !shouldFetch.items) return { data: [] as any[] }
    let queryBuilder = supabase
      .from('listings')
      .select(
        'id,title,description,price,images,category,campus,condition,created_at,view_count,is_featured,featured_until,listing_type,rental_price,rental_period,seller:profiles!seller_id(id,username,full_name,avatar_url,follower_count),wishlist_count:wishlist(count)'
      )
      .eq('moderation', 'approved')
      .eq('status', 'available')
      .limit(120)
    const orFilter = buildSearchOrFilter(['title', 'description', 'category', 'campus', 'condition'], searchTerms)
    if (orFilter) queryBuilder = queryBuilder.or(orFilter)
    if (parsed.operators.category) queryBuilder = queryBuilder.ilike('category', `%${toSafeLikeTerm(parsed.operators.category)}%`)
    if (parsed.operators.campus) queryBuilder = queryBuilder.ilike('campus', `%${toSafeLikeTerm(parsed.operators.campus)}%`)
    if (parsed.operators.minPrice !== undefined) queryBuilder = queryBuilder.gte('price', parsed.operators.minPrice)
    if (parsed.operators.maxPrice !== undefined) queryBuilder = queryBuilder.lte('price', parsed.operators.maxPrice)
    return queryBuilder
  })()

  const blogsPromise = (async () => {
    if (!showResults || !shouldFetch.blogs) return { data: [] as any[] }
    let queryBuilder = supabase
      .from('blogs')
      .select(
        'id,title,excerpt,cover_image,field,tags,like_count,view_count,created_at,author:profiles!author_id(id,username,full_name,avatar_url)'
      )
      .eq('moderation', 'approved')
      .limit(120)
    const orFilter = buildSearchOrFilter(['title', 'excerpt', 'field'], searchTerms)
    if (orFilter) queryBuilder = queryBuilder.or(orFilter)
    if (parsed.operators.field) queryBuilder = queryBuilder.ilike('field', `%${toSafeLikeTerm(parsed.operators.field)}%`)
    return queryBuilder
  })()

  const communitiesPromise = (async () => {
    if (!showResults || !shouldFetch.communities) return { data: [] as any[] }
    let queryBuilder = supabase
      .from('communities')
      .select('id,name,description,field,member_count,avatar_url,created_at')
      .eq('moderation', 'approved')
      .limit(120)
    const orFilter = buildSearchOrFilter(['name', 'description', 'field'], searchTerms)
    if (orFilter) queryBuilder = queryBuilder.or(orFilter)
    if (parsed.operators.field) queryBuilder = queryBuilder.ilike('field', `%${toSafeLikeTerm(parsed.operators.field)}%`)
    return queryBuilder
  })()

  const usersPromise = (async () => {
    if (!showResults || !shouldFetch.users) return { data: [] as any[] }
    const userTerms = parsed.operators.field
      ? [...searchTerms, toSafeLikeTerm(parsed.operators.field)]
      : searchTerms
    let queryBuilder = supabase
      .from('profiles')
      .select(
        'id,username,full_name,avatar_url,university,field_of_study,follower_count,following_count,rating_avg,rating_count,created_at'
      )
      .eq('is_verified', true)
      .limit(120)
    const orFilter = buildSearchOrFilter(['username', 'full_name', 'university', 'field_of_study'], userTerms)
    if (orFilter) queryBuilder = queryBuilder.or(orFilter)
    return queryBuilder
  })()

  const [{ data: listingsRaw }, { data: blogsRaw }, { data: communitiesRaw }, { data: usersRaw }] = await Promise.all([
    listingsPromise,
    blogsPromise,
    communitiesPromise,
    usersPromise,
  ])

  const listings = rankSearchResults(listingsRaw || [], (item: any) =>
    scoreSearchDocument({
      query,
      tokens: parsed.tokens,
      primary: item.title || '',
      fields: [
        { value: item.title, weight: 22 },
        { value: item.category, weight: 12 },
        { value: item.description, weight: 10 },
        { value: item.campus, weight: 8 },
        { value: item.condition, weight: 6 },
      ],
      popularity: Number(item.view_count || 0),
      createdAt: item.created_at,
    })
  ).slice(0, 24)

  const blogs = rankSearchResults(blogsRaw || [], (item: any) =>
    scoreSearchDocument({
      query,
      tokens: parsed.tokens,
      primary: item.title || '',
      fields: [
        { value: item.title, weight: 22 },
        { value: item.excerpt, weight: 10 },
        { value: item.field, weight: 9 },
        { value: Array.isArray(item.tags) ? item.tags.join(' ') : '', weight: 7 },
      ],
      popularity: Number(item.like_count || 0) + Number(item.view_count || 0),
      createdAt: item.created_at,
    })
  ).slice(0, 24)

  const communities = rankSearchResults(communitiesRaw || [], (item: any) =>
    scoreSearchDocument({
      query,
      tokens: parsed.tokens,
      primary: item.name || '',
      fields: [
        { value: item.name, weight: 22 },
        { value: item.field, weight: 10 },
        { value: item.description, weight: 9 },
      ],
      popularity: Number(item.member_count || 0),
      createdAt: item.created_at,
    })
  ).slice(0, 24)

  const users = rankSearchResults(usersRaw || [], (item: any) =>
    scoreSearchDocument({
      query,
      tokens: parsed.tokens,
      primary: item.full_name || item.username || '',
      fields: [
        { value: item.full_name, weight: 22 },
        { value: item.username, weight: 20 },
        { value: item.university, weight: 10 },
        { value: item.field_of_study, weight: 8 },
      ],
      popularity:
        Number(item.follower_count || 0) +
        Number(item.rating_count || 0) * 2 +
        Number(item.rating_avg || 0),
      createdAt: item.created_at,
    })
  ).slice(0, 24)

  const totalResults = listings.length + blogs.length + communities.length + users.length

  const buildHref = (tab: SearchType) => {
    const qValue = rawQuery || query
    return ROUTES.search.results(qValue, tab)
  }

  return (
    <main className="min-h-screen bg-background pb-32">
      <section className="bg-white py-12 sm:py-20 shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="relative group">
              <span
                className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-primary text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                search
              </span>
              <form action="/search" method="GET">
                <input
                  name="q"
                  defaultValue={rawQuery || query}
                  className="w-full pl-16 pr-16 py-6 bg-surface border-none rounded-[2rem] text-xl font-black focus:ring-4 focus:ring-primary/5 transition-all shadow-inner tracking-tight placeholder:text-text-muted"
                  placeholder="Search smarter: @username, type:blogs, campus:ntu, min:5000 max:20000"
                  type="text"
                />
              </form>
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              {['@username', 'type:items', 'campus:ntu', 'field:electronics', 'min:1000 max:5000'].map((hint) => (
                <span key={hint} className="px-3 py-1.5 rounded-full bg-surface text-text-secondary text-[10px] font-black tracking-widest uppercase border border-border">
                  {hint}
                </span>
              ))}
            </div>

            <p className="text-text-secondary text-lg font-black uppercase tracking-widest flex items-center justify-center gap-3">
              <span className="text-primary">{totalResults}</span> results for
              <span className="text-text-primary italic">&quot;{rawQuery || query}&quot;</span>
            </p>
          </div>
        </div>
      </section>

      <section className="sticky top-[72px] z-40 bg-white/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-10 overflow-x-auto">
            {[
              { id: 'all', label: 'All Results', count: totalResults },
              { id: 'items', label: 'Listings', count: listings.length },
              { id: 'blogs', label: 'Publications', count: blogs.length },
              { id: 'communities', label: 'Nexus Hub', count: communities.length },
              { id: 'users', label: 'Students', count: users.length },
            ].map((tab) => (
              <Link
                key={tab.id}
                href={buildHref(tab.id as SearchType)}
                className={`flex items-center gap-2 py-6 whitespace-nowrap text-xs font-black uppercase tracking-[0.2em] border-b-2 transition-all ${
                  type === tab.id ? 'text-primary border-primary' : 'text-text-muted border-transparent hover:text-text-primary'
                }`}
              >
                {tab.label}
                <span
                  className={`px-3 py-1 rounded-full text-[10px] ${
                    type === tab.id ? 'bg-primary text-white' : 'bg-surface text-text-muted border border-border'
                  }`}
                >
                  {tab.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16 sm:space-y-24">
        {(type === 'all' || type === 'items') && listings.length > 0 && (
          <section>
            <div className="flex justify-between items-end mb-12">
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-text-primary tracking-tighter uppercase">Marketplace ({listings.length})</h2>
                <div className="h-1.5 w-16 bg-primary rounded-full"></div>
              </div>
              <Link href={ROUTES.marketplace.list()} className="text-primary font-black uppercase tracking-widest text-xs hover:underline flex items-center gap-2">
                View all items <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-10">
              {listings.map((listing: any) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </section>
        )}

        {(type === 'all' || type === 'blogs') && blogs.length > 0 && (
          <section>
            <div className="flex justify-between items-end mb-12">
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-text-primary tracking-tighter uppercase">Publications ({blogs.length})</h2>
                <div className="h-1.5 w-16 bg-primary rounded-full"></div>
              </div>
              <Link href={ROUTES.blog.list()} className="text-primary font-black uppercase tracking-widest text-xs hover:underline flex items-center gap-2">
                Read all blogs <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {blogs.map((blog: any) => (
                <Link key={blog.id} href={ROUTES.blog.detail(blog.id)} className="group bg-white rounded-[2.5rem] overflow-hidden border border-border hover:shadow-2xl transition-all h-full flex flex-col">
                  <div className="h-56 relative overflow-hidden shrink-0">
                    <Image
                      src={blog.cover_image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3'}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                    <div className="absolute bottom-6 left-6">
                      <UserLink user={blog.author} size="sm" className="text-white hover:text-white" />
                    </div>
                  </div>
                  <div className="p-10 flex flex-col flex-1">
                    <span className="text-primary text-[10px] font-black uppercase tracking-widest mb-4 block">{blog.field || 'General'}</span>
                    <h3 className="text-2xl font-black text-text-primary leading-tight group-hover:text-primary transition-colors tracking-tighter uppercase mb-6 flex-1">{blog.title}</h3>
                    <div className="flex items-center gap-6 mt-auto pt-8 border-t border-surface text-[10px] font-black uppercase tracking-widest text-text-muted">
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">visibility</span> {blog.view_count || 0}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">favorite</span> {blog.like_count || 0}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {(type === 'all' || type === 'communities') && communities.length > 0 && (
          <section>
            <div className="flex justify-between items-end mb-12">
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-text-primary tracking-tighter uppercase">Nexus Hub ({communities.length})</h2>
                <div className="h-1.5 w-16 bg-primary rounded-full"></div>
              </div>
              <Link href={ROUTES.communities.list()} className="text-primary font-black uppercase tracking-widest text-xs hover:underline flex items-center gap-2">
                Join all groups <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {communities.map((community: any) => (
                <Link key={community.id} href={ROUTES.communities.detail(community.id)} className="group flex items-center gap-6 bg-white p-8 rounded-[2rem] border border-border hover:shadow-xl hover:border-primary/20 transition-all">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-sm">
                    <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      groups
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-black text-text-primary uppercase tracking-tight group-hover:text-primary transition-colors">{community.name}</h4>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-1 opacity-70">
                      {community.member_count || 0} Members • {community.field || 'General'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {(type === 'all' || type === 'users') && users.length > 0 && (
          <section>
            <div className="flex justify-between items-end mb-12">
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-text-primary tracking-tighter uppercase">Users ({users.length})</h2>
                <div className="h-1.5 w-16 bg-primary rounded-full"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {users.map((profile: any) => (
                <div key={profile.id} className="bg-white rounded-[2.5rem] border border-border p-10 text-center space-y-6 hover:shadow-2xl hover:border-primary/20 transition-all flex flex-col items-center group">
                  <div className="w-24 h-24 rounded-full p-1.5 bg-gradient-to-tr from-primary/10 to-primary/40 group-hover:scale-110 transition-transform">
                    <Image src={profile.avatar_url || '/images/default-avatar.svg'} className="w-full h-full object-cover rounded-full border-4 border-white shadow-xl" alt="" width={96} height={96} />
                  </div>
                  <div>
                    <h4 className="font-black text-text-primary uppercase tracking-tight mb-1">{profile.full_name}</h4>
                    <p className="text-[10px] text-text-muted font-black tracking-widest uppercase mb-4">@{profile.username}</p>
                    <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">{profile.field_of_study || 'Student'}</p>
                    <p className="text-[10px] text-text-muted font-black tracking-widest uppercase mt-3">
                      {profile.follower_count || 0} Followers • {profile.following_count || 0} Following
                    </p>
                  </div>
                  <Link href={ROUTES.profile.view(profile.username)} className="w-full bg-primary text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-full shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all mt-auto active:scale-95">
                    View Profile
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {totalResults === 0 && (
          <div className="py-20 text-center bg-surface/50 rounded-[4rem] border-2 border-dashed border-border">
            <span className="material-symbols-outlined text-8xl text-text-muted mb-8 opacity-20">search_off</span>
            <h3 className="text-3xl font-black text-text-primary uppercase tracking-tight mb-4">No results for &quot;{rawQuery || query}&quot;</h3>
            <p className="text-text-secondary font-black uppercase tracking-widest text-sm max-w-xl mx-auto opacity-70">
              Try shorter keywords or smart operators like <span className="text-primary">type:blogs</span>, <span className="text-primary">campus:ntu</span>, or <span className="text-primary">@username</span>.
            </p>
            <Link href={ROUTES.home()} className="inline-block mt-12 bg-white border border-border px-10 py-4 rounded-full font-black uppercase tracking-widest text-xs hover:bg-surface transition-all">
              Back Home
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
