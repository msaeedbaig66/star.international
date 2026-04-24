'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface NetflixRowProps {
  title: string
  icon?: string
  children: React.ReactNode
  seeAllContent?: React.ReactNode
  className?: string
  showExpandToggle?: boolean
}

export function NetflixRow({ 
  title, 
  icon, 
  children, 
  seeAllContent, 
  className,
  showExpandToggle = true
}: NetflixRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 20)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 20)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      ro.disconnect()
    }
  }, [checkScroll])

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.85
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  return (
    <section className={cn('py-4 sm:py-6', className)}>
      {/* High-End Section Header */}
      <div className='flex items-end justify-between mb-6 sm:mb-8 px-1'>
        <div className='flex items-center gap-5'>
          <div className='w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white flex items-center justify-center border border-slate-200 shadow-sm'>
            <span className="material-symbols-outlined text-[24px] text-sky-600 font-black">{icon}</span>
          </div>
          <div>
            <h3 className='text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight leading-none'>{title}</h3>
          </div>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Modern Navigation Arrows */}
          {!expanded && (canScrollLeft || canScrollRight) && (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className={cn(
                  'w-10 h-10 sm:w-12 sm:h-12 bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-sm text-slate-600 transition-all btn-haptic flex items-center justify-center',
                  !canScrollLeft ? 'opacity-30 cursor-default' : 'hover:bg-sky-600 hover:text-white hover:border-sky-600 hover:shadow-md'
                )}
                aria-label='Previous set'
              >
                <span className='material-symbols-outlined font-black text-lg sm:text-xl'>chevron_left</span>
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className={cn(
                  'w-10 h-10 sm:w-12 sm:h-12 bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-sm text-slate-600 transition-all btn-haptic flex items-center justify-center',
                  !canScrollRight ? 'opacity-30 cursor-default' : 'hover:bg-sky-600 hover:text-white hover:border-sky-600 hover:shadow-md'
                )}
                aria-label='Next set'
              >
                <span className='material-symbols-outlined font-black text-lg sm:text-xl'>chevron_right</span>
              </button>
            </div>
          )}

          {seeAllContent && showExpandToggle && (
            <button
              onClick={() => setExpanded(!expanded)}
              className='flex items-center gap-2 sm:gap-3 text-sky-600 text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-sky-50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all group btn-haptic border border-sky-100/50'
            >
              {expanded ? 'See Less' : 'See All'}
              <span className='material-symbols-outlined text-[14px] sm:text-sm font-black transition-transform group-hover:translate-x-1'>
                {expanded ? 'expand_less' : 'arrow_forward'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Row Implementation */}
      {!expanded && (
        <div className='relative'>
          {/* Tonal fades for professional depth */}
          {canScrollLeft && (
            <div className='absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-white to-transparent z-[5] pointer-events-none' />
          )}

          {/* Swipeable Container - Mobile optimized snapping */}
          <div
            ref={scrollRef}
            className='flex overflow-x-auto gap-4 sm:gap-6 scrollbar-hide no-scrollbar snap-x snap-mandatory px-1 pb-2 pt-2'
          >
            {children}
            {/* End padding for scroll */}
            <div className="flex-shrink-0 w-4 sm:w-8" />
          </div>

          {(canScrollLeft || canScrollRight) && (
            <div className={cn(
              'absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-white to-transparent z-[5] pointer-events-none transition-opacity duration-300',
              !canScrollRight && 'opacity-0'
            )} />
          )}
        </div>
      )}

      {/* Expanded Grid Node */}
      {expanded && seeAllContent && (
        <div className='animate-reveal'>
          <div className='grid grid-cols-1 min-[500px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4'>
            {seeAllContent}
          </div>
          <div className='flex justify-center mt-12'>
            <button
              onClick={() => setExpanded(false)}
              className='text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] px-10 py-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all btn-haptic flex items-center gap-3'
            >
              <span className='material-symbols-outlined text-sm font-black'>keyboard_double_arrow_up</span>
              Collapse View
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export function NetflixCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex-shrink-0 snap-start w-[45%] min-w-[200px] sm:w-[30%] md:w-[22%] lg:w-[18%] h-full', className)}>
      {children}
    </div>
  )
}
