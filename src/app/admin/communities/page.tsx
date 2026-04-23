import { createAdminClient } from '@/lib/supabase/admin';
import { CommunitiesManager } from '@/components/admin/communities-manager';

export const dynamic = 'force-dynamic';

export default async function CommunitiesQueuePage() {
  const supabase = createAdminClient();
  if (!supabase) return <div>Missing Admin Client Configuration</div>

  // Fetch Stats for Top Bar
  const [
    { count: pendingCount },
    { count: approvedToday },
    { count: rejectedToday },
    { count: totalToday },
  ] = await Promise.all([
    supabase.from('communities').select('*', { count: 'exact', head: true }).eq('moderation', 'pending'),
    supabase.from('communities').select('*', { count: 'exact', head: true }).eq('moderation', 'approved').gte('updated_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
    supabase.from('communities').select('*', { count: 'exact', head: true }).eq('moderation', 'rejected').gte('updated_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
    supabase.from('communities').select('*', { count: 'exact', head: true }).gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
  ]);

  // Initial Fetch (safe two-step mapping avoids ambiguous relation embeds)
  const { data: communitiesRaw } = await supabase
    .from('communities')
    .select('*')
    .order('created_at', { ascending: false });

  const ownerIds = Array.from(
    new Set((communitiesRaw || []).map((community: any) => community.owner_id).filter(Boolean))
  );

  const { data: owners } = ownerIds.length
    ? await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, university')
        .in('id', ownerIds)
    : { data: [] as any[] };

  const ownerById = new Map((owners || []).map((owner: any) => [owner.id, owner]));
  const communities = (communitiesRaw || []).map((community: any) => ({
    ...community,
    owner: ownerById.get(community.owner_id) || {
      id: community.owner_id,
      username: 'unknown',
      full_name: 'Unknown Owner',
      avatar_url: '/images/default-avatar.svg',
      university: 'N/A',
    },
  }));

  return (
    <CommunitiesManager 
      initialCommunities={communities || []}
      stats={{
        pending: pendingCount || 0,
        approved: approvedToday || 0,
        rejected: rejectedToday || 0,
        total: totalToday || 0
      }}
    />
  );
}
