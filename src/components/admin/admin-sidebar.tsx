'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PendingBadge } from './pending-badge';

interface SidebarProps {
  counts?: {
    listings: number;
    blogs: number;
    nexusHub: number;
    comments?: number;
    reports?: number;
    support?: number;
    slotRequests?: number;
    featureRequests?: number;
    orders?: number;
  };
  isCollapsed?: boolean;
}

export function AdminSidebar({ counts, isCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const isSupportActive = pathname === '/admin/support'

  const navLinks = [
    { label: 'Overview', href: '/admin', icon: 'dashboard' },
    { label: 'Web Analytics', href: '/admin/analytics', icon: 'query_stats' },
    { label: 'Listings Queue', href: '/admin/listings', icon: 'inventory_2', badge: counts?.listings },
    { label: 'Blogs Queue', href: '/admin/blogs', icon: 'article', badge: counts?.blogs },
    { label: 'Nexus Hub Queue', href: '/admin/communities', icon: 'groups', badge: counts?.nexusHub },
    { label: 'Comments Queue', href: '/admin/comments', icon: 'comment', badge: counts?.comments },
    { label: 'Hero Banners', href: '/admin/hero', icon: 'gallery_thumbnail' },
    { label: 'Advertisements', href: '/admin/advertisements', icon: 'campaign' },
    { label: 'Academic Structure', href: '/admin/academic-structure', icon: 'account_tree' },
    { label: 'Users', href: '/admin/users', icon: 'manage_accounts' },
    { label: 'Chats Monitor', href: '/admin/chats', icon: 'forum' },
    { label: 'Reports', href: '/admin/reports', icon: 'flag', badge: counts?.reports },
    { label: 'Slot Requests', href: '/admin/slot-requests', icon: 'extension', badge: counts?.slotRequests },
    { label: 'Feature Requests', href: '/admin/feature-requests', icon: 'workspace_premium', badge: counts?.featureRequests },
    { label: 'Support Inbox', href: '/admin/support-requests', icon: 'support_agent', badge: counts?.support },
    { label: 'Broadcasts', href: '/admin/broadcasts', icon: 'campaign' },
    { label: 'Marketplace Orders', href: '/admin/orders', icon: 'shopping_bag', badge: counts?.orders },
  ];

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Admin sign-out failed:', error);
    } finally {
      router.replace('/login');
      router.refresh();
      setSigningOut(false);
    }
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen z-40 bg-white border-r border-border flex flex-col py-8 transition-all duration-300 ease-in-out font-medium text-sm overflow-hidden",
      isCollapsed ? "w-[80px] px-2" : "w-[260px] px-4"
    )}>
      <div className={cn("px-4 mb-10 overflow-hidden whitespace-nowrap", isCollapsed && "px-2 text-center")}>
        <div className={cn("flex items-center gap-2", isCollapsed && "justify-center")}>
          <Image src="/brand/logo-mark.png" alt="Allpanga" width={36} height={36} className="w-9 h-9 shrink-0" />
          {!isCollapsed && <h1 className="text-xl font-bold text-primary tracking-tighter transition-all opacity-100">Allpanga Admin</h1>}
        </div>
        {!isCollapsed && <p className="text-[10px] uppercase tracking-widest text-text-secondary mt-1 font-bold opacity-100">Admin Console</p>}
      </div>

      <nav className="flex-1 space-y-1.5 scrollbar-hide overflow-y-auto px-2">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              title={isCollapsed ? link.label : undefined}
              className={cn(
                "flex items-center gap-3 px-4 py-3 relative transition-all active:scale-[0.98] rounded-lg group",
                isActive 
                  ? "bg-slate-100/80 text-primary font-bold" 
                  : "text-text-secondary hover:text-primary hover:bg-surface",
                isCollapsed && "justify-center px-0 h-12 w-12 mx-auto"
              )}
            >
              <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: isActive ? "'FILL' 1" : undefined }}>
                {link.icon}
              </span>
              {!isCollapsed && <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{link.label}</span>}
              
              {link.badge !== undefined && link.badge > 0 && (
                <div className={cn(
                  isCollapsed ? "absolute -top-1 -right-1 scale-75" : "relative"
                )}>
                  <PendingBadge count={link.badge} />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={cn("mt-auto space-y-1.5 pt-6 border-t border-border", isCollapsed && "px-0")}>
        <Link 
          href="/admin/support"
          title={isCollapsed ? "Support" : undefined}
          className={cn(
            "flex items-center gap-3 px-4 py-3 transition-all rounded-lg",
            isSupportActive
              ? "bg-slate-100/80 text-primary font-bold"
              : "text-text-secondary hover:text-primary hover:bg-surface",
            isCollapsed && "justify-center px-0 h-12 w-12 mx-auto"
          )}
        >
          <span className="material-symbols-outlined">help_outline</span>
          {!isCollapsed && <span>Support</span>}
        </Link>
        <button 
          onClick={handleSignOut}
          disabled={signingOut}
          title={isCollapsed ? "Sign Out" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 text-destructive hover:bg-destructive/5 transition-all rounded-lg disabled:opacity-60 disabled:cursor-not-allowed",
            isCollapsed && "justify-center px-0 h-12 w-12 mx-auto"
          )}
        >
          <span className="material-symbols-outlined font-light">logout</span>
          {!isCollapsed && <span>{signingOut ? 'Signing Out...' : 'Sign Out'}</span>}
        </button>
      </div>
    </aside>
  );
}
