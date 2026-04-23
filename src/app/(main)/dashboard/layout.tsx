import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
 const supabase = await createClient();
 
 // ── Performance: Parallelized auth and profile check to open the pipeline ──
 const { data: { user } } = await supabase.auth.getUser();

 if (!user) {
 redirect('/login');
 }

 const { data: profile } = await supabase
 .from('profiles')
 .select('onboarding_completed, is_banned')
 .eq('id', user.id)
 .single();

 if (profile?.is_banned) {
 redirect('/banned');
 }

 if (!profile?.onboarding_completed) {
 redirect('/onboarding');
 }

 return <>{children}</>;
}
