// ── Professional loading skeleton for the Dashboard page ──

function SidebarSkeleton() {
  return (
    <div className="hidden md:flex w-[260px] flex-shrink-0 flex-col bg-white border-r border-slate-100 p-4 space-y-2">
      {/* Profile area */}
      <div className="flex items-center gap-3 p-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
        <div className="space-y-1.5 flex-1">
          <div className="h-4 w-24 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-3 w-16 bg-slate-50 rounded-lg animate-pulse" />
        </div>
      </div>
      {/* Nav items */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <div className="w-5 h-5 rounded bg-slate-100 animate-pulse" />
          <div className="h-4 rounded-lg bg-slate-100 animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
        </div>
      ))}
    </div>
  )
}

function ContentSkeleton() {
  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-7 w-40 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-4 w-64 bg-slate-50 rounded-lg animate-pulse" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-slate-100 rounded-lg animate-pulse" />
              <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
            </div>
            <div className="h-7 w-16 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>

      {/* Content area */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <div className="h-5 w-32 bg-slate-100 rounded-lg animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0">
            <div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-3/4 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-3 w-1/2 bg-slate-50 rounded-lg animate-pulse" />
            </div>
            <div className="h-8 w-16 rounded-full bg-slate-100 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div className="flex h-[calc(100vh-72px)] bg-[#f8fafb]">
      <SidebarSkeleton />
      <ContentSkeleton />
    </div>
  )
}
