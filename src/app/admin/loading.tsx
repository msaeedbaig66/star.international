// ── Premium Admin Loading State ──
// Ensuring administrative transitions are smooth and professional.

import { LoadingSpinner } from '@/components/shared/loading-spinner'

export default function AdminLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
      <div className="w-12 h-12 rounded-xl bg-emerald-600/5 flex items-center justify-center border border-emerald-600/10">
         <LoadingSpinner size="md" className="!border-t-emerald-600" />
      </div>
      <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
        Fetching Records...
      </p>
    </div>
  )
}
