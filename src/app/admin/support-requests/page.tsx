import { createAdminClient } from '@/lib/supabase/admin'
import { SupportRequestsManager } from '@/components/admin/support-requests-manager'

export const dynamic = 'force-dynamic';

export default async function AdminSupportRequestsPage({
 searchParams
}: {
 searchParams: { page?: string }
}) {
 const supabase = createAdminClient()
 if (!supabase) return <div>Missing Admin Client Configuration</div>
 const page = Number(searchParams.page) || 1
 const ITEMS_PER_PAGE = 50
 const from = (page - 1) * ITEMS_PER_PAGE
 const to = from + ITEMS_PER_PAGE - 1

 const { data: requests, count: totalCount } = await supabase
 .from('support_requests')
 .select('*', { count: 'exact' })
 .order('created_at', { ascending: false })
 .range(from, to)

 const safe = requests || []
 const userIds = Array.from(new Set(safe.map((r: any) => r.user_id).filter(Boolean)))
 const { data: users } = userIds.length
 ? await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', userIds)
 : { data: [] as any[] }
 const userById = new Map((users || []).map((u: any) => [u.id, u]))

 const enriched = safe.map((r: any) => ({
 ...r,
 user: r.user_id ? userById.get(r.user_id) || null : null,
 }))

 const stats = {
 open: enriched.filter((r: any) => r.status === 'open').length,
 replied: enriched.filter((r: any) => r.status === 'replied').length,
 closed: enriched.filter((r: any) => r.status === 'closed').length,
 total: totalCount || 0,
 }

 return (
 <SupportRequestsManager
 initialRequests={enriched}
 stats={stats}
 totalCount={totalCount || 0}
 currentPage={page}
 itemsPerPage={ITEMS_PER_PAGE}
 />
 )
}
