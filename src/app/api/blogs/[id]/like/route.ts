import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const blogIdSchema = z.string().uuid()

/**
 * PRODUCTION-GRADE LIKE API
 * Atomic increments and ground-truth counts are managed by Postgres Triggers (tr_on_like_change).
 * This prevents data corruption and counter desync at the architectural level.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {

  try {
    const blogId = blogIdSchema.parse(params.id)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Insert like. IDEMPOTENCY: DB Unique constraint handle duplicates.
    const { error: likeError } = await supabase
      .from('likes')
      .insert({ user_id: user.id, blog_id: blogId })

    if (likeError && likeError.code !== '23505') throw likeError

    // Fetch the ground-truth updated count from the blogs table
    const { data: blog } = await supabase
      .from('blogs')
      .select('like_count')
      .eq('id', blogId)
      .single()

    return NextResponse.json({ 
        liked: true, 
        like_count: blog?.like_count || 0 
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    console.error('Like API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {

  try {
    const blogId = blogIdSchema.parse(params.id)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error: unlikeError } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', user.id)
      .eq('blog_id', blogId)
    
    if (unlikeError) throw unlikeError

    // Fetch refreshed count
    const { data: blog } = await supabase
      .from('blogs')
      .select('like_count')
      .eq('id', blogId)
      .single()

    return NextResponse.json({ 
        liked: false, 
        like_count: blog?.like_count || 0 
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    console.error('Unlike API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
