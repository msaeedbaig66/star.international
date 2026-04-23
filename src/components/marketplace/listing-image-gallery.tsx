'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
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
 <button
 type="button"
 onClick={() => setZoomOpen(true)}
 className="relative group w-full aspect-square rounded-lg overflow-hidden bg-white shadow-sm border border-border cursor-zoom-in"
 >
 <Image
 className="w-full h-full object-contain p-3"
 alt={title}
 src={activeImage}
 fill
 priority
 />
 <div className="absolute right-3 bottom-3 px-2 py-1 rounded-full bg-black/55 text-white text-[10px] font-semibold">
 Zoom
 </div>
 </button>
 
 {images.length > 1 && (
 <div className="grid grid-cols-5 gap-2">
 {images.slice(0, 8).map((imgUrl, idx) => (
 <button
 key={idx}
 type="button"
 onClick={() => setActiveIndex(idx)}
 className={cn(
 'relative aspect-square rounded-md overflow-hidden ring-1 bg-white',
 idx === activeIndex ? 'ring-primary ring-2' : 'ring-border hover:opacity-80'
 )}
 aria-label={`Open image ${idx + 1}`}
 >
 <Image
 className="w-full h-full object-cover"
 alt={`${title} image ${idx + 1}`}
 src={imgUrl}
 fill
 sizes="(max-width: 768px) 25vw, 15vw"
 />
 </button>
 ))}
 </div>
 )}
 </div>

 {zoomOpen && (
 <div
 className="fixed inset-0 z-[80] bg-black/85 flex items-center justify-center p-4"
 onClick={() => setZoomOpen(false)}
 >
 <button
 type="button"
 onClick={() => setZoomOpen(false)}
 className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white hover:bg-white/25"
 aria-label="Close zoom"
 >
 <span className="material-symbols-outlined">close</span>
 </button>

 <div
 className="relative w-[80vw] h-[80vh]"
 onClick={(e) => e.stopPropagation()}
 >
 <Image
 src={activeImage}
 alt={title}
 fill
 className="object-contain"
 sizes="80vw"
 priority
 />
 </div>
 </div>
 )}
 </>
 )
}
