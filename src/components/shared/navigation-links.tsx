'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ROUTES } from '@/lib/routes'

/**
 * Resolves a notification object to its clickable destination URL.
 */
function resolveNotificationLink(notification: any): string {
  const { type, listing_id, blog_id, post_id, actor, is_anonymous } = notification;
  switch (type) {
    case 'like':
    case 'comment':
      if (blog_id) return ROUTES.blog.detail(blog_id);
      if (listing_id) return ROUTES.marketplace.detail(listing_id);
      return ROUTES.home();
    case 'follow':
      if (is_anonymous) return '#';
      return actor?.username ? ROUTES.profile.view(actor.username) : ROUTES.home();
    case 'reply':
      return blog_id ? ROUTES.blog.detail(blog_id) : ROUTES.home();
    case 'listing_approved':
    case 'new_listing':
      return listing_id ? ROUTES.marketplace.detail(listing_id) : ROUTES.marketplace.list();
    case 'listing_rejected':
      return ROUTES.dashboard.sell(listing_id || undefined);
    case 'blog_approved':
    case 'blog_update':
    case 'new_blog':
      return blog_id ? ROUTES.blog.detail(blog_id) : ROUTES.blog.list();
    case 'blog_rejected':
      return ROUTES.dashboard.blogStudio(blog_id || undefined);
    case 'community_approved':
    case 'community_update':
      return notification.community_id ? ROUTES.communities.detail(notification.community_id) : ROUTES.communities.list();
    case 'community_rejected':
      return ROUTES.dashboard.tab('communities');
    case 'message':
      return post_id ? ROUTES.dashboard.messages(post_id) : ROUTES.dashboard.messages();
    default:
      return ROUTES.home();
  }
}
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'

/**
 * 1. UserLink - Unified clickable identity (Avatar + Name)
 */
interface UserLinkProps {
  user: {
    username: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showAvatar?: boolean;
  showName?: boolean;
  className?: string;
  avatarOnly?: boolean;
  isAnonymous?: boolean;
  viewerRole?: string;
}

export function UserLink({ 
  user, 
  size = 'md', 
  showAvatar = true, 
  showName = true, 
  className,
  avatarOnly = false,
  isAnonymous = false,
  viewerRole
}: UserLinkProps) {
  const sizeMap = {
    xs: 'w-6 h-6 text-[8px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base'
  };

  const nameSizeMap = {
    xs: 'text-[10px]',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  if (isAnonymous) {
    const isAdminViewer = viewerRole === 'admin'
    
    if (isAdminViewer) {
      return (
        <div className={cn("inline-flex items-center gap-2 h-fit", className)}>
          {showAvatar && (
            <Avatar 
              src={user.avatar_url} 
              fallback={user.full_name || user.username} 
              size={size} 
            />
          )}
          {!avatarOnly && showName && (
            <div className="flex flex-col">
              <span className={cn("font-bold text-text-primary", nameSizeMap[size])}>
                {user.full_name || user.username}
              </span>
              <span className="text-[10px] text-amber-600 font-bold uppercase tracking-widest leading-none mt-0.5">
                Admin Reveal: Anonymous
              </span>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className={cn("inline-flex items-center gap-2 h-fit", className)}>
        {showAvatar && (
          <div className={cn("rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden", sizeMap[size])}>
             <span className="material-symbols-outlined text-[1.25em]">visibility_off</span>
          </div>
        )}
        {!avatarOnly && showName && (
          <span className={cn(
            "font-black text-slate-500 uppercase tracking-widest",
            nameSizeMap[size]
          )}>
            Anonymous Student
          </span>
        )}
      </div>
    );
  }

  const href = ROUTES.profile.view(user.username);

  return (
    <Link 
      href={href} 
      className={cn("inline-flex items-center gap-2 group transition-all h-fit", className)}
      aria-label={`View ${user.username}'s profile`}
    >
      {showAvatar && (
        <Avatar 
          src={user.avatar_url} 
          fallback={user.full_name || user.username} 
          size={size} 
          className="group-hover:scale-105 transition-transform" 
        />
      )}
      {!avatarOnly && showName && (
        <span className={cn(
          "font-bold text-text-primary group-hover:text-primary transition-colors tracking-tight",
          nameSizeMap[size]
        )}>
          {user.full_name || user.username}
        </span>
      )}
    </Link>
  );
}

/**
 * 2. ContentCardLink - Wraps cards with correct navigation
 */
interface ContentCardLinkProps {
  type: 'blog' | 'listing' | 'community';
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function ContentCardLink({ type, id, children, className }: ContentCardLinkProps) {
  const getHref = () => {
    switch (type) {
      case 'blog': return ROUTES.blog.detail(id);
      case 'listing': return ROUTES.marketplace.detail(id);
      case 'community': return ROUTES.communities.detail(id);
    }
  };

  return (
    <Link href={getHref()} className={cn("block w-full h-full focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-inherit", className)}>
      {children}
    </Link>
  );
}

/**
 * 3. TagLink - Clickable badges for feeds
 */
interface TagLinkProps {
  tag: string;
  context: 'blog' | 'marketplace' | 'community';
  className?: string;
}

export function TagLink({ tag, context, className }: TagLinkProps) {
  const getHref = () => {
    switch (context) {
      case 'blog': return ROUTES.blog.tag(tag);
      case 'marketplace': return ROUTES.marketplace.list(tag);
      default: return ROUTES.home();
    }
  };

  return (
    <Link 
      href={getHref()} 
      className={cn(
        "px-3 py-1 bg-surface border border-border rounded-full text-[10px] font-black uppercase tracking-widest text-text-secondary hover:border-primary hover:text-primary transition-all",
        className
      )}
    >
      #{tag}
    </Link>
  );
}

/**
 * 4. NotificationLink - Smart notification nav with read logic
 */
interface NotificationLinkProps {
  notification: any;
  children: React.ReactNode;
  onRead?: (id: string) => void;
  className?: string;
}

export function NotificationLink({ notification, children, onRead, className }: NotificationLinkProps) {
  const href = resolveNotificationLink(notification);
  
  const handleClick = () => {
    if (!notification.is_read && onRead) {
      onRead(notification.id);
    }
  };

  return (
    <Link 
      href={href} 
      onClick={handleClick}
      className={cn("block w-full", className)}
    >
      {children}
    </Link>
  );
}

/**
 * 5. CategoryBreadcrumb - Unified Back + Breadcrumb nav
 */
interface Crumb {
  label: string;
  href: string;
}

interface CategoryBreadcrumbProps {
  crumbs: Crumb[];
  className?: string;
}

export function CategoryBreadcrumb({ crumbs, className }: CategoryBreadcrumbProps) {
  return (
    <nav className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted mb-6", className)}>
      <Link href={ROUTES.home()} className="hover:text-primary transition-colors">Home</Link>
      {crumbs.map((crumb, idx) => (
        <React.Fragment key={idx}>
          <span className="material-symbols-outlined text-[12px] opacity-30">chevron_right</span>
          {idx === crumbs.length - 1 ? (
             <span className="text-text-primary">{crumb.label}</span>
          ) : (
             <Link href={crumb.href} className="hover:text-primary transition-colors">{crumb.label}</Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
