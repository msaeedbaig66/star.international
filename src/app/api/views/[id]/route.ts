import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const viewSchema = z.object({
  id: z.string().uuid('Invalid identifier format'),
  type: z.enum(['listing', 'blog', 'community', 'nexus_hub'])
})

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') as any
    
    // 1. Validate Input
    const validation = viewSchema.safeParse({ id: params.id, type })
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { id: targetId } = validation.data
    const supabase = await createClient()

    // 2. Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 3. Atomic Track - RPC handles unique logic (one view per user per target)
    const { error } = await supabase.rpc('track_view', {
      p_user_id: user.id,
      p_target_type: type === 'nexus_hub' ? 'community' : type, // Map UI names to DB names
      p_target_id: targetId
    })

    if (error) {
      console.error('View tracking failed:', error)
      return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('View route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
