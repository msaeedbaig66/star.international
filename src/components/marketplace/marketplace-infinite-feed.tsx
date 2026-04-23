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
}

export function MarketplaceInfiniteFeed({
  initialItems,
  totalItems,
  itemsPerPage,
  view,
  userWishlist,
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
        <div className="rounded-[3rem] border-2 border-dashed border-border bg-white p-20 text-center">
          <span className="material-symbols-outlined text-8xl text-primary/10 mb-8 block font-light">inventory_2</span>
          <p className="text-2xl font-black text-text-primary tracking-tight uppercase">Nothing found</p>
          <p className="text-xs text-text-secondary mt-2 font-medium italic">Adjust your discovery matrix to expand search.</p>
        </div>
     )
  }

  return (
    <div className="space-y-12">
      <div className={cn(
        "grid gap-4 sm:gap-7 transition-all duration-500",
        view === 'communities' 
          ? "grid-cols-1 md:grid-cols-2" 
          : isSidebarOpen 
            ? "grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" 
            : "grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5"
      )}>
        {items.map((item: any) => (
          view === 'items' ? (
            <ListingCard key={item.id} listing={item} isSaved={userWishlist.has(item.id)} />
          ) : view === 'blogs' ? (
            <BlogCard key={item.id} blog={item} />
          ) : (
            <CommunityCard key={item.id} community={item} />
          )
        ))}
      </div>

      {/* Professional Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 pt-12 border-t border-border">
          <div className="flex flex-col items-center lg:items-start gap-2">
             <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-text-muted">Discovery Status</span>
                <span className="px-2 py-0.5 rounded-md bg-primary text-white text-[10px] font-black tabular-nums">LIVE</span>
             </div>
             <p className="text-xs font-black uppercase tracking-widest text-text-primary">
                Displaying <span className="text-primary tabular-nums">{items.length}</span> of <span className="text-primary tabular-nums">{totalItems}</span> findings
             </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
             {/* Previous Button */}
             <Link 
               href={currentPage > 1 ? createPageHref(currentPage - 1) : '#'}
               className={cn(
                 "flex items-center justify-center w-12 h-12 rounded-2xl transition-all border shrink-0",
                 currentPage > 1 
                   ? "bg-white border-border text-text-primary hover:border-primary hover:text-primary shadow-sm active:scale-95" 
                   : "bg-surface border-transparent text-text-disabled pointer-events-none opacity-50"
               )}
             >
               <span className="material-symbols-outlined text-[20px]">chevron_left</span>
             </Link>

             {/* Dynamic Page Numbers */}
             <div className="hidden sm:flex items-center gap-2">
                {getPageNumbers().map((p, idx) => (
                    p === '...' ? (
                        <span key={`dots-${idx}`} className="w-12 h-12 flex items-center justify-center text-text-muted text-sm font-black">...</span>
                    ) : (
                        <Link
                            key={p}
                            href={createPageHref(Number(p))}
                            className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black transition-all border",
                                currentPage === p 
                                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                                    : "bg-white border-border text-text-secondary hover:border-primary/50 hover:text-primary active:scale-95"
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
                  "flex items-center gap-3 px-8 h-12 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border",
                  currentPage < totalPages 
                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95" 
                    : "bg-surface border-transparent text-text-disabled pointer-events-none opacity-50"
                )}
              >
                <span>Next</span>
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </Link>
          </div>
        </div>
      )}
    </div>
  )
}
