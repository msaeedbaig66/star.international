'use client'
import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import type { Advertisement } from '@/types/database'
import { getSafeHref } from '@/lib/security/url-security'

interface AdBannerSliderProps {
  ads: Advertisement[]
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1523240715632-d984bc31958b?auto=format&fit=crop&q=80&w=1200'

function AdImage({ ad, priority = false }: { ad: Advertisement, priority?: boolean }) {
  const [imgSrc, setImgSrc] = useState(ad.image_url.startsWith('http') ? ad.image_url : FALLBACK_IMAGE)

  useEffect(() => {
    setImgSrc(ad.image_url.startsWith('http') ? ad.image_url : FALLBACK_IMAGE)
  }, [ad.image_url])

  const content = (
    <Image
      src={imgSrc}
      alt={ad.title}
      fill
      priority={priority}
      className='object-cover'
      sizes='(max-width: 1200px) 100vw, 1200px'
      onError={() => setImgSrc(FALLBACK_IMAGE)}
    />
  )

  if (ad.link_url) {
    return (
      <a href={getSafeHref(ad.link_url)} target='_blank' rel='noopener noreferrer' className='block w-full h-full'>
        {content}
      </a>
    )
  }

  return content
}

export function AdBannerSlider({ ads }: AdBannerSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const items = ads.length > 0 ? ads : null

  // Ensure index is valid if items list changes
  useEffect(() => {
    if (items && currentIndex >= items.length) {
      setCurrentIndex(Math.max(0, items.length - 1))
    }
  }, [items, currentIndex])

  const next = useCallback(() => {
    if (!items) return
    setCurrentIndex((prev) => (prev + 1) % items.length)
  }, [items])

  const prev = useCallback(() => {
    if (!items) return
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)
  }, [items])

  useEffect(() => {
    if (!items || items.length <= 1) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [items, next])

  // Render nothing when no ads to avoid empty space
  if (!items) return null

  return (
    <section className='py-6'>
      <div className='relative w-full h-[220px] md:h-[340px] rounded-xl overflow-hidden bg-surface'>
        {/* Slides */}
        <div className='flex transition-transform duration-700 ease-out h-full' style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
          {items.map((ad, idx) => (
            <div key={ad.id} className='w-full h-full flex-shrink-0'>
              <AdImage ad={ad} priority={idx === 0} />
            </div>
          ))}
        </div>

        {/* Left arrow */}
        {items.length > 1 && (
          <button
            onClick={prev}
            className='absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-white/80 backdrop-blur-sm rounded-full shadow flex items-center justify-center hover:bg-white transition-all'
            aria-label='Previous slide'
          >
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' /></svg>
          </button>
        )}

        {/* Right arrow */}
        {items.length > 1 && (
          <button
            onClick={next}
            className='absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-white/80 backdrop-blur-sm rounded-full shadow flex items-center justify-center hover:bg-white transition-all'
            aria-label='Next slide'
          >
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' /></svg>
          </button>
        )}

        {/* Dot indicators */}
        {items.length > 1 && (
          <div className='absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5'>
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-white w-4' : 'bg-white/50'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
