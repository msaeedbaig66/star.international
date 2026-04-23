'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { getSafeHref } from '@/lib/security/url-security'

interface Banner {
  id: string
  image_url: string
  title: string | null
  subtitle: string | null
  button_text: string | null
  button_url: string | null
}

interface HeroSliderProps {
  banners: Banner[]
}

export function HeroSlider({ banners }: HeroSliderProps) {
  const [current, setCurrent] = useState(0)
  const isAnimatingRef = useRef(false)

  const next = useCallback(() => {
    if (isAnimatingRef.current) return
    isAnimatingRef.current = true
    setCurrent((prev) => (prev + 1) % banners.length)
    setTimeout(() => { isAnimatingRef.current = false }, 800)
  }, [banners.length])

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [banners.length, next])

  if (!banners.length) return null

  return (
    <section 
      className="relative w-full rounded-[2rem] overflow-hidden aspect-[1.8/1] sm:aspect-[2.4/1] md:aspect-[3/1] lg:aspect-[3.2/1] bg-slate-900 shadow-2xl group border border-slate-100/10 transition-all duration-700"
    >
      {banners.map((banner, idx) => {
        const isPoster = !banner.title && !banner.subtitle;
        
        return (
          <div
            key={banner.id}
            className={cn(
              "absolute inset-0 transition-all duration-1000 ease-in-out flex flex-col",
              idx === current ? "opacity-100 translate-x-0 scale-100 z-10" : "opacity-0 translate-x-20 scale-105 z-0"
            )}
          >
            {/* Main Background Image */}
            <div className="absolute inset-0">
              <Image
                src={banner.image_url}
                alt={banner.title || "Banner poster"}
                fill
                className={cn(
                  "object-cover transition-opacity duration-700",
                  isPoster ? "opacity-100" : "opacity-60"
                )}
                priority={idx === 0}
                sizes="100vw"
              />
              {/* Cinematic Gradient Overlays - Only if not a poster */}
              {!isPoster && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                </>
              )}
            </div>

            {/* Content Layer */}
            <div className={cn(
               "relative z-10 flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20",
               isPoster ? "items-start pb-20 justify-end" : "max-w-5xl"
            )}>
              <div className={cn(
                "space-y-6 transition-all duration-700 delay-300",
                idx === current ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
              )}>
                  {!isPoster && current === idx && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live Hub Update
                      </div>
                  )}

                {!isPoster && (
                  <>
                    <h2 className="text-3xl sm:text-5xl lg:text-7xl font-black text-white leading-[1.05] tracking-tighter">
                      {banner.title}
                    </h2>
                    <p className="text-base sm:text-xl text-slate-300 font-medium leading-relaxed max-w-2xl opacity-90">
                      {banner.subtitle}
                    </p>
                  </>
                )}

                {banner.button_text && banner.button_url && (
                  <div className="pt-4">
                    <Link href={getSafeHref(banner.button_url)}>
                      <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                        {banner.button_text}
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Slide Indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-10 right-10 z-20 flex gap-3">
            {banners.map((_, idx) => (
                <button
                    key={idx}
                    onClick={() => setCurrent(idx)}
                    className={cn(
                        "h-1 transition-all duration-500 rounded-full",
                        idx === current ? "w-12 bg-emerald-500" : "w-4 bg-white/20 hover:bg-white/40"
                    )}
                />
            ))}
        </div>
      )}

      {/* Decorative Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 overflow-hidden z-20">
          <div 
            key={current}
            className="h-full bg-emerald-500/50 animate-progress-bar"
            style={{ animationDuration: '5000ms' }}
          />
      </div>
    </section>
  )
}
