import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ListingCard } from '@/components/shared/listing-card';
import { BlogCard } from '@/components/shared/blog-card';
import { FollowButton } from '@/components/shared/follow-button';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/routes';
import { UserLink } from '@/components/shared/navigation-links';

import type { Profile } from '@/types/database';

type ProfileTab = 'listings' | 'blogs' | 'communities' | 'reviews' | 'followers' | 'following';

const validTabs: ProfileTab[] = ['listings', 'blogs', 'communities', 'reviews', 'followers', 'following'];
const PUBLIC_PROFILE_SELECT =
  'id, username, full_name, avatar_url, bio, university, field_of_study, city, is_verified, follower_count, following_count, rating_avg, rating_count, created_at, role'
const PROFILE_LISTING_SELECT =
  'id, seller_id, title, price, listing_type, rental_price, rental_period, condition, category, campus, images, status, moderation, view_count, created_at, updated_at, is_featured, featured_until'
const PROFILE_BLOG_SELECT =
  'id, author_id, title, excerpt, cover_image, field, moderation, like_count, comment_count, view_count, created_at, updated_at, is_featured, featured_until'
const PROFILE_COMMUNITY_SELECT =
  'id, owner_id, name, description, field, avatar_url, member_count, post_count, moderation, created_at, updated_at, is_featured, featured_until, is_official'
