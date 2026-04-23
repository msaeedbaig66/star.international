import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default async function BannedPage() {
 const supabase = await createClient();
 const { data: { user } } = await supabase.auth.getUser();

 if (!user) {
 redirect('/login');
 }

 const { data: profile } = await supabase
 .from('profiles')
 .select('is_banned, ban_reason, banned_at')
 .eq('id', user.id)
 .single();

 if (!profile?.is_banned) {
 redirect('/');
 }

 return (
 <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
 <div className="max-w-2xl w-full text-center space-y-10 animate-in fade-in zoom-in duration-700">
 <div className="relative inline-block">
 <div className="w-24 h-24 rounded-[2rem] bg-destructive/10 flex items-center justify-center text-destructive mx-auto shadow-2xl shadow-destructive/20 ring-4 ring-destructive/5">
 <span className="material-symbols-outlined text-[48px] font-bold">lock_person</span>
 </div>
 <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-destructive text-white flex items-center justify-center border-4 border-background animate-pulse">
 <span className="material-symbols-outlined text-sm font-bold">warning</span>
 </div>
 </div>

 <div className="space-y-4">
 <h1 className="text-4xl sm:text-5xl font-black text-text-primary tracking-tighter uppercase leading-[0.9]">
 Account <br />
 <span className="text-destructive underline decoration-8 decoration-destructive/20 underline-offset-8">Restricted</span>
 </h1>
 <p className="text-text-secondary font-bold text-lg max-w-md mx-auto leading-relaxed">
 Your Allpanga access has been suspended due to a violation of our community guidelines.
 </p>
 </div>

 <div className="bg-surface border border-border rounded-[2.5rem] p-8 sm:p-12 space-y-6 shadow-xl text-left relative overflow-hidden group">
 <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-destructive/10 transition-colors" />
 
 <div className="space-y-1">
 <p className="text-[10px] uppercase tracking-[0.25em] text-text-muted font-black">Reason for Suspension</p>
 <p className="text-xl font-black text-text-primary leading-tight">
 {profile.ban_reason || 'Compliance with safety protocols and marketplace integrity.'}
 </p>
 </div>

 <div className="pt-6 border-t border-border flex items-center gap-2 text-text-muted">
 <span className="material-symbols-outlined text-base">info</span>
 <p className="text-xs font-bold uppercase tracking-widest leading-none">
 Decision finalized on {new Date(profile.banned_at || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
 </p>
 </div>
 </div>

 <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
 <Link
 href="/contact"
 className="w-full sm:w-auto px-10 h-14 rounded-2xl bg-text-primary text-white text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center hover:bg-primary transition-all active:scale-95 shadow-lg shadow-text-primary/20"
 >
 Appeal Decision
 </Link>
 <form action="/api/auth/logout" method="POST" className="w-full sm:w-auto">
 <button
 type="submit"
 className="w-full sm:w-auto px-10 h-14 rounded-2xl border border-border bg-white text-text-secondary text-xs font-black uppercase tracking-[0.2em] hover:bg-surface transition-all active:scale-95"
 >
 Sign Out
 </button>
 </form>
 </div>

 <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.1em]">
 Powered by Allpanga Emerald • Trust & Safety Team
 </p>
 </div>
 </main>
 );
}
