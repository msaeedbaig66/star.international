'use client'

import { ListingCard } from '@/components/shared/listing-card'
import { BlogCard } from '@/components/shared/blog-card'
import { CommunityCard } from '@/components/shared/community-card'
import { cn } from '@/lib/utils'
import { useMarketplace } from './marketplace-view-shell'
import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'

import type { Listing, Blog, Community } from '@/types/database'

type FeedItem = (Listing & { seller?: any }) | (Blog & { author?: any }) | Community

interface MarketplaceInfiniteFeedProps {
 initialItems: FeedItem[]
 totalItems: number
 itemsPerPage: number
 view: 'items' | 'blogs' | 'communities'
 userWishlist: Set<string>
 userLikes: Set<string>
}

export function MarketplaceInfiniteFeed({
 initialItems,
 totalItems,
 itemsPerPage,
 view,
 userWishlist,
 userLikes,
}: MarketplaceInfiniteFeedProps) {
 const { isSidebarOpen } = useMarketplace()
 const searchParams = useSearchParams()
 const pathname = usePathname()
 
 const currentPage = Number(searchParams.get('page')) || 1
 const totalPages = Math.ceil(totalItems / itemsPerPage)
 
 const items = normalizeItems(initialItems)

 function normalizeItems(data: any[]): FeedItem[] {
 return data.map(item => ({
 ...item,
 author: Array.isArray(item.author) ? item.author[0] : item.author,
 seller: Array.isArray(item.seller) ? item.seller[0] : item.seller
 }))
 }

 const createPageHref = (pageNumber: number) => {
 const params = new URLSearchParams(searchParams.toString())
 if (pageNumber <= 1) params.delete('page')
 else params.set('page', String(pageNumber))
 return `${pathname}?${params.toString()}`
 }

 // Generate page numbers for professional pagination
 const getPageNumbers = () => {
 const pages = []
 const range = 2 // Show 2 pages before and after current
 
 for (let i = 1; i <= totalPages; i++) {
 if (i === 1 || i === totalPages || (i >= currentPage - range && i <= currentPage + range)) {
 pages.push(i)
 } else if (pages[pages.length - 1] !== '...') {
 pages.push('...')
 }
 }
 return pages
 }

  if (items.length === 0) {
  return (
  <div className="relative rounded-[3rem] overflow-hidden border-2 border-dashed border-slate-200 bg-white p-20 text-center group">
    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
    <div className="relative z-10">
      <span className="material-symbols-outlined text-8xl text-primary/20 mb-8 block font-light animate-float">inventory_2</span>
      <p className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Nexus Empty</p>
      <p className="text-[10px] text-slate-400 mt-3 font-black uppercase tracking-[0.3em] italic">Adjust your discovery matrix to expand search.</p>
      <Link href="/marketplace" className="inline-flex items-center gap-2 mt-8 px-8 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all active:scale-95">
        <span className="material-symbols-outlined text-sm">refresh</span>
        Reset Matrix
      </Link>
    </div>
  </div>
  )
  }

  return (
  <div className="space-y-16">
  <div className={cn(
  "grid gap-6 sm:gap-8 transition-all duration-500",
  view === 'communities' 
  ? "grid-cols-1 md:grid-cols-2" 
  : isSidebarOpen 
  ? "grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" 
  : "grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5"
  )}>
  {items.map((item: any, index: number) => (
  <div 
    key={item.id} 
    className="animate-reveal" 
    style={{ animationDelay: `${index * 50}ms` }}
  >
  {view === 'items' ? (
  <ListingCard listing={item} isSaved={userWishlist.has(item.id)} />
  ) : view === 'blogs' ? (
  <BlogCard blog={item} isLiked={userLikes.has(item.id)} />
  ) : (
  <CommunityCard community={item} />
  )}
  </div>
  ))}
  </div>

  {/* Professional Pagination Controls: Matrix Navigation */}
  {totalPages > 1 && (
  <div className="flex flex-col lg:flex-row items-center justify-between gap-10 pt-16 border-t-2 border-slate-100">
  <div className="flex flex-col items-center lg:items-start gap-3">
  <div className="flex items-center gap-3">
  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Matrix Status</span>
  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
    <span className="text-[9px] font-black uppercase tracking-widest">Live Sync</span>
  </div>
  </div>
  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-900">
  Visualizing <span className="text-primary tabular-nums">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="text-primary tabular-nums">{totalItems}</span> Findings
  </p>
  </div>

  <div className="flex items-center gap-3 sm:gap-4">
  {/* Previous Button */}
  <Link 
  href={currentPage > 1 ? createPageHref(currentPage - 1) : '#'}
  className={cn(
  "flex items-center justify-center w-14 h-14 rounded-2xl transition-all border-2 shrink-0 shadow-lg",
  currentPage > 1 
  ? "bg-white border-slate-100 text-slate-900 hover:border-slate-900 hover:shadow-slate-900/10 active:scale-95" 
  : "bg-slate-50 border-transparent text-slate-300 pointer-events-none opacity-50"
  )}
  >
  <span className="material-symbols-outlined text-[24px]">chevron_left</span>
  </Link>
 
  {/* Dynamic Page Numbers */}
  <div className="hidden md:flex items-center gap-3">
  {getPageNumbers().map((p, idx) => (
  p === '...' ? (
  <span key={`dots-${idx}`} className="w-12 h-12 flex items-center justify-center text-slate-300 text-sm font-black">...</span>
  ) : (
  <Link
  key={p}
  href={createPageHref(Number(p))}
  className={cn(
  "w-14 h-14 rounded-2xl flex items-center justify-center text-xs font-black transition-all border-2 shadow-sm",
  currentPage === p 
  ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20" 
  : "bg-white border-slate-100 text-slate-500 hover:border-slate-400 active:scale-95"
  )}
  >
  {p}
  </Link>
  )
  ))}
  </div>
 
  {/* Next Button */}
  <Link 
  href={currentPage < totalPages ? createPageHref(currentPage + 1) : '#'}
  className={cn(
  "flex items-center gap-4 px-10 h-14 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all border-2 shadow-lg",
  currentPage < totalPages 
  ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/30 hover:opacity-90 active:scale-95" 
  : "bg-slate-50 border-transparent text-slate-300 pointer-events-none opacity-50"
  )}
  >
  <span>Next Matrix</span>
  <span className="material-symbols-outlined text-[24px]">chevron_right</span>
  </Link>
  </div>
  </div>
  )}
  </div>
 )
}
