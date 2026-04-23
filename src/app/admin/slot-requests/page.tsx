import { createAdminClient } from '@/lib/supabase/admin'
import { SlotRequestsManager } from '@/components/admin/slot-requests-manager'

export const dynamic = 'force-dynamic';

export default async function AdminSlotRequestsPage({
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
 .from('slot_requests')
 .select('*', { count: 'exact' })
 .order('created_at', { ascending: false })
 .range(from, to)

 const safeRequests = requests || []
 const userIds = Array.from(
 new Set(
 safeRequests
 .flatMap((r: any) => [r.user_id, r.reviewed_by])
 .filter(Boolean)
 )
 )

 const { data: profiles } = userIds.length
 ? await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', userIds)
 : { data: [] as any[] }

 const profileById = new Map((profiles || []).map((p: any) => [p.id, p]))

 const enriched = safeRequests.map((r: any) => ({
 ...r,
 user: profileById.get(r.user_id) || null,
 reviewer: r.reviewed_by ? profileById.get(r.reviewed_by) || null : null,
 }))

 const stats = {
 pending: enriched.filter((r: any) => r.status === 'pending').length,
 approved: enriched.filter((r: any) => r.status === 'approved').length,
 rejected: enriched.filter((r: any) => r.status === 'rejected').length,
 total: totalCount || 0,
 }

 return (
 <SlotRequestsManager 
 initialRequests={enriched} 
 stats={stats} 
 totalCount={totalCount || 0}
 currentPage={page}
 itemsPerPage={ITEMS_PER_PAGE}
 />
 )
}
