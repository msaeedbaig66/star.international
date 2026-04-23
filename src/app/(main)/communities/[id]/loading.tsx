// ── Professional loading skeleton for Community detail page ──

export default function CommunityDetailLoading() {
 return (
 <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
 {/* Cover banner */}
 <div className="h-48 sm:h-64 w-full rounded-2xl bg-slate-100 animate-pulse mb-6" />

 {/* Community header */}
 <div className="flex items-start gap-4 mb-8">
 <div className="w-16 h-16 rounded-2xl bg-slate-100 animate-pulse flex-shrink-0 -mt-8 border-4 border-white relative z-10" />
 <div className="flex-1 space-y-2 pt-1">
 <div className="h-7 w-48 bg-slate-100 rounded-lg animate-pulse" />
 <div className="h-4 w-32 bg-slate-50 rounded-lg animate-pulse" />
 </div>
 <div className="h-10 w-24 rounded-full bg-slate-100 animate-pulse" />
 </div>

 {/* Description */}
 <div className="space-y-2 mb-8 pb-6 border-b border-slate-100">
 <div className="h-4 w-full bg-slate-50 rounded-lg animate-pulse" />
 <div className="h-4 w-3/4 bg-slate-50 rounded-lg animate-pulse" />
 </div>

 {/* Posts skeleton */}
 <div className="space-y-4">
 {Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse" />
 <div className="space-y-1">
 <div className="h-4 w-24 bg-slate-100 rounded-lg animate-pulse" />
 <div className="h-3 w-16 bg-slate-50 rounded-lg animate-pulse" />
 </div>
 </div>
 <div className="h-4 w-full bg-slate-50 rounded-lg animate-pulse" />
 <div className="h-4 w-2/3 bg-slate-50 rounded-lg animate-pulse" />
 </div>
 ))}
 </div>
 </div>
 )
}
