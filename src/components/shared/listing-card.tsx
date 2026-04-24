'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { formatPrice } from '@/lib/utils'
import { SafePrice } from '@/components/shared/safe-time'
import type { Listing, Profile } from '@/types/database'
import { isFeaturedActive } from '@/lib/featured-content'
import { cn } from '@/lib/utils'
import { getOptimizedImageUrl } from '@/lib/cloudinary'
import { dispatchSync, useSyncListener } from '@/lib/action-sync'
import { ROUTES } from '@/lib/routes'
import { UserLink } from './navigation-links'

interface ListingCardProps {
  listing: Listing & { 
    seller?: (Pick<Profile, 'username'> & { avatar_url?: string | null; full_name?: string | null; follower_count?: number | null; university?: string | null }) | null,
    wishlist_count?: Array<{ count: number }> | number
  }
  onSave?: (id: string, newSavedState: boolean) => void
  isSaved?: boolean
}

export function ListingCard({ listing, onSave, isSaved: initialIsSaved = false }: ListingCardProps) {
  const initialCount = typeof listing.wishlist_count === 'number' 
    ? listing.wishlist_count 
    : (Array.isArray(listing.wishlist_count) && listing.wishlist_count[0] ? listing.wishlist_count[0].count : 0)

  const [isSaved, setIsSaved] = useState(initialIsSaved)
  const [saveCount, setSaveCount] = useState(initialCount)
  const [featuredActive, setFeaturedActive] = useState(false)
  
  const serverStateRef = useRef({ saved: initialIsSaved, count: initialCount })
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastModifiedRef = useRef<number>(0)

  useEffect(() => {
    setFeaturedActive(isFeaturedActive(listing))
  }, [listing])

  const listingType = (listing.listing_type || 'sell') as 'sell' | 'rent' | 'both'
  const views = listing.view_count || 0
  const university = listing.is_official 
    ? 'Official Platform Store' 
    : (listing.seller?.university || 'University Student')

  useEffect(() => {
    const isRecentlyModified = Date.now() - lastModifiedRef.current < 3000
    if (!isRecentlyModified && (initialIsSaved !== serverStateRef.current.saved || initialCount !== serverStateRef.current.count)) {
      setIsSaved(initialIsSaved)
      setSaveCount(initialCount)
      serverStateRef.current = { saved: initialIsSaved, count: initialCount }
    }
  }, [initialIsSaved, initialCount])

  useSyncListener('listing-wishlist', listing.id, (nextState, nextCount) => {
    setIsSaved(nextState)
    if (typeof nextCount === 'number') setSaveCount(nextCount)
  })

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()

    const nextSaved = !isSaved
    const nextCount = nextSaved ? saveCount + 1 : Math.max(0, saveCount - 1)

    setIsSaved(nextSaved)
    setSaveCount(nextCount)
    lastModifiedRef.current = Date.now()

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    debounceTimerRef.current = setTimeout(async () => {
      if (nextSaved === serverStateRef.current.saved) return

      try {
        const method = nextSaved ? 'POST' : 'DELETE'
        const res = await fetch(`/api/listings/${listing.id}/wishlist`, { method })
        
        if (!res.ok) { 
          if (res.status === 401) {
            window.location.href = '/login'
            return
          }
          throw new Error('Failed to sync')
        }

        const data = await res.json()
        const finalCount = data.save_count ?? nextCount
        setSaveCount(finalCount)
        serverStateRef.current = { saved: nextSaved, count: finalCount }
        dispatchSync({ type: 'listing-wishlist', id: listing.id, state: nextSaved, count: finalCount })
        if (onSave) onSave(listing.id, nextSaved)
      } catch (error) { 
        console.error('Wishlist error:', error)
        setIsSaved(serverStateRef.current.saved)
        setSaveCount(serverStateRef.current.count)
        dispatchSync({ type: 'listing-wishlist', id: listing.id, state: serverStateRef.current.saved, count: serverStateRef.current.count })
      }
    }, 800)
  }

  return (
    <div 
      className={cn(
        "group/card relative w-full h-full bg-white rounded-[24px] overflow-hidden transition-all duration-500 flex flex-col border border-slate-100 hover:border-emerald-500/30 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] active:scale-[0.98]",
        featuredActive && "ring-[3px] ring-emerald-500/5"
      )}
    >
      <Link 
        href={ROUTES.marketplace.detail(listing.id)}
        className="absolute inset-0 z-10"
        aria-label={`View details for ${listing.title}`}
      />

      <div className='relative aspect-[4/3] overflow-hidden bg-slate-50'>
        <button 
          onClick={handleWishlistToggle}
          className={cn(
            "absolute top-3 right-3 w-8 h-8 rounded-xl backdrop-blur-md transition-all duration-300 z-30 flex items-center justify-center border",
            isSaved 
              ? "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20" 
              : "bg-white/60 border-white/50 text-slate-400 hover:text-rose-500"
          )}
        >
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}>
            favorite
          </span>
        </button>

        {listing.images && listing.images.length > 0 ? (
          <Image 
            src={getOptimizedImageUrl(listing.images[0], 600, 450)}
            alt={listing.title}
            fill
            className='object-cover group-hover/card:scale-105 transition-transform duration-700 ease-out'
            sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
          />
        ) : (
          <div className='w-full h-full flex items-center justify-center bg-slate-100 text-slate-300'>
            <span className='material-symbols-outlined text-4xl'>image</span>
          </div>
        )}
      </div>

      <div className='p-3 sm:p-4 pt-3 sm:pt-4 flex flex-col flex-1 gap-3 sm:gap-4 relative z-20 pointer-events-none'>
        <div className="flex-1 space-y-1">
          <h3 className='font-black text-[13px] sm:text-[15px] text-slate-900 line-clamp-2 leading-tight uppercase group-hover/card:text-emerald-600 transition-colors'>
            {listing.title}
          </h3>
          <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest truncate">{university}</p>
        </div>

        <div className="flex flex-col gap-2 sm:gap-3 py-2 sm:py-3 border-t border-slate-50 mt-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
              <div className="flex items-center gap-1 sm:gap-1.5" title="Item Views">
                <span className="material-symbols-outlined text-[14px] sm:text-[16px] text-slate-300">visibility</span>
                <span className="text-[10px] sm:text-[11px] font-black text-slate-500 tabular-nums">{views}</span>
              </div>
            </div>
            <div className="text-sm sm:text-lg font-black text-slate-900 tracking-tighter leading-none whitespace-nowrap">
              <SafePrice price={listingType === 'rent' ? Number(listing.rental_price || 0) : Number(listing.price || 0)} />
            </div>
          </div>
        </div>
        
        {listing.is_official ? (
          <div className="flex items-center gap-2 pt-0.5 sm:pt-1">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/20">
              <span className="material-symbols-outlined text-[12px] sm:text-[14px] text-white">verified</span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-emerald-900">Official Store</span>
          </div>
        ) : listing.seller && (
          <div className="pointer-events-auto">
            <UserLink 
              user={listing.seller} 
              size="xs" 
              showAvatar 
              showName
              className="pt-0.5 sm:pt-1"
            />
          </div>
        )}
      </div>
    </div>
  )
}
