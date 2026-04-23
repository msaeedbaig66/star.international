import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const blockedUserIdSchema = z.string().uuid()

export async function POST(_req: Request, { params }: { params: { id: string } }) {

 try {
 const parsedBlockedUserId = blockedUserIdSchema.safeParse(params.id)
 if (!parsedBlockedUserId.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsedBlockedUserId.error.format() }, { status: 400 })
 }
 const blockedUserId = parsedBlockedUserId.data

 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 if (user.id === blockedUserId) return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 })

 const { error } = await supabase
 .from('blocked_users')
 .upsert({ blocker_id: user.id, blocked_id: blockedUserId }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true })
 if (error) throw error

 return NextResponse.json({ success: true, error: null })
 } catch (error: any) {
 return NextResponse.json({ data: null, error: 'Failed to process block request' }, { status: 500 })
 }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {

 try {
 const parsedBlockedUserId = blockedUserIdSchema.safeParse(params.id)
 if (!parsedBlockedUserId.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsedBlockedUserId.error.format() }, { status: 400 })
 }
 const blockedUserId = parsedBlockedUserId.data

 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const { error } = await supabase
 .from('blocked_users')
 .delete()
 .eq('blocker_id', user.id)
 .eq('blocked_id', blockedUserId)
 if (error) throw error

 return NextResponse.json({ success: true, error: null })
 } catch (error: any) {
 return NextResponse.json({ data: null, error: 'Failed to process block request' }, { status: 500 })
 }
}
