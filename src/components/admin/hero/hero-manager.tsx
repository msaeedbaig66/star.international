'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { uploadToCloudinary } from '@/lib/cloudinary'

interface Banner {
 id: string
 image_url: string
 title: string | null
 subtitle: string | null
 button_text: string | null
 button_url: string | null
 display_order: number
 is_active: boolean
}

export function HeroManager({ initialBanners }: { initialBanners: Banner[] }) {
 const [banners, setBanners] = useState<Banner[]>(initialBanners)
 const [loading, setLoading] = useState(false)
 const [editingId, setEditingId] = useState<string | null>(null)
 const router = useRouter()
 const supabase = createClient()

 // Sync state when server data changes from router.refresh()
 useEffect(() => {
 setBanners(initialBanners)
 }, [initialBanners])

 const handleToggleActive = async (id: string, current: boolean) => {
 setLoading(true)
 const { error } = await supabase
 .from('hero_banners')
 .update({ is_active: !current })
 .eq('id', id)
 
 if (!error) {
 setBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: !current } : b))
 router.refresh()
 }
 setLoading(false)
 }

 const handleDelete = async (id: string) => {
 if (!confirm('Are you sure you want to delete this banner?')) return
 setLoading(true)
 const { error } = await supabase
 .from('hero_banners')
 .delete()
 .eq('id', id)
 
 if (!error) {
 setBanners(prev => prev.filter(b => b.id !== id))
 router.refresh()
 }
 setLoading(false)
 }

 return (
 <div className="space-y-6">
 <div className="flex justify-end">
 <button 
 onClick={() => setEditingId('new')}
 className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
 >
 <span className="material-symbols-outlined text-[18px]">add</span>
 Deploy New Banner
 </button>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
 {banners.map((banner) => (
 <div key={banner.id} className={cn(
 "group bg-white rounded-3xl overflow-hidden border transition-all duration-300",
 banner.is_active ? "border-slate-100 shadow-xl" : "border-slate-200 opacity-60 grayscale-[0.5]"
 )}>
 <div className="relative aspect-[16/9] w-full bg-slate-100">
 <Image 
 src={banner.image_url} 
 alt="Banner Preview" 
 fill 
 sizes="(max-width: 768px) 100vw, 50vw"
 className="object-cover" 
 />
 <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
 <div className="absolute bottom-4 left-4 right-4 text-white">
 <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest mb-2 inline-block">Order: {banner.display_order}</span>
 <h4 className="font-black truncate uppercase text-sm leading-none">{banner.title || 'No Title'}</h4>
 </div>
 </div>

 <div className="p-5 space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex flex-col">
 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visibility</span>
 <span className={cn("text-xs font-black uppercase", banner.is_active ? "text-emerald-600" : "text-slate-400")}>
 {banner.is_active ? 'Active on Home' : 'Shadow Mode'}
 </span>
 </div>
 <div className="flex items-center gap-2">
 <button 
 disabled={loading}
 onClick={() => handleToggleActive(banner.id, banner.is_active)}
 className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center hover:bg-white hover:border-emerald-500 transition-all text-slate-400 hover:text-emerald-600"
 >
 <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: banner.is_active ? "'FILL' 1" : "'FILL' 0" }}>
 visibility
 </span>
 </button>
 <button 
 onClick={() => setEditingId(banner.id)}
 className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center hover:bg-white hover:border-sky-500 transition-all text-slate-400 hover:text-sky-600"
 >
 <span className="material-symbols-outlined text-[20px]">edit</span>
 </button>
 <button 
 disabled={loading}
 onClick={() => handleDelete(banner.id)}
 className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center hover:bg-rose-50 hover:border-rose-200 transition-all text-slate-400 hover:text-rose-600"
 >
 <span className="material-symbols-outlined text-[20px]">delete</span>
 </button>
 </div>
 </div>

 {banner.button_text && (
 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
 <div className="flex flex-col">
 <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">CTA Button</span>
 <span className="text-[10px] font-black text-slate-700 uppercase">{banner.button_text}</span>
 </div>
 <span className="material-symbols-outlined text-sm text-slate-400">link</span>
 </div>
 )}
 </div>
 </div>
 ))}
 </div>

 {editingId && (
 <BannerEditor 
 id={editingId} 
 onClose={() => setEditingId(null)} 
 initialData={banners.find(b => b.id === editingId)}
 onSuccess={() => {
 setEditingId(null)
 router.refresh()
 }}
 />
 )}
 </div>
 )
}

