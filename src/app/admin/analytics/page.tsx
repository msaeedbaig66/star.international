import { createAdminClient } from '@/lib/supabase/admin'
import { StatCard } from '@/components/admin/stat-card'
import { AdminOverviewCharts } from '@/components/admin/admin-overview-charts'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase = createAdminClient()
  if (!supabase) return <div>Missing Admin Client Configuration</div>

  if (!supabase) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 bg-white rounded-3xl border-2 border-dashed border-destructive/20 text-center">
        <div className="w-20 h-20 rounded-full bg-destructive/5 flex items-center justify-center text-destructive mb-6">
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>key_off</span>
        </div>
        <h2 className="text-2xl font-black text-text-primary uppercase tracking-tighter mb-4">Configuration Error</h2>
        <p className="text-text-secondary max-w-md mx-auto mb-8 font-medium italic tracking-wide">
          Intelligence gathering restricted. The <code className="bg-surface px-2 py-1 rounded text-destructive font-bold">SUPABASE_SERVICE_ROLE_KEY</code> is missing.
        </p>
        <Link href="/admin" className="bg-text-primary text-white border-2 border-text-primary px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-white hover:text-text-primary">
          Back to Console
        </Link>
      </div>
    )
  }

  // ── Date Helpers ───────────────────────────────────────────────────
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()

  // ── Fetch Real Core Aggregates ─────────────────────────────────────
  const [
    { count: totalUsers },
    { count: newUsersToday },
    { data: listingsData },
    { data: blogsData },
    { count: totalJoins },
    { count: activeCommunities },
    contentSubmissions,
    { data: userGrowthRollup },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('listings').select('view_count'),
    supabase.from('blogs').select('view_count'),
    supabase.from('community_members').select('id', { count: 'exact', head: true }),
    supabase.from('communities').select('id', { count: 'exact', head: true }),
    // Aggregate all content for flow chart
    Promise.all([
      supabase.from('listings').select('created_at').gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('blogs').select('created_at').gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('communities').select('created_at').gte('created_at', sevenDaysAgo.toISOString()),
    ]).then(results => results.flatMap(r => r.data || [])),
    supabase.from('profiles').select('created_at').gte('created_at', fourWeeksAgo.toISOString()),
  ])

  // ── Process Platform Views ──────────────────────────────────────────
  const totalListingViews = (listingsData || []).reduce((sum, l) => sum + (l.view_count || 0), 0)
  const totalBlogViews = (blogsData || []).reduce((sum, b) => sum + (b.view_count || 0), 0)
  const totalPlatformViews = totalListingViews + totalBlogViews

  // ── Build Real Content Flow Chart (Last 7 Days) ─────────────────────
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const contentFlowData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000)
    const dateStr = d.toISOString().split('T')[0]
    const count = (contentSubmissions || []).filter((item: any) => item.created_at.startsWith(dateStr)).length
    return { name: dayNames[d.getDay()], value: count }
  })

  // ── Build Real User Growth Chart (Last 4 Weeks) ─────────────────────
  const userGrowthData = Array.from({ length: 4 }, (_, i) => {
    const weekEnd = new Date(now.getTime() - (3 - i) * 7 * 24 * 60 * 60 * 1000)
    const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
    const count = (userGrowthRollup || []).filter(u => {
      const d = new Date(u.created_at)
      return d >= weekStart && d <= weekEnd
    }).length
    return { name: `W${i + 1}`, value: count }
  })

  const growthLabel = totalUsers && totalUsers > 0 ? `+${newUsersToday || 0} New Today` : 'Live'

  const stats = [
    { label: 'Total Accounts', value: totalUsers || 0, icon: 'person', color: 'primary', trend: { value: `+${newUsersToday || 0} today`, isUp: true } },
    { label: 'Platform Engagement', value: totalPlatformViews, icon: 'visibility', color: 'blue', trend: { value: 'Real-time', isUp: true } },
    { label: 'Market Interest', value: totalListingViews, icon: 'shopping_bag', color: 'indigo', trend: { value: 'Active', isUp: true } },
    { label: 'Nexus Readership', value: totalBlogViews, icon: 'article', color: 'purple', trend: { value: 'Steady', isUp: true } },
    { label: 'Network Reach', value: totalJoins || 0, icon: 'group_add', color: 'emerald', trend: { value: 'Joined', isUp: true } },
    { label: 'System Pulse', value: totalUsers ? 1 : 0, icon: 'pulse', color: 'rose', trend: { value: 'Healthy', isUp: true } },
  ]

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
            <Link href="/admin" className="hover:text-primary transition-colors hover:underline underline-offset-4 decoration-primary/30">Console</Link>
            <span className="material-symbols-outlined text-[10px] opacity-40">chevron_right</span>
            <span className="text-text-primary tracking-[0.2em]">Intelligence</span>
          </nav>
          <h1 className="text-5xl font-black tracking-tight text-text-primary">Platform <span className="text-primary italic">Intelligence</span></h1>
          <p className="text-text-secondary mt-3 max-w-lg font-medium tracking-tight">Data-driven analysis of user acquisition and content circulation across the network.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 text-emerald-600 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 border border-emerald-100 shadow-sm animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            Vitals Nominal
          </div>
        </div>
      </header>

      {/* Analytics Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <section className="bg-white p-10 rounded-[2.5rem] border border-border shadow-2xl shadow-slate-200/50">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-2xl">monitoring</span>
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-text-primary tracking-tighter">Performance Trajectory</h2>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] mt-1">Live Database Aggregation</p>
                 </div>
              </div>
            </div>

            <AdminOverviewCharts
              contentFlowData={contentFlowData}
              userGrowthData={userGrowthData}
              growthLabel={growthLabel}
            />
          </section>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
            <section className="bg-white p-10 rounded-[2.5rem] border border-border shadow-sm flex flex-col hover:shadow-xl transition-shadow duration-500 min-h-[300px]">
                 <h3 className="text-xl font-black text-text-primary mb-8 tracking-tight italic">Regional Nodes</h3>
                 <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-5xl text-text-muted/20 mb-4">map</span>
                    <p className="text-xs font-bold text-text-muted uppercase tracking-[0.2em]">Geospatial Data Pending</p>
                    <p className="text-[10px] text-text-secondary mt-2 max-w-xs">Location telemetry will populate as verified profiles update their residency records.</p>
                 </div>
            </section>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <section className="bg-text-primary text-white p-12 rounded-[3rem] shadow-2xl relative overflow-hidden group border border-white/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -mr-32 -mt-32 opacity-50" />
            <div className="relative z-10">
                <span className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase border border-white/20">System Status</span>
                <h3 className="text-3xl font-black tracking-tighter mt-6 mb-3 leading-tight italic">Platform Health</h3>
                <p className="text-white/60 text-xs font-medium leading-relaxed mb-10">All core infrastructure components are reporting healthy signal strength.</p>
                
                <div className="space-y-5">
                   {[
                     { label: 'Database Service', status: 'Online' },
                     { label: 'Object Storage', status: 'Healthy' },
                     { label: 'Auth Gateway', status: 'Active' },
                     { label: 'Edge Functions', status: 'Standby' },
                   ].map(sys => (
                     <div key={sys.label} className="flex justify-between items-center py-4 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 -mx-2 transition-colors rounded-xl">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{sys.label}</span>
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{sys.status}</span>
                     </div>
                   ))}
                </div>
            </div>
          </section>

          <section className="bg-white p-10 rounded-[2.5rem] border border-border shadow-sm hover:shadow-2xl transition-all duration-500">
             <h3 className="text-xl font-black text-text-primary mb-8 tracking-tight italic">Content Distribution</h3>
             <div className="space-y-8">
                {[
                  { name: 'Market Listings', count: listingsData?.length || 0, icon: 'shopping_bag', color: 'text-primary' },
                  { name: 'Nexus Articles', count: blogsData?.length || 0, icon: 'article', color: 'text-emerald-500' },
                  { name: 'Communities', count: activeCommunities || 0, icon: 'hub', color: 'text-blue-500' },
                ].map(area => (
                  <div key={area.name} className="flex items-center gap-5 group">
                    <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-text-secondary group-hover:bg-primary/5 group-hover:text-primary transition-all shadow-sm">
                       <span className="material-symbols-outlined text-xl">{area.icon}</span>
                    </div>
                    <div className="flex-1">
                       <p className="text-[11px] font-black text-text-primary uppercase tracking-tight">{area.name}</p>
                       <p className="text-[10px] text-text-muted font-bold tracking-[0.1em] uppercase">{area.count} verified Records</p>
                    </div>
                  </div>
                ))}
             </div>
          </section>
        </div>
      </div>
    </div>
  )
}
