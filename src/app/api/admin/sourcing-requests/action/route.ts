import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const actionSchema = z.object({
  request_id: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'unavailable']),
  admin_note: z.string().max(2000).optional(),
}).strict()

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = actionSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    const { request_id, status, admin_note } = parsed.data

    const { error } = await supabase
      .from('sourcing_requests')
      .update({
        status,
        admin_note,
        updated_at: new Date().toISOString()
      })
      .eq('id', request_id)

    if (error) {
      console.error('Admin Sourcing Action Error:', error)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API Error in /api/admin/sourcing-requests/action:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
