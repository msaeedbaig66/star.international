'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { formatPrice } from '@/lib/utils'
import { CATEGORIES, CAMPUSES } from '@/lib/constants'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { uploadToCloudinary } from '@/lib/cloudinary'
import type { Profile } from '@/types/database'
import { SlotUsageBanner } from './sell-item/slot-usage-banner'
import { ImageUploadSection } from './sell-item/image-upload-section'
import { ListingPreview } from './sell-item/listing-preview'
import { QualitySidebar } from './sell-item/quality-sidebar'
import { SlotRequestModal } from './sell-item/slot-request-modal'

interface SellItemTabProps {
 profile: Profile
 editId?: string | null
}

interface SellItemDraft {
 ownerId: string
 title: string
 category: string
 condition: string
 listingType: string
 price: string
 rentalPrice: string
 rentalPeriod: string
 rentalDeposit: string
 campus: string
 description: string
 images: string[]
 contactPref: string
 updatedAt: string
 expiresAt: string
 variants?: {name: string, price: number}[]
}

const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'] as const
const LISTING_TYPES = ['sell', 'rent', 'both'] as const
const RENTAL_PERIODS = ['day', 'week', 'month', 'semester'] as const
const CONDITION_LABELS: Record<string, string> = {
 new: 'New',
 like_new: 'Like New',
 good: 'Good',
 fair: 'Fair',
 poor: 'Poor',
}
const LISTING_TYPE_LABELS: Record<(typeof LISTING_TYPES)[number], string> = {
 sell: 'For Sale',
 rent: 'For Rent',
 both: 'Sale + Rent',
}
const RENTAL_PERIOD_LABELS: Record<(typeof RENTAL_PERIODS)[number], string> = {
 day: 'Per Day',
 week: 'Per Week',
 month: 'Per Month',
 semester: 'Per Semester',
}
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const LISTING_MAX_IMAGES = 4

