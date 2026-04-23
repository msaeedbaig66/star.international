'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ApproveButtonProps {
 id: string;
 type: 'listing' | 'blog' | 'community';
 onSuccess?: () => void;
 className?: string;
 variant?: 'pill' | 'text' | 'full';
 label?: string;
}

export function ApproveButton({ id, type, onSuccess, className, variant = 'pill', label = 'Approve' }: ApproveButtonProps) {
 const router = useRouter();
 const [loading, setLoading] = useState(false);

 const handleApprove = async () => {
 try {
 setLoading(true);
 const res = await fetch('/api/admin/approve', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ id, type }),
 });
 const data = await res.json();
 if (!res.ok) throw new Error(data.error || 'Failed to approve');

 toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} approved successfully`);
 onSuccess?.();
 router.refresh();
 } catch (error: any) {
 toast.error(error.message || 'Failed to approve item');
 } finally {
 setLoading(false);
 }
 };

 if (variant === 'text') {
 return (
 <button 
 onClick={(e) => { e.stopPropagation(); handleApprove(); }}
 disabled={loading}
 className={cn("text-primary font-bold text-xs hover:underline disabled:opacity-50", className)}
 >
 {loading ? '...' : label}
 </button>
 );
 }

 return (
 <button
 onClick={(e) => { e.stopPropagation(); handleApprove(); }}
 disabled={loading}
 className={cn(
 "bg-primary text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 leading-none",
 variant === 'full' ? "w-full py-4 rounded-xl shadow-lg shadow-primary/20" : "px-6 py-2 rounded-full text-sm",
 className
 )}
 >
 {loading ? (
 <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 ) : (
 <span className="material-symbols-outlined text-lg">verified_user</span>
 )}
 {label}
 </button>
 );
}
