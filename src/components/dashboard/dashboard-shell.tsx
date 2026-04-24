'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from './sidebar'
import { OverviewTab } from './tabs/overview-tab'
import { MyListingsTab } from './tabs/my-listings-tab'
import { SellItemTab } from './tabs/sell-item-tab'
import { MyBlogsTab } from './tabs/my-blogs-tab'
import { BlogStudioTab } from './tabs/blog-studio-tab'
import { MyCommunitiesTab } from './tabs/my-communities-tab'
import { MessagesTab } from './tabs/messages-tab'
import { NotificationsTab } from './tabs/notifications-tab'
import { WishlistTab } from './tabs/wishlist-tab'
import { ProfileSettingsTab } from './tabs/profile-settings-tab'
import { AnalyticsTab } from './tabs/analytics-tab'
import { DeleteAccountTab } from './tabs/delete-account-tab'
import { TrackingTab } from './tabs/tracking-tab'

const navItems = [
  { icon: 'dashboard', label: 'Overview', tab: 'overview' },
  { icon: 'monitoring', label: 'Performance Metrics', tab: 'analytics' },
  { icon: 'package_2', label: 'My Orders', tab: 'tracking' },
  { icon: 'format_list_bulleted', label: 'My Listings', tab: 'listings' },
  { icon: 'add_circle', label: 'Sell Item', tab: 'sell' },
  { icon: 'article', label: 'My Blogs', tab: 'blogs' },
  { icon: 'edit_note', label: 'Blog Studio', tab: 'blog-studio' },
  { icon: 'groups', label: 'Nexus Hub', tab: 'communities' },
  { icon: 'chat_bubble', label: 'Messages', tab: 'messages', hasBadge: true },
  { icon: 'notifications', label: 'Notifications', tab: 'notifications' },
  { icon: 'favorite', label: 'Wishlist', tab: 'wishlist' },
  { icon: 'manage_accounts', label: 'Profile Settings', tab: 'profile' },
  { icon: 'delete', label: 'Delete Account', tab: 'delete' },
]

interface DashboardShellProps {
  profile: any
  activeTab: string
  editId?: string | null
  threadId?: string | null
}

export function DashboardShell({ profile, activeTab, editId, threadId }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkRes = () => setIsDesktop(window.innerWidth >= 1024)
    checkRes()
    window.addEventListener('resize', checkRes)
    return () => window.removeEventListener('resize', checkRes)
  }, [])

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab profile={profile} />
      case 'analytics': return <AnalyticsTab profile={profile} />
      case 'listings': return <MyListingsTab profile={profile} />
      case 'tracking': return <TrackingTab profile={profile} />
      case 'sell': return <SellItemTab profile={profile} editId={editId} />
      case 'blogs': return <MyBlogsTab profile={profile} />
      case 'blog-studio': return <BlogStudioTab profile={profile} editId={editId} />
      case 'communities': return <MyCommunitiesTab profile={profile} />
      case 'messages': return <MessagesTab profile={profile} initialThreadId={threadId} onOpenSidebar={() => setMobileOpen(true)} />
      case 'notifications': return <NotificationsTab profile={profile} />
      case 'wishlist': return <WishlistTab profile={profile} />
      case 'profile': return <ProfileSettingsTab profile={profile} />
      case 'delete': return <DeleteAccountTab profile={profile} />
      default: return <OverviewTab profile={profile} />
    }
  }

  const isMessagesTab = activeTab === 'messages'

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[60] lg:hidden animate-in fade-in duration-500"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Wrapper */}
      <div
        className={cn(
          'fixed lg:relative z-[70] lg:z-0 h-full transition-all duration-500 ease-in-out overflow-hidden',
          mobileOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full lg:translate-x-0',
          isSidebarCollapsed ? 'lg:w-0' : 'lg:w-[22%] lg:min-w-[280px] lg:max-w-[340px] flex-shrink-0'
        )}
      >
        <Sidebar
          profile={profile}
          activeTab={activeTab}
          onMobileClose={() => setMobileOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        {/* Dashboard Header - Always Visible Section */}
        <header className="flex items-center h-16 md:h-20 shrink-0 border-b border-slate-200/50 bg-white/70 backdrop-blur-xl px-4 sm:px-8 transition-all relative z-40">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => isDesktop ? setIsSidebarCollapsed(!isSidebarCollapsed) : setMobileOpen(true)}
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 border-2",
                  isSidebarCollapsed 
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                    : "bg-surface text-text-primary border-border hover:border-primary active:bg-primary/10"
                )}
              >
                <span className="material-symbols-outlined text-[20px] font-black">
                  {isSidebarCollapsed ? 'menu_open' : 'menu'}
                </span>
              </button>
              
              <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
              
              <h2 className="text-sm md:text-xl font-black text-text-primary tracking-tighter uppercase sm:block">
                {navItems.find(i => i.tab === activeTab)?.label || 'Dashboard'}
              </h2>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-full px-3 py-1.5 hidden md:flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Workspace Active</span>
              </div>
              
              <Link 
                href="/" 
                className="flex items-center gap-2 bg-[#0a0f18] text-white px-4 md:px-6 py-2.5 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all active:scale-95 group"
              >
                <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
                <span className="hidden sm:inline">Portal Home</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Dynamic Tab Content */}
        <main className={cn(
          'flex-1 overflow-x-hidden overflow-y-auto relative custom-scrollbar',
          activeTab === 'messages' && 'overflow-y-hidden'
        )}>
          <div className={cn(
            "w-full",
            activeTab === 'messages' ? 'h-full' : 'p-4 sm:p-8 lg:p-12 pb-12 min-h-full',
            !isMessagesTab && "max-w-7xl mx-auto"
          )}>
            {renderTab()}
          </div>
        </main>
      </div>
    </div>
  )
}
