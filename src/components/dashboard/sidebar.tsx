'use client'

import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { useRouter } from 'next/navigation'

interface SidebarProps {
  profile: {
    full_name: string
    avatar_url: string | null
    is_verified: boolean
  }
  activeTab: string
  unreadCount?: number
  onMobileClose?: () => void
}

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
]

export function Sidebar({ profile, activeTab, unreadCount = 0, onMobileClose }: SidebarProps) {
  const router = useRouter()

  const navigate = (tab: string) => {
    const url = tab === 'overview' ? '/dashboard' : `/dashboard?tab=${tab}`
    router.push(url)
    onMobileClose?.()
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/login')
      router.refresh()
      onMobileClose?.()
    }
  }

  return (
    <aside className="flex flex-col h-full bg-white border-r border-border">
      {/* Mobile close header — only on small screens */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 lg:hidden">
        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Menu</span>
        <button
          onClick={onMobileClose}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* User Identity */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3 mb-5">
          <Avatar
            src={profile.avatar_url}
            fallback={profile.full_name}
            size="md"
          />
          <div className="min-w-0">
            <h3 className="font-bold text-text-primary text-sm truncate">
              {profile.full_name}
            </h3>
            {profile.is_verified && (
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                Verified Student
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate('sell')}
          className={cn(
            'w-full bg-gradient-to-br from-primary to-primary-hover text-white',
            'py-3 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20',
            'flex items-center justify-center gap-2',
            'hover:opacity-90 active:scale-[0.98] transition-all'
          )}
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Create New Listing</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.tab
          return (
            <button
              key={item.tab}
              onClick={() => navigate(item.tab)}
              className={cn(
                'relative flex items-center w-full px-5 py-3.5 gap-3 text-left transition-all duration-150',
                isActive
                  ? 'bg-gradient-to-r from-primary/10 to-transparent text-primary font-semibold before:absolute before:left-0 before:w-[3px] before:h-7 before:bg-primary before:rounded-r-full'
                  : 'text-text-secondary hover:bg-slate-50 hover:text-text-primary'
              )}
            >
              <span
                className={cn(
                  'material-symbols-outlined text-[20px]',
                  isActive && 'font-variation-fill'
                )}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="text-sm">{item.label}</span>
              {item.hasBadge && unreadCount > 0 && (
                <span className="ml-auto bg-primary text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer: Account Actions */}
      <div className="px-5 py-4 border-t border-border space-y-1">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 text-text-secondary hover:text-text-primary hover:bg-slate-50 transition-colors w-full px-2 py-2.5 rounded-lg"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="text-sm font-medium">Logout</span>
        </button>
        <button
          onClick={() => navigate('delete')}
          className="flex items-center gap-3 text-destructive hover:text-destructive/80 hover:bg-red-50 transition-colors w-full px-2 py-2.5 rounded-lg"
        >
          <span className="material-symbols-outlined text-[20px]">delete_forever</span>
          <span className="text-sm font-medium">Delete Account</span>
        </button>
      </div>
    </aside>
  )
}
