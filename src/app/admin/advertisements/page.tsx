import { createAdminClient } from '@/lib/supabase/admin';
import { AdvertisementsManager } from '@/components/admin/advertisements-manager';

export default async function AdvertisementsPage() {
  const supabase = createAdminClient();
  if (!supabase) return <div>Missing Admin Client Configuration</div>

  // Fetch Stats
  const [
    { count: activeCount },
    { count: inactiveCount },
    { count: totalCount },
  ] = await Promise.all([
    supabase.from('advertisements').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('advertisements').select('*', { count: 'exact', head: true }).eq('is_active', false),
    supabase.from('advertisements').select('*', { count: 'exact', head: true }),
  ]);

  // Initial Fetch (Order by display_order)
  const { data: ads } = await supabase
    .from('advertisements')
    .select('*')
    .order('display_order', { ascending: true });

  return (
    <AdvertisementsManager 
      initialAds={ads || []} 
      stats={{
        active: activeCount || 0,
        inactive: inactiveCount || 0,
        total: totalCount || 0
      }}
    />
  );
}
