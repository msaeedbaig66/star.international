import { createAdminClient } from '@/lib/supabase/admin';
import { ListingsManager } from '@/components/admin/listings-manager';

export const dynamic = 'force-dynamic';

export default async function ListingsQueuePage() {
  const supabase = createAdminClient();
  if (!supabase) return <div>Missing Admin Client Configuration</div>

  // Fetch Stats for Top Bar
  const [
    { count: pendingCount },
    { count: approvedToday },
    { count: rejectedToday },
    { count: totalToday },
  ] = await Promise.all([
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('moderation', 'pending').neq('status', 'removed'),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('moderation', 'approved').gte('updated_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('moderation', 'rejected').gte('updated_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
    supabase.from('listings').select('*', { count: 'exact', head: true }).gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
  ]);

  // Initial Fetch (safe two-step mapping to avoid relation-cache mismatches)
  const { data: listingsRaw } = await supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false });

  const sellerIds = Array.from(new Set((listingsRaw || []).map((l: any) => l.seller_id).filter(Boolean)));
  const { data: sellers } = sellerIds.length
    ? await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, university, created_at, rating_avg')
        .in('id', sellerIds)
    : { data: [] as any[] };

  const sellerById = new Map((sellers || []).map((s: any) => [s.id, s]));
  const listings = (listingsRaw || []).map((l: any) => ({
    ...l,
    seller: sellerById.get(l.seller_id) || {
      id: l.seller_id,
      username: 'unknown',
      full_name: 'Unknown Seller',
      avatar_url: '/images/default-avatar.svg',
      university: 'N/A',
    },
  }));

  return (
    <ListingsManager 
      initialListings={listings || []} 
      stats={{
        pending: pendingCount || 0,
        approved: approvedToday || 0,
        rejected: rejectedToday || 0,
        total: totalToday || 0
      }}
    />
  );
}
