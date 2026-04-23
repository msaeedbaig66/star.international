import { createClient } from '@/lib/supabase/server'
import { HeroManager } from '@/components/admin/hero/hero-manager'

export const dynamic = 'force-dynamic'

export default async function AdminHeroPage() {
 const supabase = await createClient()
 
 const { data: banners } = await supabase
 .from('hero_banners')
 .select('*')
 .order('display_order', { ascending: true })

 return (
 <div className="space-y-8">
 <div>
 <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Hero Matrix Control</h1>
 <p className="text-sm text-slate-500 font-medium">Coordinate the central visual identity and call-to-action gateways of Allpanga.</p>
 </div>

 <HeroManager initialBanners={banners || []} />
 </div>
 )
}
