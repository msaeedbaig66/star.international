import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const messageThreadCreateSchema = z
 .object({
 targetUserId: z.string().uuid(),
 })
 .strict()

export async function GET(req: Request) {
 try {
 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const url = new URL(req.url)
 const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
 const limit = Math.min(30, Math.max(1, parseInt(url.searchParams.get('limit') || '30', 10) || 30))
 const from = (page - 1) * limit
 const to = from + limit // fetch one extra to check hasMore

 const { data: participants } = await supabase
 .from('thread_participants')
 .select('thread_id')
 .eq('user_id', user.id);
 
 if (!participants || participants.length === 0) {
 return NextResponse.json({ data: [], hasMore: false, error: null })
 }

 const threadIds = participants.map(p => p.thread_id);

 const { data: threads, error } = await supabase
 .from('message_threads')
 .select(`
 id,
 created_at,
 updated_at,
 participants:thread_participants(user:profiles(id, username, full_name, avatar_url)),
 messages(id, content, created_at, sender_id)
 `)
 .in('id', threadIds)
 .order('updated_at', { ascending: false })
 .order('created_at', { foreignTable: 'messages', ascending: false })
 .limit(1, { foreignTable: 'messages' })
 .range(from, to);

 if (error) throw error;

 const hasMore = (threads || []).length > limit
 const paginatedThreads = hasMore ? (threads || []).slice(0, limit) : (threads || [])

 return NextResponse.json({ data: paginatedThreads, hasMore, error: null })
 } catch (error: any) {
 console.error('Messages GET error:', error)
 return NextResponse.json({ data: null, error: 'Failed to fetch messages' }, { status: 500 })
 }
}

export async function POST(req: Request) {
 try {
 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const body = await req.json().catch(() => ({}))
 const parsed = messageThreadCreateSchema.safeParse(body)
 if (!parsed.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
 }
 const { targetUserId } = parsed.data
 if (targetUserId === user.id) {
 return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
 }

 const { data: targetProfile, error: targetProfileError } = await supabase
 .from('profiles')
 .select('id')
 .eq('id', targetUserId)
 .maybeSingle()
 if (targetProfileError) throw targetProfileError
 if (!targetProfile) {
 return NextResponse.json({ error: 'User not found' }, { status: 404 })
 }

 const { data: myThreads } = await supabase
 .from('thread_participants')
 .select('thread_id')
 .eq('user_id', user.id);
 
 if (myThreads && myThreads.length > 0) {
 const threadIds = myThreads.map(t => t.thread_id);
 const { data: theirThreads } = await supabase
 .from('thread_participants')
 .select('thread_id')
 .eq('user_id', targetUserId)
 .in('thread_id', threadIds);
 
 if (theirThreads && theirThreads.length > 0) {
 return NextResponse.json({ data: { thread_id: theirThreads[0].thread_id }, error: null })
 }
 }

 const { data: newThread, error: threadError } = await supabase
 .from('message_threads')
 .insert({})
 .select('id')
 .single();

 if (threadError) throw threadError;

 const { error: partError } = await supabase
 .from('thread_participants')
 .insert([
 { thread_id: newThread.id, user_id: user.id },
 { thread_id: newThread.id, user_id: targetUserId }
 ]);
 
 if (partError) throw partError;

 return NextResponse.json({ data: { thread_id: newThread.id }, error: null })

 } catch (error: any) {
 console.error('API Error:', error)
 return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
 }
}
