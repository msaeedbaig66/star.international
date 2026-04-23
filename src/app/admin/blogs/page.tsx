import { createAdminClient } from '@/lib/supabase/admin';
import { BlogsManager } from '@/components/admin/blogs-manager';

export const dynamic = 'force-dynamic';

export default async function BlogsQueuePage() {
 const supabase = createAdminClient();
 if (!supabase) return <div>Missing Admin Client Configuration</div>

 // Fetch Stats for Top Bar
 const [
 { count: pendingCount },
 { count: approvedToday },
 { count: rejectedToday },
 { count: totalToday },
 ] = await Promise.all([
 supabase.from('blogs').select('*', { count: 'exact', head: true }).eq('moderation', 'pending'),
 supabase.from('blogs').select('*', { count: 'exact', head: true }).eq('moderation', 'approved').gte('updated_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
 supabase.from('blogs').select('*', { count: 'exact', head: true }).eq('moderation', 'rejected').gte('updated_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
 supabase.from('blogs').select('*', { count: 'exact', head: true }).gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
 ]);

 // Initial Fetch (safe two-step mapping to avoid relation-cache mismatches)
 const { data: blogsRaw } = await supabase
 .from('blogs')
 .select('*')
 .order('created_at', { ascending: false });

 const authorIds = Array.from(new Set((blogsRaw || []).map((b: any) => b.author_id).filter(Boolean)))
 const { data: authors } = authorIds.length
 ? await supabase
 .from('profiles')
 .select('id, username, full_name, avatar_url, university')
 .in('id', authorIds)
 : { data: [] as any[] }

 const authorById = new Map((authors || []).map((a: any) => [a.id, a]))
 const blogs = (blogsRaw || []).map((b: any) => ({
 ...b,
 author: authorById.get(b.author_id) || {
 id: b.author_id,
 username: 'unknown',
 full_name: 'Unknown Author',
 avatar_url: '/images/default-avatar.svg',
 university: 'N/A',
 },
 }))

 return (
 <BlogsManager 
 initialBlogs={blogs || []} 
 stats={{
 pending: pendingCount || 0,
 approved: approvedToday || 0,
 rejected: rejectedToday || 0,
 total: totalToday || 0
 }}
 />
 );
}
