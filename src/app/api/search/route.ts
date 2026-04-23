import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  buildSearchOrFilter,
  parseSearchQuery,
  rankSearchResults,
  scoreSearchDocument,
  toSafeLikeTerm,
} from '@/lib/search-ranking'

import { cacheService } from '@/lib/cache-service'

export const dynamic = 'force-dynamic'
const SEARCH_FETCH_LIMIT = 96

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all'
    const cacheKey = `search:results:${type}:${q.trim().toLowerCase()}`

    if (q.trim()) {
      const cached = await cacheService.get<any>(cacheKey)
      if (cached) return NextResponse.json({ data: cached, error: null, cached: true })
    }

    const supabase = await createClient()
    const parsed = parseSearchQuery(q, type || undefined)

    if (!parsed.cleanQuery && !parsed.operators.category && !parsed.operators.campus && !parsed.operators.field) {
      return NextResponse.json({ data: { listings: [], blogs: [], communities: [], users: [] }, error: null })
    }

    const searchTerms = Array.from(
      new Set([parsed.cleanQuery, ...parsed.tokens].map(toSafeLikeTerm).filter(Boolean))
    ).slice(0, 6)

    const shouldFetch = {
      items: parsed.resolvedType === 'all' || parsed.resolvedType === 'items',
      blogs: parsed.resolvedType === 'all' || parsed.resolvedType === 'blogs',
      communities: parsed.resolvedType === 'all' || parsed.resolvedType === 'communities',
      users: parsed.resolvedType === 'all' || parsed.resolvedType === 'users',
    }

    const listingsPromise = (async () => {
      if (!shouldFetch.items) return { data: [] as any[] }
      let query = supabase
        .from('listings')
        .select('id,title,description,price,images,category,campus,condition,view_count,created_at')
        .eq('moderation', 'approved')
        .eq('status', 'available')
        .limit(SEARCH_FETCH_LIMIT)
      const orFilter = buildSearchOrFilter(['title', 'description', 'category', 'campus', 'condition'], searchTerms)
      if (orFilter) query = query.or(orFilter)
      if (parsed.operators.category) query = query.ilike('category', `%${toSafeLikeTerm(parsed.operators.category)}%`)
      if (parsed.operators.campus) query = query.ilike('campus', `%${toSafeLikeTerm(parsed.operators.campus)}%`)
      if (parsed.operators.minPrice !== undefined) query = query.gte('price', parsed.operators.minPrice)
      if (parsed.operators.maxPrice !== undefined) query = query.lte('price', parsed.operators.maxPrice)
      return query
    })()

    const blogsPromise = (async () => {
      if (!shouldFetch.blogs) return { data: [] as any[] }
      let query = supabase
        .from('blogs')
        .select('id,title,excerpt,cover_image,field,tags,like_count,view_count,created_at')
        .eq('moderation', 'approved')
        .limit(SEARCH_FETCH_LIMIT)
      const orFilter = buildSearchOrFilter(['title', 'excerpt', 'field'], searchTerms)
      if (orFilter) query = query.or(orFilter)
      if (parsed.operators.field) query = query.ilike('field', `%${toSafeLikeTerm(parsed.operators.field)}%`)
      return query
    })()

    const communitiesPromise = (async () => {
      if (!shouldFetch.communities) return { data: [] as any[] }
      let query = supabase
        .from('communities')
        .select('id,name,description,field,member_count,avatar_url,created_at')
        .eq('moderation', 'approved')
        .limit(SEARCH_FETCH_LIMIT)
      const orFilter = buildSearchOrFilter(['name', 'description', 'field'], searchTerms)
      if (orFilter) query = query.or(orFilter)
      if (parsed.operators.field) query = query.ilike('field', `%${toSafeLikeTerm(parsed.operators.field)}%`)
      return query
    })()

    const usersPromise = (async () => {
      if (!shouldFetch.users) return { data: [] as any[] }
      const userTerms = parsed.operators.field
        ? [...searchTerms, toSafeLikeTerm(parsed.operators.field)]
        : searchTerms
      let query = supabase
        .from('profiles')
        .select('id,username,full_name,avatar_url,university,field_of_study,follower_count,rating_avg,rating_count,created_at')
        .eq('is_verified', true)
        .limit(SEARCH_FETCH_LIMIT)
      const orFilter = buildSearchOrFilter(['username', 'full_name', 'university', 'field_of_study'], userTerms)
      if (orFilter) query = query.or(orFilter)
      return query
    })()

    const [listingsRes, blogsRes, communitiesRes, usersRes] = await Promise.all([
      listingsPromise,
      blogsPromise,
      communitiesPromise,
      usersPromise,
    ])

    const listings = rankSearchResults(listingsRes.data || [], (item: any) =>
      scoreSearchDocument({
        query: parsed.cleanQuery,
        tokens: parsed.tokens,
        primary: item.title || '',
        fields: [
          { value: item.title, weight: 22 },
          { value: item.category, weight: 12 },
          { value: item.description, weight: 9 },
          { value: item.campus, weight: 8 },
          { value: item.condition, weight: 6 },
        ],
        popularity: Number(item.view_count || 0),
        createdAt: item.created_at,
      })
    ).slice(0, 10)

    const blogs = rankSearchResults(blogsRes.data || [], (item: any) =>
      scoreSearchDocument({
        query: parsed.cleanQuery,
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
    ).slice(0, 10)

    const communities = rankSearchResults(communitiesRes.data || [], (item: any) =>
      scoreSearchDocument({
        query: parsed.cleanQuery,
        tokens: parsed.tokens,
        primary: item.name || '',
        fields: [
          { value: item.name, weight: 22 },
          { value: item.field, weight: 11 },
          { value: item.description, weight: 9 },
        ],
        popularity: Number(item.member_count || 0),
        createdAt: item.created_at,
      })
    ).slice(0, 10)

    const users = rankSearchResults(usersRes.data || [], (item: any) =>
      scoreSearchDocument({
        query: parsed.cleanQuery,
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
    ).slice(0, 10)

    const searchResults = { 
        listings,
        blogs,
        communities,
        users,
      }

    if (q.trim()) {
      await cacheService.set(cacheKey, searchResults, 300) // Cache for 5 mins
    }

    return NextResponse.json({ 
      data: searchResults, 
      error: null 
    })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { data: null, error: { message: 'An internal server error occurred' } },
      { status: 500 }
    )
  }
}
