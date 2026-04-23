'use client'

import { cn } from '@/lib/utils'

interface QualitySidebarProps {
  qualityScore: number
  qualityChecklist: { label: string; done: boolean }[]
}

export function QualitySidebar({ qualityScore, qualityChecklist }: QualitySidebarProps) {
  return (
    <div className="hidden xl:block w-72 space-y-6 sticky top-8">
      <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-widest text-text-primary mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">verified</span>
          Listing Strength
        </h3>
        
        <div className="space-y-6">
          <div className="space-y-3">
            {qualityChecklist.map((item, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className={cn(
                  "material-symbols-outlined text-[18px] mt-0.5",
                  item.done ? "text-primary font-bold" : "text-text-muted opacity-30"
                )}>
                  {item.done ? 'check_circle' : 'circle'}
                </span>
                <span className={cn(
                  "text-xs font-semibold leading-tight",
                  item.done ? "text-text-primary" : "text-text-muted"
                )}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-border">
            <div className="w-full bg-surface-2 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${qualityScore}%` }}
              />
            </div>
            <p className="text-[10px] text-text-muted mt-2 font-bold uppercase tracking-widest">
              Quality score: {qualityScore}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
