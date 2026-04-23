import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const followTargetSchema = z.string().uuid()

/**
 * PRODUCTION-GRADE FOLLOW API
 * All counter increments, atomic sync, and notifications are handled via Database Triggers 
 * (tr_on_follow_change) to ensure 100% data integrity and zero race conditions.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
 try {
 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const parsedTarget = followTargetSchema.safeParse(params.id)
 if (!parsedTarget.success) {
 return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
 }
 const targetUserId = parsedTarget.data
 if (user.id === targetUserId) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

 // Basic check for target existence
 const { count: exists } = await supabase
 .from('profiles')
 .select('id', { count: 'exact', head: true })
 .eq('id', targetUserId)
 
 if (!exists) return NextResponse.json({ error: 'User not found' }, { status: 404 })

 // Database PK and Unique Constraints handle idempotency
 const { error: insertError } = await supabase
 .from('follows')
 .insert({ follower_id: user.id, following_id: targetUserId })

 // Handle the 'Already Following' case gracefully (23505 = Unique Violation)
 if (insertError && insertError.code !== '23505') {
 throw insertError
 }

 // Return the fresh ground-truth count from the profile table (updated by trigger)
 const { data: profile } = await supabase
 .from('profiles')
 .select('follower_count')
 .eq('id', targetUserId)
 .single()

 return NextResponse.json({ 
 success: true, 
 isFollowing: true, 
 followerCount: profile?.follower_count || 0 
 })
 } catch (error: any) {
 console.error('Follow API Error:', error)
 return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
 }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
 try {
 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const parsedTarget = followTargetSchema.safeParse(params.id)
 if (!parsedTarget.success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
 
 const targetUserId = parsedTarget.data

 // Simply delete. Trigger handles the decrement and ensures zero race conditions.
 const { error: deleteError } = await supabase
 .from('follows')
 .delete()
 .eq('follower_id', user.id)
 .eq('following_id', targetUserId)
 
 if (deleteError) throw deleteError

 // Fetch refreshed count
 const { data: profile } = await supabase
 .from('profiles')
 .select('follower_count')
 .eq('id', targetUserId)
 .single()

 return NextResponse.json({ 
 success: true, 
 isFollowing: false, 
 followerCount: profile?.follower_count || 0 
 })
 } catch (error: any) {
 console.error('Unfollow API Error:', error)
 return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
 }
}

