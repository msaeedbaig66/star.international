'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AdminSidebar } from './admin-sidebar';
import { AdminNavbar } from './admin-navbar';
import { User } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PageReveal } from '../shared/page-reveal';

interface AdminShellProps {
 children: ReactNode;
 user: User | null;
 initialUnlockStatus?: boolean;
 counts?: {
 listings: number;
 blogs: number;
 nexusHub: number;
 comments?: number;
 reports?: number;
 support?: number;
 slotRequests?: number;
 featureRequests?: number;
 orders?: number;
 sourcingRequests?: number;
 };
}

export function AdminShell({ children, user, counts, initialUnlockStatus = false }: AdminShellProps) {
 const router = useRouter();
 const pathname = usePathname();
 const supabase = createClient();
 const [isCollapsed, setIsCollapsed] = useState(false);
 const [isMounted, setIsMounted] = useState(false);

 useEffect(() => {
 setIsMounted(true);
 const saved = localStorage.getItem('admin_sidebar_collapsed');
 if (saved === 'true') setIsCollapsed(true);

 // ── Open Pipeline: Realtime Moderation Monitor ──
 const channel = supabase
 .channel('admin-pipeline')
 .on('postgres_changes', { event: '*', schema: 'public', table: 'communities' }, () => {
 router.refresh();
 })
 .on('postgres_changes', { event: '*', schema: 'public', table: 'blogs' }, () => {
 router.refresh();
 })
 .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => {
 router.refresh();
 })
 .subscribe();

 return () => {
 supabase.removeChannel(channel);
 };
 }, [router, supabase]);

 const toggleSidebar = () => {
 const next = !isCollapsed;
 setIsCollapsed(next);
 localStorage.setItem('admin_sidebar_collapsed', String(next));
 };

 const [isUnlocked, setIsUnlocked] = useState<boolean>(initialUnlockStatus);
 const [accessKey, setAccessKey] = useState('');
 const [isVerifying, setIsVerifying] = useState(false);
 const [unlockError, setUnlockError] = useState(false);

 // Sync with initial status if it changes (e.g. on mount)
 useEffect(() => {
 setIsUnlocked(initialUnlockStatus);
 }, [initialUnlockStatus]);

 const handleUnlock = async (e?: React.FormEvent) => {
 e?.preventDefault();
 if (isVerifying || !accessKey) return;

 try {
 setIsVerifying(true);
 const res = await fetch('/api/admin/verify-passcode', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ passcode: accessKey }),
 });

 if (res.ok) {
 setIsUnlocked(true);
 toast.success('Admin Panel Unlocked');
 router.refresh(); // Refresh to ensure layout state is synced
 } else {
 setUnlockError(true);
 setTimeout(() => setUnlockError(false), 500);
 toast.error('Invalid Admin Unlock Key');
 }
 } catch (err) {
 toast.error('Verification failed. Try again.');
 } finally {
 setIsVerifying(false);
 }
 };

 if (isUnlocked === null) return null;

 if (!isUnlocked) {
 return (
 <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
 <div className={cn(
 "max-w-md w-full bg-white rounded-[32px] p-8 sm:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100 transition-all duration-300",
 unlockError && "animate-shake border-destructive/30"
 )}>
 <div className="flex flex-col items-center text-center space-y-6">
 <div className="w-20 h-20 rounded-3xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
 <span className="material-symbols-outlined text-white text-4xl">admin_panel_settings</span>
 </div>
 
 <div className="space-y-2">
 <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Admin Access Required</h1>
 <p className="text-slate-500 text-sm font-medium leading-relaxed">
 Verification required to access administrative controls.<br />
 Please enter your secondary security key.
 </p>
 </div>

 <form onSubmit={handleUnlock} className="w-full space-y-4 pt-4">
 <div className="relative">
 <input
 type="password"
 autoFocus
 placeholder="Enter Security Key"
 value={accessKey}
 onChange={(e) => setAccessKey(e.target.value)}
 className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 text-center text-lg font-bold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
 />
 </div>

 <button
 type="submit"
 disabled={isVerifying}
 className={cn(
 "w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50",
 isVerifying && "cursor-wait"
 )}
 >
 {isVerifying ? 'Verifying...' : 'Unlock Dashboard'}
 </button>
 </form>

 <button 
 onClick={() => router.push('/')}
 className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors"
 >
 Return to Website
 </button>
 </div>
 </div>

 <style jsx global>{`
 @keyframes shake {
 0%, 100% { transform: translateX(0); }
 25% { transform: translateX(-8px); }
 75% { transform: translateX(8px); }
 }
 .animate-shake { animation: shake 0.2s ease-in-out infinite; }
 `}</style>
 </div>
 );
 }

 return (
 <div className="flex min-h-screen bg-surface font-sans">
 <AdminSidebar counts={counts} isCollapsed={isCollapsed} />
 
 <div className={cn(
 "flex-1 flex flex-col justify-start transition-all duration-300 ease-in-out",
 isCollapsed ? "ml-[80px]" : "ml-[260px]"
 )}>
 <AdminNavbar user={user} onToggleSidebar={toggleSidebar} isSidebarCollapsed={isCollapsed} />
 
 <main className="flex-1 p-8 pt-24 min-h-screen overflow-x-hidden">
 <div className="max-w-[1440px] mx-auto animate-in fade-in duration-500">
 <PageReveal key={pathname}>{children}</PageReveal>
 </div>
 </main>
 </div>
 </div>
 );
}
