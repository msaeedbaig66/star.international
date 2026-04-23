import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const NOTIFICATION_SELECT = `
 id, type, message, is_read, created_at, listing_id, blog_id, post_id, is_anonymous,
 actor:profiles!actor_id(id, username, avatar_url)
`

export async function GET(req: Request) {
 try {
 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()
 
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const { searchParams } = new URL(req.url)
 const cursor = searchParams.get('cursor')
 const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)

 let query = supabase
 .from('notifications')
 .select(NOTIFICATION_SELECT)
 .eq('user_id', user.id)
 .eq('is_read', false)

 if (cursor) {
 query = query.lt('created_at', cursor)
 }

 const { data, error } = await query
 .order('created_at', { ascending: false })
 .limit(limit)

 if (error) throw error;

 const nextCursor = data.length === limit ? data[data.length - 1].created_at : null

 return NextResponse.json({ data, nextCursor, error: null })
 } catch (error: any) {
 console.error('Notifications GET Error:', error)
 return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
 }
}

export async function PATCH(req: Request) {
 try {
 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const { error } = await supabase
 .from('notifications')
 .update({ is_read: true })
 .eq('user_id', user.id)
 .eq('is_read', false)

 if (error) throw error
 return NextResponse.json({ success: true })
 } catch (error: any) {
 return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
 }
}