export function SellItemTab({ profile, editId }: SellItemTabProps) {
 const router = useRouter()
 const [title, setTitle] = useState('')
 const [category, setCategory] = useState('')
 const [condition, setCondition] = useState<string>('new')
 const [listingType, setListingType] = useState<(typeof LISTING_TYPES)[number]>('sell')
 const [price, setPrice] = useState('')
 const [rentalPrice, setRentalPrice] = useState('')
 const [rentalPeriod, setRentalPeriod] = useState<(typeof RENTAL_PERIODS)[number]>('month')
 const [rentalDeposit, setRentalDeposit] = useState('')
 const [campus, setCampus] = useState('')
 const [description, setDescription] = useState('')
 const [images, setImages] = useState<string[]>([])
 const [contactPref, setContactPref] = useState('chat')
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState('')
 const [isEditing, setIsEditing] = useState(false)
 const [draftRestored, setDraftRestored] = useState(false)
 const [slotLimit, setSlotLimit] = useState<number>(Number(profile?.listing_slot_limit || 5))
 const [slotUsed, setSlotUsed] = useState<number>(0)
 const [pendingSlotRequest, setPendingSlotRequest] = useState<any | null>(null)
 const [showSlotRequestModal, setShowSlotRequestModal] = useState(false)
 const [requestedSlotLimit, setRequestedSlotLimit] = useState<number>(Number(profile?.listing_slot_limit || 5) + 1)
 const [slotRequestReason, setSlotRequestReason] = useState('')
 const [slotRequestLoading, setSlotRequestLoading] = useState(false)
 const [hasPublished, setHasPublished] = useState(false)
 const [isOfficial, setIsOfficial] = useState(false)
 const [moderationStatus, setModerationStatus] = useState<string | null>(null)
 const [variants, setVariants] = useState<{name: string, price: number}[]>([])

 const draftKey = profile?.id ? `allpanga_sell_item_draft_${profile.id}` : null

 const clearForm = () => {
 setTitle('')
 setCategory('')
 setCondition('new')
 setListingType('sell')
 setPrice('')
 setRentalPrice('')
 setRentalPeriod('month')
 setRentalDeposit('')
 setCampus('')
 setDescription('')
 setImages([])
 setContactPref('chat')
 setIsOfficial(false)
 setModerationStatus(null)
 setVariants([])
 setError('')
 }

 const clearDraftFromLocal = useCallback(() => {
 if (!draftKey) return
 localStorage.removeItem(draftKey)
 }, [draftKey])

 const saveDraftToLocal = useCallback(() => {
 try {
 if (!draftKey || !profile?.id) return false

 const payload: SellItemDraft = {
 ownerId: profile.id,
 title,
 category,
 condition,
 listingType,
 price,
 rentalPrice,
 rentalPeriod,
 rentalDeposit,
 campus,
 description,
 images,
 contactPref,
 variants,
 updatedAt: new Date().toISOString(),
 expiresAt: new Date(Date.now() + DRAFT_TTL_MS).toISOString(),
 }
 const hasAnyData =
 !!payload.title.trim() ||
 !!payload.category ||
 !!payload.price ||
 !!payload.campus ||
 !!payload.description.trim() ||
 payload.images.length > 0

 if (!hasAnyData) {
 clearDraftFromLocal()
 return false
 }

 localStorage.setItem(draftKey, JSON.stringify(payload))
 return true
 } catch {
 return false
 }
 }, [title, category, condition, listingType, price, rentalPrice, rentalPeriod, rentalDeposit, campus, description, images, contactPref, variants, draftKey, profile?.id, clearDraftFromLocal])

 const loadListing = useCallback(async (id: string) => {
 const supabase = createClient()
 const { data } = await supabase
 .from('listings')
 .select('*')
 .eq('id', id)
 .eq('seller_id', profile.id)
 .single()

 if (data) {
 setTitle(data.title)
 setCategory(data.category)
 setCondition(data.condition)
 setListingType((data.listing_type as (typeof LISTING_TYPES)[number]) || 'sell')
 setPrice(String(data.price))
 setRentalPrice(data.rental_price != null ? String(data.rental_price) : '')
 setRentalPeriod((data.rental_period as (typeof RENTAL_PERIODS)[number]) || 'month')
 setRentalDeposit(data.rental_deposit != null ? String(data.rental_deposit) : '')
 setCampus(data.campus || '')
 setDescription(data.description)
 setImages(data.images || [])
 setContactPref(data.contact_preference === 'phone' ? 'phone' : 'chat')
 setIsOfficial(!!data.is_official)
 setModerationStatus(data.moderation || 'pending')
 setVariants(data.variants || [])
 setIsEditing(true)
 }
 }, [profile.id])

 const loadSlotInfo = useCallback(async () => {
 const supabase = createClient()

 const [profileRes, usageRes, pendingReqData] = await Promise.all([
 supabase
 .from('profiles')
 .select('*')
 .eq('id', profile.id)
 .single(),
 supabase
 .from('listings')
 .select('id', { count: 'exact', head: true })
 .eq('seller_id', profile.id)
 .neq('status', 'removed'),
 fetch('/api/slot-requests?type=listing')
 .then((res) => (res.ok ? res.json() : null))
 .then((json) => (Array.isArray(json?.data) ? json.data[0] || null : null))
 .catch(() => null),
 ])

 if (!profileRes.error) {
 setSlotLimit(Number((profileRes.data as any)?.listing_slot_limit || 5))
 }
 if (!usageRes.error) {
 setSlotUsed(Number(usageRes.count || 0))
 }
 setPendingSlotRequest(pendingReqData || null)
 }, [profile.id])

 useEffect(() => {
 if (editId) {
 loadListing(editId)
 return
 }
 if (!draftKey || !profile?.id) return

 try {
 const raw = localStorage.getItem(draftKey)
 if (!raw) return

 const draft = JSON.parse(raw) as Partial<SellItemDraft>
 const expiresAtMs = draft.expiresAt ? Date.parse(draft.expiresAt) : NaN
 const isExpired = !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()
 const ownerMismatch = draft.ownerId !== profile.id

 if (isExpired || ownerMismatch) {
 clearDraftFromLocal()
 return
 }

 setTitle(draft.title || '')
 setCategory(draft.category || '')
 setCondition(draft.condition || 'new')
 setListingType((draft.listingType as (typeof LISTING_TYPES)[number]) || 'sell')
 setPrice(draft.price || '')
 setRentalPrice(draft.rentalPrice || '')
 setRentalPeriod((draft.rentalPeriod as (typeof RENTAL_PERIODS)[number]) || 'month')
 setRentalDeposit(draft.rentalDeposit || '')
 setCampus(draft.campus || '')
 setDescription(draft.description || '')
 setImages(Array.isArray(draft.images) ? draft.images : [])
 setContactPref(draft.contactPref || 'chat')
 setVariants(Array.isArray(draft.variants) ? draft.variants : [])
 setDraftRestored(true)
 } catch {
 clearDraftFromLocal()
 }
 }, [draftKey, editId, loadListing, profile?.id, clearDraftFromLocal])

 useEffect(() => {
 if (isEditing || editId) return
 saveDraftToLocal()
 }, [saveDraftToLocal, isEditing, editId])

 useEffect(() => {
 loadSlotInfo()
 }, [loadSlotInfo])

 const qualityScore = (() => {
 let score = 0
 if (title.length >= 5) score += 20
 if (category) score += 20
 if (listingType === 'rent' || (price && parseFloat(price) > 0)) score += 20
 if (description.length >= 50) score += 20
 if (images.length >= 1) score += 20
 return score
 })()

 const qualityChecklist = [
 { label: 'High-quality Title', done: title.length >= 5 },
 { label: 'Category selected', done: !!category },
 { label: 'Price is set', done: listingType === 'rent' ? true : (!!price && parseFloat(price) > 0) },
 { label: 'Detailed description (50+ chars)', done: description.length >= 50 },
 { label: 'At least 1 photo added', done: images.length >= 1 },
 ]
 const reachedSlotLimit = !isEditing && !editId && slotUsed >= slotLimit

 const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files
 if (!files) return

 const remainingSlots = Math.max(0, LISTING_MAX_IMAGES - images.length)
 if (remainingSlots === 0) {
 setError(`Maximum ${LISTING_MAX_IMAGES} images allowed per listing.`)
 e.target.value = ''
 return
 }

 const selectedFiles = Array.from(files)
 const filesToUpload = selectedFiles.slice(0, remainingSlots)
 if (selectedFiles.length > remainingSlots) {
 setError(`Only ${remainingSlots} image(s) were uploaded. Maximum ${LISTING_MAX_IMAGES} images allowed per listing.`)
 }

 const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
 // 50MB absolute max limit before auto-compression kicks in
 const MAX_SIZE = 50 * 1024 * 1024

 const newImages: string[] = []
 for (const file of filesToUpload) {
 setError('')
 
 if (!ALLOWED_TYPES.includes(file.type)) {
 setError(`File ${file.name} is not a supported format. Please use JPG, PNG, or WEBP.`)
 continue
 }
 
 if (file.size > MAX_SIZE) {
 setError(`File ${file.name} is too large. Absolute maximum size is 50MB.`)
 continue
 }

 try {
 const publicUrl = await uploadToCloudinary(file, 'listings')
 newImages.push(publicUrl)
 } catch (err: any) {
 setError(err.message || 'Failed to upload some images.')
 }
 }

 setImages((prev) => [...prev, ...newImages].slice(0, LISTING_MAX_IMAGES))
 e.target.value = ''
 }

 const removeImage = (index: number) => {
 setImages((prev) => prev.filter((_, i) => i !== index))
 }

 const getValidationMessage = (details: any) => {
 if (!details || typeof details !== 'object') return ''
 const entries = Object.entries(details) as Array<[string, any]>
 for (const [field, value] of entries) {
 const firstError = Array.isArray(value?._errors) ? value._errors[0] : null
 if (firstError) {
 const labelMap: Record<string, string> = {
 title: 'Title',
 description: 'Description',
 price: 'Price',
 category: 'Category',
 condition: 'Condition',
 listing_type: 'Listing Type',
 rental_price: 'Rental Price',
 rental_period: 'Rental Period',
 rental_deposit: 'Rental Deposit',
 contact_preference: 'Contact Preference',
 campus: 'Campus',
 images: 'Images',
 }
 return `${labelMap[field] || field}: ${firstError}`
 }
 }
 return ''
 }

 const handleRequestMoreSlots = async () => {
 const requestedLimit = Number(requestedSlotLimit || 0)
 if (!Number.isFinite(requestedLimit) || requestedLimit <= slotLimit) {
 toast.error(`Requested slots must be greater than your current limit (${slotLimit}).`)
 return
 }
 if (slotRequestReason.trim().length < 10) {
 toast.error('Please add a short reason (at least 10 characters).')
 return
 }

 try {
 setSlotRequestLoading(true)
 const res = await fetch('/api/slot-requests', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 request_type: 'listing',
 requested_limit: requestedLimit,
 reason: slotRequestReason.trim(),
 }),
 })
 const json = await res.json().catch(() => ({}))
 if (!res.ok) throw new Error(json?.error || 'Failed to submit request')

 toast.success('Slot request sent to admin for review.')
 setShowSlotRequestModal(false)
 setSlotRequestReason('')
 await loadSlotInfo()
 } catch (error: any) {
 toast.error(error?.message || 'Unable to submit slot request')
 } finally {
 setSlotRequestLoading(false)
 }
 }

 const handleSubmit = async (isDraft = false) => {
 setLoading(true)
 setError('')

 if (isDraft) {
 const saved = saveDraftToLocal()
 if (saved) {
 toast.success('Draft saved. Continue later from this Sell Item form.')
 } else {
 toast.info('Nothing to save in draft yet.')
 }
 setLoading(false)
 return
 }

 if (!title || !category || (listingType !== 'rent' && !price)) {
 setError('Title, category, and price are required.')
 setLoading(false)
 return
 }
 if (title.length > 100) {
 setError('Title is too long (max 100 characters).')
 setLoading(false)
 return
 }
 if (price && (Number(price) < 0 || Number(price) > 10000000)) {
 setError('Price must be between 0 and 10,000,000 PKR.')
 setLoading(false)
 return
 }
 if ((listingType === 'rent' || listingType === 'both') && (!rentalPrice || Number(rentalPrice) <= 0 || Number(rentalPrice) > 1000000)) {
 setError('Invalid rental price (max 1,000,000 PKR).')
 setLoading(false)
 return
 }
 if ((listingType === 'rent' || listingType === 'both') && !rentalPeriod) {
 setError('Rental period is required when listing is for rent.')
 setLoading(false)
 return
 }
 if (!campus) {
 setError('Campus location is required.')
 setLoading(false)
 return
 }
 if (!description || description.trim().length < 10) {
 setError('Description must be at least 10 characters.')
 setLoading(false)
 return
 }
 if (images.length < 1) {
 setError('Please upload at least 1 image.')
 setLoading(false)
 return
 }
 if (reachedSlotLimit) {
 setError(`You reached your ${slotLimit} listing slots. Request more slots from admin.`)
 setLoading(false)
 return
 }

 if (isOfficial && variants.some(v => !v.name.trim() || v.price < 0)) {
 setError('All variant names must be filled and prices must be valid.')
 setLoading(false)
 return
 }

 const listingData = {
 title,
 description,
 category,
 condition,
 listing_type: listingType,
 price: Number(price) || 0,
 rental_price: listingType === 'rent' || listingType === 'both' ? (Number(rentalPrice) || 0) : null,
 rental_period: listingType === 'rent' || listingType === 'both' ? rentalPeriod : null,
 rental_deposit: listingType === 'rent' || listingType === 'both' ? (Number(rentalDeposit) || 0) : null,
 contact_preference: contactPref,
 campus: campus || 'Main Campus',
 images,
 is_official: isOfficial,
 variants: isOfficial ? variants : [],
 }

 try {
 const url = isEditing && editId ? `/api/listings/${editId}` : '/api/listings'
 const method = isEditing && editId ? 'PATCH' : 'POST'
 
 const response = await fetch(url, {
 method,
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(listingData)
 })

 const result = await response.json()

 if (!response.ok) {
 const detailedMessage = getValidationMessage(result?.details)
 throw new Error(detailedMessage || result.error || 'Failed to save listing')
 }
 clearDraftFromLocal()
 setDraftRestored(false)
 setHasPublished(true)
 setTimeout(() => setHasPublished(false), 2000)

 if (isEditing) {
 toast.success('Listing updated and sent for review.')
 setLoading(false)
 router.push('/dashboard?tab=listings')
 router.refresh()
 } else {
 // Keep user in Sell Item so they can move to next listing immediately.
 clearForm()
 await loadSlotInfo()
 setLoading(false)
 }
 } catch (err: any) {
 setError(err.message)
 setLoading(false)
 }
 }

 return (
 <div className="space-y-8">
 <header>
 <h1 className="text-3xl font-bold text-text-primary tracking-tight">
 {isEditing ? 'Edit Listing' : 'Sell an Item'}
 </h1>
 <p className="text-text-secondary text-lg mt-1">
 {isEditing 
 ? 'Update your item details. Changes will be sent for review.' 
 : 'Fill in the details below. Your listing will be reviewed by our team before going live.'}
 </p>
 </header>

 {isEditing && (moderationStatus === 'pending' || moderationStatus === 'rejected') && (
 <div className="bg-blue-50 text-blue-700 p-4 rounded-xl flex items-start gap-3 border border-blue-200 animate-in fade-in slide-in-from-top-2">
 <span className="material-symbols-outlined mt-0.5 text-blue-600">info</span>
 <div>
 <p className="text-sm font-bold uppercase tracking-wider mb-0.5">Re-submission Mode</p>
 <p className="text-xs font-medium opacity-90">
 You are editing a {moderationStatus === 'pending' ? 'pending' : 'rejected'} listing. Once you save, it will be automatically sent back to our team for a fresh review.
 </p>
 </div>
 </div>
 )}

 {/* Info Banner */}
 <div className="bg-warning-light text-warning p-4 rounded-xl flex items-start gap-3 border border-warning/20">
 <span className="material-symbols-outlined mt-0.5">info</span>
 <div>
 <p className="text-sm font-bold uppercase tracking-wider mb-1">Important Listing Policy</p>
 <p className="text-sm font-medium opacity-90">
 All listings are reviewed within 24 hours. To keep Allpanga fresh, non-admin listings are automatically deleted after 30 days. Please mark your item as &quot;Sold&quot; once it&apos;s gone!
 </p>
 </div>
 </div>

 {!editId && draftRestored && (
 <div className="bg-primary-light text-primary p-4 rounded-xl flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border border-primary/20">
 <div className="flex items-start gap-3">
 <span className="material-symbols-outlined mt-0.5">draft</span>
 <p className="text-sm font-semibold">
 Unfinished draft restored. Complete this item and submit when ready.
 </p>
 </div>
 <button
 type="button"
 onClick={() => {
 clearDraftFromLocal()
 clearForm()
 setDraftRestored(false)
 toast.success('Draft cleared')
 }}
 className="text-xs font-black uppercase tracking-wider hover:underline"
 >
 Clear Draft
 </button>
 </div>
 )}

 {!isEditing && !editId && (
 <SlotUsageBanner 
 slotUsed={slotUsed}
 slotLimit={slotLimit}
 pendingSlotRequest={pendingSlotRequest}
 reachedSlotLimit={reachedSlotLimit}
 onOpenSlotRequest={() => {
 setRequestedSlotLimit(Math.max(slotLimit + 1, Number(pendingSlotRequest?.requested_limit || 0)))
 setShowSlotRequestModal(true)
 }}
 />
 )}

 <div className="flex flex-col lg:flex-row gap-8 items-stretch lg:items-start pb-20 lg:pb-0">
 {/* Form */}
 <div className="flex-1 w-full max-w-2xl">
 <div className="bg-white rounded-xl border border-border p-4 sm:p-6 lg:p-8 shadow-sm space-y-6">
 {/* Title */}
 <div className="space-y-2">
 <label className="block text-sm font-bold uppercase tracking-wider text-text-muted">
 Item Title *
 </label>
 <input
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 className={cn(
 'w-full px-4 py-3 rounded-lg border border-border bg-surface',
 'focus:ring-2 focus:ring-primary/50 focus:border-primary',
 'text-text-primary outline-none transition-all text-sm'
 )}
 placeholder="e.g. Sony WH-1000XM4 Headphones"
 />
 </div>

 {/* Listing Type */}
 <div className="space-y-2">
 <label className="block text-sm font-bold uppercase tracking-wider text-text-muted">
 Listing Type
 </label>
 <div className="grid grid-cols-3 gap-2">
 {LISTING_TYPES.map((type) => (
 <button
 key={type}
 type="button"
 onClick={() => setListingType(type)}
 className={cn(
 'rounded-xl border px-3 py-3 text-xs font-black uppercase tracking-wider transition-all',
 listingType === type
 ? 'border-primary bg-primary-light text-primary'
 : 'border-border bg-surface text-text-secondary hover:border-primary/40'
 )}
 >
 {LISTING_TYPE_LABELS[type]}
 </button>
 ))}
 </div>
 </div>

 {/* Category & Price */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="block text-sm font-bold uppercase tracking-wider text-text-muted">
 Category *
 </label>
 <select
 value={category}
 onChange={(e) => setCategory(e.target.value)}
 className={cn(
 'w-full px-4 py-3 rounded-lg border border-border bg-surface',
 'focus:ring-2 focus:ring-primary/50 focus:border-primary',
 'text-text-primary outline-none transition-all text-sm'
 )}
 >
 <option value="">Select category</option>
 {CATEGORIES.map((cat) => (
 <option key={cat} value={cat}>
 {cat}
 </option>
 ))}
 </select>
 </div>
 <div className="space-y-2">
 <label className="block text-sm font-bold uppercase tracking-wider text-text-muted">
 {listingType === 'rent' ? 'Market Value (Optional)' : 'Price *'}
 </label>
 <div className="relative">
 <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-text-muted text-sm">
 PKR
 </span>
 <input
 type="number"
 value={price}
 onChange={(e) => setPrice(e.target.value)}
 className={cn(
 'w-full pl-14 pr-4 py-3 rounded-lg border border-border bg-surface',
 'focus:ring-2 focus:ring-primary/50 focus:border-primary',
 'text-text-primary outline-none transition-all text-sm'
 )}
 placeholder={listingType === 'rent' ? 'Optional estimated value' : '0'}
 />
 </div>
 </div>
 </div>

 {(listingType === 'rent' || listingType === 'both') && (
 <div className="rounded-2xl border border-primary/20 bg-primary-light/30 p-4 space-y-4">
 <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Rental Details</p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="block text-sm font-bold uppercase tracking-wider text-text-muted">
 Rental Price *
 </label>
 <div className="relative">
 <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-text-muted text-sm">
 PKR
 </span>
 <input
 type="number"
 value={rentalPrice}
 onChange={(e) => setRentalPrice(e.target.value)}
 className={cn(
 'w-full pl-14 pr-4 py-3 rounded-lg border border-border bg-surface',
 'focus:ring-2 focus:ring-primary/50 focus:border-primary',
 'text-text-primary outline-none transition-all text-sm'
 )}
 placeholder="0"
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="block text-sm font-bold uppercase tracking-wider text-text-muted">
 Rental Period *
 </label>
 <select
 value={rentalPeriod}
 onChange={(e) => setRentalPeriod(e.target.value as (typeof RENTAL_PERIODS)[number])}
 className={cn(
 'w-full px-4 py-3 rounded-lg border border-border bg-surface',
 'focus:ring-2 focus:ring-primary/50 focus:border-primary',
 'text-text-primary outline-none transition-all text-sm'
 )}
 >
 {RENTAL_PERIODS.map((period) => (
 <option key={period} value={period}>
 {RENTAL_PERIOD_LABELS[period]}
 </option>
 ))}
 </select>
 </div>
 </div>

 <div className="space-y-2">
 <label className="block text-sm font-bold uppercase tracking-wider text-text-muted">
 Refundable Deposit (Optional)
 </label>
 <div className="relative">
 <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-text-muted text-sm">
 PKR
 </span>
 <input
 type="number"
 value={rentalDeposit}
 onChange={(e) => setRentalDeposit(e.target.value)}
 className={cn(
 'w-full pl-14 pr-4 py-3 rounded-lg border border-border bg-surface',
 'focus:ring-2 focus:ring-primary/50 focus:border-primary',
 'text-text-primary outline-none transition-all text-sm'
 )}
 placeholder="0"
 />
 </div>
 </div>
 </div>
 )}

 {/* Condition */}
 <div className="space-y-2">
 <label className="block text-sm font-bold uppercase tracking-wider text-text-muted">
 Condition
 </label>
 <div className="flex flex-wrap gap-2">
 {CONDITIONS.map((c) => (
 <button
 key={c}
 type="button"
 onClick={() => setCondition(c)}
 className={cn(
 'px-5 py-2.5 rounded-full border text-sm font-semibold transition-all',
 condition === c
 ? 'border-primary bg-primary-light text-primary'
 : 'border-border bg-surface text-text-secondary hover:border-primary/50'
 )}
 >
 {CONDITION_LABELS[c]}
 </button>
 ))}
 </div>
 </div>

 {/* Campus */}
 <div className="space-y-2">
 <label className="block text-sm font-bold uppercase tracking-wider text-text-muted">
 Campus Location
 </label>
 <select
 value={campus}
 onChange={(e) => setCampus(e.target.value)}
 className={cn(
 'w-full px-4 py-3 rounded-lg border border-border bg-surface',
 'focus:ring-2 focus:ring-primary/50 focus:border-primary',
 'text-text-primary outline-none transition-all text-sm'
 )}
 >
 <option value="">Select campus</option>
 {CAMPUSES.map((c) => (
 <option key={c} value={c}>
 {c}
 </option>
 ))}
 </select>
 </div>

 {/* Description */}
 <div className="space-y-2">
 <div className="flex justify-between items-center">
 <label className="block text-sm font-bold uppercase tracking-wider text-text-muted">
 Description
 </label>
 <span className="text-xs text-text-muted">
 {description.length} / 1000
 </span>
 </div>
 <textarea
 value={description}
 onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
 className={cn(
 'w-full px-4 py-3 rounded-lg border border-border bg-surface',
 'focus:ring-2 focus:ring-primary/50 focus:border-primary',
 'text-text-primary outline-none transition-all resize-none text-sm'
 )}
 rows={4}
 placeholder="Describe your item's features, usage history, and any flaws..."
 />
 </div>

 {/* Photos */}
 <ImageUploadSection 
 images={images}
 maxImages={LISTING_MAX_IMAGES}
 onUpload={handleImageUpload}
 onRemove={removeImage}
 error={error.toLowerCase().includes('image') || error.toLowerCase().includes('photo') ? error : undefined}
 />

 {/* Contact Preference */}
 <div className="space-y-2">
 <label className="block text-sm font-bold uppercase tracking-wider text-text-muted">
 Contact Preference
 </label>
 <div className="flex flex-col sm:flex-row gap-3">
 <label
 className={cn(
 'flex-1 flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all',
 contactPref === 'chat'
 ? 'border-primary bg-primary-light'
 : 'border-border bg-surface hover:border-primary/40'
 )}
 >
 <input
 type="radio"
 name="contact"
 value="chat"
 checked={contactPref === 'chat'}
 onChange={() => setContactPref('chat')}
 className="text-primary focus:ring-primary w-4 h-4"
 />
 <span className="material-symbols-outlined text-primary">chat</span>
 <span className="font-bold text-text-primary text-sm">In-app Chat</span>
 </label>
 <label
 className={cn(
 'flex-1 flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all',
 contactPref === 'phone'
 ? 'border-primary bg-primary-light'
 : 'border-border bg-surface hover:border-primary/40'
 )}
 >
 <input
 type="radio"
 name="contact"
 value="phone"
 checked={contactPref === 'phone'}
 onChange={() => setContactPref('phone')}
 className="text-primary focus:ring-primary w-4 h-4"
 />
 <span className="material-symbols-outlined text-text-secondary">call</span>
 <span className="font-bold text-text-primary text-sm">Show Phone</span>
 </label>
 </div>
 </div>

 {/* Official Store Toggle (Admin/Sub-Admin Only) */}
 {(profile?.role === 'admin' || profile?.role === 'subadmin') && (
 <div className="space-y-4 pt-4 border-t border-border">
 <div 
 onClick={() => setIsOfficial(!isOfficial)}
 className={cn(
 "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer",
 isOfficial 
 ? "border-emerald-500/30 bg-emerald-50 shadow-sm shadow-emerald-500/10" 
 : "border-border bg-surface hover:border-emerald-200"
 )}
 >
 <div className="flex items-center gap-4">
 <div className={cn(
 "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
 isOfficial ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-600"
 )}>
 <span className="material-symbols-outlined text-[28px]">storefront</span>
 </div>
 <div>
 <p className={cn(
 "text-sm font-black uppercase tracking-wider",
 isOfficial ? "text-emerald-900" : "text-text-primary"
 )}>Official Store Item</p>
 <p className="text-xs text-text-secondary mt-0.5">Post this item to the Official Allpanga Store</p>
 </div>
 </div>
 <div className={cn(
 "w-14 h-7 rounded-full transition-all relative p-1",
 isOfficial ? "bg-emerald-600" : "bg-slate-200"
 )}>
 <div className={cn(
 "w-5 h-5 rounded-full bg-white transition-transform shadow-sm",
 isOfficial ? "translate-x-7" : "translate-x-0"
 )} />
 </div>
 </div>
 </div>
 )}

 {/* Official Store Variants (Admin/Sub-Admin Only) */}
 {isOfficial && (
   <div className="space-y-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-2">
     <div className="flex items-center justify-between">
       <label className="block text-sm font-bold uppercase tracking-wider text-text-muted">
         Pricing Variants (Optional)
       </label>
       <button
         type="button"
         onClick={() => setVariants([...variants, { name: '', price: 0 }])}
         className="text-xs font-black uppercase text-primary hover:text-primary/80 transition-colors"
       >
         + Add Variant
       </button>
     </div>
     
     {variants.length === 0 ? (
       <p className="text-xs text-text-secondary">No variants added. Base price will be used.</p>
     ) : (
       <div className="space-y-3">
         {variants.map((variant, index) => (
           <div key={index} className="flex gap-3 items-center">
             <input
               value={variant.name}
               onChange={(e) => {
                 const newVariants = [...variants];
                 newVariants[index].name = e.target.value;
                 setVariants(newVariants);
               }}
               className="flex-1 px-4 py-3 rounded-lg border border-border bg-surface focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-primary outline-none transition-all text-sm"
               placeholder="e.g. 1 Piece, Pack of 5"
             />
             <div className="relative w-32">
               <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-text-muted text-xs">
                 PKR
               </span>
               <input
                 type="number"
                 value={variant.price || ''}
                 onChange={(e) => {
                   const newVariants = [...variants];
                   newVariants[index].price = Number(e.target.value);
                   setVariants(newVariants);
                 }}
                 className="w-full pl-10 pr-3 py-3 rounded-lg border border-border bg-surface focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-primary outline-none transition-all text-sm"
                 placeholder="0"
               />
             </div>
             <button
               type="button"
               onClick={() => setVariants(variants.filter((_, i) => i !== index))}
               className="p-3 text-destructive hover:bg-destructive-light rounded-lg transition-colors flex items-center justify-center"
             >
               <span className="material-symbols-outlined text-[20px]">delete</span>
             </button>
           </div>
         ))}
       </div>
     )}
   </div>
 )}

 {/* Error */}
 {error && (
 <p className="text-sm text-destructive bg-destructive-light p-3 rounded-xl">
 {error}
 </p>
 )}

 {/* Buttons */}
 <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
 <Button
 variant="outline"
 size="lg"
 onClick={() => handleSubmit(true)}
 loading={loading}
 className="w-full sm:flex-1 h-14 sm:h-12"
 >
 Save as Draft
 </Button>
 <Button
 size="lg"
 onClick={() => handleSubmit(false)}
 disabled={loading || hasPublished}
 loading={loading}
 className={cn(
 "w-full sm:flex-[2] h-14 sm:h-12 rounded-full font-black uppercase tracking-widest text-xs transition-all duration-300",
 hasPublished && "bg-green-600 hover:bg-green-600 border-green-600 shadow-green-500/20"
 )}
 >
 {hasPublished ? (
 <span className="material-symbols-outlined text-2xl animate-in zoom-in duration-300">check_circle</span>
 ) : (
 isEditing 
 ? (moderationStatus === 'approved' ? 'Update Listing' : 'Update & Resubmit') 
 : 'Publish Listing'
 )}
 </Button>
 </div>
 </div>
 </div>

 {/* Preview Panel (Desktop) */}
 <div className="w-72 hidden lg:block">
 <div className="sticky top-8 space-y-6">
 <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">
 Listing Preview
 </h3>

 <ListingPreview 
 images={images}
 condition={condition}
 listingType={listingType}
 category={category}
 title={title}
 price={price}
 rentalPrice={rentalPrice}
 rentalPeriod={rentalPeriod}
 rentalDeposit={rentalDeposit}
 campus={campus}
 conditionLabels={CONDITION_LABELS}
 listingTypeLabels={LISTING_TYPE_LABELS}
 rentalPeriodLabels={RENTAL_PERIOD_LABELS}
 />

 <QualitySidebar 
 qualityScore={qualityScore}
 qualityChecklist={qualityChecklist}
 />
 </div>
 </div>
 </div>

 {/* Preview Panel (Mobile/Tablet) */}
 <div className="space-y-6 lg:hidden">
 <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">
 Listing Preview
 </h3>

 <ListingPreview
 images={images}
 condition={condition}
 listingType={listingType}
 category={category}
 title={title}
 price={price}
 rentalPrice={rentalPrice}
 rentalPeriod={rentalPeriod}
 rentalDeposit={rentalDeposit}
 campus={campus}
 conditionLabels={CONDITION_LABELS}
 listingTypeLabels={LISTING_TYPE_LABELS}
 rentalPeriodLabels={RENTAL_PERIOD_LABELS}
 />

 <QualitySidebar
 qualityScore={qualityScore}
 qualityChecklist={qualityChecklist}
 />
 </div>

 <SlotRequestModal 
 open={showSlotRequestModal}
 onClose={() => setShowSlotRequestModal(false)}
 slotLimit={slotLimit}
 slotUsed={slotUsed}
 requestedSlotLimit={requestedSlotLimit}
 setRequestedSlotLimit={setRequestedSlotLimit}
 slotRequestReason={slotRequestReason}
 setSlotRequestReason={setSlotRequestReason}
 loading={slotRequestLoading}
 onSubmit={handleRequestMoreSlots}
 />
 </div>
 )
}
