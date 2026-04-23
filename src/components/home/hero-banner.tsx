import { createClient } from '@/lib/supabase/server'
import { HeroSlider } from './hero-slider'

export const dynamic = 'force-dynamic'

export async function HeroBanner() {
 const supabase = await createClient()
 
 // Fetch active banners ordered by display_order
 const { data: banners } = await supabase
 .from('hero_banners')
 .select('id, image_url, title, subtitle, button_text, button_url')
 .eq('is_active', true)
 .order('display_order', { ascending: true })
 .limit(5)

 // Fallback banner if DB is empty
 const defaultBanners = [
 {
 id: 'default-1',
 image_url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070',
 title: 'Democratizing Student Trade.',
 subtitle: 'Built to empower the academic community through zero-fee commerce and knowledge sharing.',
 button_text: 'Start Trading',
 button_url: '/signup'
 }
 ]

 const displayBanners = banners && banners.length > 0 ? banners : defaultBanners

 return (
 <div className="w-full">
 <HeroSlider banners={displayBanners} />
 
 {/* Visual Sub-Banner Features: Professional Trust Bar (Now Mobile Responsive) */}
 <div className="relative z-20 -mt-6 sm:-mt-8 mx-auto max-w-5xl">
 <div className="flex items-center gap-4 sm:gap-12 overflow-x-auto scrollbar-hide px-4 sm:px-8 py-4 sm:py-5 bg-white border border-slate-200 rounded-[2rem] sm:rounded-3xl shadow-xl">
 {/* Security Stat */}
 <div className="flex items-center gap-3 sm:gap-4 group shrink-0">
 <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
 <span className="material-symbols-outlined text-xl">shield_locked</span>
 </div>
 <div className="flex flex-col">
 <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Security</span>
 <span className="text-[11px] sm:text-xs font-black text-slate-800 uppercase whitespace-nowrap">Academic Trust</span>
 </div>
 </div>

 <div className="hidden sm:block w-px h-8 bg-slate-100" />

 {/* Verification Stat */}
 <div className="flex items-center gap-3 sm:gap-4 group shrink-0">
 <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
 <span className="material-symbols-outlined text-xl">school</span>
 </div>
 <div className="flex flex-col">
 <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Verification</span>
 <span className="text-[11px] sm:text-xs font-black text-slate-800 uppercase whitespace-nowrap">Student Only</span>
 </div>
 </div>

 <div className="hidden sm:block w-px h-8 bg-slate-100" />

 {/* Velocity Stat */}
 <div className="flex items-center gap-3 sm:gap-4 group shrink-0 pr-4 sm:pr-0">
 <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
 <span className="material-symbols-outlined text-xl">bolt</span>
 </div>
 <div className="flex flex-col">
 <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Velocity</span>
 <span className="text-[11px] sm:text-xs font-black text-slate-800 uppercase whitespace-nowrap">Instant Connect</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 )
}
