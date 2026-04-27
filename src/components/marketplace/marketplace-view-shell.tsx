'use client'

import React, { useState, useEffect, createContext, useContext } from 'react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'

interface MarketplaceContextType {
 isSidebarOpen: boolean
 setSidebarOpen: (open: boolean) => void
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined)

export function useMarketplace() {
 const context = useContext(MarketplaceContext)
 if (!context) {
 throw new Error('useMarketplace must be used within a MarketplaceProvider')
 }
 return context
}

interface MarketplaceViewShellProps {
 filters: React.ReactNode
 totalCount: number
 currentSource: string
 currentView: string
 sort: string
 children: React.ReactNode
 hideSourceToggles?: boolean
}

export function MarketplaceViewShell({
 filters,
 totalCount,
 currentSource,
 currentView,
 sort,
 children,
 hideSourceToggles = false
}: MarketplaceViewShellProps) {
 const [isSidebarOpen, setSidebarOpen] = useState(false)
 const [isSortOpen, setSortOpen] = useState(false)
 const [isMounted, setIsMounted] = useState(false)
 const searchParams = useSearchParams()
 const pathname = usePathname()

 useEffect(() => {
 setIsMounted(true)
 // Auto-open on large screens
 if (window.innerWidth >= 1280) {
 setSidebarOpen(true)
 }
 }, [])

 useEffect(() => {
   setSidebarOpen(false)
   setSortOpen(false)
 }, [searchParams, pathname])

 // Lock body scroll on mobile when sidebar is open
 useEffect(() => {
 if (isSidebarOpen && window.innerWidth < 1280) {
 document.body.style.overflow = 'hidden'
 } else {
 document.body.style.overflow = 'unset'
 }
 return () => { document.body.style.overflow = 'unset' }
 }, [isSidebarOpen])

 if (!isMounted) return null

 const createQueryString = (name: string, value: string) => {
 const params = new URLSearchParams(searchParams.toString())
 params.set(name, value)
 if (name === 'view') {
 params.delete('page')
 }
 return params.toString()
 }

 const sourceOptions = [
 { label: 'Market', value: 'market', icon: 'person' },
 { label: 'Store', value: 'store', icon: 'verified' },
 ]

 return (
 <MarketplaceContext.Provider value={{ isSidebarOpen, setSidebarOpen }}>
 <div className="flex flex-col xl:flex-row gap-8 relative">
 
 {/* Mobile Filter Drawer (Overlapping) */}
 <div className={cn(
 "fixed inset-0 z-[2000] xl:hidden transition-all duration-500",
 isSidebarOpen ? "visible" : "invisible"
 )}>
 {/* Backdrop */}
 <div 
 className={cn(
 "absolute inset-0 bg-[#081536]/60 backdrop-blur-sm transition-opacity duration-500",
 isSidebarOpen ? "opacity-100" : "opacity-0"
 )}
 onClick={() => setSidebarOpen(false)}
 />
 {/* Drawer Content */}
 <div className={cn(
  "fixed inset-y-0 left-0 w-[90%] max-w-[420px] bg-white z-[2000] shadow-2xl transition-transform duration-500 ease-buy-in-out p-6 sm:p-12 overflow-y-auto flex flex-col",
  isSidebarOpen ? "translate-x-0" : "-translate-x-full"
 )}>
  <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
  <div className="flex items-center gap-3">
  <span className="material-symbols-outlined text-primary font-black text-xl">tune</span>
  <span className="font-black text-xs uppercase tracking-widest text-[#1f3468]">Filters</span>
  </div>
  <button 
  onClick={() => setSidebarOpen(false)}
  className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-90"
  >
  <span className="material-symbols-outlined text-[24px]">close</span>
  </button>
  </div>
 {filters}
 </div>
 </div>

 {/* Desktop Persistent Sidebar */}
 <div className={cn(
 "hidden xl:block transition-all duration-500 ease-in-out shrink-0 sticky top-24 h-fit",
 isSidebarOpen ? "w-[25%] min-w-[280px] max-w-[340px] opacity-100" : "w-0 overflow-hidden opacity-0 pointer-events-none"
 )}>
 {filters}
 </div>

  {/* Content Area */}
  <section className="flex-grow min-w-0">
  <div className="flex flex-col gap-6 mb-10">
  {/* Context Header: Glass Lumina Matrix */}
  <div className="sticky top-4 z-40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 p-5 sm:p-7 rounded-[2rem] glass-lumina shadow-2xl shadow-slate-200/40">
  
  {/* Group 1: Filter & Discovery Count */}
  <div className="flex items-center gap-5">
  <button 
  onClick={() => setSidebarOpen(!isSidebarOpen)}
  className={cn(
  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg shrink-0 border-2",
  isSidebarOpen 
  ? "bg-slate-900 text-white border-slate-900 shadow-slate-900/20" 
  : "bg-white text-slate-900 border-slate-100 hover:border-primary/50"
  )}
  >
  <span className="material-symbols-outlined text-[22px] font-black">
  {window.innerWidth < 1280 ? 'tune' : (isSidebarOpen ? 'keyboard_double_arrow_left' : 'keyboard_double_arrow_right')}
  </span>
  </button>
  <div className="flex flex-col">
  <div className="flex items-baseline gap-2">
  <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">{totalCount}</span>
  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">discoveries</span>
  </div>
  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary italic mt-1.5 flex items-center gap-2">
    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
    Active Matrix
  </p>
  </div>
  </div>
 
  {/* Group 2: Controls Cluster (Toggles & Sort) */}
  <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-4 !ml-0 sm:!ml-auto">
  
  {/* Central Toggles: Tactile Feel */}
  {!hideSourceToggles && (
  <div className="flex p-1 bg-slate-100/50 rounded-2xl border border-slate-200/60 backdrop-blur-md flex-1 xs:flex-none">
  {sourceOptions.map(opt => (
  <Link
  key={opt.value}
  href={`${pathname}?${createQueryString('source', opt.value)}`}
  className={cn(
  "flex-1 xs:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2.5",
  currentSource === opt.value 
  ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50 border border-slate-200" 
  : "text-slate-400 hover:text-slate-600"
  )}
  >
  <span className="material-symbols-outlined text-[16px] font-bold">{opt.icon}</span>
  <span>{opt.label}</span>
  </Link>
  ))}
  </div>
  )}
 
  {/* Sort Control: Professional Dropdown */}
  <div className="relative flex-1 xs:flex-none">
    <button 
      onClick={() => setSortOpen(!isSortOpen)}
      className={cn(
        "w-full xs:w-auto flex items-center justify-between xs:justify-start gap-4 bg-white border-2 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shrink-0 shadow-lg",
        isSortOpen ? "border-slate-900 text-slate-900 shadow-slate-900/10" : "border-slate-100 text-slate-500 hover:border-primary/50"
      )}
    >
      <span className="truncate">
        {sort === 'latest' ? 'New Arrivals' : sort === 'price_low' ? 'Price Low' : sort === 'price_high' ? 'Price High' : sort === 'random' ? 'Random' : sort === 'recommended' ? 'Recommended' : 'Featured'}
      </span>
      <span className={cn("material-symbols-outlined text-[18px] text-primary transition-transform duration-500 ease-in-out", isSortOpen && "rotate-180")}>expand_more</span>
    </button>
    
    {isSortOpen && (
      <>
        <div className="fixed inset-0 z-50" onClick={() => setSortOpen(false)} />
        
        <div className="absolute right-0 top-full mt-3 w-full xs:w-56 bg-white border border-slate-100 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.12)] z-[60] overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300">
          <div className="p-2">
          {[
            { l: 'New Arrivals', v: 'latest', i: 'new_releases' },
            { l: 'Recommended', v: 'recommended', i: 'stars' },
            { l: 'Random Discovery', v: 'random', i: 'shuffle' },
            { l: 'Price: Low-High', v: 'price_low', i: 'arrow_downward' },
            { l: 'Price: High-Low', v: 'price_high', i: 'arrow_upward' },
          ].map((s) => (
            <Link
              key={s.v}
              href={`${pathname}?${createQueryString('sort', s.v)}`}
              onClick={() => setSortOpen(false)}
              className={cn(
                "flex items-center gap-3 w-full px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                sort === s.v ? "text-white bg-slate-900 shadow-lg" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <span className="material-symbols-outlined text-lg">{s.i}</span>
              {s.l}
            </Link>
          ))}
          </div>
        </div>
      </>
    )}
  </div>
  </div>
  </div>
  </div>

 <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
 {children}
 </div>
 </section>
 </div>
 </MarketplaceContext.Provider>
 )
}
