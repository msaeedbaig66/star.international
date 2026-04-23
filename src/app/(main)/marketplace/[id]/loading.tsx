// ── Professional loading skeleton for Marketplace listing detail ──

export default function MarketplaceDetailLoading() {
 return (
 <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
 {/* Image gallery skeleton */}
 <div className="space-y-3">
 <div className="aspect-square w-full rounded-2xl bg-slate-100 animate-pulse" />
 <div className="flex gap-2">
 {[1, 2, 3, 4].map(i => (
 <div key={i} className="w-20 h-20 rounded-xl bg-slate-100 animate-pulse flex-shrink-0" />
 ))}
 </div>
 </div>

 {/* Details skeleton */}
 <div className="space-y-5">
 <div className="space-y-2">
 <div className="h-8 w-3/4 bg-slate-100 rounded-lg animate-pulse" />
 <div className="h-4 w-1/2 bg-slate-50 rounded-lg animate-pulse" />
 </div>
 <div className="h-10 w-32 bg-slate-100 rounded-xl animate-pulse" />
 <div className="border-t border-slate-100 pt-5 space-y-3">
 <div className="h-4 w-full bg-slate-50 rounded-lg animate-pulse" />
 <div className="h-4 w-full bg-slate-50 rounded-lg animate-pulse" />
 <div className="h-4 w-2/3 bg-slate-50 rounded-lg animate-pulse" />
 </div>
 <div className="flex items-center gap-3 pt-4">
 <div className="w-12 h-12 rounded-full bg-slate-100 animate-pulse" />
 <div className="space-y-1.5">
 <div className="h-4 w-28 bg-slate-100 rounded-lg animate-pulse" />
 <div className="h-3 w-20 bg-slate-50 rounded-lg animate-pulse" />
 </div>
 </div>
 <div className="flex gap-3 pt-4">
 <div className="h-12 flex-1 rounded-xl bg-slate-100 animate-pulse" />
 <div className="h-12 flex-1 rounded-xl bg-slate-100 animate-pulse" />
 </div>
 </div>
 </div>
 </div>
 )
}
