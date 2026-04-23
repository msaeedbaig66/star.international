'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { formatPrice, formatDate, formatRelativeTime, formatNumber } from '@/lib/utils'
import { SafePrice, SafeTime } from '@/components/shared/safe-time'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { SlotRequestModal } from '../slot-request-modal'

interface OverviewTabProps {
  profile: any
}

interface StatCard {
  label: string
  value: number | string
  icon: string
  iconBg: string
  iconColor: string
  hasPulse?: boolean
}

export function OverviewTab({ profile }: OverviewTabProps) {
  const router = useRouter()
  const [stats, setStats] = useState({
    activeListings: 0,
    publishedBlogs: 0,
    ownedCommunities: 0,
    followers: 0,
    unreadMessages: 0,
    totalViews: 0,
    totalLikes: 0,
  })
  const [recentListings, setRecentListings] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadData = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)

    const [listingsCount, blogsCount, communitiesCount, listings, followersCount] = await Promise.all([
      supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', profile.id)
        .neq('status', 'removed'),
      supabase
        .from('blogs')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', profile.id),
      supabase
        .from('communities')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', profile.id),
      supabase
        .from('listings')
        .select('id, title, price, moderation, created_at, images, status')
        .eq('seller_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(4),
      supabase
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('following_id', profile.id),
    ])

    let analytics = { summary: { blog_views: 0, blog_likes: 0, listing_views: 0 } }
    try {
        const anaRes = await fetch('/api/dashboard/analytics')
        if (anaRes.ok) {
            const anaJson = await anaRes.json()
            if (anaJson?.data?.summary) {
                analytics = anaJson.data
            }
        }
    } catch (e) {}

    let activityRows: any[] = []
    try {
      const activityRes = await fetch('/api/dashboard/recent-activity')
      if (activityRes.ok) {
        const activityJson = await activityRes.json().catch(() => ({}))
        activityRows = activityJson?.data || []
      }
    } catch {
      activityRows = []
    }

    setStats({
      activeListings: listingsCount.count || 0,
      publishedBlogs: blogsCount.count || 0,
      ownedCommunities: communitiesCount.count || 0,
      followers: followersCount.count || 0,
      unreadMessages: 0,
      totalViews: (analytics.summary.blog_views || 0) + (analytics.summary.listing_views || 0),
      totalLikes: analytics.summary.blog_likes || 0,
    })

    setRecentListings(listings.data || [])
    setRecentActivity(activityRows)
    setLoading(false)
  }, [profile.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const firstName = profile.full_name?.split(' ')[0] || 'there'
  const [greeting, setGreeting] = useState('Welcome')

  useEffect(() => {
    const hour = new Date().getHours()
    setGreeting(hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening')
  }, [])

  const statCards: StatCard[] = [
    {
      label: 'Engagement Signal',
      value: stats.totalViews,
      icon: 'monitoring',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      label: 'Academic Impact',
      value: stats.totalLikes,
      icon: 'favorite',
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-500',
    },
    {
      label: 'Active Hubs',
      value: stats.ownedCommunities,
      icon: 'groups_3',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
    },
    {
      label: 'Messages',
      value: stats.unreadMessages,
      icon: 'mail',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      hasPulse: stats.unreadMessages > 0,
    },
  ]

  const getStatusBadge = (moderation: string, status: string) => {
    if (status === 'sold') return <Badge variant="default">Sold</Badge>
    if (moderation === 'approved') return <Badge variant="primary">Active</Badge>
    if (moderation === 'pending') return <Badge variant="warning">Pending</Badge>
    if (moderation === 'rejected') return <Badge variant="destructive">Rejected</Badge>
    return <Badge variant="default">{moderation}</Badge>
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'listing_approved':
        return { icon: 'check_circle', bg: 'bg-success-light', color: 'text-success' }
      case 'listing_rejected':
        return { icon: 'cancel', bg: 'bg-destructive-light', color: 'text-destructive' }
      case 'like':
        return { icon: 'favorite', bg: 'bg-destructive-light', color: 'text-destructive' }
      case 'comment':
        return { icon: 'chat_bubble', bg: 'bg-primary-light', color: 'text-primary' }
      case 'follow':
        return { icon: 'person_add', bg: 'bg-secondary-light', color: 'text-secondary' }
      case 'blog_update':
        return { icon: 'article', bg: 'bg-primary-light', color: 'text-primary' }
      case 'community_update':
        return { icon: 'forum', bg: 'bg-accent-light', color: 'text-accent' }
      case 'listing_comment':
        return { icon: 'chat', bg: 'bg-primary-light', color: 'text-primary' }
      case 'blog_comment':
        return { icon: 'comment', bg: 'bg-secondary-light', color: 'text-secondary' }
      case 'community_comment':
        return { icon: 'forum', bg: 'bg-accent-light', color: 'text-accent' }
      case 'message':
        return { icon: 'mail', bg: 'bg-primary-light', color: 'text-primary' }
      default:
        return { icon: 'notifications', bg: 'bg-accent-light', color: 'text-accent' }
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-64 bg-surface-2 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 h-24 border border-border" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">Active Workspace</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{greeting}, {firstName}</h1>
          <p className="text-slate-500 mt-1 text-base">Here is your academic and marketplace performance for today.</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/dashboard?tab=analytics')}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all active:scale-[0.98] group shadow-xl shadow-slate-900/10"
            >
              <span className="material-symbols-outlined text-[18px] group-hover:rotate-12 transition-transform">monitoring</span>
              <span className="text-xs font-black uppercase tracking-widest">Intelligent Insights</span>
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all active:scale-[0.98] group"
            >
              <span className="material-symbols-outlined text-slate-400 group-hover:rotate-12 transition-transform">database</span>
              <span className="text-xs font-black uppercase tracking-widest text-slate-600">Manage Slots</span>
            </button>
        </div>
      </header>

      {/* Resource Quota Row */}
      <div className="bg-white rounded-[32px] border border-border p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
                <h3 className="text-lg font-black text-text-primary tracking-tight">Resource Quotas</h3>
                <p className="text-xs text-text-secondary font-medium">Monitoring your platform growth and usage limits.</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                Standard Plan
            </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            <QuotaTracker 
              label="Listing Slots" 
              used={stats.activeListings} 
              limit={profile.listing_slot_limit || 5} 
              icon="inventory_2"
            />
            <QuotaTracker 
              label="Blog Slots" 
              used={stats.publishedBlogs} 
              limit={profile.blog_slot_limit || 5} 
              icon="article"
            />
            <QuotaTracker 
              label="Community Slots" 
              used={stats.ownedCommunities} 
              limit={profile.community_slot_limit || 2} 
              icon="groups_3"
            />
            <QuotaTracker 
              label="Images Per Blog" 
              used={profile.blog_image_limit || 5} 
              limit={profile.blog_image_limit || 5} 
              isCapOnly 
              icon="photo_library"
            />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="relative group bg-white border border-slate-100 p-4 md:p-6 rounded-[24px] md:rounded-[32px] hover:border-primary/20 transition-all hover:shadow-[0_20px_40px_rgba(0,0,0,0.03)] active:scale-[0.98]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div
                className={cn(
                  'w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-500',
                  stat.iconBg
                )}
              >
                <span className={cn('material-symbols-outlined text-[20px] sm:text-[24px]', stat.iconColor)}>
                  {stat.icon}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5 truncate">
                  {stat.label}
                </p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none">{formatNumber(Number(stat.value))}</p>
              </div>
            </div>
            {stat.hasPulse && (
              <span className="absolute top-4 right-4 h-2 w-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            )}
          </div>
        ))}
      </div>

      {/* Two Column: Recent Listings + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Listings Table */}
        <Card padding="lg" className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-text-primary">Recent Listings</h2>
            <button
              onClick={() => router.push('/dashboard?tab=listings')}
              className="text-primary text-sm font-semibold hover:underline"
            >
              View All
            </button>
          </div>
          {recentListings.length === 0 ? (
            <p className="text-text-muted text-sm py-8 text-center">
              No listings yet. Start selling!
            </p>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="text-[10px] uppercase tracking-widest text-text-muted">
                    <tr>
                      <th className="pb-4 font-bold">Item</th>
                      <th className="pb-4 font-bold">Status</th>
                      <th className="pb-4 font-bold text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {recentListings.map((listing) => (
                      <tr
                        key={listing.id}
                        className="border-b border-border last:border-b-0 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-surface flex-shrink-0 overflow-hidden border border-border">
                              {listing.images?.[0] ? (
                                <Image
                                  src={listing.images[0]}
                                  alt={listing.title}
                                  className="w-full h-full object-cover"
                                  width={48}
                                  height={48}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-text-muted">
                                  <span className="material-symbols-outlined text-xl">image</span>
                                </div>
                              )}
                            </div>
                            <span className="font-bold text-slate-900 truncate max-w-[240px]">
                              {listing.title}
                            </span>
                          </div>
                        </td>
                        <td className="py-4">
                          {getStatusBadge(listing.moderation, listing.status)}
                        </td>
                        <td className="py-4 text-right font-black text-slate-900">
                          <SafePrice price={listing.price} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Grid - 2x2 */}
              <div className="sm:hidden grid grid-cols-2 gap-4">
                {recentListings.map((listing) => (
                  <div 
                    key={listing.id} 
                    onClick={() => router.push(`/listings/${listing.id}`)}
                    className="flex flex-col rounded-3xl bg-slate-50/50 border border-slate-100 overflow-hidden active:bg-slate-100 transition-all group"
                  >
                    <div className="aspect-square relative bg-white overflow-hidden">
                      {listing.images?.[0] ? (
                        <Image 
                          src={listing.images[0]} 
                          alt={listing.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                          width={150} 
                          height={150} 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <span className="material-symbols-outlined text-2xl">image</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 scale-75 origin-top-right">
                        {getStatusBadge(listing.moderation, listing.status)}
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="font-black text-[10px] text-slate-900 truncate uppercase mb-1 tracking-tight">{listing.title}</p>
                      <p className="text-xs font-black text-emerald-600">
                        <SafePrice price={listing.price} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <Card padding="lg" className="flex flex-col lg:max-h-[520px]">
          <h2 className="text-xl font-bold text-text-primary mb-6">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-text-muted text-sm py-8 text-center flex-1 flex items-center justify-center">
              No activity yet.
            </p>
          ) : (
            <div className="space-y-6 overflow-y-auto pr-1 min-h-0">
              {recentActivity.map((notif) => {
                const { icon, bg, color } = getActivityIcon(notif.type)
                const isClickable = typeof notif.href === 'string' && notif.href.length > 0
                return (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => isClickable && router.push(notif.href)}
                    className={cn(
                      'w-full flex items-start gap-3 rounded-xl text-left transition-all',
                      isClickable ? 'hover:bg-surface px-2 py-2 -mx-2 -my-2 cursor-pointer' : ''
                    )}
                  >
                    <Avatar
                      src={notif.actor?.avatar_url}
                      fallback={notif.actor?.full_name || notif.actor?.username || 'U'}
                      size="sm"
                    />
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1',
                        bg
                      )}
                    >
                      <span className={cn('material-symbols-outlined text-lg', color)}>
                        {icon}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-text-primary leading-tight">
                        {notif.title || notif.type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </p>
                      {notif.context_title && (
                        <p className="text-[11px] text-primary mt-0.5 truncate font-semibold">
                          {notif.context_title}
                        </p>
                      )}
                      {notif.message && (
                        <p className="text-xs text-text-secondary mt-0.5 truncate">
                          {notif.message}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <SafeTime date={notif.created_at} className="text-[10px] text-text-muted block" />
                        {notif.moderation && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                            {notif.moderation}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <SlotRequestModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        currentLimits={{
          listing: profile.listing_slot_limit || 5,
          community: profile.community_slot_limit || 2,
          blog: profile.blog_slot_limit || 5,
          blog_image: profile.blog_image_limit || 5
        }}
      />
    </div>
  )
}

function QuotaTracker({ label, used, limit, icon, isCapOnly }: { label: string; used: number; limit: number; icon: string; isCapOnly?: boolean }) {
    const percentage = Math.min((used / limit) * 100, 100)
    
    return (
        <div className="space-y-4 p-4 rounded-3xl bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200/40 dark:border-zinc-800/40 group hover:border-primary/50 transition-all duration-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                        <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-primary transition-colors">{label}</span>
                        {!isCapOnly ? (
                            <span className="text-xs font-black text-slate-900 dark:text-zinc-100">{used} <span className="text-slate-400 font-medium">/ {limit}</span></span>
                        ) : (
                            <span className="text-xs font-black text-slate-900 dark:text-zinc-100">Max: {limit}</span>
                        )}
                    </div>
                </div>
            </div>
            
            {!isCapOnly ? (
                <div className="relative pt-1">
                    <div className="h-2.5 w-full bg-slate-200/50 dark:bg-zinc-800/50 rounded-full overflow-hidden shadow-inner">
                        <div 
                            className={cn(
                                "h-full transition-all duration-1000 ease-out relative overflow-hidden",
                                percentage > 90 ? "bg-red-500" : percentage > 70 ? "bg-amber-500" : "bg-emerald-500"
                            )}
                            style={{ width: `${percentage}%` }}
                        >
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-shimmer" />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex gap-1.5 pt-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-2 flex-1 bg-emerald-500/20 rounded-full" />
                    ))}
                    <div className="h-2 flex-1 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                </div>
            )}
        </div>
    )
}

