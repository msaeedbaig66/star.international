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
 </div>
 )
}
