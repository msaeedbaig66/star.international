'use client';

import { cn } from '@/lib/utils';

interface BulkActionBarProps {
  selectedCount: number;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onClear: () => void;
  loading?: boolean;
}

export function BulkActionBar({ selectedCount, onApproveAll, onRejectAll, onClear, loading }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] w-auto">
      <div className="bg-text-primary text-white border border-white/10 px-8 py-4 rounded-full shadow-2xl flex items-center gap-10 animate-in slide-in-from-bottom duration-500">
        <div className="flex items-center gap-4">
          <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm ring-4 ring-primary/20">
            {selectedCount}
          </span>
          <span className="font-bold text-sm tracking-tight whitespace-nowrap text-white/90">
            items selected
          </span>
        </div>
        
        <div className="h-6 w-[1px] bg-white/20"></div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={onApproveAll}
            disabled={loading}
            className="px-6 py-2.5 bg-primary text-white rounded-full text-sm font-black hover:bg-primary/90 transition-all font-sans disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Approve All'}
          </button>
          <button 
            onClick={onRejectAll}
            disabled={loading}
            className="px-6 py-2.5 text-white/70 hover:text-white transition-colors text-sm font-bold disabled:opacity-50"
          >
            Reject All
          </button>
          <button 
            onClick={onClear}
            className="p-2 text-white/40 hover:text-white transition-colors group"
          >
            <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform duration-300">close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
