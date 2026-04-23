'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RejectModalProps {
 isOpen: boolean;
 onClose: () => void;
 id: string;
 type: 'listing' | 'blog' | 'community';
 onSuccess?: () => void;
}

const rejectReasons: Record<string, string[]> = {
 listing: [
 'Contact information in description',
 'Price appears fraudulent',
 'Not academic related',
 'Inappropriate content',
 'Duplicate listing',
 'Other',
 ],
 blog: [
 'External commercial links',
 'Not educational content',
 'Plagiarized content',
 'Inappropriate language',
 'Insufficient quality',
 'Other',
 ],
 community: [
 'Name is institution-specific',
 'Duplicate community',
 'Inappropriate purpose',
 'Private group not open to all',
 'Other',
 ],
};

export function RejectModal({ isOpen, onClose, id, type, onSuccess }: RejectModalProps) {
 const router = useRouter();
 const [reason, setReason] = useState(rejectReasons[type][0]);
 const [message, setMessage] = useState('');
 const [loading, setLoading] = useState(false);

 if (!isOpen) return null;

 const handleReject = async () => {
 try {
 setLoading(true);
 const res = await fetch('/api/admin/reject', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ id, type, reason, message }),
 });

 if (!res.ok) throw new Error('Failed to reject');

 toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} rejected successfully`);
 onSuccess?.();
 router.refresh(); // Update sidebar count
 onClose();
 } catch (error) {
 toast.error('Failed to reject item');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="fixed inset-0 bg-text-primary/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
 <div 
 className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 transform animate-in zoom-in duration-300"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex justify-between items-start mb-6">
 <div>
 <h3 className="text-xl font-bold text-text-primary">Reject this {type}</h3>
 <p className="text-sm text-text-secondary mt-1">Provide a clear reason for the user</p>
 </div>
 <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary transition-colors">
 <span className="material-symbols-outlined shrink-0">close</span>
 </button>
 </div>

 <div className="space-y-6">
 <div>
 <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Rejection Reason</label>
 <select 
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 className="w-full bg-surface border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-destructive/20 border-border"
 >
 {rejectReasons[type].map((r) => (
 <option key={r} value={r}>{r}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Custom Message (Optional)</label>
 <textarea 
 value={message}
 onChange={(e) => setMessage(e.target.value)}
 className="w-full bg-surface border-none rounded-lg p-4 text-sm focus:ring-2 focus:ring-destructive/20 border-border"
 placeholder="e.g. Please remove your phone number from the description..."
 rows={3}
 />
 </div>

 <div className="flex gap-3 pt-2">
 <button
 onClick={handleReject}
 disabled={loading}
 className="flex-1 py-4 bg-destructive text-white rounded-full font-bold shadow-lg shadow-destructive/20 active:scale-95 disabled:opacity-50 transition-transform leading-none"
 >
 {loading ? (
 <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
 ) : (
 'Confirm Rejection'
 )}
 </button>
 <button 
 onClick={onClose}
 className="px-8 py-4 bg-surface text-text-secondary rounded-full font-bold hover:bg-border transition-all active:scale-95 leading-none"
 >
 Cancel
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}
