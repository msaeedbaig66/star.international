/**
 * Centralized Route Map for Allpanga
 * Every clickable surface in the application MUST use this helper.
 */

export const ROUTES = {
  home: () => '/',
  
  blog: {
    list: () => '/blogs',
    detail: (id: string) => `/blogs/${id}`,
    category: (cat: string) => `/blogs?category=${encodeURIComponent(cat)}`,
    tag: (tag: string) => `/blogs?tag=${encodeURIComponent(tag)}`,
    byAuthor: (username: string) => `/profile/${username}/blogs`,
    comments: (id: string) => `/blogs/${id}#comments`,
    specificComment: (blogId: string, commentId: string) => `/blogs/${blogId}#comment-${commentId}`,
  },
  
  marketplace: {
    list: (category?: string) => category ? `/marketplace?category=${category}` : '/marketplace',
    detail: (id: string) => `/marketplace/${id}`,
  },
  
  communities: {
    list: () => '/communities',
    detail: (id: string) => `/communities/${id}`,
    create: () => '/communities/create',
    thread: (communityId: string, postId: string) => `/communities/${communityId}/p/${postId}`,
    comment: (communityId: string, postId: string, commentId: string) => `/communities/${communityId}/p/${postId}#comment-${commentId}`,
  },
  
  profile: {
    view: (username?: string) => username ? `/profile/${username}` : '/dashboard',
    edit: () => '/dashboard?tab=profile',
    followers: (username: string) => `/profile/${username}/followers`,
    following: (username: string) => `/profile/${username}/following`,
    listings: (username: string) => `/profile/${username}/listings`,
    blogs: (username: string) => `/profile/${username}/blogs`,
  },
  
  dashboard: {
    home: () => '/dashboard',
    tab: (tab: string) => `/dashboard?tab=${tab}`,
    blogStudio: (id?: string) => `/dashboard?tab=blog-studio${id ? `&edit=${id}` : ''}`,
    sell: (id?: string) => `/dashboard?tab=sell${id ? `&edit=${id}` : ''}`,
    messages: (threadId?: string) => `/dashboard?tab=messages${threadId ? `&thread=${threadId}` : ''}`,
    notifications: () => '/dashboard?tab=notifications',
  },
  
  auth: {
    login: () => '/login',
    signup: () => '/signup',
    forgotPassword: () => '/forgot-password',
    resetPassword: () => '/reset-password',
  },
  
  search: {
    results: (q?: string, type?: string) => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (type && type !== 'all') params.set('type', type);
      const qs = params.toString();
      return qs ? `/search?${qs}` : '/search';
    }
  },

  settings: {
    root: () => '/dashboard?tab=profile',
    notifications: () => '/dashboard?tab=notifications',
  }
};

/**
 * Resolves a notification object to its clickable destination URL.
 */
export function resolveNotificationLink(notification: any): string {
  const { type, listing_id, blog_id, post_id, actor } = notification;

  switch (type) {
    case 'like':
    case 'comment':
      if (blog_id) return ROUTES.blog.detail(blog_id);
      if (listing_id) return ROUTES.marketplace.detail(listing_id);
      return ROUTES.home();

    case 'follow':
      return actor?.username ? ROUTES.profile.view(actor.username) : ROUTES.home();

    case 'reply':
      if (post_id) {
        return blog_id ? ROUTES.blog.detail(blog_id) : ROUTES.home();
      }
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

