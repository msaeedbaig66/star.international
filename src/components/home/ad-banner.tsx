import { createClient } from '@/lib/supabase/server'
import { AdBannerSlider } from './ad-banner-slider'

interface AdBannerProps {
 slot?: number
}

export const revalidate = 60

export async function AdBanner({ slot }: AdBannerProps) {
 const supabase = await createClient()
 const { data: ads } = await supabase
 .from('advertisements')
 .select('id, title, image_url, link_url, display_order, is_active, created_at, meta')
 .eq('is_active', true)
 .order('display_order', { ascending: true })

 const activeAds = ads || []
 const rowAds = activeAds.filter((ad: any) => (ad.display_order || 0) > 0)

 if (slot && slot > 0) {
 const slotAd = rowAds.find((ad: any) => Number(ad.display_order) === slot)
 if (!slotAd) return null
 return <AdBannerSlider ads={[slotAd]} />
 }

 if (rowAds.length === 0) return null
 return <AdBannerSlider ads={rowAds} />
}
