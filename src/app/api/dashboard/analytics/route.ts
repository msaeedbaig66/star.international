import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch Blog Aggregate Stats
    const { data: blogs, error: blogsError } = await supabase
      .from('blogs')
      .select('id, title, view_count, like_count, comment_count, created_at')
      .eq('author_id', user.id)

    if (blogsError) throw blogsError

    // 2. Fetch Listing Aggregate Stats
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, title, view_count, created_at')
      .eq('seller_id', user.id)

    if (listingsError) throw listingsError

    // 3. Fetch Community Stats
    const { data: communities, error: communitiesError } = await supabase
      .from('communities')
      .select('id, name, member_count, post_count')
      .eq('owner_id', user.id)

    if (communitiesError) throw communitiesError

    // 4. Fetch Recent Interactions (Likes/Comments) only if user has blogs
    const blogIds = (blogs || []).map(b => b.id)
    let recentLikes: any[] = []
    let recentComments: any[] = []

    if (blogIds.length > 0) {
      const { data: likes } = await supabase
        .from('likes')
        .select('id, created_at, user:profiles!user_id(id, full_name, avatar_url, username), blog:blogs!blog_id(id, title)')
        .in('blog_id', blogIds.slice(0, 50)) // Cap to 50 blogs for performance
        .order('created_at', { ascending: false })
        .limit(10)
      recentLikes = likes || []

      const { data: comments } = await supabase
        .from('comments')
        .select('id, content, created_at, author:profiles!author_id(id, full_name, avatar_url, username), blog:blogs!blog_id(id, title)')
        .in('blog_id', blogIds.slice(0, 50))
        .order('created_at', { ascending: false })
        .limit(10)
      recentComments = comments || []
    }

    // Calculate Totals
    const totalBlogViews = blogs?.reduce((acc, b) => acc + (b.view_count || 0), 0) || 0
    const totalBlogLikes = blogs?.reduce((acc, b) => acc + (b.like_count || 0), 0) || 0
    const totalListingViews = listings?.reduce((acc, l) => acc + (l.view_count || 0), 0) || 0
    const totalCommunityMembers = communities?.reduce((acc, c) => acc + (c.member_count || 0), 0) || 0

    const response = {
      summary: {
        blog_views: totalBlogViews,
        blog_likes: totalBlogLikes,
        listing_views: totalListingViews,
        community_members: totalCommunityMembers,
        total_blogs: blogs?.length || 0,
        total_listings: listings?.length || 0,
        total_communities: communities?.length || 0,
      },
      top_blogs: (blogs || [])
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 5),
      top_listings: (listings || [])
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 5),
      recent_interactions: [
        ...(recentLikes || []).map(l => ({ ...l, type: 'like' })),
        ...(recentComments || []).map(c => ({ ...c, type: 'comment' })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 15)
    }

    return NextResponse.json({ data: response, error: null })
  } catch (error: any) {
    console.error('Analytics API Error:', error)
    return NextResponse.json({ data: null, error: 'Failed to load analytics' }, { status: 500 })
  }
}
