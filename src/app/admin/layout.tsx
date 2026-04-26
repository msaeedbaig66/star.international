import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/admin-shell';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Strict Role Check: Deep dive into profile to ensure it's an admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_banned')
    .eq('id', user.id)
    .single();

  if (profile?.is_banned) {
    redirect('/banned');
  }

  // "just on admin email login" - if they aren't an admin or subadmin, kick them out immediately
  if (profile?.role !== 'admin' && profile?.role !== 'subadmin') {
    redirect('/');
  }

  // 2. Passcode Verification: Verify the HMAC token in the cookie
  const adminToken = (await cookies()).get('admin_unlocked')?.value;
  const passcode = process.env.ADMIN_PANEL_PASSCODE;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  let isUnlocked = false;
  
  if (adminToken && passcode && serviceRoleKey) {
    // Re-calculate the expected HMAC to verify the cookie is authentic
    const encoder = new TextEncoder();
    const keyData = encoder.encode(serviceRoleKey);
    const data = encoder.encode(passcode);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const expectedToken = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (timingSafeEqual(adminToken, expectedToken)) {
      isUnlocked = true;
    }
  }

  // 3. Fetch pending counts for Sidebar
  const adminClient = await import('@/lib/supabase/admin').then(m => m.createAdminClient());
  const [
    listingsRes,
    blogsRes,
    communitiesRes,
    commentsRes,
    reportsRes,
    slotRequestsRes,
    featureRequestsRes,
    supportRes,
    ordersRes,
    sourcingRes,
  ] = await Promise.all([
    adminClient.from('listings').select('id', { count: 'exact', head: true }).eq('moderation', 'pending'),
    adminClient.from('blogs').select('id', { count: 'exact', head: true }).eq('moderation', 'pending'),
    adminClient.from('communities').select('id', { count: 'exact', head: true }).eq('moderation', 'pending'),
    adminClient.from('comments').select('id', { count: 'exact', head: true }).eq('moderation', 'pending'),
    adminClient.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    adminClient.from('slot_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    adminClient.from('feature_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    adminClient.from('support_requests').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    adminClient.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    adminClient.from('sourcing_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const counts = {
    listings: listingsRes.count || 0,
    blogs: blogsRes.count || 0,
    nexusHub: communitiesRes.count || 0,
    comments: commentsRes.count || 0,
    reports: reportsRes.count || 0,
    slotRequests: slotRequestsRes.count || 0,
    featureRequests: featureRequestsRes.count || 0,
    support: supportRes.count || 0,
    orders: ordersRes.count || 0,
    sourcingRequests: sourcingRes.count || 0,
  };

  return (
    <AdminShell user={user} counts={counts} initialUnlockStatus={isUnlocked}>
      {children}
    </AdminShell>
  );
}
