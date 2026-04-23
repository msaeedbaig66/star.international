'use client'

import React, { useState, useEffect } from 'react'

export function MobileFiltersWrapper({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full xl:hidden mb-6 flex items-center justify-center gap-2 bg-white border border-border text-text-primary px-6 py-4 rounded-2xl font-black uppercase tracking-[0.16em] text-xs shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-[18px]">tune</span>
        Show Filters
      </button>

      <div className={`xl:block xl:w-80 shrink-0 ${isOpen ? 'fixed inset-0 z-[200] block' : 'hidden'}`}>
        {isOpen && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm xl:hidden transition-opacity" onClick={() => setIsOpen(false)} />
        )}
        <div className={`xl:static xl:w-full xl:h-auto xl:translate-x-0 ${
          isOpen ? 'fixed right-0 top-0 bottom-0 w-[85%] max-w-[360px] bg-background shadow-2xl flex flex-col transition-transform translate-x-0' : 'hidden xl:block'
        }`}>
          {isOpen && (
            <div className="flex xl:hidden items-center justify-between p-5 border-b border-border bg-white shrink-0 shadow-sm z-10 pt-safe-top">
              <h3 className="text-xl font-black text-text-primary tracking-tight">Filters</h3>
              <button onClick={() => setIsOpen(false)} className="p-2 -mr-2 bg-surface text-slate-500 hover:bg-primary/10 hover:text-primary rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          
          <div className={`w-full ${isOpen ? 'flex-1 overflow-y-auto p-4 bg-background' : ''}`}>
             <div className="h-full"> 
               {children}
             </div>
          </div>

          {isOpen && (
            <div className="p-5 border-t border-border bg-white shrink-0 pb-safe-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-10">
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-full bg-primary text-white py-4 rounded-full text-[11px] font-black uppercase tracking-[0.16em] hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                View Results
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
