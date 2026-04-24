import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { BlogLikeButton } from '@/components/blogs/blog-like-button';
import { BlogShareActions } from '@/components/blogs/blog-share-actions';
import { BlogCommentsSection } from '@/components/blogs/blog-comments-section';
import { FollowButton } from '@/components/shared/follow-button';
import { getAdminVisibleMessage, isUndoWindowOpen, parseAdminActionNote } from '@/lib/admin-report-action';
import { BlogMediaEnhancer } from '@/components/blogs/blog-media-enhancer';
import { BlogSidebarEngagement } from '@/components/blogs/blog-sidebar-engagement';
import { ViewTracker } from '@/components/shared/view-tracker';
import { InteractionCounter } from '@/components/shared/interaction-counter';
import { ROUTES } from '@/lib/routes';
import { UserLink, CategoryBreadcrumb, TagLink } from '@/components/shared/navigation-links';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/*
export async function generateMetadata({ params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookies().getAll() } } }
    );

    const routeKey = params.id || '';
    // Use a more permissive UUID regex for production resilience
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routeKey);
    
    let blog: any = null;
    if (isUuid) {
      const { data } = await supabase.from('blogs').select('title, excerpt, cover_image').eq('id', routeKey).maybeSingle();
      blog = data;
    }
    if (!blog) {
      const { data } = await supabase.from('blogs').select('title, excerpt, cover_image').eq('slug', routeKey).maybeSingle();
      blog = data;
    }

    if (!blog) return { title: 'Blog Post | Allpanga' };

    return {
      title: `${blog.title} | Allpanga`,
      description: blog.excerpt || 'Read the latest blog post on Allpanga.',
      openGraph: {
        title: blog.title,
        description: blog.excerpt,
        images: blog.cover_image ? [{ url: blog.cover_image }] : [],
      }
    };
  } catch (err) {
    console.error('[Metadata Error]:', err);
    return { title: 'Blog Post | Allpanga' };
  }
}
*/

