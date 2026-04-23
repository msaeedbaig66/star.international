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
          "fixed inset-0 z-[1000] xl:hidden transition-all duration-500",
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
            "absolute inset-y-0 left-0 w-[85%] max-w-[340px] bg-white shadow-2xl transition-transform duration-500 ease-buy-in-out p-6 overflow-y-auto",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
               <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary font-black">tune</span>
                  <span className="font-black text-xs uppercase tracking-widest text-[#1f3468]">Filters</span>
               </div>
               <button 
                  onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
               >
                  <span className="material-symbols-outlined text-[20px]">close</span>
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
          <div className="flex flex-col gap-6 mb-8">
            {/* Context Header */}
            {/* Context Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-white border border-border shadow-sm">
               
               {/* Group 1: Filter & Discovery Count */}
               <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSidebarOpen(!isSidebarOpen)}
                    className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shadow-sm border shrink-0",
                      isSidebarOpen 
                        ? "bg-primary text-white border-primary shadow-primary/20" 
                        : "bg-surface text-text-primary border-border hover:border-primary/50"
                    )}
                  >
                    <span className="material-symbols-outlined text-[20px] sm:text-[22px] font-black">
                      {window.innerWidth < 1280 ? 'tune' : (isSidebarOpen ? 'keyboard_double_arrow_left' : 'keyboard_double_arrow_right')}
                    </span>
                  </button>
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1.5">
                       <span className="text-2xl sm:text-3xl font-black text-text-primary tracking-tighter tabular-nums leading-none">{totalCount}</span>
                       <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-text-muted">discoveries</span>
                    </div>
                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-primary italic mt-0.5">Live Discovery Matrix</p>
                  </div>
               </div>

               {/* Group 2: Controls Cluster (Toggles & Sort) */}
               <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-3 sm:gap-4 !ml-0 sm:!ml-auto">
                  
                  {/* Central Toggles */}
                  {!hideSourceToggles && (
                    <div className="flex p-0.5 sm:p-1 bg-surface rounded-xl sm:rounded-2xl border border-border flex-1 xs:flex-none">
                      {sourceOptions.map(opt => (
                        <Link
                          key={opt.value}
                          href={`${pathname}?${createQueryString('source', opt.value)}`}
                          className={cn(
                            "flex-1 xs:flex-none px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                            currentSource === opt.value 
                              ? "bg-primary text-white shadow-lg shadow-primary/20" 
                              : "text-text-muted hover:text-text-primary"
                          )}
                        >
                           <span className="material-symbols-outlined text-[14px] sm:text-[16px]">{opt.icon}</span>
                           <span>{opt.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Sort Control */}
                  <div className="relative group flex-1 xs:flex-none">
                     <button className="w-full xs:w-auto flex items-center justify-between xs:justify-start gap-3 bg-white border border-border px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.16em] transition-all hover:border-primary shrink-0">
                        <span className="truncate">
                           {sort === 'latest' ? 'New Arrivals' : sort === 'price_low' ? 'Price Low' : sort === 'price_high' ? 'Price High' : sort === 'random' ? 'Random' : sort === 'recommended' ? 'Recommended' : 'Featured'}
                        </span>
                        <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-primary">expand_more</span>
                     </button>
                     
                     <div className="absolute right-0 top-full mt-2 w-full xs:w-48 bg-white border border-border rounded-2xl shadow-xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all z-[60] overflow-hidden">
                        {[
                          { l: 'New Arrivals', v: 'latest' },
                          { l: 'Recommended', v: 'recommended' },
                          { l: 'Random Discovery', v: 'random' },
                          { l: 'Price: Low-High', v: 'price_low' },
                          { l: 'Price: High-Low', v: 'price_high' },
                        ].map((s) => (
                           <Link
                             key={s.v}
                             href={`${pathname}?${createQueryString('sort', s.v)}`}
                             className={cn(
                               "block w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 transition-colors",
                               sort === s.v ? "text-primary bg-primary/5" : "text-text-secondary"
                             )}
                           >
                             {s.l}
                           </Link>
                        ))}
                     </div>
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
