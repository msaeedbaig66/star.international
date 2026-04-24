import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
 const { searchParams } = new URL(request.url)
 const communityId = searchParams.get('community_id')
 const offset = parseInt(searchParams.get('offset') || '0', 10)
 const limit = parseInt(searchParams.get('limit') || '10', 10)

 if (!communityId) {
 return NextResponse.json({ error: 'Community ID is required' }, { status: 400 })
 }

 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()

 try {
 // We need to match the moderation logic from the page.tsx
 // Fetch community owner info to handle moderation visibility
 const { data: community } = await supabase
 .from('communities')
 .select('owner_id')
 .eq('id', communityId)
 .single()

 let query = supabase
 .from('posts')
 .select('*, author:profiles!author_id(id,username,full_name,avatar_url,university,bio,follower_count,following_count)')
 .eq('community_id', communityId)

 if (user?.id === community?.owner_id) {
 query = query.in('moderation', ['approved', 'pending'])
 } else if (user) {
 query = query.or(`moderation.eq.approved,and(author_id.eq.${user.id},moderation.eq.pending)`)
 } else {
 query = query.eq('moderation', 'approved')
 }

 const { data, error } = await query
 .order('is_pinned', { ascending: false })
 .order('created_at', { ascending: false })
 .range(offset, offset + limit - 1)

 if (error) throw error

 // Enhance posts with isLiked status if user is logged in
 if (user && data) {
   const { data: userLikes } = await supabase
     .from('likes')
     .select('post_id')
     .eq('user_id', user.id)
     .in('post_id', data.map(p => p.id))

   const likedSet = new Set(userLikes?.map(l => l.post_id) || [])
   data.forEach(p => {
     p.isLiked = likedSet.has(p.id)
   })
 }

 return NextResponse.json({ data })
 } catch (error: any) {
 console.error('Feed fetch error:', error)
 return NextResponse.json({ error: error.message }, { status: 500 })
 }
}
