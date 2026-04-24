// ── Premium Global Loading State for Allpanga ──
// This ensures that during server-side transitions, the user sees a polished
// and branded experience instead of a blank screen or partial content.

import { LoadingSpinner } from '@/components/shared/loading-spinner'

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="relative">
        {/* Outer Glow */}
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
        
        {/* Core Spinner */}
        <div className="relative flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-2xl flex items-center justify-center border border-primary/10 rotate-12 animate-in zoom-in-50 duration-500">
             <LoadingSpinner size="lg" />
          </div>
          
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-sm font-black text-text-primary uppercase tracking-[0.2em] animate-in slide-in-from-bottom-2 duration-700">
              Initializing
            </h2>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest animate-in slide-in-from-bottom-4 duration-1000">
              Synchronizing with Allpanga
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
