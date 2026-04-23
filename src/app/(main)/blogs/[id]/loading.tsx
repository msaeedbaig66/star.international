// ── Professional loading skeleton for Blog detail page ──

export default function BlogDetailLoading() {
 return (
 <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
 {/* Back link */}
 <div className="h-4 w-20 bg-slate-100 rounded-lg animate-pulse mb-6" />

 {/* Cover image */}
 <div className="aspect-[2/1] w-full rounded-2xl bg-slate-100 animate-pulse mb-8" />

 {/* Title */}
 <div className="space-y-3 mb-6">
 <div className="h-9 w-full bg-slate-100 rounded-lg animate-pulse" />
 <div className="h-9 w-2/3 bg-slate-100 rounded-lg animate-pulse" />
 </div>

 {/* Author row */}
 <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
 <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
 <div className="space-y-1.5">
 <div className="h-4 w-28 bg-slate-100 rounded-lg animate-pulse" />
 <div className="h-3 w-36 bg-slate-50 rounded-lg animate-pulse" />
 </div>
 </div>

 {/* Content lines */}
 <div className="space-y-3">
 {Array.from({ length: 12 }).map((_, i) => (
 <div
 key={i}
 className="h-4 bg-slate-50 rounded-lg animate-pulse"
 style={{ width: `${65 + Math.random() * 35}%` }}
 />
 ))}
 </div>
 </div>
 )
}
