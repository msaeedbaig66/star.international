'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'

interface WishlistTabProps {
  profile: any
}

type WishlistFilter = 'all' | 'available' | 'sold'

export function WishlistTab({ profile }: WishlistTabProps) {
  const [items, setItems] = useState<any[]>([])
  const [filter, setFilter] = useState<WishlistFilter>('all')
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [stats, setStats] = useState({ total: 0, available: 0, soldOut: 0 })

  const loadWishlist = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)

    const { data: wishlistRows } = await supabase
      .from('wishlist')
      .select('listing_id, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (!wishlistRows || wishlistRows.length === 0) {
      setItems([])
      setStats({ total: 0, available: 0, soldOut: 0 })
      setLoading(false)
      return
    }

    const listingIds = wishlistRows.map((row: any) => row.listing_id)
    const { data: listingRows, error: listingError } = await supabase
      .from('listings')
      .select(`
        id, title, price, images, condition, status, campus, moderation, seller_id
      `)
      .in('id', listingIds)

    if (listingError) {
      console.error('Failed to load wishlist listings:', listingError)
      setItems([])
      setStats({ total: 0, available: 0, soldOut: 0 })
      setLoading(false)
      return
    }

    const sellerIds = Array.from(new Set((listingRows || []).map((listing: any) => listing.seller_id).filter(Boolean)))
    let sellerMap = new Map<string, any>()

    if (sellerIds.length > 0) {
      const { data: sellers } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .in('id', sellerIds)
      sellerMap = new Map((sellers || []).map((seller: any) => [seller.id, seller]))
    }

    const listingMap = new Map(
      (listingRows || []).map((listing: any) => [
        listing.id,
        {
          ...listing,
          seller: listing.seller_id ? sellerMap.get(listing.seller_id) || null : null,
        },
      ])
    )
    const merged = wishlistRows
      .map((row: any) => ({
        created_at: row.created_at,
        listing: listingMap.get(row.listing_id) || null,
      }))
      .filter((w: any) => w.listing)

    let filtered = merged

    if (filter === 'available') filtered = filtered.filter((w: any) => w.listing.status === 'available')
    if (filter === 'sold') filtered = filtered.filter((w: any) => w.listing.status === 'sold')

    setItems(filtered)

    // Stats from all items
    const allItems = merged
    setStats({
      total: allItems.length,
      available: allItems.filter((w: any) => w.listing.status === 'available').length,
      soldOut: allItems.filter((w: any) => w.listing.status === 'sold').length,
    })
    setLoading(false)
  }, [filter, profile.id])

  useEffect(() => {
    loadWishlist()
  }, [loadWishlist])

  const handleRemove = async (listingId: string) => {
    try {
      await fetch(`/api/listings/${listingId}/wishlist`, { method: 'DELETE' })
      setItems(prev => prev.filter(w => w.listing.id !== listingId))
    } catch (e) { console.error(e) }
  }

  const handleBulkRemove = async () => {
    try {
      for (const id of Array.from(selectedItems)) {
        await fetch(`/api/listings/${id}/wishlist`, { method: 'DELETE' })
      }
      setSelectedItems(new Set())
      setBulkMode(false)
      await loadWishlist()
    } catch (e) { console.error(e) }
  }

  const handleClearSold = async () => {
    try {
      const soldIds = items.filter((w) => w.listing.status === 'sold').map((w) => w.listing.id)
      for (const id of soldIds) {
        await fetch(`/api/listings/${id}/wishlist`, { method: 'DELETE' })
      }
      await loadWishlist()
    } catch (e) { console.error(e) }
  }

  const toggleSelect = (listingId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      next.has(listingId) ? next.delete(listingId) : next.add(listingId)
      return next
    })
  }

  const CONDITION_LABELS: Record<string, string> = {
    new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair', poor: 'Poor',
  }

  const filterTabs: { label: string; value: WishlistFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Available', value: 'available' },
    { label: 'Sold', value: 'sold' },
  ]

  const statCards = [
    { label: 'Saved Items', value: stats.total, icon: 'favorite' },
    { label: 'Available', value: stats.available, icon: 'check_circle' },
    { label: 'Sold Out', value: stats.soldOut, icon: 'remove_shopping_cart' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase leading-tight">Wishlist</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">Items you&apos;ve saved for later.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={bulkMode ? 'primary' : 'outline'}
            size="sm"
            onClick={() => {
              setBulkMode(!bulkMode)
              setSelectedItems(new Set())
            }}
            className="rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-5"
          >
            {bulkMode ? 'Done' : 'Select Items'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {statCards.map((stat, idx) => (
          <Card key={stat.label} className={cn(
              "flex flex-col sm:flex-row sm:items-center justify-between border-none bg-white p-4 sm:p-6 rounded-3xl shadow-sm",
              idx === 2 && "col-span-2 lg:col-span-1"
          )}>
            <div>
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
              <h3 className="text-xl sm:text-3xl font-black text-slate-900 leading-none">{stat.value}</h3>
            </div>
            <div className="hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-50 items-center justify-center border border-slate-100">
              <span className="material-symbols-outlined text-[20px] sm:text-[24px] text-slate-500">{stat.icon}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Sold items banner */}
      {stats.soldOut > 0 && (
        <div className="bg-warning-light text-warning p-4 rounded-xl flex items-center justify-between border border-warning/20">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined">info</span>
            <p className="text-sm font-medium">
              {stats.soldOut} item{stats.soldOut > 1 ? 's' : ''} in your wishlist {stats.soldOut > 1 ? 'have' : 'has'} been sold
            </p>
          </div>
          <button
            onClick={handleClearSold}
            className="text-xs font-bold text-warning hover:underline whitespace-nowrap"
          >
            Clear Sold Items
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              'px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border shrink-0',
              filter === tab.value
                ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10'
                : 'bg-white text-slate-500 border-slate-100 hover:border-emerald-500 hover:text-emerald-600'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid - 2x2 Mobile */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-slate-50 border border-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 border-2 border-dashed border-slate-100 rounded-[40px] flex flex-col items-center justify-center text-center bg-slate-50/50 px-6">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-slate-100">
            <span className="material-symbols-outlined text-slate-300 text-[40px]">favorite_border</span>
          </div>
          <h3 className="font-black text-slate-900 uppercase tracking-tight">Empty Wishlist</h3>
          <p className="text-slate-500 text-xs max-w-[200px] mt-2 font-medium">
            Explore the marketplace and heart items you like!
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {items.map((item) => {
              const listing = item.listing
              const isSold = listing.status === 'sold'

              return (
                <Card key={listing.id} padding="none" className="relative group overflow-hidden border border-slate-100 rounded-3xl bg-white shadow-sm hover:shadow-xl transition-all duration-500 h-full flex flex-col">
                  {/* Selection checkbox */}
                  {bulkMode && (
                    <label className="absolute top-2 left-2 z-20 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center cursor-pointer border border-slate-100">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(listing.id)}
                        onChange={() => toggleSelect(listing.id)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded-full"
                      />
                    </label>
                  )}

                  {/* Heart remove button */}
                  {!bulkMode && (
                    <button
                      onClick={() => handleRemove(listing.id)}
                      className="absolute top-2 right-2 z-20 w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all text-rose-500"
                    >
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        favorite
                      </span>
                    </button>
                  )}

                  {/* Image */}
                  <div className="aspect-[4/3] relative bg-slate-50 overflow-hidden">
                    {listing.images?.[0] ? (
                      <Image
                        src={listing.images[0]}
                        alt={listing.title}
                        className={cn('w-full h-full object-cover transition-transform duration-700 group-hover:scale-110', isSold && 'grayscale')}
                        fill
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <span className="material-symbols-outlined text-3xl">image</span>
                      </div>
                    )}
                    {isSold && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[10px] font-black text-white uppercase tracking-widest backdrop-blur-md">
                          Claimed
                        </span>
                      </div>
                    )}
                    {listing.condition && !isSold && (
                      <span className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-[8px] font-black text-slate-600 uppercase tracking-widest border border-slate-100">
                        {CONDITION_LABELS[listing.condition] || listing.condition}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3 flex-1 flex flex-col">
                    <div className="mb-2">
                      <h4 className="font-black text-slate-900 text-[11px] leading-tight uppercase tracking-tight line-clamp-1">{listing.title}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate">
                        {listing.seller?.full_name || 'Vendor'}
                      </p>
                    </div>
                    
                    <div className="mt-auto pt-2 border-t border-slate-50 flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-emerald-600">{formatPrice(listing.price)}</p>
                      <Link 
                        href={`/listings/${listing.id}`}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all',
                          isSold
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-900 text-white hover:bg-emerald-600 active:scale-95'
                        )}
                        onClick={(e) => isSold && e.preventDefault()}
                      >
                        {isSold ? 'Sold' : 'View'}
                      </Link>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Item count */}
          <div className="flex flex-col items-center gap-3 pt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              End of results • {items.length} of {stats.total} items
            </p>
            <div className="h-1 w-12 bg-slate-100 rounded-full" />
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {bulkMode && selectedItems.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg border border-border px-6 py-3 flex items-center gap-4 z-40">
          <span className="text-sm font-medium text-text-primary">
            {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
          </span>
          <Button variant="destructive" size="sm" onClick={handleBulkRemove}>
            Remove Selected
          </Button>
        </div>
      )}
    </div>
  )
}
