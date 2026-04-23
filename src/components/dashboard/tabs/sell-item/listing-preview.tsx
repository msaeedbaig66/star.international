'use client'

import Image from 'next/image'
import { formatPrice } from '@/lib/utils'

interface ListingPreviewProps {
 images: string[]
 condition: string
 listingType: string
 category: string
 title: string
 price: string
 rentalPrice: string
 rentalPeriod: string
 rentalDeposit: string
 campus: string
 conditionLabels: Record<string, string>
 listingTypeLabels: Record<string, string>
 rentalPeriodLabels: Record<string, string>
}

export function ListingPreview({
 images,
 condition,
 listingType,
 category,
 title,
 price,
 rentalPrice,
 rentalPeriod,
 rentalDeposit,
 campus,
 conditionLabels,
 listingTypeLabels,
 rentalPeriodLabels
}: ListingPreviewProps) {
 return (
 <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-border">
 <div className="aspect-[4/3] relative bg-surface">
 {images[0] ? (
 <Image src={images[0]} alt="Preview" className="w-full h-full object-cover" fill />
 ) : (
 <div className="w-full h-full flex items-center justify-center text-text-muted">
 <span className="material-symbols-outlined text-4xl">image</span>
 </div>
 )}
 {condition && (
 <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter text-primary">
 {conditionLabels[condition]}
 </span>
 )}
 <span className="absolute top-3 left-3 bg-primary text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.14em]">
 {listingTypeLabels[listingType]}
 </span>
 </div>
 <div className="p-5 space-y-2">
 <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">
 {category || 'Category'}
 </p>
 <h4 className="font-bold text-text-primary truncate">
 {title || 'Your Item Title'}
 </h4>
 <div className="flex items-center justify-between">
 <span className="text-lg font-black text-primary">
 {listingType === 'rent' ? (rentalPrice ? formatPrice(parseFloat(rentalPrice)) : 'PKR 0') : (price ? formatPrice(parseFloat(price)) : 'PKR 0')}
 </span>
 {campus && (
 <div className="flex items-center gap-1 text-text-muted">
 <span className="material-symbols-outlined text-xs">location_on</span>
 <span className="text-xs font-semibold">{campus}</span>
 </div>
 )}
 </div>
 {(listingType === 'rent' || listingType === 'both') && (
 <p className="text-xs font-semibold text-text-secondary">
 {rentalPeriod ? rentalPeriodLabels[rentalPeriod] : 'Rental period'}
 {rentalDeposit ? ` • Deposit ${formatPrice(parseFloat(rentalDeposit))}` : ''}
 </p>
 )}
 </div>
 </div>
 )
}
