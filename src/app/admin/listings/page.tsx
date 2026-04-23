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

  const { data: listings } = await supabase
    .from('listings')
    .select('*, seller:profiles!seller_id(id, username, full_name, avatar_url, university, created_at, rating_avg)')
    .order('created_at', { ascending: false });

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
