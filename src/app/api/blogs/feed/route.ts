import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const q = searchParams.get('q')
  const tag = searchParams.get('tag')
  const sort = searchParams.get('sort') || 'latest'
  const offset = parseInt(searchParams.get('offset') || '0', 10)
  const limit = parseInt(searchParams.get('limit') || '12', 10)

  const supabase = await createClient()

  try {
    let query = supabase
      .from('blogs')
      .select('*, author:profiles!author_id(id,username,full_name,avatar_url,university,bio,follower_count,following_count)')
      .eq('moderation', 'approved')

    if (category && category !== 'All') {
      query = query.eq('field', category)
    }
    if (q) {
      query = query.textSearch('search_vector', q, { 
        config: 'english', 
        type: 'websearch' 
      })
    }
    if (tag) {
      query = query.contains('tags', [tag])
    }

    // Sorting logic
    query = query.order('is_featured', { ascending: false }).order('featured_until', { ascending: false })
    
    if (sort === 'popular') {
      query = query.order('view_count', { ascending: false }).order('created_at', { ascending: false })
    } else if (sort === 'liked') {
      query = query.order('like_count', { ascending: false }).order('created_at', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query.range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Blog feed fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
