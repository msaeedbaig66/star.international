import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { HeroBanner } from '@/components/home/hero-banner'
import { FeaturedCommunities } from '@/components/home/featured-communities'
import { AdBanner } from '@/components/home/ad-banner'
import { TopRankedItems } from '@/components/home/top-ranked-items'
import { RecentlyViewed } from '@/components/home/recently-viewed'
import { CategoryRows } from '@/components/home/category-rows'
import { RecentBlogs } from '@/components/home/recent-blogs'

// ── Performance: revalidate every 30s instead of 60s for fresher content without rebuild ──
export const revalidate = 30

// ── Performance: lightweight skeleton (no component import needed) ──
function SectionSkeleton() {
 return (
 <div className='py-4 sm:py-6 animate-pulse'>
 <div className='flex items-center gap-3 mb-5'>
 <div className='w-9 h-9 rounded-xl bg-slate-200' />
 <div className='h-5 w-36 bg-slate-200 rounded-lg' />
 </div>
 <div className='flex gap-3 sm:gap-4'>
 {[1, 2, 3, 4].map((i) => (
 <div key={i} className='flex-shrink-0 w-[240px] sm:w-[260px] md:w-[280px]'>
 <div className='aspect-[4/3] bg-slate-200 rounded-2xl mb-3' />
 <div className='h-4 w-3/4 bg-slate-200 rounded-lg mb-2' />
 <div className='h-4 w-1/2 bg-slate-200 rounded-lg' />
 </div>
 ))}
 </div>
 </div>
 )
}

export default async function HomePage() {
 const supabase = await createClient()

 // ── Performance: fetch user + wishlist in parallel ──
 const userPromise = supabase.auth.getUser()
 const { data: { user } } = await userPromise

 let savedIds = new Set<string>()
 if (user) {
 const { data: wishlistRows } = await supabase
 .from('wishlist')
 .select('listing_id')
 .eq('user_id', user.id)
 savedIds = new Set((wishlistRows || []).map((r: any) => r.listing_id))
 }

 return (
 <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-12'>
 {/* Hero loads immediately (above the fold) */}
 <HeroBanner />

 {/* Below-fold content uses Suspense for streaming */}
 <Suspense fallback={<SectionSkeleton />}>
 <FeaturedCommunities user={user} />
 </Suspense>

 <Suspense fallback={null}>
 <AdBanner slot={1} />
 </Suspense>

 <Suspense fallback={<SectionSkeleton />}>
 <TopRankedItems user={user} savedIds={savedIds} />
 </Suspense>

 <Suspense fallback={null}>
 <AdBanner slot={2} />
 </Suspense>

 {/* Client component — deferred load, no Suspense needed */}
 <RecentlyViewed />

 <Suspense fallback={null}>
 <AdBanner slot={3} />
 </Suspense>

 <Suspense fallback={<SectionSkeleton />}>
 <CategoryRows user={user} savedIds={savedIds} />
 </Suspense>

 <Suspense fallback={null}>
 <AdBanner slot={4} />
 </Suspense>

 <Suspense fallback={<SectionSkeleton />}>
 <RecentBlogs />
 </Suspense>
 </main>
 )
}
