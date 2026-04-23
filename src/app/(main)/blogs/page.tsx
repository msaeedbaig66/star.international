import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { MobileFiltersWrapper } from '@/components/marketplace/mobile-filters-wrapper';
import { MarketplaceViewShell } from '@/components/marketplace/marketplace-view-shell';
import { MarketplaceInfiniteFeed } from '@/components/marketplace/marketplace-infinite-feed';
import { cacheService } from '@/lib/cache-service';

const BLOG_CATEGORIES = ['Electronics', 'Computer Science', 'Mechanical', 'AI', 'Textile', 'Fashion', 'Civil', 'Chemistry', 'Other'];

export default async function BlogsPage({
  searchParams
}: {
  searchParams: { category?: string; q?: string; page?: string; sort?: string; tag?: string; source?: string }
}) {
  const supabase = await createClient();
  const page = Number(searchParams.page) || 1;
  const ITEMS_PER_PAGE = 20;
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;
  
  const currentView = 'blogs';
  const currentSource = searchParams.source || 'market';
  const selectedTag = searchParams.tag;
  const selectedSort = searchParams.sort || 'latest';
  const currentCategory = searchParams.category || 'All';

  // 1. Fetch Blogs
  let query = supabase
    .from('blogs')
    .select('*, author:profiles!author_id(id,username,full_name,avatar_url,university,bio,follower_count,following_count,role)', { count: 'exact' })
    .eq('moderation', 'approved');

  if (currentSource === 'store') {
    query = query.eq('author.role', 'admin');
  } else {
    query = query.neq('author.role', 'admin');
  }

  if (currentCategory !== 'All') {
    query = query.eq('field', currentCategory);
  }
  if (searchParams.q) {
    query = query.textSearch('search_vector', searchParams.q, { config: 'english', type: 'websearch' });
  }
  if (selectedTag) {
    query = query.contains('tags', [selectedTag]);
  }

  query = query.order('is_featured', { ascending: false }).order('featured_until', { ascending: false });
  if (selectedSort === 'popular') query = query.order('view_count', { ascending: false });
  else if (selectedSort === 'liked') query = query.order('like_count', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  const { data: blogs, count: totalCount } = await query.range(from, to);

  // 2. Stats
  let fieldStatsMap: Record<string, number> = {};
  let popularTags: [string, number][] = [];
  try {
    const statsCacheKey = 'blogs:stats:global';
    const cachedStats = await cacheService.get<any>(statsCacheKey);
    if (cachedStats) {
      fieldStatsMap = cachedStats.fields || {};
      popularTags = Object.entries(cachedStats.tags || {}) as [string, number][];
    } else {
      const { data: statsData } = await supabase.rpc('get_blog_stats');
      if (statsData) {
        fieldStatsMap = (statsData as any).fields || {};
        popularTags = Object.entries((statsData as any).tags || {}) as [string, number][];
        await cacheService.set(statsCacheKey, statsData, 600);
      }
    }
    popularTags.sort((a, b) => b[1] - a[1]);
  } catch (err) {}

  const makeHref = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams();
    if (searchParams.source) params.set('source', searchParams.source);
    if (searchParams.q) params.set('q', searchParams.q);
    if (currentCategory !== 'All') params.set('category', currentCategory);
    if (selectedTag) params.set('tag', selectedTag);
    if (selectedSort !== 'latest') params.set('sort', selectedSort);
    if (page > 1) params.set('page', String(page));
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    return `/blogs${params.toString() ? `?${params.toString()}` : ''}`;
  };

  return (
    <div className="bg-background min-h-screen">
      <section className="bg-primary/5 border-b border-border py-6 sm:py-12 px-4 sm:px-8">
        <div className="max-w-[1440px] mx-auto flex flex-col gap-4 sm:gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-4xl font-black text-primary tracking-tight mb-1 sm:mb-3">Academic Blogs</h1>
              <nav className="flex text-[9px] sm:text-sm font-bold text-text-muted gap-1.5 sm:gap-2 uppercase tracking-widest">
                <Link className="hover:text-primary transition-colors" href="/">Home</Link>
                <span>{'>'}</span>
                <Link className="hover:text-primary transition-colors" href="/marketplace">Marketplace</Link>
                <span>{'>'}</span>
                <Link className="hover:text-primary transition-colors" href="/blogs">Blogs</Link>
              </nav>
            </div>
            
            <Link href="/dashboard?tab=blogs">
              <button className="flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-8 sm:py-4 rounded-full bg-primary text-white font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-lg sm:gap-2 active:scale-95 transition-all">
                <span className="material-symbols-outlined font-black text-xl sm:text-lg">add_circle</span>
                <span className="hidden sm:inline">Write Blog</span>
              </button>
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-10">
        <MarketplaceViewShell
          totalCount={totalCount || 0}
          currentSource={currentSource}
          currentView={currentView}
          sort={selectedSort}
          filters={
            <MobileFiltersWrapper>
              <aside className="w-full xl:sticky xl:top-24 rounded-2xl border border-border bg-white shadow-sm overflow-hidden p-6 space-y-7">
                <section className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Field of Study</p>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {BLOG_CATEGORIES.map(cat => (
                      <Link key={cat} href={makeHref({ category: cat, page: null })} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all border ${currentCategory === cat ? 'bg-primary/5 text-primary border-primary/10' : 'text-text-secondary border-transparent hover:bg-surface'}`}>
                        <span>{cat}</span>
                        <span className="text-[10px] tabular-nums opacity-60">{fieldStatsMap[cat] || 0}</span>
                      </Link>
                    ))}
                  </div>
                </section>
                <section className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Popular Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {popularTags.slice(0, 12).map(([tag]) => (
                      <Link key={tag} href={makeHref({ tag: selectedTag === tag ? null : tag, page: null })} className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border transition-all ${selectedTag === tag ? 'bg-primary text-white border-primary border-transparent' : 'bg-surface text-text-secondary border-transparent hover:border-primary/10 hover:text-primary'}`}>
                        {tag}
                      </Link>
                    ))}
                  </div>
                </section>
              </aside>
            </MobileFiltersWrapper>
          }
        >
          <MarketplaceInfiniteFeed 
            initialItems={blogs || []} 
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
