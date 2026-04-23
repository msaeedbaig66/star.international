'use client'

import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ImageUploadSectionProps {
  images: string[]
  maxImages: number
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: (index: number) => void
  error?: string
}

export function ImageUploadSection({
  images,
  maxImages,
  onUpload,
  onRemove,
  error
}: ImageUploadSectionProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold uppercase tracking-wider text-text-muted">
        Photos
      </label>
      <div className="grid grid-cols-4 gap-3">
        {/* Upload area */}
        <label
          className={cn(
            'col-span-4 aspect-[21/9] border-2 border-dashed border-border rounded-xl',
            'flex flex-col items-center justify-center bg-surface cursor-pointer',
            'hover:bg-primary-light hover:border-primary/40 transition-all group'
          )}
        >
          <input
            type="file"
            className="hidden"
            accept="image/*"
            multiple
            onChange={onUpload}
            disabled={images.length >= maxImages}
          />
          <div className="text-center p-6">
            <div className="w-12 h-12 rounded-full bg-border/50 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
              <span className="material-symbols-outlined text-text-secondary group-hover:text-primary transition-colors">
                add_a_photo
              </span>
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-text-muted group-hover:text-primary transition-colors">
              Add Item Photos
            </p>
            <p className="text-[10px] text-text-muted mt-2">
              Up to {maxImages} high-quality images. JPG, PNG or WebP.
            </p>
          </div>
        </label>

        {/* Preview grid */}
        {images.map((img, i) => (
          <div
            key={i}
            className="relative aspect-square rounded-xl overflow-hidden border border-border group"
          >
            <Image
              src={img}
              alt={`Preview ${i + 1}`}
              fill
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: Math.max(0, maxImages - images.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="aspect-square rounded-xl border border-dashed border-border bg-surface flex items-center justify-center text-border"
          >
            <span className="material-symbols-outlined text-xl">image</span>
          </div>
        ))}
      </div>
      {error && <p className="text-xs font-bold text-destructive mt-2">{error}</p>}
    </div>
  )
}
