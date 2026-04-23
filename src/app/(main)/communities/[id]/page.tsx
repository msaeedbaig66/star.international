import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CommunityJoinButton } from '@/components/communities/community-join-button';
import { CommunityPostComposer } from '@/components/communities/community-post-composer';
import { CommunityIssuesFeed } from '@/components/communities/community-issues-feed';
import { FollowButton } from '@/components/shared/follow-button';
import { getAdminVisibleMessage, isUndoWindowOpen, parseAdminActionNote } from '@/lib/admin-report-action';

export default async function CommunityDetailPage({ params }: { params: { id: string } }) {

 const supabase = await createClient();
 const { data: { user } } = await supabase.auth.getUser();
 let routeKey = ''
 try {
 routeKey = decodeURIComponent(params.id || '')
 .replace(/\\/g, '')
 .replace(/\/+$/g, '')
 .trim()
 } catch {
 return notFound()
 }
 
 // 1. Fetch main community data (support both UUID id and slug route values)
 let { data: community, error } = await supabase
 .from('communities')
 .select('*, owner:profiles!owner_id(id,username,full_name,avatar_url,university,bio,follower_count,following_count,role)')
 .eq('id', routeKey)
 .eq('moderation', 'approved')
 .single();

 if (error || !community) {
 const fallback = await supabase
 .from('communities')
 .select('*, owner:profiles!owner_id(id,username,full_name,avatar_url,university,bio,follower_count,following_count,role)')
 .eq('slug', routeKey)
 .eq('moderation', 'approved')
 .single()
 community = fallback.data
 error = fallback.error
 }

 if (error || !community) {
 return notFound();
 }

 // 2. Fetch sidebar data (Top Members & Posts)
 const [
 { data: posts },
 { data: members },
 { count: ownerFollowerCount },
 { count: ownerFollowingCount }
 ] = await Promise.all([
 (() => {
 let query = supabase.from('posts')
 .select('*, author:profiles!author_id(id,username,full_name,avatar_url,university,bio,follower_count,following_count)')
 .eq('community_id', community.id);
 
 if (user?.id === community.owner_id) {
 query = query.in('moderation', ['approved', 'pending']);
 } else if (user) {
 query = query.or(`moderation.eq.approved,and(author_id.eq.${user.id},moderation.eq.pending)`);
 } else {
 query = query.eq('moderation', 'approved');
 }

 return query
 .order('is_pinned', { ascending: false })
 .order('created_at', { ascending: false })
 .limit(10);
 })(),
 supabase.from('community_members')
 .select('*, user:profiles!user_id(id,username,full_name,avatar_url)')
 .eq('community_id', community.id)
 .limit(5),
 supabase
 .from('follows')
 .select('follower_id', { count: 'exact', head: true })
 .eq('following_id', community.owner_id),
 supabase
 .from('follows')
 .select('following_id', { count: 'exact', head: true })
 .eq('follower_id', community.owner_id),
 ]);
 const ownerFollowers = Number.isFinite(Number(ownerFollowerCount))
 ? Number(ownerFollowerCount)
 : Number((community.owner as any)?.follower_count || 0);
 const ownerFollowing = Number.isFinite(Number(ownerFollowingCount))
 ? Number(ownerFollowingCount)
 : Number((community.owner as any)?.following_count || 0);

 const postIds = (posts || []).map((post: any) => post.id);
 const [{ data: postComments }, { data: userCommentLikes }] = postIds.length
 ? await Promise.all([
 supabase
 .from('comments')
 .select('*, author:profiles!author_id(id,username,full_name,avatar_url)')
 .in('post_id', postIds)
 .in('moderation', user?.id === community.owner_id ? ['approved', 'pending'] : ['approved'])
 .order('created_at', { ascending: true }),
 user 
 ? supabase
 .from('comment_likes')
 .select('comment_id')
 .eq('user_id', user.id)
 : Promise.resolve({ data: [] })
 ])
 : [{ data: [] }, { data: [] }];

 if (userCommentLikes && postComments) {
 const likedSet = new Set(userCommentLikes.map(cl => cl.comment_id));
 postComments.forEach((c: any) => {
 c.isLiked = likedSet.has(c.id);
 });
 }

 let isMember = false;
 if (user) {
 const { data: memberData } = await supabase
 .from('community_members')
 .select('id')
 .eq('user_id', user.id)
 .eq('community_id', community.id)
 .single();
 if (memberData) isMember = true;
 }

 const { data: viewerProfile } = user 
 ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle() 
 : { data: null };
 const isAdmin = viewerProfile?.role === 'admin';

 const isOwner = user?.id === community.owner_id;
 let isFollowingOwner = false;
 if (user && !isOwner) {
 const { data: followData } = await supabase
 .from('follows')
 .select('follower_id')
 .eq('follower_id', user.id)
 .eq('following_id', community.owner_id)
 .maybeSingle();
 if (followData) isFollowingOwner = true;
 }

 const name = community.name;
 const category = community.field || "General";
 const description = community.description || "No description provided.";
 const coverImage = community.banner_url || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=1200";
 const avatarUrl = community.avatar_url || null;
 const adminActionMeta = parseAdminActionNote(community.rejection_note);
 const warningMessage =
 adminActionMeta?.action === 'warn' && isUndoWindowOpen(adminActionMeta)
 ? getAdminVisibleMessage(community.rejection_note)
 : null;

 return (
 <main className="min-h-screen bg-background">
 {warningMessage && (
 <div className="max-w-7xl mx-auto px-6 pt-6">
 <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-900">
 <p className="text-xs font-black uppercase tracking-[0.2em]">Admin Warning</p>
 <p className="text-sm mt-1">{warningMessage}</p>
 </div>
 </div>
 )}
 {/* 1. Full-Bleed Panoramic Banner (outside constraints) */}
 <div className="relative w-full h-[250px] md:h-[550px] overflow-hidden bg-[#050505] shadow-2xl border-b border-border">
 {/* Background Ambient Glow */}
 <div className="absolute inset-0">
 <Image 
 className="w-full h-full object-cover blur-3xl opacity-20 scale-125" 
 alt="" 
 src={coverImage} 
 fill 
 priority 
 />
 </div>

 {/* Foreground: The Complete Image */}
 <div className="relative w-full h-full z-10 flex items-center justify-center">
 <Image 
 className="w-full h-full object-contain" 
 alt={name} 
 src={coverImage} 
 fill 
 priority 
 sizes="100vw" 
 />
 </div>
 
 {/* Subtle Bottom depth */}
 <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/50 to-transparent z-20"></div>
 </div>

 <div className="max-w-7xl mx-auto px-0 md:px-6 relative">
 {/* Profile Info Section */}
 <section className="bg-white px-4 md:px-8 pb-6 relative z-30 pt-0 border-b border-border shadow-sm mx-0 md:mx-0">
 <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-16 md:-mt-20">
 {/* Avatar */}
 <div className="relative isolate flex-shrink-0 z-10 w-fit mx-auto md:mx-0">
 <div className="w-[160px] h-[160px] rounded-full bg-white p-1.5 shadow-xl border border-border overflow-hidden overflow-visible">
 {avatarUrl ? (
 <div className="relative w-full h-full rounded-full overflow-hidden">
 <Image src={avatarUrl} alt={name} className="w-full h-full object-cover" fill sizes="160px" />
 </div>
 ) : (
 <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-primary">
 <span className="material-symbols-outlined text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
 </div>
 )}
 </div>
 </div>
 
 {/* Title & Actions */}
 <div className="flex-1 flex flex-col md:flex-row justify-between items-center md:items-end gap-6 pb-2 text-center md:text-left mt-2 md:mt-0">
 <div className="flex flex-col gap-3 max-w-2xl">
 <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-primary uppercase leading-none flex items-center justify-center md:justify-start gap-2">
 {name}
 {community.is_official && (
 <span className="material-symbols-outlined text-[#1877F2] text-[28px] md:text-[32px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
 )}
 </h1>
 
 <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
 {community.owner?.role === 'admin' && (
 <span className="bg-[#1877F2] text-white text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-widest shadow-sm">
 <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
 OFFICIAL
 </span>
 )}
 <span className="bg-surface text-text-secondary text-[11px] font-bold px-4 py-1 rounded-full border border-border">
 {category}
 </span>
 <span className="bg-surface text-text-muted text-[11px] font-bold px-4 py-1 rounded-full border border-border uppercase tracking-widest">
 Community
 </span>
 </div>
 </div>
 
 <div className="w-full md:w-auto shrink-0 mb-1">
 {!isOwner ? (
 <CommunityJoinButton communityId={community.id} initialIsMember={isMember} />
 ) : (
 <button disabled className="w-full md:w-auto bg-surface text-text-primary font-bold text-sm px-8 py-3 rounded-xl border border-border cursor-default flex items-center justify-center gap-2">
 <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
 Admin
 </button>
 )}
 </div>
 </div>
 </div>

 <div className="my-6 border-b border-border"></div>
 
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
 <p className="max-w-3xl text-sm font-medium text-text-secondary leading-relaxed text-center md:text-left">
 {description}
 </p>
 
 <div className="flex items-center justify-center gap-8 shrink-0">
 <div className="flex flex-col items-center">
 <span className="text-lg text-text-primary font-black leading-none mb-1">{community.member_count || 0}</span>
 <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Members</span>
 </div>
 <div className="flex flex-col items-center">
 <span className="text-lg text-text-primary font-black leading-none mb-1">{community.post_count || 0}</span>
 <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Discussions</span>
 </div>
 <div className="flex flex-col items-center">
 <span className="text-lg text-green-500 font-black leading-none mb-1 flex items-center justify-center h-5">
 <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
 </span>
 <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Active</span>
 </div>
 </div>
 </div>
 </section>
 </div>

 {/* Main Content Area */}
 <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
 <CommunityPostComposer 
 communityId={community.id} 
 canPost={!!user && (isMember || isOwner || isAdmin)} 
 currentUserId={user?.id}
 viewerRole={isAdmin ? 'admin' : 'user'}
 />

 {posts && posts.length > 0 ? (
 <CommunityIssuesFeed
 initialPosts={posts}
 initialComments={postComments || []}
 canInteract={!!user && (isMember || isOwner || isAdmin)}
 currentUserId={user?.id}
 communityOwnerId={community.owner_id}
 communityId={community.id}
 isViewerAdmin={isAdmin}
 />
 ) : (
 <div className="bg-surface/50 border-2 border-dashed border-border rounded-[3rem] p-20 text-center">
 <span className="material-symbols-outlined text-6xl text-text-muted mb-4 block opacity-30">forum</span>
 <h3 className="text-xl font-black text-text-primary mb-2 uppercase tracking-tight">No issues yet</h3>
 <p className="text-text-secondary font-bold">Post the first issue or discussion for this community.</p>
 </div>
 )}
 </div>
 </main>
 );
}

