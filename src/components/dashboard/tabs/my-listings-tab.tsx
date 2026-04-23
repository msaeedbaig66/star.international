'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { formatPrice, formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { parseSoftDeleteNote, isSoftDeleteRecoverable } from '@/lib/content-soft-delete'
import { HydratedOnly } from '@/components/shared/safe-time'

interface MyListingsTabProps {
  profile: any
}

type FilterType = 'all' | 'active' | 'pending' | 'rejected' | 'sold' | 'deleted'

function isFeatureActive(featuredUntil?: string | null) {
  if (!featuredUntil) return false
  const time = Date.parse(featuredUntil)
  return Number.isFinite(time) && time > Date.now()
}

export function MyListingsTab({ profile }: MyListingsTabProps) {
  const router = useRouter()
  const [listings, setListings] = useState<any[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(true)
  const [expandedRejections, setExpandedRejections] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, sold: 0 })
  const [pendingFeatureByEntity, setPendingFeatureByEntity] = useState<Record<string, any>>({})
  const [showFeatureModal, setShowFeatureModal] = useState(false)
  const [featureTarget, setFeatureTarget] = useState<any | null>(null)
  const [requestedFeatureDays, setRequestedFeatureDays] = useState(7)
  const [featureReason, setFeatureReason] = useState('')
  const [featureSubmitting, setFeatureSubmitting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 5

  const loadListings = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)

    try {
      let query = supabase
        .from('listings')
        .select('id, title, images, category, price, status, moderation, rejection_note, is_featured, featured_until, created_at')
        .eq('seller_id', profile.id)
        .order('created_at', { ascending: false })

      if (filter === 'active') query = query.eq('moderation', 'approved').eq('status', 'available')
      if (filter === 'pending') query = query.eq('moderation', 'pending')
      if (filter === 'rejected') query = query.eq('moderation', 'rejected')
      if (filter === 'sold') query = query.eq('status', 'sold')
      if (filter === 'deleted') query = query.eq('status', 'removed')

      const { data, error } = await query
      if (error) throw error
      setListings(data || [])

      // Load stats
      const [totalRes, activeRes, pendingRes, soldRes, featureReqResponse] = await Promise.all([
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', profile.id),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', profile.id).eq('moderation', 'approved').eq('status', 'available'),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', profile.id).eq('moderation', 'pending'),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', profile.id).eq('status', 'sold'),
        fetch('/api/feature-requests?entity_type=listing&status=pending')
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
      ])

      const nextPendingFeatureByEntity: Record<string, any> = {}
      for (const row of featureReqResponse?.data || []) {
        if (row?.entity_id) nextPendingFeatureByEntity[row.entity_id] = row
      }
      setPendingFeatureByEntity(nextPendingFeatureByEntity)

      setStats({
        total: totalRes.count || 0,
        active: activeRes.count || 0,
        pending: pendingRes.count || 0,
        sold: soldRes.count || 0,
      })
    } catch (error) {
      console.error('Failed to load listings tab data:', error)
      setListings([])
      setStats({ total: 0, active: 0, pending: 0, sold: 0 })
      toast.error('Unable to load listings right now.')
    } finally {
      setLoading(false)
    }
  }, [filter, profile.id])

  useEffect(() => {
    loadListings()
    setCurrentPage(1) // Reset to page 1 on filter change
  }, [loadListings])

  const totalPages = Math.ceil(listings.length / ITEMS_PER_PAGE)
  const paginatedListings = listings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/listings/${id}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.error || 'Failed to delete listing')
      toast.success('Listing deleted. You can undo within 2 days.')
      setDeleteConfirm(null)
      await loadListings()
    } catch (error: any) {
      toast.error(error?.message || 'Unable to delete listing')
    }
  }

  const handleRecover = async (id: string) => {
    try {
      const response = await fetch(`/api/listings/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recover' }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.error || 'Failed to recover listing')
      toast.success('Listing recovered successfully')
      await loadListings()
    } catch (error: any) {
      toast.error(error?.message || 'Unable to recover listing')
    }
  }

  const handleMarkSold = async (id: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('listings')
        .update({ status: 'sold' })
        .eq('id', id)
        .eq('seller_id', profile.id)
      if (error) throw error
      await loadListings()
    } catch (error: any) {
      toast.error(error?.message || 'Unable to mark listing as sold')
    }
  }

  const handleMarkAvailable = async (id: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('listings')
        .update({ status: 'available' })
        .eq('id', id)
        .eq('seller_id', profile.id)
      if (error) throw error
      await loadListings()
    } catch (error: any) {
      toast.error(error?.message || 'Unable to re-list item')
    }
  }

  const toggleRejection = (id: string) => {
    setExpandedRejections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openFeatureModal = (listing: any) => {
    setFeatureTarget(listing)
    setRequestedFeatureDays(7)
    setFeatureReason('')
    setShowFeatureModal(true)
  }

  const submitFeatureRequest = async () => {
    if (!featureTarget?.id) return
    if (!Number.isInteger(requestedFeatureDays) || requestedFeatureDays < 1 || requestedFeatureDays > 60) {
      toast.error('Feature days must be between 1 and 60.')
      return
    }
    if (featureReason.trim().length < 10) {
      toast.error('Please add a reason with at least 10 characters.')
      return
    }

    try {
      setFeatureSubmitting(true)
      const response = await fetch('/api/feature-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: 'listing',
          entity_id: featureTarget.id,
          requested_days: requestedFeatureDays,
          reason: featureReason.trim(),
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.error || 'Failed to send feature request')

      toast.success('Feature request sent to admin.')
      setShowFeatureModal(false)
      await loadListings()
    } catch (error: any) {
      toast.error(error?.message || 'Unable to send feature request')
    } finally {
      setFeatureSubmitting(false)
    }
  }

  const getStatusBadge = (listing: any) => {
    const softDeleteMeta = parseSoftDeleteNote(listing.rejection_note)

    if (listing.status === 'removed' && softDeleteMeta)
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-destructive-light text-destructive">
          <span className="w-1.5 h-1.5 rounded-full bg-destructive mr-2" />
          Deleted
        </span>
      )

    if (listing.status === 'sold')
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-surface text-text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-text-muted mr-2" />
          Sold
        </span>
      )
    if (listing.moderation === 'approved')
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-primary-light text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
          Active
        </span>
      )
    if (listing.moderation === 'pending')
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-warning-light text-warning">
          <span className="w-1.5 h-1.5 rounded-full bg-warning mr-2" />
          Pending Review
        </span>
      )
    if (listing.moderation === 'rejected')
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-destructive-light text-destructive">
          <span className="w-1.5 h-1.5 rounded-full bg-destructive mr-2" />
          Rejected
        </span>
      )
    return null
  }

  const filterTabs: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Pending', value: 'pending' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Sold', value: 'sold' },
    { label: 'Deleted', value: 'deleted' },
  ];

  const statCards = [
    { label: 'Total', value: stats.total, icon: 'inventory_2', borderColor: 'border-primary' },
    { label: 'Active', value: stats.active, icon: 'check_circle', borderColor: 'border-success' },
    { label: 'Pending', value: stats.pending, icon: 'hourglass_empty', borderColor: 'border-warning' },
    { label: 'Sold', value: stats.sold, icon: 'payments', borderColor: 'border-text-muted' }
  ];

  return (
    <Fragment>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">My Listings</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">
            Manage and track your campus marketplace activity.
          </p>
        </div>
        <Button
          onClick={() => router.push('/dashboard?tab=sell')}
          className="w-full sm:w-auto shadow-lg shadow-emerald-500/20 py-6 sm:py-3 rounded-2xl sm:rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[11px]"
        >
          <span className="material-symbols-outlined text-[20px] mr-2">add</span>
          Sell Item
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            className={cn('p-4 sm:p-6 flex flex-col sm:flex-row items-center sm:justify-between border-b-4 bg-white rounded-3xl', stat.borderColor)}
          >
            <div className="text-center sm:text-left mb-3 sm:mb-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                {stat.label}
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">{stat.value}</h3>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
              <span className="material-symbols-outlined">{stat.icon}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters & Listings Table */}
      <Card className="p-4 sm:p-8 rounded-[32px] border-none bg-white shadow-[0_20px_50px_rgba(0,0,0,0.02)]">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-50 pb-4 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={cn(
                'px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
                filter === tab.value
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 sm:h-20 bg-slate-50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="py-20 text-center animate-in fade-in duration-700">
            <span className="material-symbols-outlined text-6xl text-slate-100 mb-4 block">
              inventory_2
            </span>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No listings found</p>
            <p className="text-xs text-slate-300 mt-2">
              {filter === 'all' ? 'Start selling items to your peers!' : `You have no ${filter} listings.`}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
            {/* Mobile Card Grid (2x2) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:hidden">
               {paginatedListings.map((listing) => (
                 <div key={listing.id} className="flex flex-col rounded-3xl bg-slate-50/50 border border-slate-100/50 relative overflow-hidden group">
                    {/* Compact Image Header */}
                    <div className="aspect-square w-full relative overflow-hidden bg-white border-b border-slate-100">
                        {listing.images?.[0] ? (
                            <Image src={listing.images[0]} alt={listing.title} className={cn("w-full h-full object-cover transition-transform duration-500 group-hover:scale-110", listing.status === 'sold' && "grayscale")} width={200} height={200} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-200">
                                <span className="material-symbols-outlined text-4xl">image</span>
                            </div>
                        )}
                        
                        {/* Status Overlay */}
                        <div className="absolute top-2 left-2 z-10 scale-75 origin-top-left">
                           {getStatusBadge(listing)}
                        </div>

                        {listing.status === 'removed' && (
                            <div className="absolute inset-0 bg-rose-500/10 backdrop-blur-[2px] flex items-center justify-center">
                                <span className="material-symbols-outlined text-rose-500 text-3xl">heart_broken</span>
                            </div>
                        )}
                    </div>

                    {/* Content Section */}
                    <div className="p-3 flex flex-col flex-1">
                        <div className="mb-3">
                            <h4 className="font-black text-slate-900 text-[11px] leading-tight line-clamp-2 uppercase tracking-tight mb-1">{listing.title}</h4>
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg uppercase inline-block">
                              {formatPrice(listing.price)}
                            </span>
                        </div>

                        <div className="mt-auto pt-3 border-t border-slate-100/50 flex flex-wrap gap-1.5">
                           {/* Compact Action Buttons */}
                           {listing.status === 'removed' ? (
                               (() => {
                                   const softDeleteMeta = parseSoftDeleteNote(listing.rejection_note)
                                   const canRecover = isSoftDeleteRecoverable(softDeleteMeta)
                                   return softDeleteMeta && (
                                     <button onClick={() => handleRecover(listing.id)} disabled={!canRecover} className="flex-1 py-2 rounded-xl border border-emerald-500/20 bg-white text-[9px] font-black uppercase tracking-widest text-emerald-600 disabled:opacity-30">
                                        {canRecover ? 'Undo' : 'Gone'}
                                     </button>
                                   )
                               })()
                           ) : (
                             <>
                               {listing.status !== 'sold' && listing.moderation === 'approved' && (
                                 <button onClick={() => openFeatureModal(listing)} className="flex-1 py-2 rounded-xl bg-amber-50 border border-amber-200/50 text-[9px] font-black uppercase tracking-widest text-amber-600">
                                    Boost
                                 </button>
                               )}
                               {listing.status !== 'sold' ? (
                                 <div className="flex w-full gap-1.5">
                                   <button onClick={() => router.push(`/dashboard?tab=sell&edit=${listing.id}`)} className="flex-1 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                                     <span className="material-symbols-outlined text-[18px]">edit</span>
                                   </button>
                                   {listing.moderation === 'approved' && (
                                     <button onClick={() => handleMarkSold(listing.id)} className="flex-1 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                                       <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                     </button>
                                   )}
                                 </div>
                               ) : (
                                 <button onClick={() => handleMarkAvailable(listing.id)} className="w-full py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
                                   Re-list
                                 </button>
                               )}
                               {listing.status !== 'sold' && (
                                 <button onClick={() => setDeleteConfirm(listing.id)} className="w-full mt-2 py-2 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100">
                                   <span className="material-symbols-outlined text-[18px] mr-2">delete</span>
                                   <span className="text-[9px] font-black uppercase tracking-widest">Remove</span>
                                 </button>
                               )}
                             </>
                           )}
                        </div>
                    </div>
                 </div>
               ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-text-muted text-[11px] uppercase tracking-widest font-bold">
                    <th className="px-4 pb-2">Item</th>
                    <th className="px-4 pb-2 hidden md:table-cell">Category</th>
                    <th className="px-4 pb-2">Price</th>
                    <th className="px-4 pb-2">Status</th>
                    <th className="px-4 pb-2 hidden md:table-cell">Date</th>
                    <th className="px-4 pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedListings.map((listing) => (
                    <Fragment key={listing.id}>
                      <tr className={cn('group hover:bg-surface transition-colors', listing.moderation === 'rejected' && 'bg-destructive-light/30')}>
                        <td className="px-4 py-4 rounded-l-xl">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-16 h-16 rounded-lg overflow-hidden bg-surface flex-shrink-0', listing.status === 'sold' && 'relative')}>
                              {listing.images?.[0] ? (
                                <Image src={listing.images[0]} alt={listing.title} className={cn('w-full h-full object-cover', listing.status === 'sold' && 'grayscale')} width={64} height={64} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="material-symbols-outlined text-text-muted">image</span>
                                </div>
                              )}
                              {listing.status === 'sold' && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <span className="text-[9px] font-black text-white uppercase tracking-widest">Sold</span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-text-primary text-sm truncate max-w-[200px]">{listing.title}</h4>
                              <p className="text-xs text-text-muted mt-0.5">ID: #{listing.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-text-secondary hidden md:table-cell">{listing.category}</td>
                        <td className="px-4 py-4 font-bold text-primary text-sm">{formatPrice(listing.price)}</td>
                        <td className="px-4 py-4">{getStatusBadge(listing)}</td>
                        <td className="px-4 py-4 text-sm text-text-secondary hidden md:table-cell">{formatDate(listing.created_at)}</td>
                        <td className="px-4 py-4 text-right rounded-r-xl">
                          <div className="flex justify-end gap-1">
                            {listing.status === 'removed' ? (
                              (() => {
                                const softDeleteMeta = parseSoftDeleteNote(listing.rejection_note)
                                const canRecover = isSoftDeleteRecoverable(softDeleteMeta)
                                return softDeleteMeta ? (
                                  <HydratedOnly fallback={<div className="w-20 h-8 bg-surface animate-pulse rounded-lg" />}>
                                    <button onClick={() => handleRecover(listing.id)} disabled={!canRecover} className="px-3 py-1.5 flex items-center justify-center rounded-lg border border-primary/20 text-[10px] font-black uppercase tracking-widest gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-primary" title={canRecover ? 'Undo delete' : 'Recovery window expired'}>
                                      <span className="material-symbols-outlined text-[16px]">history</span>
                                      {canRecover ? 'Recover' : 'Expired'}
                                    </button>
                                  </HydratedOnly>
                                ) : (
                                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Removed</span>
                                )
                              })()
                            ) : listing.moderation === 'rejected' ? (
                              <>
                                <button onClick={() => toggleRejection(listing.id)} className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-text-secondary hover:text-primary transition-all shadow-sm border border-border">
                                  <span className="material-symbols-outlined text-[18px]">{expandedRejections.has(listing.id) ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
                                </button>
                                <button onClick={() => setDeleteConfirm(listing.id)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-destructive-light hover:text-destructive text-text-secondary transition-all">
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </>
                            ) : listing.status !== 'sold' ? (
                              <>
                                {listing.moderation === 'approved' && listing.status !== 'removed' && (
                                  (() => {
                                    const pendingReq = pendingFeatureByEntity[listing.id]
                                    const featuredActive = !!listing.is_featured && isFeatureActive(listing.featured_until)
                                    if (featuredActive) return <HydratedOnly><button disabled className="px-3 py-1.5 rounded-lg border border-success/20 text-[10px] font-black uppercase tracking-widest text-success bg-success-light/40 cursor-not-allowed">Featured</button></HydratedOnly>
                                    return <HydratedOnly><button onClick={() => openFeatureModal(listing)} disabled={!!pendingReq} className={cn('px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-colors', pendingReq ? 'border-border text-text-muted cursor-not-allowed' : 'border-warning/30 text-warning hover:bg-warning-light/40')}>{pendingReq ? 'Requested' : 'Feature'}</button></HydratedOnly>
                                  })()
                                )}
                                <button onClick={() => router.push(`/dashboard?tab=sell&edit=${listing.id}`)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface text-text-secondary transition-all"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                {listing.moderation === 'approved' && listing.status === 'available' && (
                                  <button onClick={() => handleMarkSold(listing.id)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-success-light text-text-secondary hover:text-success transition-all"><span className="material-symbols-outlined text-[18px]">check_circle</span></button>
                                )}
                                <button onClick={() => setDeleteConfirm(listing.id)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-destructive-light hover:text-destructive text-text-secondary transition-all"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                              </>
                            ) : (
                              <button onClick={() => handleMarkAvailable(listing.id)} className="px-3 py-1.5 flex items-center justify-center rounded-lg hover:bg-surface text-primary border border-primary/20 transition-all text-[10px] font-black uppercase tracking-widest gap-2"><span className="material-symbols-outlined text-[16px]">replay</span>Re-list</button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {listing.moderation === 'rejected' && expandedRejections.has(listing.id) && (
                        <tr key={`${listing.id}-rejection`}>
                          <td colSpan={6} className="px-4 pb-4">
                            <div className="bg-white rounded-xl p-4 border border-destructive/10 flex gap-3 items-start ml-16">
                              <span className="material-symbols-outlined text-destructive mt-0.5">info</span>
                              <div>
                                <p className="text-sm font-bold text-text-primary mb-1">Reason for Rejection</p>
                                <p className="text-xs text-text-secondary leading-relaxed">{listing.rejection_note || 'No reason provided.'}</p>
                                <button onClick={() => router.push(`/dashboard?tab=sell&edit=${listing.id}`)} className="mt-2 text-xs font-bold text-primary hover:underline">Edit & Resubmit Listing</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls - Moved outside for cross-viewport accessibility */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-50 pt-6">
                <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest order-2 sm:order-1 text-center sm:text-left">
                  Showing <span className="text-slate-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * ITEMS_PER_PAGE, listings.length)}</span> of <span className="text-slate-900">{listings.length}</span> items
                </p>
                <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="flex-1 sm:flex-none border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl px-4 py-6 sm:py-2 text-[10px] font-black uppercase tracking-widest gap-2"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    Prev
                  </Button>
                  <div className="flex items-center justify-center gap-1.5 px-4 min-w-[100px]">
                     <span className="text-[11px] font-black text-emerald-600">{currentPage}</span>
                     <span className="text-[10px] text-slate-300">/</span>
                     <span className="text-[11px] font-black text-slate-400">{totalPages}</span>
                  </div>
                  <Button
                    variant="outline"
                    className="flex-1 sm:flex-none border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl px-4 py-6 sm:py-2 text-[10px] font-black uppercase tracking-widest gap-2"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Card>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-xl p-6 max-w-sm w-full shadow-lg z-10">
            <h3 className="text-lg font-bold text-text-primary mb-2">Delete Listing?</h3>
            <p className="text-sm text-text-secondary mb-6">
              Listing will be hidden now. You can recover it within 2 days.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} fullWidth>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirm)}
                fullWidth
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={showFeatureModal}
        onClose={() => setShowFeatureModal(false)}
        title="Request Listing Spotlight"
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Selected Listing</p>
            <p className="text-sm font-bold text-text-primary mt-1">{featureTarget?.title || '-'}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Requested featured days</label>
            <input
              type="number"
              min={1}
              max={60}
              value={requestedFeatureDays}
              onChange={(e) => setRequestedFeatureDays(Number(e.target.value || 0))}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Reason for featuring</label>
            <textarea
              rows={4}
              value={featureReason}
              onChange={(e) => setFeatureReason(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none resize-none"
              placeholder="Tell admin why this listing should be promoted."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth onClick={() => setShowFeatureModal(false)}>
              Cancel
            </Button>
            <Button fullWidth loading={featureSubmitting} onClick={submitFeatureRequest}>
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </Fragment>
  );
}
