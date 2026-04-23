import { getAuthorizedAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AdminOverviewCharts } from '@/components/admin/admin-overview-charts';

export const dynamic = 'force-dynamic';

interface OverviewSearchParams {
  focus?: 'all' | 'academic' | 'marketplace';
}

export default async function AdminOverviewPage({ searchParams }: { searchParams: OverviewSearchParams }) {
  let supabase;
  try {
    supabase = await getAuthorizedAdminClient();
  } catch (err) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 text-center">
        <h2 className="text-2xl font-black text-text-primary uppercase mb-4">Access Denied</h2>
        <p className="text-text-secondary mb-8">You do not have the required permissions to view the administrative console.</p>
        <Link href="/" className="bg-text-primary text-white px-8 py-3 rounded-full text-sm font-black uppercase tracking-widest transition-all">
          Back to Home
        </Link>
      </div>
    );
  }
  const currentFocus = searchParams.focus || 'all';

  if (!supabase) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 bg-white rounded-3xl border-2 border-dashed border-destructive/20 text-center">
        <div className="w-20 h-20 rounded-full bg-destructive/5 flex items-center justify-center text-destructive mb-6">
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>key_off</span>
        </div>
        <h2 className="text-2xl font-black text-text-primary uppercase tracking-tighter mb-4">Configuration Error</h2>
        <p className="text-text-secondary max-w-md mx-auto mb-8 font-medium">
          The Admin Dashboard requires a <code className="bg-surface px-2 py-1 rounded text-destructive font-bold">SUPABASE_SERVICE_ROLE_KEY</code> in your environment.
        </p>
        <Link href="/" className="bg-text-primary text-white px-8 py-3 rounded-full text-sm font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
          Back to Home
        </Link>
      </div>
    );
  }

  // ── Fetch all real stats ──────────────────────────────────────────────
  const { data: statsRaw, error: statsError } = await supabase.rpc('get_admin_stats');
  
  if (statsError) {
    console.error('Error fetching admin stats:', statsError);
  }

  const stats = statsRaw || {};
  const totalUsers = stats.totalUsers || 0;
  const activeListings = stats.activeListings || 0;
  const publishedBlogs = stats.publishedBlogs || 0;
  const activeCommunities = stats.activeCommunities || 0;
  const openReports = stats.openReports || 0;
  const listingsPending = stats.listingsPending || 0;
  const blogsPending = stats.blogsPending || 0;
  const communitiesPending = stats.communitiesPending || 0;
  const commentsPending = stats.commentsPending || 0;
  const supportOpen = stats.supportOpen || 0;

  const academicPending = (blogsPending || 0) + (communitiesPending || 0) + (commentsPending || 0);
  const marketplacePending = listingsPending || 0;
  
  const totalPending = currentFocus === 'academic' 
    ? academicPending 
    : currentFocus === 'marketplace' 
      ? marketplacePending 
      : (listingsPending || 0) + academicPending;

  // ── Fetch recent activity ─────────────────────────────────────────────
  const activityPromises: any[] = [
    supabase.from('profiles').select('id, username, full_name, created_at').order('created_at', { ascending: false }).limit(3),
    supabase.from('reports').select('id, reason, status, created_at').order('created_at', { ascending: false }).limit(3),
  ];

  if (currentFocus !== 'marketplace') {
    activityPromises.push(supabase.from('blogs').select('id, title, moderation, created_at').order('created_at', { ascending: false }).limit(3));
  }
  if (currentFocus !== 'academic') {
    activityPromises.push(supabase.from('listings').select('id, title, moderation, created_at').order('created_at', { ascending: false }).limit(3));
  }

  const activityResults = await Promise.all(activityPromises);
  const recentUsers = activityResults[0]?.data;
  const recentReports = activityResults[1]?.data;
  const recentBlogs = currentFocus !== 'marketplace' ? activityResults[2]?.data : [];
  const recentListings = currentFocus === 'all' ? activityResults[3]?.data : currentFocus === 'marketplace' ? activityResults[2]?.data : [];

  type ActivityItem = { title: string; detail: string; time: string; type: 'success' | 'warning' | 'info' | 'muted' };
  const activityFeed: ActivityItem[] = [];

  recentUsers?.forEach((u: any) => activityFeed.push({ title: u.full_name || u.username || 'New User', detail: `@${u.username || 'unknown'} joined`, time: u.created_at || new Date(0).toISOString(), type: 'info' }));
  recentReports?.forEach((r: any) => activityFeed.push({ title: `Report #${r.id?.slice(0, 6)}`, detail: r.reason || 'Safety report', time: r.created_at || new Date(0).toISOString(), type: 'warning' }));
  recentBlogs?.forEach((l: any) => activityFeed.push({ title: l.title || 'Publication', detail: l.moderation === 'pending' ? 'Reviewing' : 'Published', time: l.created_at || new Date(0).toISOString(), type: l.moderation === 'pending' ? 'warning' : 'success' }));
  recentListings?.forEach((l: any) => activityFeed.push({ title: l.title || 'Market Item', detail: l.moderation === 'pending' ? 'Awaiting' : 'Active', time: l.created_at || new Date(0).toISOString(), type: l.moderation === 'pending' ? 'warning' : 'success' }));

  activityFeed.sort((a, b) => (new Date(b.time).getTime() || 0) - (new Date(a.time).getTime() || 0));
  const topActivity = activityFeed.slice(0, 6);

  // ── UI Data Prep ──────────────────────────────────────────────────────
  const allStats = [
    { label: 'Total Users', value: totalUsers || 0, icon: 'group', color: 'primary', group: 'core' },
    { label: 'Active Listings', value: activeListings || 0, icon: 'storefront', color: 'blue', group: 'marketplace' },
    { label: 'Published Blogs', value: publishedBlogs || 0, icon: 'article', color: 'purple', group: 'academic' },
    { label: 'Communities', value: activeCommunities || 0, icon: 'groups', color: 'indigo', group: 'academic' },
    { label: 'Open Reports', value: openReports || 0, icon: 'flag', color: 'amber', isUrgent: (openReports || 0) > 0, group: 'core' },
    { label: 'Support Open', value: supportOpen || 0, icon: 'support_agent', color: 'destructive', isUrgent: (supportOpen || 0) > 0, group: 'core' },
  ];

  const filteredStats = allStats.filter(s => currentFocus === 'all' || s.group === 'core' || s.group === currentFocus);

  const allPipeline = [
    { label: 'Orders', count: 0, icon: 'local_shipping', href: '/admin/orders', group: 'marketplace' },
    { label: 'Listings', count: listingsPending || 0, icon: 'shopping_bag', href: '/admin/listings', group: 'marketplace' },
    { label: 'Blogs', count: blogsPending || 0, icon: 'draw', href: '/admin/blogs', group: 'academic' },
    { label: 'Communities', count: communitiesPending || 0, icon: 'hub', href: '/admin/communities', group: 'academic' },
    { label: 'Comments', count: commentsPending || 0, icon: 'comment', href: '/admin/comments', group: 'academic' },
  ];

  const filteredPipeline = allPipeline.filter(p => currentFocus === 'all' || p.group === currentFocus);

  const iconColors: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    blue: 'bg-blue-500/10 text-blue-600',
    purple: 'bg-purple-500/10 text-purple-600',
    amber: 'bg-amber-500/10 text-amber-600',
    indigo: 'bg-indigo-500/10 text-indigo-600',
    destructive: 'bg-destructive/10 text-destructive',
  };

  const activityDot: Record<string, string> = { success: 'bg-primary', warning: 'bg-amber-500', info: 'bg-blue-500', muted: 'bg-slate-400' };
  const activityRing: Record<string, string> = { success: 'bg-primary/10 border-primary/20', warning: 'bg-amber-500/10 border-amber-500/20', info: 'bg-blue-500/10 border-blue-500/20', muted: 'bg-surface border-border' };

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-text-primary uppercase">Console <span className="text-primary italic">Overview</span></h1>
          <p className="text-text-secondary mt-1 font-medium italic">Operational pulse of the Allpanga network.</p>
        </div>

        {/* Content Focus Switcher */}
        <div className="flex p-1 bg-surface rounded-2xl border border-border overflow-hidden shadow-inner w-fit">
          {[
            { id: 'all', label: 'Global', icon: 'public' },
            { id: 'academic', label: 'Academic', icon: 'school' },
            { id: 'marketplace', label: 'Marketplace', icon: 'payments' }
          ].map(opt => (
            <Link
              key={opt.id}
              href={`/admin?focus=${opt.id}`}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                currentFocus === opt.id ? "bg-white text-primary shadow-sm" : "text-text-muted hover:text-primary"
              )}
            >
              <span className="material-symbols-outlined text-lg">{opt.icon}</span>
              {opt.label}
            </Link>
          ))}
        </div>
      </header>

      {/* Urgent Banner */}
      {totalPending > 0 && (
        <div className="bg-white border-l-4 border-amber-500 rounded-3xl shadow-sm overflow-hidden border border-border">
          <div className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
              </div>
              <div>
                <h3 className="font-black text-text-primary text-sm uppercase tracking-tight">Pipeline Processing Active</h3>
                <p className="text-xs text-text-secondary font-medium">
                  Currently <span className="font-bold text-amber-600">{totalPending} verified records</span> awaiting clearance in {currentFocus} sector.
                </p>
              </div>
            </div>
            <Link
              href={currentFocus === 'marketplace' ? '/admin/listings' : '/admin/blogs'}
              className="bg-text-primary text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2"
            >
              Enter Queue
              <span className="material-symbols-outlined text-sm">rocket_launch</span>
            </Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {filteredStats.map((stat, i) => (
          <div
            key={i}
            className={cn(
              "bg-white p-6 rounded-3xl border border-border shadow-sm flex flex-col group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden relative",
              stat.isUrgent && "border-amber-500/30"
            )}
          >
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-surface rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className={cn("p-2.5 rounded-xl w-fit mb-4 shadow-sm", iconColors[stat.color] || iconColors.primary)}>
              <span className="material-symbols-outlined text-xl">{stat.icon}</span>
            </div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">{stat.label}</p>
            <p className="text-3xl font-black text-text-primary tracking-tighter mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Review Pipeline */}
          <section>
            <h2 className="text-xs font-black text-text-primary mb-5 flex items-center gap-2 uppercase tracking-[0.25em]">
              Operational Pipeline
              <span className="bg-amber-500/10 text-amber-600 text-[9px] px-2 py-0.5 rounded font-black">{totalPending} TOTAL PENDING</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {filteredPipeline.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className={cn(
                    "bg-white p-5 rounded-[2rem] border border-border shadow-sm flex flex-col items-center text-center gap-4",
                    "group hover:border-primary/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 no-underline"
                  )}
                >
                  <div className="w-12 h-12 rounded-2xl bg-surface text-text-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm ring-4 ring-transparent group-hover:ring-primary/10">
                    <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{item.label}</p>
                    <p className={cn(
                      "text-2xl font-black tracking-tighter mt-1",
                      item.count > 0 ? "text-amber-600 animate-pulse" : "text-text-muted"
                    )}>{item.count}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Charts Placeholder/Integration */}
          <AdminOverviewCharts
            contentFlowData={[]}
            userGrowthData={[]}
            growthLabel="Live Telemetry"
          />
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-[2.5rem] border border-border h-full flex flex-col overflow-hidden shadow-xl shadow-slate-200/50">
            <div className="px-8 py-7 border-b border-border flex items-center justify-between bg-gradient-to-br from-white to-surface">
              <h2 className="text-xs font-black text-text-primary tracking-[0.2em] uppercase">Intelligence Feed</h2>
              <span className="text-[9px] font-black text-text-muted bg-white border border-border px-2.5 py-1 rounded-full">{topActivity.length} LATEST</span>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-7">
              {topActivity.length === 0 && (
                <div className="py-20 text-center opacity-30">
                  <span className="material-symbols-outlined text-6xl mb-4">analytics</span>
                  <p className="text-[10px] font-black uppercase tracking-widest">No activity reported in this sector</p>
                </div>
              )}
              {topActivity.map((item, i) => (
                <div key={i} className="flex gap-4 relative group" style={{ animationDelay: `${i * 80}ms` }}>
                  {i < topActivity.length - 1 && (
                    <div className="absolute left-[13px] top-[30px] w-[1px] h-[calc(100%+8px)] bg-border group-hover:bg-primary/20 transition-colors" />
                  )}
                  <div className={cn("flex-shrink-0 w-[28px] h-[28px] rounded-full border-2 flex items-center justify-center z-10 bg-white", activityRing[item.type])}>
                    <div className={cn("w-2 h-2 rounded-full shadow-lg", activityDot[item.type])} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary font-black leading-none truncate group-hover:text-primary transition-colors">{item.title}</p>
                    <p className="text-[11px] text-text-secondary mt-1.5 font-medium leading-relaxed">{item.detail}</p>
                    <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mt-2">{timeAgo(item.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
