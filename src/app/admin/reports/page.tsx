import { createAdminClient } from '@/lib/supabase/admin'
import { ReportsManager } from '@/components/admin/reports-manager'
import type {
 BlogReportTarget,
 CommunityReportTarget,
 ListingReportTarget,
 ProfileBrief,
 ReportView,
} from '@/types/admin-reports'
import type { Report } from '@/types/database'

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage({
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

 const { data: reports, count: totalCount } = await supabase
 .from('reports')
 .select('*', { count: 'exact' })
 .order('created_at', { ascending: false })
 .range(from, to)

 const safeReports = (reports || []) as Report[]
 const reporterIds = Array.from(new Set(safeReports.map((report) => report.reporter_id).filter(Boolean)))

 const listingIds = safeReports.filter((report) => report.target_type === 'listing').map((report) => report.target_id)
 const blogIds = safeReports.filter((report) => report.target_type === 'blog').map((report) => report.target_id)
 const communityIds = safeReports.filter((report) => report.target_type === 'community').map((report) => report.target_id)

 const [{ data: reporters }, { data: listings }, { data: blogs }, { data: communities }] = await Promise.all([
 reporterIds.length
 ? supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', reporterIds)
 : Promise.resolve({ data: [] as ProfileBrief[] }),
 listingIds.length
 ? supabase.from('listings').select('id, title, seller_id, moderation, status, rejection_note').in('id', listingIds)
 : Promise.resolve({ data: [] as ListingReportTarget[] }),
 blogIds.length
 ? supabase.from('blogs').select('id, title, author_id, moderation, rejection_note').in('id', blogIds)
 : Promise.resolve({ data: [] as BlogReportTarget[] }),
 communityIds.length
 ? supabase.from('communities').select('id, name, owner_id, moderation, rejection_note').in('id', communityIds)
 : Promise.resolve({ data: [] as CommunityReportTarget[] }),
 ])

 const typedReporters = (reporters || []) as ProfileBrief[]
 const typedListings = (listings || []) as ListingReportTarget[]
 const typedBlogs = (blogs || []) as BlogReportTarget[]
 const typedCommunities = (communities || []) as CommunityReportTarget[]

 const profileById = new Map(typedReporters.map((profile) => [profile.id, profile]))
 const listingById = new Map(typedListings.map((listing) => [listing.id, listing]))
 const blogById = new Map(typedBlogs.map((blog) => [blog.id, blog]))
 const communityById = new Map(typedCommunities.map((community) => [community.id, community]))

 const ownerIds = Array.from(
 new Set([
 ...typedListings.map((listing) => listing.seller_id),
 ...typedBlogs.map((blog) => blog.author_id),
 ...typedCommunities.map((community) => community.owner_id),
 ].filter(Boolean))
 )
 const { data: owners } = ownerIds.length
 ? await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', ownerIds)
 : { data: [] as ProfileBrief[] }
 const ownerById = new Map(((owners || []) as ProfileBrief[]).map((profile) => [profile.id, profile]))

 const enriched: ReportView[] = safeReports.map((report) => {
 const reporter = profileById.get(report.reporter_id) || null
 let target: ListingReportTarget | BlogReportTarget | CommunityReportTarget | null = null
 let targetTitle = 'Unknown target'
 let owner: ProfileBrief | null = null

 if (report.target_type === 'listing') {
 target = listingById.get(report.target_id) || null
 targetTitle = target?.title || 'Listing'
 owner = target?.seller_id ? ownerById.get(target.seller_id) || null : null
 } else if (report.target_type === 'blog') {
 target = blogById.get(report.target_id) || null
 targetTitle = target?.title || 'Blog'
 owner = target?.author_id ? ownerById.get(target.author_id) || null : null
 } else if (report.target_type === 'community') {
 target = communityById.get(report.target_id) || null
 targetTitle = target?.name || 'Community'
 owner = target?.owner_id ? ownerById.get(target.owner_id) || null : null
 }

 return {
 ...report,
 reporter,
 target,
 target_title: targetTitle,
 owner,
 }
 })

 const stats = {
 open: enriched.filter((report) => report.status === 'open').length,
 reviewing: enriched.filter((report) => report.status === 'reviewing').length,
 resolved: enriched.filter((report) => report.status === 'resolved').length,
 total: totalCount || 0,
 }

 return (
 <ReportsManager 
 initialReports={enriched} 
 stats={stats} 
 totalCount={totalCount || 0}
 currentPage={page}
 itemsPerPage={ITEMS_PER_PAGE}
 />
)
}
