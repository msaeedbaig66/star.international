import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CommunityJoinButton } from '@/components/communities/community-join-button';
import { CommunityIssuesFeed } from '@/components/communities/community-issues-feed';
import { parseAdminActionNote, isUndoWindowOpen, getAdminVisibleMessage } from '@/lib/admin-report-action';

export default async function CommunityPostThreadPage({ 
  params 
}: { 
  params: { id: string; postId: string } 
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let routeKey = ''
  try {
    routeKey = decodeURIComponent(params.id || '').trim()
  } catch {
    return notFound()
  }

  // 1. Fetch Community
  let { data: community, error: commError } = await supabase
    .from('communities')
    .select('*, owner:profiles!owner_id(id,username,full_name,avatar_url,university,role)')
    .eq('id', routeKey)
    .single();

  if (commError || !community) {
    const fallback = await supabase
      .from('communities')
      .select('*, owner:profiles!owner_id(id,username,full_name,avatar_url,university,role)')
      .eq('slug', routeKey)
      .single()
    community = fallback.data
    commError = fallback.error
  }

  if (commError || !community || community.moderation !== 'approved') {
    return notFound();
  }

  // 2. Fetch Specific Post
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('*, author:profiles!author_id(id,username,full_name,avatar_url,university)')
    .eq('id', params.postId)
    .eq('community_id', community.id)
    .maybeSingle();

  if (postError || !post) {
    return notFound();
  }

  // 3. Security Check (Moderation)
  const isOwner = user?.id === community.owner_id;
  const isAuthor = user?.id === post.author_id;
  
  const { data: viewerProfile } = user 
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle() 
    : { data: null };
  const isAdmin = viewerProfile?.role === 'admin';

  if (post.moderation === 'pending' && !isOwner && !isAuthor && !isAdmin) {
    return notFound();
  }

  // 4. Fetch Comments for this post
  const { data: comments } = await supabase
    .from('comments')
    .select('*, author:profiles!author_id(id,username,full_name,avatar_url)')
    .eq('post_id', post.id)
    .in('moderation', isOwner || isAdmin ? ['approved', 'pending'] : ['approved'])
    .order('created_at', { ascending: true });

  // 5. Membership Status
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

  const name = community.name;
  const coverImage = community.banner_url || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=1200";
  const avatarUrl = community.avatar_url || null;

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Header / Identity Bar (Simplified for Thread view) */}
      <div className="bg-white border-b border-border shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link 
            href={`/communities/${params.id}`}
            className="flex items-center gap-3 text-text-muted hover:text-primary transition-colors group"
          >
            <span className="material-symbols-outlined transition-transform group-hover:-translate-x-1">arrow_back</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-border bg-surface relative">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary bg-primary/5">
                    <span className="material-symbols-outlined text-sm">groups</span>
                  </div>
                )}
              </div>
              <span className="text-xs font-black uppercase tracking-widest">{name}</span>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
             {!isOwner && <CommunityJoinButton communityId={community.id} initialIsMember={isMember} />}
             {isOwner && (
               <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 flex items-center gap-2">
                 <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                 Moderator
               </span>
             )}
          </div>
        </div>
      </div>

      {/* Thread Content */}
      <div className="max-w-4xl mx-auto px-6 pt-12">
        <div className="mb-8">
           <h2 className="text-xs font-bold text-text-muted uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
             <span className="w-8 h-[2px] bg-primary/20"></span>
             Discussion Thread
           </h2>
        </div>

        <CommunityIssuesFeed
          initialPosts={[post]}
          initialComments={comments || []}
          canInteract={!!user && (isMember || isOwner || isAdmin)}
          currentUserId={user?.id}
          communityOwnerId={community.owner_id}
          communityId={community.id}
          isViewerAdmin={isAdmin}
          initialExpandedId={post.id}
        />
      </div>
    </main>
  );
}