function BannerEditor({ id, onClose, initialData, onSuccess }: { id: string, onClose: () => void, initialData?: Banner, onSuccess: () => void }) {
 const [formData, setFormData] = useState({
 title: initialData?.title || '',
 subtitle: initialData?.subtitle || '',
 image_url: initialData?.image_url || '',
 button_text: initialData?.button_text || '',
 button_url: initialData?.button_url || '',
 display_order: initialData?.display_order || 0,
 is_active: initialData?.is_active ?? true
 })
 const [uploading, setUploading] = useState(false)
 const supabase = createClient()

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!formData.image_url) {
 alert('An image is required.')
 return
 }

 // Clean up empty strings to be null for cleaner database entries
 const payload = {
 ...formData,
 title: formData.title.trim() || null,
 subtitle: formData.subtitle.trim() || null,
 button_text: formData.button_text.trim() || null,
 button_url: formData.button_url.trim() || null,
 }

 setUploading(true)
 try {
 if (id === 'new') {
 const { error, data } = await supabase.from('hero_banners').insert([payload]).select()
 if (error) throw error
 if (!data || data.length === 0) throw new Error("Insert blocked by security policy")
 } else {
 const { error, data } = await supabase.from('hero_banners').update(payload).eq('id', id).select()
 if (error) throw error
 if (!data || data.length === 0) throw new Error("Update blocked by security policy")
 }
 onSuccess()
 } catch (err: any) {
 console.error('Hero Matrix Sync Error:', err)
 alert(`Synchronization Failed: ${err.message || 'Unknown Error'}`)
 } finally {
 setUploading(false)
 }
 }

 const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0]
 if (!file) return

 setUploading(true)
 try {
 // Professional Cloudinary upload
 const url = await uploadToCloudinary(file, 'hero')
 setFormData(prev => ({ ...prev, image_url: url }))
 } catch (err) {
 alert('Error uploading to Cloudinary!')
 } finally {
 setUploading(false)
 }
 }

 return (
 <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto">
 {/* Synchronization Progress Overlay */}
 {uploading && (
 <div className="absolute inset-0 z-[110] bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center transition-all animate-in fade-in">
 <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
 <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Synchronizing Matrix...</p>
 <p className="text-[10px] text-slate-500 font-medium mt-1">Establishing secure connection to repository</p>
 </div>
 )}

 <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden animate-reveal my-auto relative">
 <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
 <div>
 <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">{id === 'new' ? 'New Banner Node' : 'Edit Matrix Node'}</h2>
 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configure Visual Gateway Interface</p>
 </div>
 <button 
 type="button"
 onClick={onClose} 
 className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all"
 >
 <span className="material-symbols-outlined text-slate-400">close</span>
 </button>
 </div>

 <form onSubmit={handleSubmit} method="POST" className="p-8 space-y-6">
 <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl">
 <p className="text-[10px] font-black text-sky-700 uppercase tracking-widest flex items-center gap-2">
 <span className="material-symbols-outlined text-sm">info</span>
 Pro Tip: Poster Mode
 </p>
 <p className="text-[10px] text-sky-600 mt-1 font-medium leading-relaxed">
 If you leave **Title** and **Subtitle** empty, the system enters &quot;Poster Mode.&quot; Your image will be shown at 100% brightness with no text overlay. Use this for pre-designed PNG posters.
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-4 md:col-span-2">
 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Main Header Title (Optional)</label>
 <input 
 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-500 transition-all outline-none"
 value={formData.title} 
 onChange={e => setFormData({ ...formData, title: e.target.value })} 
 placeholder="Leave empty for Poster Mode"
 />
 </div>

 <div className="space-y-4 md:col-span-2">
 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtitle / Description (Optional)</label>
 <textarea 
 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 focus:bg-white focus:border-emerald-500 transition-all outline-none min-h-[80px]"
 value={formData.subtitle} 
 onChange={e => setFormData({ ...formData, subtitle: e.target.value })} 
 placeholder="Leave empty for Poster Mode"
 />
 </div>

 <div className="space-y-4">
 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Button Label (Optional)</label>
 <input 
 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-500 transition-all outline-none"
 value={formData.button_text} 
 onChange={e => setFormData({ ...formData, button_text: e.target.value })} 
 placeholder="e.g. Shop Now"
 />
 </div>

 <div className="space-y-4">
 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Button Target Link (Optional)</label>
 <input 
 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-500 transition-all outline-none"
 value={formData.button_url} 
 onChange={e => setFormData({ ...formData, button_url: e.target.value })} 
 placeholder="e.g. /marketplace"
 />
 </div>

 <div className="space-y-4">
 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Display Priority (Numeric)</label>
 <input 
 type="number"
 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-500 transition-all outline-none"
 value={formData.display_order} 
 onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) })} 
 />
 </div>

 <div className="space-y-4">
 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Banner Media Sourcing</label>
 <div className="flex items-center gap-3">
 <label className={cn(
 "flex-1 flex items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-3 transition-all cursor-pointer",
 uploading ? "opacity-50 cursor-wait bg-slate-50" : "border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20"
 )}>
 <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
 <span className="material-symbols-outlined text-[18px] text-slate-400">upload_file</span>
 <span className="text-[10px] font-black text-slate-500 uppercase">{uploading ? 'Processing Matrix...' : 'Upload Local Image'}</span>
 </label>
 {formData.image_url && (
 <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
 <Image src={formData.image_url} alt="Mini Preview" width={48} height={48} className="object-cover h-full" />
 </div>
 )}
 </div>
 </div>
 </div>

 <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
 <button 
 type="submit" 
 disabled={uploading || !formData.image_url}
 className="flex-1 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {uploading ? 'Syncing...' : 'Synchronize Banner Matrix'}
 </button>
 <button 
 type="button"
 onClick={onClose}
 className="bg-white border border-slate-200 text-slate-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
 >
 Cancel
 </button>
 </div>
 </form>
 </div>
 </div>
 )
}
