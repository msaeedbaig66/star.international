// ── Professional loading skeleton for the Marketplace page ──

function FilterBarSkeleton() {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {[80, 100, 70, 90, 60].map((w, i) => (
        <div key={i} style={{ width: w }} className="h-9 rounded-full bg-slate-100 animate-pulse" />
      ))}
    </div>
  )
}

function ListingCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="aspect-[4/3] w-full bg-slate-100 animate-pulse" />
      <div className="p-4 space-y-2.5">
        <div className="h-4 w-3/4 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-4 w-1/2 bg-slate-100 rounded-lg animate-pulse" />
        <div className="flex items-center justify-between mt-2">
          <div className="h-6 w-20 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export default function MarketplaceLoading() {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {/* Page Title */}
      <div className="mb-6 space-y-2">
        <div className="h-8 w-48 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-4 w-72 bg-slate-50 rounded-lg animate-pulse" />
      </div>

      <FilterBarSkeleton />

      {/* Grid of listing cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
