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
 const pageParam = Number(searchParams.get('page') || '1')
 const limitParam = Number(searchParams.get('limit') || '50')

 const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1
 const limit = Number.isFinite(limitParam) && limitParam > 0
 ? Math.min(Math.floor(limitParam), 100)
 : 50
 const from = (page - 1) * limit
 const to = from + limit - 1

 const supabase = createAdminClient()

 let query = supabase
 .from('reports')
 .select('*', { count: 'exact' })
 .order('created_at', { ascending: false })
 .range(from, to)

 if (status) query = query.eq('status', status)

 const { data, error, count } = await query
 if (error) throw error

 const total = count || 0
 const totalPages = Math.max(1, Math.ceil(total / limit))

 return NextResponse.json({
 data: data || [],
 error: null,
 pagination: {
 page,
 limit,
 total,
 totalPages,
 hasNextPage: page < totalPages,
 hasPrevPage: page > 1,
 },
 })
 } catch (error: any) {
 console.error('Admin reports GET error:', error)
 return NextResponse.json({ data: null, error: { message: error?.message || 'Internal server error' } }, { status: 500 })
 }
}
