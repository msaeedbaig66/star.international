export default function Loading() {
  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center transition-opacity duration-500">
      <div className="relative">
        {/* Outer Ring */}
        <div className="w-20 h-20 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
        
        {/* Inner Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-emerald-600 text-3xl animate-pulse">school</span>
        </div>
      </div>
      
      {/* Branding */}
      <h2 className="mt-6 text-xl font-black text-slate-900 tracking-tighter uppercase transition-all">
        Allpanga <span className="text-emerald-500 inline-block animate-bounce">...</span>
      </h2>
      <p className="mt-2 text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">
        Initializing Workspace
      </p>
    </div>
  )
}
