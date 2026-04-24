import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const listingIdSchema = z.string().uuid()

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const listingId = listingIdSchema.parse(params.id)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Insert like. IDEMPOTENCY: DB Unique constraint handle duplicates.
    const { error: likeError } = await supabase
      .from('likes')
      .insert({ user_id: user.id, listing_id: listingId })

    if (likeError && likeError.code !== '23505') throw likeError

    // Fetch the ground-truth updated count bypassing RLS
    const admin = createAdminClient()
    const { count } = await admin
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', listingId)

    return NextResponse.json({ 
      liked: true, 
      like_count: count || 0 
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    console.error('Listing Like API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const listingId = listingIdSchema.parse(params.id)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error: unlikeError } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
    
    if (unlikeError) throw unlikeError

    // Fetch the ground-truth updated count bypassing RLS
    const admin = createAdminClient()
    const { count } = await admin
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', listingId)

    return NextResponse.json({ 
      liked: false, 
      like_count: count || 0 
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    console.error('Listing Unlike API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
