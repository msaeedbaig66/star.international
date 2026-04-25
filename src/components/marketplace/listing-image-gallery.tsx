'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { getOptimizedImageUrl } from '@/lib/cloudinary'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface ListingImageGalleryProps {
 images: string[]
 title: string
}

export function ListingImageGallery({ images, title }: ListingImageGalleryProps) {
 const [activeIndex, setActiveIndex] = useState(0)
 const [zoomOpen, setZoomOpen] = useState(false)
 const activeImage = images[activeIndex] || images[0]

 useEffect(() => {
 if (!zoomOpen) return
 const onEsc = (e: KeyboardEvent) => {
 if (e.key === 'Escape') setZoomOpen(false)
 }
 window.addEventListener('keydown', onEsc)
 document.body.style.overflow = 'hidden'
 return () => {
 window.removeEventListener('keydown', onEsc)
 document.body.style.overflow = ''
 }
 }, [zoomOpen])

  return (
    <>
      <div className="space-y-3 max-w-md mx-auto">
        <div className="relative group w-full aspect-square rounded-2xl overflow-hidden bg-surface-container-lowest shadow-sm border border-border">
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            className="w-full h-full cursor-zoom-in"
          >
            <Image
              className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-[1.02]"
              alt={title}
              src={getOptimizedImageUrl(activeImage, 800, 800)}
              fill
              priority
            />
            <div className="absolute right-4 bottom-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-sm">zoom_in</span>
              Zoom
            </div>
          </button>

          {/* Quick Navigation Arrows for main view */}
          {images.length > 1 && (
            <>
              <button 
                onClick={() => setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center text-on-surface opacity-0 group-hover:opacity-100 transition-all hover:bg-white"
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </button>
              <button 
                onClick={() => setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center text-on-surface opacity-0 group-hover:opacity-100 transition-all hover:bg-white"
              >
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </>
          )}
        </div>
        
        {images.length > 1 && (
          <div className="grid grid-cols-5 gap-2">
            {images.slice(0, 10).map((imgUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  'relative aspect-square rounded-xl overflow-hidden ring-2 transition-all',
                  idx === activeIndex ? 'ring-primary' : 'ring-transparent hover:ring-border opacity-70 hover:opacity-100'
                )}
                aria-label={`View image ${idx + 1}`}
              >
                <Image
                  className="w-full h-full object-cover"
                  alt={`${title} thumbnail ${idx + 1}`}
                  src={getOptimizedImageUrl(imgUrl, 200, 200)}
                  fill
                  sizes="80px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Improved Zoom Overlay via Portal */}
      {zoomOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center select-none"
          onClick={() => setZoomOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'black' }}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            className="absolute top-6 right-6 w-14 h-14 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors z-[100000]"
            aria-label="Close zoom"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>

          {/* Counter */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-white/10 text-white text-sm font-bold tracking-widest z-[100000]">
            {activeIndex + 1} / {images.length}
          </div>

          {/* Image Container */}
          <div
            className="relative w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {activeImage ? (
              <img
                src={getOptimizedImageUrl(activeImage, 1600, 1600)}
                alt={title}
                className="max-w-full max-h-full object-contain shadow-2xl transition-all duration-300 animate-in zoom-in-95"
                loading="eager"
                style={{ display: 'block' }}
              />
            ) : (
              <div className="text-white text-sm">Image not found</div>
            )}

            {/* Navigation Arrows for Zoom */}
            {images.length > 1 && (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
                  }}
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-all z-[100000] border border-white/5"
                >
                  <span className="material-symbols-outlined text-5xl">chevron_left</span>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
                  }}
                  className="absolute right-6 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-all z-[100000] border border-white/5"
                >
                  <span className="material-symbols-outlined text-5xl">chevron_right</span>
                </button>
              </>
            )}
          </div>
          
          {/* Info */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/30 text-[10px] font-black uppercase tracking-widest px-4 py-2 border border-white/5 rounded-full">
            Esc to close • ← → to browse
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
