import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const blockSchema = z.object({
  targetUserId: z.string().uuid(),
  action: z.enum(['block', 'unblock']),
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const parsed = blockSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
    }

    const { targetUserId, action } = parsed.data

    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 })
    }

    if (action === 'block') {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: user.id,
          blocked_id: targetUserId,
        })
      
      if (error && error.code !== '23505') { // Ignore unique constraint violation
         throw error
      }
    } else {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', targetUserId)
      
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Block API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
