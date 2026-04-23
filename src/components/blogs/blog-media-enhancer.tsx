'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface BlogMediaEnhancerProps {
  children: React.ReactNode
}

export function BlogMediaEnhancer({ children }: BlogMediaEnhancerProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)

  useEffect(() => {
    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG' && target.closest('.blog-html-content')) {
        const src = (target as HTMLImageElement).src
        if (src) {
          setZoomedImage(src)
        }
      }
    }

    document.addEventListener('click', handleImageClick)
    return () => document.removeEventListener('click', handleImageClick)
  }, [])

  return (
    <>
      {children}
      
      {/* Lightbox Overlay */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative w-full h-full max-w-6xl flex items-center justify-center">
            <Image 
              src={zoomedImage} 
              alt="Zoomed" 
              fill
              className="object-contain animate-in zoom-in-95 duration-300"
              unoptimized
            />
            <button 
              className="absolute top-4 right-4 text-white hover:bg-white/10 rounded-full p-2 transition-colors"
              onClick={() => setZoomedImage(null)}
            >
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
