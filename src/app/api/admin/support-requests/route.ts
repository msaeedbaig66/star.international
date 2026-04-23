import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await createClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await auth.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const supabase = createAdminClient()
    let query = supabase.from('support_requests').select('*').order('created_at', { ascending: false }).limit(300)
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data: data || [], error: null })
  } catch (error: any) {
    console.error('Admin support-requests GET error:', error)
    return NextResponse.json({ data: null, error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
