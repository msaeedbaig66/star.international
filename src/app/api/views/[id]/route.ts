import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
 request: Request,
 { params }: { params: { id: string } }
) {

 try {
 const { searchParams } = new URL(request.url)
 const type = searchParams.get('type') || 'blog'
 const targetId = params.id

 if (!['blog', 'listing'].includes(type)) {
 return NextResponse.json({ error: 'Invalid target type' }, { status: 400 })
 }

 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()
 
 // We only track views for logged-in users to ensure deduplication accuracy
 // In a future update, we could add session_id for guests.
 if (!user) {
 return NextResponse.json({ success: false, message: 'Guest views not tracked uniquely yet' })
 }

 // Call the hardened RPC function
 const { error } = await supabase.rpc('track_view', {
 p_user_id: user.id,
 p_target_type: type,
 p_target_id: targetId
 })

 if (error) throw error

 return NextResponse.json({ success: true })
 } catch (error) {
 console.error('View Tracking Error:', error)
 return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
 }
}
