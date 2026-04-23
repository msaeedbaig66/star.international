import { createAdminClient } from '@/lib/supabase/admin'
import { FeatureRequestsManager } from '@/components/admin/feature-requests-manager'

export default async function AdminFeatureRequestsPage() {
 const supabase = createAdminClient()
 if (!supabase) return <div>Missing Admin Client Configuration</div>

 const { data: requests } = await supabase
 .from('feature_requests')
 .select('*')
 .order('created_at', { ascending: false })
 .limit(400)

 const safeRequests = requests || []
 const userIds = Array.from(
 new Set(
 safeRequests
 .flatMap((row: any) => [row.user_id, row.reviewed_by])
 .filter(Boolean)
 )
 )

 const { data: profiles } = userIds.length
 ? await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', userIds)
 : { data: [] as any[] }

 const listingIds = safeRequests.filter((r: any) => r.entity_type === 'listing').map((r: any) => r.entity_id)
 const blogIds = safeRequests.filter((r: any) => r.entity_type === 'blog').map((r: any) => r.entity_id)
 const communityIds = safeRequests.filter((r: any) => r.entity_type === 'community').map((r: any) => r.entity_id)

 const [listingRows, blogRows, communityRows] = await Promise.all([
 listingIds.length
 ? supabase
 .from('listings')
 .select('id, title, moderation, status, is_featured, featured_until')
 .in('id', listingIds)
 : Promise.resolve({ data: [] as any[] }),
 blogIds.length
 ? supabase
 .from('blogs')
 .select('id, title, moderation, is_featured, featured_until')
 .in('id', blogIds)
 : Promise.resolve({ data: [] as any[] }),
 communityIds.length
 ? supabase
 .from('communities')
 .select('id, name, moderation, is_featured, featured_until')
 .in('id', communityIds)
 : Promise.resolve({ data: [] as any[] }),
 ])

 const profileById = new Map((profiles || []).map((p: any) => [p.id, p]))
 const entityByKey = new Map<string, any>()

 for (const row of listingRows.data || []) {
 entityByKey.set(`listing:${row.id}`, row)
 }
 for (const row of blogRows.data || []) {
 entityByKey.set(`blog:${row.id}`, row)
 }
 for (const row of communityRows.data || []) {
 entityByKey.set(`community:${row.id}`, row)
 }

 const enriched = safeRequests.map((row: any) => ({
 ...row,
 user: profileById.get(row.user_id) || null,
 reviewer: row.reviewed_by ? profileById.get(row.reviewed_by) || null : null,
 entity: entityByKey.get(`${row.entity_type}:${row.entity_id}`) || null,
 }))

 const stats = {
 pending: enriched.filter((row: any) => row.status === 'pending').length,
 approved: enriched.filter((row: any) => row.status === 'approved').length,
 rejected: enriched.filter((row: any) => row.status === 'rejected').length,
 total: enriched.length,
 }

 return <FeatureRequestsManager initialRequests={enriched} stats={stats} />
}
