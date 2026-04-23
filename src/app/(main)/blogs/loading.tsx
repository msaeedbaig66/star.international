// ── Professional loading skeleton for the Blogs page ──

function BlogCardSkeleton() {
 return (
 <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
 <div className="aspect-[16/9] w-full bg-slate-100 animate-pulse" />
 <div className="p-4 space-y-2.5">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-slate-100 animate-pulse" />
 <div className="h-3 w-24 bg-slate-100 rounded-lg animate-pulse" />
 <div className="h-3 w-16 bg-slate-50 rounded-lg animate-pulse ml-auto" />
 </div>
 <div className="h-5 w-full bg-slate-100 rounded-lg animate-pulse" />
 <div className="h-4 w-2/3 bg-slate-50 rounded-lg animate-pulse" />
 </div>
 </div>
 )
}

export default function BlogsLoading() {
 return (
 <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
 {/* Page Title */}
 <div className="mb-6 space-y-2">
 <div className="h-8 w-32 bg-slate-100 rounded-lg animate-pulse" />
 <div className="h-4 w-56 bg-slate-50 rounded-lg animate-pulse" />
 </div>

 {/* Category pills */}
 <div className="flex gap-2 mb-6 overflow-hidden">
 {[60, 80, 70, 90, 50, 100].map((w, i) => (
 <div key={i} style={{ width: w }} className="h-8 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
 ))}
 </div>

 {/* Grid of blog cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
 {Array.from({ length: 9 }).map((_, i) => (
 <BlogCardSkeleton key={i} />
 ))}
 </div>
 </div>
 )
}