const PROFILE_RELATION_SELECT = 'id, username, full_name, avatar_url, university, field_of_study, is_verified'
const compactNumber = (value: number) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Math.max(0, Number(value || 0)));

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: { username: string; tab?: string[] };
  searchParams?: { tab?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const urlTab = params.tab?.[0];
  const queryTab = typeof searchParams?.tab === 'string' ? searchParams.tab : null;
  const requestedTab = (urlTab || queryTab || 'listings').toLowerCase();
  
  const activeTab: ProfileTab = validTabs.includes(requestedTab as ProfileTab)
    ? (requestedTab as ProfileTab)
    : 'listings';

  const { data: profile } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_SELECT)
    .eq('username', params.username)
    .single();
  
  if (!profile) return notFound();

  let ownRole: string | null = null;
  if (user && user.id === profile.id) {
    const { data: ownProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    ownRole = ownProfile?.role || null;
  }

  const [
    listingsCountRes,
    blogsCountRes,
    communitiesCountRes,
    reviewsCountRes,
    followersCountRes,
    followingCountRes,
  ] = await Promise.allSettled([
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', profile.id)
      .eq('moderation', 'approved')
      .neq('status', 'removed'),
    supabase
      .from('blogs')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', profile.id)
      .eq('moderation', 'approved'),
    supabase
      .from('communities')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', profile.id)
      .eq('moderation', 'approved'),
    supabase
      .from('ratings')
      .select('id', { count: 'exact', head: true })
      .eq('subject_id', profile.id),
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', profile.id),
    supabase
      .from('follows')
      .select('following_id', { count: 'exact', head: true })
      .eq('follower_id', profile.id),
  ]);

  const resolveCount = (result: PromiseSettledResult<any>, fallback = 0) =>
    result.status === 'fulfilled' ? Number(result.value?.count || 0) : fallback;

  const listingsCount = resolveCount(listingsCountRes);
  const blogsCount = resolveCount(blogsCountRes);
  const communitiesCount = resolveCount(communitiesCountRes);
  const reviewsCount = resolveCount(reviewsCountRes, Number(profile.rating_count || 0));
  const followersCount = resolveCount(followersCountRes, Number(profile.follower_count || 0));
  const followingCount = resolveCount(followingCountRes, Number(profile.following_count || 0));

  const profileRatingCount = Number(profile.rating_count || 0);
  const profileRatingAverage = Number(profile.rating_avg || 0);

  const [listingIdsRes, blogLikesRes, communityMembersRes, postLikesRes, commentLikesRes] = await Promise.allSettled([
    supabase
      .from('listings')
      .select('id')
      .eq('seller_id', profile.id)
      .eq('moderation', 'approved')
      .neq('status', 'removed'),
    supabase
      .from('blogs')
      .select('like_count')
      .eq('author_id', profile.id)
      .eq('moderation', 'approved'),
    supabase
      .from('communities')
      .select('member_count')
      .eq('owner_id', profile.id)
      .eq('moderation', 'approved'),
    supabase
      .from('posts')
      .select('like_count')
      .eq('author_id', profile.id)
      .eq('moderation', 'approved'),
    supabase
      .from('comments')
      .select('like_count')
      .eq('author_id', profile.id)
      .eq('moderation', 'approved'),
  ]);

  const listingIds =
    listingIdsRes.status === 'fulfilled'
      ? ((listingIdsRes.value?.data || []) as any[]).map((listing) => listing.id)
      : [];
  const blogLikeCount =
    blogLikesRes.status === 'fulfilled'
      ? ((blogLikesRes.value?.data || []) as any[]).reduce((sum, blog) => sum + Number(blog.like_count || 0), 0)
      : 0;
  const communityEngagement =
    communityMembersRes.status === 'fulfilled'
      ? ((communityMembersRes.value?.data || []) as any[]).reduce((sum, community) => sum + Number(community.member_count || 0), 0)
      : 0;
  const postLikeCount =
    postLikesRes.status === 'fulfilled'
      ? ((postLikesRes.value?.data || []) as any[]).reduce((sum, post) => sum + Number(post.like_count || 0), 0)
      : 0;
  const commentLikeCount =
    commentLikesRes.status === 'fulfilled'
      ? ((commentLikesRes.value?.data || []) as any[]).reduce((sum, comment) => sum + Number(comment.like_count || 0), 0)
      : 0;

  let listingLikeCount = 0;
  if (listingIds.length > 0) {
    const { count } = await supabase
      .from('wishlist')
      .select('listing_id', { count: 'exact', head: true })
      .in('listing_id', listingIds);
    listingLikeCount = count || 0;
  }
  const totalLikes = listingLikeCount + blogLikeCount + communityEngagement + postLikeCount + commentLikeCount;

  let listings: any[] = [];
  let blogs: any[] = [];
  let communities: any[] = [];
  let reviews: any[] = [];
  let followers: any[] = [];
  let following: any[] = [];

  if (activeTab === 'listings') {
    const { data, error } = await supabase
      .from('listings')
      .select(PROFILE_LISTING_SELECT)
      .eq('seller_id', profile.id)
      .eq('moderation', 'approved')
      .neq('status', 'removed')
      .order('created_at', { ascending: false });
    if (!error) listings = data || [];
  } else if (activeTab === 'blogs') {
    const { data, error } = await supabase
      .from('blogs')
      .select(PROFILE_BLOG_SELECT)
      .eq('author_id', profile.id)
      .eq('moderation', 'approved')
      .order('created_at', { ascending: false });
    if (!error) blogs = data || [];
  } else if (activeTab === 'communities') {
    const { data, error } = await supabase
      .from('communities')
      .select(PROFILE_COMMUNITY_SELECT)
      .eq('owner_id', profile.id)
      .eq('moderation', 'approved')
      .order('created_at', { ascending: false });
    if (!error) communities = data || [];
  } else if (activeTab === 'reviews') {
    const { data: reviewsRaw, error } = await supabase
      .from('ratings')
      .select('id, reviewer_id, score, created_at, listing_id')
      .eq('subject_id', profile.id)
      .order('created_at', { ascending: false });

    if (!error) {
      const reviewerIds = Array.from(
        new Set((reviewsRaw || []).map((review: any) => review.reviewer_id).filter(Boolean))
      );
      const { data: reviewers } = reviewerIds.length
        ? await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', reviewerIds)
        : { data: [] as any[] };
      const reviewerById = new Map((reviewers || []).map((reviewer: any) => [reviewer.id, reviewer]));

      reviews = (reviewsRaw || []).map((review: any) => ({
        ...review,
        reviewer: reviewerById.get(review.reviewer_id) || {
          id: review.reviewer_id,
          username: 'unknown',
          full_name: 'Anonymous User',
          avatar_url: '/images/default-avatar.svg',
        },
      }));
    }
  } else if (activeTab === 'followers' || activeTab === 'following') {
    const followColumn = activeTab === 'followers' ? 'follower_id' : 'following_id';
    const { data: relationEdges, error } = await supabase
      .from('follows')
      .select(`${followColumn}, created_at`)
      .eq(activeTab === 'followers' ? 'following_id' : 'follower_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(300);

    if (!error) {
      const relationIds = Array.from(
        new Set((relationEdges || []).map((edge: any) => edge[followColumn]).filter(Boolean))
      );
      const { data: relationProfiles } = relationIds.length
        ? await supabase.from('profiles').select(PROFILE_RELATION_SELECT).in('id', relationIds)
        : { data: [] as any[] };
      const relationById = new Map((relationProfiles || []).map((entry: any) => [entry.id, entry]));

      const normalized = (relationEdges || [])
        .map((edge: any) => ({
          created_at: edge.created_at,
          profile: relationById.get(edge[followColumn]),
        }))
        .filter((entry: any) => !!entry.profile);

      if (activeTab === 'followers') followers = normalized;
      if (activeTab === 'following') following = normalized;
    }
  }

  let isFollowing = false;
  if (user && user.id !== profile.id) {
    const { data: followData } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .maybeSingle();
    if (followData) isFollowing = true;
  }

  const isOwnProfile = user?.id === profile.id;
  const avatarUrl = profile.avatar_url || '/images/default-avatar.svg';
  const displayName = profile.full_name || profile.username || 'User';

  const tabHeading =
    activeTab === 'listings'
      ? `${displayName}'s Listings`
      : activeTab === 'blogs'
      ? `${displayName}'s Blogs`
      : activeTab === 'communities'
      ? `${displayName}'s Communities`
      : activeTab === 'followers'
      ? `${displayName}'s Followers`
      : activeTab === 'following'
      ? `${displayName} is Following`
      : `${displayName}'s Reviews`;

  return (
    <main className="min-h-screen bg-background">
      <header className="relative bg-surface-low border-b border-border/70">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-8 sm:pt-16 pb-6 sm:pb-12">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6 sm:gap-10">
            <div className="relative w-fit mx-auto lg:mx-0">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-white p-1.5 shadow-[0_18px_48px_-30px_rgba(8,21,54,0.6)] group-hover:scale-105 transition-transform duration-500">
                <div className="relative w-full h-full rounded-full overflow-hidden">
                  <Image
                    alt={profile.full_name}
                    className="w-full h-full object-cover"
                    src={avatarUrl}
                    fill
                    priority
                  />
                </div>
              </div>
              <span className="absolute -bottom-2 right-2 px-3 py-1 rounded-full bg-[#2e5570] text-white text-[10px] font-black uppercase tracking-[0.15em] shadow-lg border border-white/20">
                {ownRole === 'admin' ? 'Admin' : 'Student'}
              </span>
            </div>

            <div className="flex-1 min-w-0 text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.03em] text-text-primary leading-[1.1] uppercase flex items-center justify-center lg:justify-start flex-wrap gap-x-4">
                {profile.full_name}
                {profile.is_verified && (
                  <span className="material-symbols-outlined text-primary text-[32px] sm:text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                )}
              </h1>
              <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-[#2e5570] text-sm font-bold">
                <span className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-primary">school</span>
                  {profile.university || 'University Student'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-primary">architecture</span>
                  {profile.field_of_study || 'General'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-primary">location_on</span>
                  {profile.city || 'Faisalabad, PK'}
                </span>
              </div>
              <p className="mt-3 text-text-primary font-black text-lg tracking-tight">
                <UserLink user={profile} showAvatar={false} size="md" />
              </p>

              {!isOwnProfile && (
                <div className="mt-6 flex items-center justify-center lg:justify-start gap-3 flex-wrap">
                  <FollowButton
                    userId={profile.id}
                    initialIsFollowing={isFollowing}
                    initialFollowerCount={followersCount}
                  />
                  <button className="h-12 w-12 rounded-2xl border border-border bg-white text-text-muted hover:text-primary hover:border-primary/30 transition-colors flex items-center justify-center">
                    <span className="material-symbols-outlined">mail</span>
                  </button>
                  <button className="h-12 w-12 rounded-full border border-border bg-white text-text-muted hover:text-primary hover:border-primary/30 transition-colors flex items-center justify-center">
                    <span className="material-symbols-outlined">more_horiz</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <Link
              href={ROUTES.profile.followers(params.username)}
              className={cn(
                'rounded-2xl border border-border bg-white px-6 py-5 shadow-sm hover:border-primary/30 transition-colors',
                activeTab === 'followers' && 'border-primary/40'
              )}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted mb-2">Followers</p>
              <div className="flex items-end gap-2">
                <p className="text-4xl leading-none font-black text-[#1f3468]">{compactNumber(followersCount)}</p>
                <p className="text-xs font-black text-emerald-600 pb-1">+{reviewsCount}</p>
              </div>
            </Link>

            <Link
              href={ROUTES.profile.following(params.username)}
              className={cn(
                'rounded-2xl border border-border bg-white px-6 py-5 shadow-sm hover:border-primary/30 transition-colors',
                activeTab === 'following' && 'border-primary/40'
              )}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted mb-2">Following</p>
              <p className="text-4xl leading-none font-black text-[#1f3468]">{compactNumber(followingCount)}</p>
            </Link>

            <div className="rounded-2xl border border-border bg-white px-6 py-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted mb-2">Rating</p>
              <div className="flex items-center gap-2">
                <p className="text-4xl leading-none font-black text-[#1f3468]">{profileRatingAverage.toFixed(1)}</p>
                <span className="material-symbols-outlined text-amber-500 text-base pb-1" style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white px-6 py-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted mb-2">Total Likes</p>
              <div className="flex items-center gap-2">
                <p className="text-4xl leading-none font-black text-text-primary">{compactNumber(totalLikes)}</p>
                <span className="material-symbols-outlined text-primary text-base pb-1" style={{ fontVariationSettings: "'FILL' 1" }}>
                  favorite
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur sticky top-[72px] z-40 border-y border-border shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="overflow-x-auto">
              <div className="flex gap-8 sm:gap-10 min-w-max">
                {[
                  { key: 'listings', label: `Listings (${listingsCount})`, href: ROUTES.profile.listings(params.username) },
                  { key: 'blogs', label: `Blogs (${blogsCount})`, href: ROUTES.profile.blogs(params.username) },
                  { key: 'communities', label: `Communities (${communitiesCount})`, href: ROUTES.profile.view(params.username) + '?tab=communities' },
                  { key: 'reviews', label: `Reviews (${reviewsCount})`, href: ROUTES.profile.view(params.username) + '?tab=reviews' },
                  { key: 'followers', label: `Followers (${followersCount})`, href: ROUTES.profile.followers(params.username) },
                  { key: 'following', label: `Following (${followingCount})`, href: ROUTES.profile.following(params.username) },
                ].map((tab) => (
                  <Link
                    key={tab.key}
                    href={tab.href}
                    className={cn(
                      'py-5 border-b-2 font-black text-xs uppercase tracking-[0.2em] transition-colors whitespace-nowrap',
                      activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-primary'
                    )}
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 py-10 sm:py-20">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 bg-primary rounded-full"></div>
              <h2 className="text-3xl font-black text-text-primary tracking-[-0.04em] uppercase">{tabHeading}</h2>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted pl-5">Verified User Feedback & Ratings</p>
          </div>

        {activeTab === 'listings' && (
          <>
            {listingsCount > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-8">
                {listings!.map((listing: any) => (
                  <ListingCard key={listing.id} listing={{ ...listing, seller: profile }} />
                ))}
              </div>
            ) : (
              <div className="py-32 text-center bg-surface/50 rounded-[3rem] border-2 border-dashed border-border">
                <span className="material-symbols-outlined text-6xl text-text-muted mb-4 opacity-30">inventory_2</span>
                <h3 className="text-xl font-black text-text-primary uppercase tracking-tight">No active listings</h3>
                <p className="text-text-secondary font-bold">This user hasn&apos;t posted any items yet.</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'blogs' && (
          <>
            {blogsCount > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {blogs!.map((blog: any) => (
                  <BlogCard
                    key={blog.id}
                    blog={{
                      ...blog,
                      author: {
                        username: profile.username,
                        avatar_url: profile.avatar_url,
                        full_name: profile.full_name,
                      },
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="py-24 text-center bg-surface/50 rounded-[3rem] border-2 border-dashed border-border">
                <span className="material-symbols-outlined text-6xl text-text-muted mb-4 opacity-30">article</span>
                <h3 className="text-xl font-black text-text-primary uppercase tracking-tight">No published blogs</h3>
                <p className="text-text-secondary font-bold">This user has not published any approved blogs yet.</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'communities' && (
          <>
            {communitiesCount > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {communities!.map((community: any) => (
                  <Link
                    key={community.id}
                    href={`/communities/${community.id}`}
                    className="group rounded-2xl border border-border bg-white p-6 hover:shadow-xl transition-shadow"
                  >
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-surface border border-border relative">
                        <Image
                          src={community.avatar_url || '/images/default-avatar.svg'}
                          alt={community.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-black text-text-primary text-lg group-hover:text-primary transition-colors flex items-center gap-1.5">
                          {community.name}
                          {community.is_official && <span className="material-symbols-outlined text-[#1877F2] text-[18px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] font-black uppercase tracking-wider text-text-muted">{community.field || 'General'}</p>
                          {profile.role === 'admin' && (
                            <span className="bg-[#1877F2]/10 text-[#1877F2] text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-widest border border-[#1877F2]/20">
                              <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                              Official
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary line-clamp-3 min-h-[60px]">
                      {community.description || 'No community description available yet.'}
                    </p>
                    <div className="pt-5 mt-5 border-t border-border flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-primary">{community.member_count || 0} members</span>
                      <span className="text-xs font-black uppercase tracking-wider text-text-muted">View</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center bg-surface/50 rounded-[3rem] border-2 border-dashed border-border">
                <span className="material-symbols-outlined text-6xl text-text-muted mb-4 opacity-30">groups</span>
                <h3 className="text-xl font-black text-text-primary uppercase tracking-tight">No live communities</h3>
                <p className="text-text-secondary font-bold">This user does not own any approved communities yet.</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'reviews' && (
          <>
            {reviewsCount > 0 ? (
              <div className="flex flex-col gap-4">
                {reviews.map((review: any) => (
                  <article key={review.id} className="group bg-white border border-border/50 rounded-3xl p-6 hover:shadow-md transition-all duration-300">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      <div className="flex items-center gap-4 shrink-0 md:w-64">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 relative">
                          <Image
                            src={review.reviewer?.avatar_url || '/images/default-avatar.svg'}
                            alt={review.reviewer?.full_name || 'Reviewer'}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <UserLink user={review.reviewer} size="sm" className="font-black uppercase tracking-tight text-text-primary hover:text-primary transition-colors truncate block" />
                          <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted mt-0.5">{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(review.created_at))}</p>
                        </div>
                      </div>
                      
                      <div className="flex-1 border-l border-border/50 pl-6 hidden md:block">
                        <p className="text-sm text-text-secondary font-medium italic line-clamp-2">
                          &ldquo;Star rating submitted for this transaction.&rdquo;
                        </p>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 md:w-72">
                        <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100/50">
                          <span className="font-black text-amber-700 text-sm leading-none">{Number(review.score || 0).toFixed(1)}</span>
                          <span className="material-symbols-outlined text-amber-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        </div>
                        
                        {review.listing_id && (
                          <Link 
                            href={ROUTES.marketplace.detail(review.listing_id)} 
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 text-slate-900 text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all border border-slate-200"
                          >
                            View Item
                            <span className="material-symbols-outlined text-xs">open_in_new</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="py-32 text-center bg-slate-50/50 rounded-[4rem] border border-slate-100 shadow-inner">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-4xl text-slate-300">reviews</span>
                </div>
                <h3 className="text-xl font-black text-text-primary uppercase tracking-tight">No reviews yet</h3>
                <p className="text-text-muted font-bold text-sm mt-2 max-w-xs mx-auto">This profile has not received public feedback from other users yet.</p>
              </div>
            )}
          </>
        )}

        {(activeTab === 'followers' || activeTab === 'following') && (
          <>
            {(activeTab === 'followers' ? followersCount : followingCount) > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(activeTab === 'followers' ? followers : following).map((entry: any) => (
                  <div key={entry.profile.id} className="group rounded-[2.5rem] border border-border bg-white p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <div className="p-1 bg-white rounded-2xl shadow-sm border border-slate-50 overflow-hidden">
                          <UserLink user={entry.profile} size="lg" showName={false} className="rounded-xl overflow-hidden" />
                        </div>
                        {entry.profile.is_verified && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                            <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pt-1">
                        <UserLink user={entry.profile} size="md" showAvatar={false} className="text-on-surface hover:text-primary transition-colors font-black uppercase tracking-tight truncate block leading-tight" />
                        <p className="text-[10px] font-bold text-text-muted mt-1 truncate uppercase tracking-widest">{entry.profile.university || 'Student'}</p>
                        <p className="text-[9px] font-medium text-text-muted mt-1 opacity-70">
                          {activeTab === 'followers' ? 'Followed' : 'Following since'} {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(entry.created_at))}
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex flex-col gap-2">
                      {user && user.id !== entry.profile.id && (
                        <FollowButton
                          userId={entry.profile.id}
                          initialIsFollowing={activeTab === 'following'} // On 'following' tab, we are following them. 
                          // On 'followers' tab, we don't know if we follow them back without a complex query.
                          // For now, we'll use a simplified check or just the profile link.
                          compact
                        />
                      )}
                      <Link
                        href={ROUTES.profile.view(entry.profile.username)}
                        className="flex items-center justify-center rounded-full bg-slate-50 py-3 text-[10px] font-black uppercase tracking-widest text-text-primary hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                      >
                        View Full Profile
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center bg-surface/50 rounded-[3rem] border-2 border-dashed border-border">
                <span className="material-symbols-outlined text-6xl text-text-muted mb-4 opacity-30">
                  {activeTab === 'followers' ? 'group' : 'person_search'}
                </span>
                <h3 className="text-xl font-black text-text-primary uppercase tracking-tight">
                  {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
                </h3>
                <p className="text-text-secondary font-bold">
                  {activeTab === 'followers' ? 'This profile has not gained followers yet.' : 'This profile is not following any users right now.'}
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
