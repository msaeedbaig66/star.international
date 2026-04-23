// ── Professional branded loading skeleton for the Home page ──
// Pure CSS, zero JS imports — renders instantly while server components load

function NavbarSkeleton() {
 return (
 <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
 <div className="max-w-7xl mx-auto px-4 h-[72px] flex items-center justify-between gap-6">
 <div className="w-[140px] h-10 rounded-xl bg-slate-100 animate-pulse" />
 <div className="flex-1 max-w-2xl hidden md:block">
 <div className="w-full h-11 rounded-full bg-slate-100 animate-pulse" />
 </div>
 <div className="flex items-center gap-3">
 <div className="w-24 h-10 rounded-full bg-slate-100 animate-pulse hidden md:block" />
 <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
 </div>
 </div>
 </div>
 )
}

function HeroSkeleton() {
 return (
 <div className="relative h-[340px] sm:h-[380px] lg:h-[460px] w-full rounded-2xl overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
 <div className="absolute inset-0 skeleton-shimmer" />
 <div className="absolute bottom-8 left-8 space-y-3">
 <div className="h-8 w-64 bg-white/40 rounded-lg animate-pulse" />
 <div className="h-5 w-48 bg-white/30 rounded-lg animate-pulse" />
 <div className="h-10 w-32 bg-white/20 rounded-full animate-pulse mt-4" />
 </div>
 </div>
 )
}

function SectionSkeleton({ cards = 4 }: { cards?: number }) {
 return (
 <div className="py-4 sm:py-6">
 <div className="flex items-center gap-3 mb-5">
 <div className="w-9 h-9 rounded-xl bg-slate-100 animate-pulse" />
 <div className="h-5 w-36 bg-slate-100 rounded-lg animate-pulse" />
 </div>
 <div className="flex gap-3 sm:gap-4 overflow-hidden">
 {Array.from({ length: cards }).map((_, i) => (
 <div key={i} className="flex-shrink-0 w-[240px] sm:w-[260px] md:w-[280px]">
 <div className="aspect-[4/3] w-full rounded-2xl bg-slate-100 animate-pulse" />
 <div className="p-3 space-y-2">
 <div className="h-4 w-3/4 bg-slate-100 rounded-lg animate-pulse" />
 <div className="h-4 w-1/2 bg-slate-100 rounded-lg animate-pulse" />
 </div>
 </div>
 ))}
 </div>
 </div>
 )
}

export default function HomePageLoading() {
 return (
 <>
 <NavbarSkeleton />
 <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-6 space-y-6">
 <HeroSkeleton />
 <SectionSkeleton />
 <SectionSkeleton cards={3} />
 <SectionSkeleton />
 </div>
 </>
 )
}