function sanitizeBlogHtml(rawHtml: string) {
  // Defensive dummy sanitizer to eliminate ERR_REQUIRE_ESM crashes
  console.log('[Sanitizer] Using fallback native sanitizer');
  return String(rawHtml || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

function stripHtml(input: string) {
  return String(input || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getTocFromContent(content: string) {
  const items: { text: string; id: string }[] = [];
  const regex = /<h[2-3][^>]*>(.*?)<\/h[2-3]>/gi;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = regex.exec(content)) !== null) {
    const text = stripHtml(match[1] || '');
    if (text) {
      items.push({ text, id: `toc-${index++}` });
    }
    if (items.length >= 10) break;
  }
  if (items.length === 0) {
    return [
      { text: 'Overview', id: 'body' },
      { text: 'Final Thoughts', id: 'footer' }
    ];
  }
  return items;
}

function injectHeadingIds(content: string) {
  let index = 0;
  return content.replace(/<(h[2-3])([^>]*)>(.*?)<\/h[2-3]>/gi, (match, tag, attrs, text) => {
    if (attrs.includes('id=')) return match;
    const id = `toc-${index++}`;
    return `<${tag} id="${id}" ${attrs}>${text}</${tag}>`;
  });
}

export default async function BlogDetailPage({ params }: { params: { id: string } }) {
  // 1. SAFE CLIENT CREATION
  let supabase;
  try {
    supabase = await createClient();
  } catch (err) {
    console.error('[BlogDetail] Client Error:', err);
    return null;
  }

  // 2. DEFENSIVE PARAMS HANDLING
  let routeKey = '';
  try {
    routeKey = decodeURIComponent(params.id || '').trim();
  } catch {
    return notFound();
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routeKey);

    // 3. PRIMARY BLOG FETCH
    let blog: any = null;
    let blogError: any = null;

    if (isUuid) {
      const byId = await supabase
        .from('blogs')
        .select('*, author:profiles!blogs_author_id_fkey(id,username,full_name,avatar_url,university,bio,follower_count,following_count)')
        .eq('id', routeKey)
        .maybeSingle();
      blog = byId.data;
      blogError = byId.error;
    }

    if (!blog && !blogError) {
      const bySlug = await supabase
        .from('blogs')
        .select('*, author:profiles!blogs_author_id_fkey(id,username,full_name,avatar_url,university,bio,follower_count,following_count)')
        .eq('slug', routeKey)
        .maybeSingle();
      blog = bySlug.data;
      blogError = bySlug.error;
    }

    if (blogError) throw blogError;
    if (!blog) return notFound();

    // 4. RESILIENT PARALLEL FETCHING (Using Promise.allSettled)
    const results = await Promise.allSettled([
      supabase.from('blogs').select('id, title, cover_image').eq('field', blog.field).neq('id', blog.id).eq('moderation', 'approved').limit(3),
      supabase.from('blogs').select('id, title, field').eq('author_id', blog.author_id).neq('id', blog.id).eq('moderation', 'approved').limit(2),
      supabase.from('comments').select('*, author:profiles!comments_author_id_fkey(id,username,full_name,avatar_url,university,bio,follower_count,following_count)').eq('blog_id', blog.id).eq('moderation', 'approved').order('created_at', { ascending: false }),
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', blog.author_id),
      supabase.from('blogs').select('id', { count: 'exact', head: true }).eq('author_id', blog.author_id).eq('moderation', 'approved'),
      user ? supabase.from('likes').select('id').eq('user_id', user.id).eq('blog_id', blog.id).maybeSingle() : Promise.resolve({ data: null }),
      user && user.id !== blog.author_id ? supabase.from('follows').select('follower_id').eq('follower_id', user.id).eq('following_id', blog.author_id).maybeSingle() : Promise.resolve({ data: null }),
      user ? supabase.from('likes').select('comment_id').eq('user_id', user.id).not('comment_id', 'is', null) : Promise.resolve({ data: [] }),
      user ? supabase.from('profiles').select('role').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null })
    ]);

    // Map results safely
    const relatedBlogs = results[0].status === 'fulfilled' ? (results[0].value as any).data : [];
    const authorBlogs = results[1].status === 'fulfilled' ? (results[1].value as any).data : [];
    const comments = results[2].status === 'fulfilled' ? (results[2].value as any).data : [];
    const authorFollowersCount = results[3].status === 'fulfilled' ? (results[3].value as any).count : 0;
    const authorBlogsCount = results[4].status === 'fulfilled' ? (results[4].value as any).count : 0;
    const userLikeRes = results[5].status === 'fulfilled' ? results[5].value : { data: null };
    const userFollowRes = results[6].status === 'fulfilled' ? results[6].value : { data: null };
    const userCommentLikesRes = results[7].status === 'fulfilled' ? results[7].value : { data: [] };
    const viewerProfile = results[8].status === 'fulfilled' ? (results[8].value as any).data : null;

    const isLiked = !!(userLikeRes as any)?.data;
    const isFollowing = !!(userFollowRes as any)?.data;
    
    if (user && comments) {
      const likedSet = new Set(((userCommentLikesRes as any)?.data || []).map((cl: any) => cl.comment_id));
      comments.forEach((c: any) => {
        c.isLiked = likedSet.has(c.id);
      });
    }

    const author = blog.author as any;
    const viewerRole = viewerProfile?.role;
    const authorFollowers = Number(authorFollowersCount || author?.follower_count || 0);
    const authorTotalBlogs = Number(authorBlogsCount || authorBlogs?.length || 0);
    const authorProfileHref = author?.username ? ROUTES.profile.view(author.username) : null;
    
    const safeBlogContent = sanitizeBlogHtml(blog.content || '');
    const blogDate = blog.created_at ? new Date(blog.created_at) : null;
    const isDateValid = blogDate && !isNaN(blogDate.getTime());
    const readMinutes = Math.max(1, Math.ceil(stripHtml(safeBlogContent).split(' ').filter(Boolean).length / 180));
    const tocItems = getTocFromContent(safeBlogContent);
    const contentWithIds = injectHeadingIds(safeBlogContent);
    const adminActionMeta = parseAdminActionNote(blog.rejection_note);
    const warningMessage = adminActionMeta?.action === 'warn' && isUndoWindowOpen(adminActionMeta)
      ? getAdminVisibleMessage(blog.rejection_note)
      : null;

    return (
      <div className="min-h-screen bg-background">
        {warningMessage && (
          <div className="max-w-7xl mx-auto px-6 pt-6">
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-900">
              <p className="text-xs font-black uppercase tracking-[0.2em]">Admin Warning</p>
              <p className="text-sm mt-1">{warningMessage}</p>
            </div>
          </div>
        )}

        <header className="relative w-full max-w-[820px] mx-auto h-[360px] mt-[56px] overflow-hidden rounded-2xl shadow-xl">
          <Image
            alt={blog.title}
            className="w-full h-full object-cover"
            src={blog.cover_image || 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=1200'}
            fill
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 max-w-7xl mx-auto right-0 z-10">
            <span className="inline-block px-4 py-1 rounded-full bg-primary-container text-on-primary-container text-xs font-bold tracking-widest uppercase mb-4">
              {blog.field || 'General'}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight max-w-4xl tracking-tight">
              {blog.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-white/90">
              <UserLink user={author} className="text-white hover:text-white/80" size="md" viewerRole={viewerRole} />
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                <span>{isDateValid ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(blogDate) : 'Recently Posted'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                <span>{readMinutes} min read</span>
              </div>
              <div className="flex items-center gap-4 md:ml-auto bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs">
                <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">visibility</span> {blog.view_count || 0}</span>
                <InteractionCounter 
                  id={blog.id} 
                  type="blog-like" 
                  initialCount={blog.like_count || 0} 
                  icon="favorite" 
                  iconActive={isLiked}
                />
                <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">chat_bubble</span> {comments?.length || 0}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          <CategoryBreadcrumb 
            crumbs={[
              { label: 'Blogs', href: ROUTES.blog.list() },
              { label: blog.field || 'General', href: ROUTES.blog.list() + `?category=${blog.field}` },
              { label: blog.title, href: '#' }
            ]}
            className="mb-10"
          />

          <div className="flex flex-col lg:flex-row gap-12 relative items-start">
            <div className="flex-1 max-w-3xl">
              <article className="bg-white rounded-3xl md:rounded-[2.5rem] shadow-[0px_12px_44px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden mb-12">
                <div className="p-6 md:p-12 pb-6 border-b border-slate-50 bg-slate-50/30">
                  <div className="flex items-start gap-6">
                    <UserLink user={author} size="lg" showName={false} viewerRole={viewerRole} />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <UserLink user={author} showAvatar={false} size="lg" viewerRole={viewerRole} />
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{author?.university || 'Student Creator'}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">{blog.field || 'General'}</span>
                          </div>
                        </div>
                        {user?.id !== blog.author_id && (
                          <FollowButton
                            userId={blog.author_id}
                            initialIsFollowing={isFollowing}
                            initialFollowerCount={authorFollowers}
                            compact
                          />
                        )}
                      </div>
                      <p className="text-base text-slate-500 max-w-2xl leading-relaxed mt-4">
                        {author?.bio || 'Sharing practical student projects and applied learning experiences.'}
                      </p>
                      <div className="flex items-center gap-6 mt-6 pt-6 border-t border-slate-100/50">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          <span className="text-slate-900">{authorTotalBlogs}</span> Works
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          <span className="text-slate-900">{authorFollowers}</span> Followers
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-14 lg:p-16">
                  {blog.excerpt && (
                    <div className="relative mb-12">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-full opacity-20" />
                      <p className="pl-8 py-2 text-2xl font-medium text-slate-600 leading-relaxed italic">
                        {blog.excerpt}
                      </p>
                    </div>
                  )}

                  <BlogMediaEnhancer>
                    <div
                      className="blog-html-content prose prose-lg sm:prose-xl max-w-none break-words overflow-x-hidden prose-headings:font-black prose-headings:tracking-tighter prose-headings:text-slate-900 prose-p:text-slate-600 prose-p:leading-[1.8] prose-strong:text-slate-900 prose-a:text-primary prose-img:rounded-3xl prose-img:shadow-2xl prose-img:my-16"
                      dangerouslySetInnerHTML={{ __html: contentWithIds }}
                    />
                  </BlogMediaEnhancer>

                  <div className="border-t border-slate-100 pt-10 md:pt-12 mt-12 md:mt-16">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 md:gap-12">
                      <div className="flex-1 space-y-3">
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Topic Exploration</p>
                        <div className="flex flex-wrap gap-2">
                          {blog.tags?.map((tag: string) => (
                            <TagLink key={tag} tag={tag} context="blog" />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3 pt-6 md:pt-0 border-t md:border-t-0 border-slate-50">
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-left md:text-right">Distribute</p>
                        <BlogShareActions title={blog.title} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 md:mt-24 pt-8 md:pt-10 border-t border-slate-50 flex flex-col items-center">
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-6 md:mb-10 animate-pulse">Pulse Recommendation</p>
                    <div className="scale-90 md:scale-100">
                      <BlogLikeButton
                        blogId={blog.id}
                        initialIsLiked={isLiked}
                        initialLikeCount={blog.like_count || 0}
                      />
                    </div>
                  </div>
                </div>
              </article>

              <div id="comments">
                <BlogCommentsSection
                  blogId={blog.id}
                  blogAuthorId={blog.author_id}
                  comments={comments || []}
                  canComment={!!user}
                  currentUserId={user?.id}
                  currentUserRole={viewerRole}
                />
              </div>
            </div>

            <aside className="w-full lg:w-72">
              <div className="sticky top-24 space-y-8">
                <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_12px_32px_rgba(0,100,101,0.06)]">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-4">In this blog</p>
                  <nav className="space-y-4">
                    {tocItems.map((toc, idx) => (
                      <a 
                        key={toc.id} 
                        className={`flex items-center gap-3 text-sm font-medium text-on-surface-variant border-l-2 border-transparent hover:text-primary hover:border-primary pl-4 transition-all`} 
                        href={`#${toc.id}`}
                      >
                        <span className="text-xs opacity-50">{String(idx + 1).padStart(2, '0')}</span>
                        {toc.text}
                      </a>
                    ))}
                  </nav>
                </div>

                <BlogSidebarEngagement 
                  blogId={blog.id} 
                  canComment={!!user} 
                  title={blog.title}
                  initialIsLiked={isLiked}
                  initialLikeCount={blog.like_count || 0}
                />

                {relatedBlogs && relatedBlogs.length > 0 && (
                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_12px_32px_rgba(0,100,101,0.06)]">
                    <h4 className="font-bold text-on-surface mb-6">Related Blogs</h4>
                    <div className="space-y-6">
                      {relatedBlogs.map((related: any) => (
                        <Link key={related.id} className="group block" href={ROUTES.blog.detail(related.id)}>
                          <div className="relative w-full h-24 mb-3">
                            <Image
                              alt={related.title}
                              className="w-full h-24 object-cover rounded-lg"
                              src={related.cover_image || 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=300'}
                              fill
                              sizes="320px"
                            />
                          </div>
                          <h5 className="text-sm font-bold group-hover:text-primary transition-colors leading-snug">{related.title}</h5>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {authorBlogs && authorBlogs.length > 0 && (
                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_12px_32px_rgba(0,100,101,0.06)]">
                    <h4 className="font-bold text-on-surface mb-6">More by {author?.full_name?.split(' ')[0] || 'Author'}</h4>
                    <div className="space-y-4">
                      {authorBlogs.map((aBlog: any) => (
                        <Link key={aBlog.id} href={ROUTES.blog.detail(aBlog.id)} className="block p-4 bg-surface rounded-xl hover:bg-surface-container-high transition-colors border border-transparent hover:border-primary/10">
                          <p className="text-[10px] font-bold text-primary uppercase mb-1">{aBlog.field || 'General'}</p>
                          <h5 className="text-xs font-bold text-on-surface leading-tight">{aBlog.title}</h5>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </main>
        <ViewTracker targetId={blog.id} type="blog" />
      </div>
    );
  } catch (err) {
    console.error('[BlogDetail] Critical Failure:', err);
    return <ProductionErrorState message="An unexpected error occurred while loading this post." error={err} />;
  }
}

function ProductionErrorState({ message, error }: { message: string, error?: any }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md w-full bg-white rounded-[2rem] p-10 shadow-xl text-center border border-slate-100">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <span className="material-symbols-outlined text-4xl text-amber-600">warning</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-4">Post Unavailable</h1>
        <p className="text-slate-500 leading-relaxed mb-10">{message}</p>
        
        {error && (
          <pre className="mb-8 p-4 bg-slate-900 text-rose-300 text-xs rounded-lg overflow-auto max-h-40 text-left border border-rose-500/30">
            {error.message || String(error)}
          </pre>
        )}

        <Link 
          href={ROUTES.blog.list()}
          className="inline-flex items-center justify-center px-8 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          Return to Blogs
        </Link>
      </div>
    </div>
  );
}

