import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/admin-shell';

export const dynamic = 'force-dynamic';

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

 // Check role and status in parallel with initial verify check
 const { data: profile } = await supabase
 .from('profiles')
 .select('role, is_banned')
 .eq('id', user.id)
 .single();

 if (profile?.is_banned) {
 redirect('/banned');
 }

 if (profile?.role !== 'admin') {
 redirect('/');
 }

 // Check for secure admin passcode cookie
 const isUnlocked = (await import('next/headers')).cookies().get('admin_unlocked')?.value === 'true';

 // Fetch pending counts for Sidebar
 // Fetch pending counts for Sidebar - Single Promise for speed
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
 ] = await Promise.all([
 supabase.from('listings').select('id', { count: 'exact', head: true }).eq('moderation', 'pending'),
 supabase.from('blogs').select('id', { count: 'exact', head: true }).eq('moderation', 'pending'),
 supabase.from('communities').select('id', { count: 'exact', head: true }).eq('moderation', 'pending'),
 supabase.from('comments').select('id', { count: 'exact', head: true }).eq('moderation', 'pending'),
 supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
 supabase.from('slot_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
 supabase.from('feature_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
 supabase.from('support_requests').select('id', { count: 'exact', head: true }).eq('status', 'open'),
 supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
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
 };

 return (
 <AdminShell user={user} counts={counts} initialUnlockStatus={isUnlocked}>
 {children}
 </AdminShell>
 );
}
