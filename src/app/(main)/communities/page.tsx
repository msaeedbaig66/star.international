import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { MobileFiltersWrapper } from '@/components/marketplace/mobile-filters-wrapper';
import { MarketplaceViewShell } from '@/components/marketplace/marketplace-view-shell';
import { MarketplaceInfiniteFeed } from '@/components/marketplace/marketplace-infinite-feed';
import { ROUTES } from '@/lib/routes';

const CATEGORIES_LIST = ['Electronics', 'Computer Science', 'Mechanical', 'AI', 'Textile', 'Fashion', 'Civil', 'Chemistry', 'Other'];

export default async function CommunitiesPage({ 
 searchParams 
}: { 
 searchParams: { category?: string, q?: string, page?: string, source?: string, sort?: string } 
}) {
 const supabase = await createClient();
 const page = Number(searchParams.page) || 1;
 const ITEMS_PER_PAGE = 20;
 const from = (page - 1) * ITEMS_PER_PAGE;
 const to = from + ITEMS_PER_PAGE - 1;
 
 const currentView = 'communities';
 const currentCategory = searchParams.category || 'All';
 const currentSort = searchParams.sort || 'latest';

 // 1. Fetch Communities - COMBINED Admin and Student
 let query = supabase
 .from('communities')
 .select('*, owner:profiles!owner_id(id,username,full_name,avatar_url,role)', { count: 'exact' })
 .eq('moderation', 'approved');

 // Removed the Source (Market/Store) check to combine ALL communities
 
 if (currentCategory !== 'All') {
 query = query.eq('field', currentCategory);
 }
 if (searchParams.q) {
 query = query.textSearch('search_vector', searchParams.q, { config: 'english', type: 'websearch' });
 }

 query = query.order('is_official', { ascending: false });
 if (currentSort === 'popular') query = query.order('member_count', { ascending: false });
 else query = query.order('created_at', { ascending: false });

 const { data: dbCommunities, count: totalCount } = await query.range(from, to);

 // Stats
 const { data: allComms } = await supabase.from('communities').select('field').eq('moderation', 'approved');
 const fieldStatsMap: Record<string, number> = {};
 allComms?.forEach(c => {
 if (c.field) fieldStatsMap[c.field] = (fieldStatsMap[c.field] || 0) + 1;
 });

 const makeHref = (updates: Record<string, string | null>) => {
 const params = new URLSearchParams();
 if (searchParams.q) params.set('q', searchParams.q);
 if (currentCategory !== 'All') params.set('category', currentCategory);
 if (page > 1) params.set('page', String(page));
 for (const [key, value] of Object.entries(updates)) {
 if (value === null || value === '') params.delete(key);
 else params.set(key, value);
 }
 return ROUTES.communities.list() + (params.toString() ? `?${params.toString()}` : '');
 };

 return (
 <div className="bg-background min-h-screen">
 <section className="bg-primary/5 border-b border-border py-6 sm:py-12 px-4 sm:px-8">
 <div className="max-w-[1440px] mx-auto flex flex-col gap-4 sm:gap-6">
 <div className="flex items-start justify-between gap-4">
 <div className="flex-1">
 <h1 className="text-xl sm:text-4xl font-black text-primary tracking-tight mb-1 sm:mb-3">Nexus Hub</h1>
 <nav className="flex text-[9px] sm:text-sm font-bold text-text-muted gap-1.5 sm:gap-2 uppercase tracking-widest">
 <Link className="hover:text-primary transition-colors" href="/">Home</Link>
 <span>{'>'}</span>
 <Link className="hover:text-primary transition-colors" href="/marketplace">Marketplace</Link>
 <span>{'>'}</span>
 <Link className="hover:text-primary transition-colors" href="/communities">Communities</Link>
 </nav>
 </div>
 
 <Link href={ROUTES.communities.create()}>
 <button className="flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-8 sm:py-4 rounded-full bg-primary text-white font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-lg sm:gap-2 active:scale-95 transition-all">
 <span className="material-symbols-outlined font-black text-xl sm:text-lg">add_circle</span>
 <span className="hidden sm:inline">Create Hub</span>
 </button>
 </Link>
 </div>
 </div>
 </section>

 <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-10">
 <MarketplaceViewShell
 totalCount={totalCount || 0}
 currentSource=""
 currentView={currentView}
 sort={currentSort}
 hideSourceToggles={true}
 filters={
 <MobileFiltersWrapper>
 <aside className="w-full xl:sticky xl:top-24 rounded-2xl border border-border bg-white shadow-sm overflow-hidden p-6 space-y-7">
 <section className="space-y-4">
 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Academic Fields</p>
 <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
 {CATEGORIES_LIST.map(cat => (
 <Link key={cat} href={makeHref({ category: cat, page: null })} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all border ${currentCategory === cat ? 'bg-primary/5 text-primary border-primary/10' : 'text-text-secondary border-transparent hover:bg-surface'}`}>
 <span>{cat}</span>
 <span className="text-[10px] tabular-nums opacity-60">{fieldStatsMap[cat] || 0}</span>
 </Link>
 ))}
 </div>
 </section>
 </aside>
 </MobileFiltersWrapper>
 }
 >
 <MarketplaceInfiniteFeed 
 initialItems={dbCommunities || []} 
 totalItems={totalCount || 0}
 itemsPerPage={ITEMS_PER_PAGE}
 view={currentView}
 userWishlist={new Set()}
 />
 </MarketplaceViewShell>
 </div>
 </div>
 );
}
