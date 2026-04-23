// ── Professional loading skeleton for the Communities page ──

function CommunityCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse flex-shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-5 w-3/4 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-3 w-1/2 bg-slate-50 rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-slate-50 rounded-lg animate-pulse" />
        <div className="h-3 w-2/3 bg-slate-50 rounded-lg animate-pulse" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex -space-x-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-7 h-7 rounded-full bg-slate-100 animate-pulse border-2 border-white" />
          ))}
        </div>
        <div className="h-8 w-20 rounded-full bg-slate-100 animate-pulse" />
      </div>
    </div>
  )
}

export default function CommunitiesLoading() {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {/* Page Title */}
      <div className="mb-6 space-y-2">
        <div className="h-8 w-44 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-4 w-64 bg-slate-50 rounded-lg animate-pulse" />
      </div>

      {/* Grid of community cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <CommunityCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
