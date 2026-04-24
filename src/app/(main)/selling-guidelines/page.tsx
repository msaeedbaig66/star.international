import Link from 'next/link'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Selling Guidelines | Allpanga' }

const LISTING_STEPS = [
 { step: 1, icon: 'add_photo_alternate', title: 'Take Great Photos', desc: 'Use natural lighting and capture all sides of the item. Show any wear or damage honestly.' },
 { step: 2, icon: 'edit_document', title: 'Write an Honest Description', desc: 'Include the item name, condition, usage history, and any defects. Be specific — buyers appreciate detail.' },
 { step: 3, icon: 'sell', title: 'Set a Fair Price', desc: 'Research similar items on campus. Price competitively — overpriced items sit unsold.' },
 { step: 4, icon: 'category', title: 'Choose the Right Category', desc: 'Pick the most accurate category and condition. This helps buyers find your item faster.' },
 { step: 5, icon: 'send', title: 'Submit for Review', desc: 'Our team reviews every listing within 24 hours. Once approved, your item goes live on the marketplace.' },
]

const CONDITIONS = [
 { label: 'New', desc: 'Unused, still in original packaging', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
 { label: 'Like New', desc: 'Used once or twice, no visible wear', color: 'bg-teal-50 border-teal-200 text-teal-800' },
 { label: 'Good', desc: 'Used but well-maintained, minor wear', color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
 { label: 'Fair', desc: 'Noticeable wear, fully functional', color: 'bg-amber-50 border-amber-200 text-amber-800' },
 { label: 'Poor', desc: 'Heavy wear, may need repair', color: 'bg-red-50 border-red-200 text-red-800' },
]

const ALLOWED_ITEMS = [
 'Textbooks & Study Materials', 'Electronics (laptops, tablets, calculators)',
 'Lab Equipment & Components', 'Project Materials & Tools',
 'Stationery & Office Supplies', 'Campus Accessories',
]

const NOT_ALLOWED_ITEMS = [
 'Food & Beverages', 'Non-academic Personal Items',
 'Weapons or Dangerous Goods', 'Copyrighted Exam Papers',
 'Counterfeit or Stolen Items', 'Commercial Business Products',
]

const TIMELINE = [
 { label: 'Submitted', icon: 'upload', color: 'bg-primary' },
 { label: 'Under Review', icon: 'pending', color: 'bg-amber-500' },
 { label: 'Approved', icon: 'check_circle', color: 'bg-emerald-500' },
 { label: 'Live', icon: 'storefront', color: 'bg-primary' },
 { label: 'Sold', icon: 'handshake', color: 'bg-purple-500' },
]

const SAFETY_TIPS = [
 'Always meet buyers on campus in a public, well-lit area',
 'Never share your home address or personal phone number',
 'Bring a friend to high-value transactions',
 'Count cash before handing over the item',
 'Trust your instincts — if something feels wrong, walk away',
]

export default function SellingGuidelinesPage() {
 return (
 <div className='bg-background min-h-screen'>
 {/* Header */}
 <section className='py-20 px-8 text-center'>
 <div className='w-20 h-20 mx-auto mb-8 rounded-3xl bg-primary/10 flex items-center justify-center'>
 <span className='material-symbols-outlined text-primary text-4xl' style={{ fontVariationSettings: "'FILL' 1" }}>sell</span>
 </div>
 <h1 className='text-5xl font-black tracking-tight text-text-primary mb-4'>Selling Guidelines</h1>
 <p className='text-text-secondary text-lg max-w-xl mx-auto'>Everything you need to know to list successfully on Allpanga.</p>
 </section>

 <div className='max-w-4xl mx-auto px-8 pb-24 space-y-20'>
 {/* Steps */}
 <section>
 <h2 className='text-3xl font-black text-text-primary mb-10 text-center'>How to List Successfully</h2>
 <div className='space-y-6'>
 {LISTING_STEPS.map(s => (
 <div key={s.step} className='bg-white rounded-3xl p-8 border border-border shadow-sm flex gap-6 items-start hover:shadow-lg transition-all'>
 <div className='w-14 h-14 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0'>
 <span className='material-symbols-outlined text-white text-2xl' style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
 </div>
 <div>
 <div className='flex items-center gap-3 mb-2'>
 <span className='text-xs font-black text-primary uppercase tracking-widest'>Step {s.step}</span>
 </div>
 <h3 className='text-lg font-black text-text-primary mb-1'>{s.title}</h3>
 <p className='text-text-secondary text-sm leading-relaxed'>{s.desc}</p>
 </div>
 </div>
 ))}
 </div>
 </section>

 {/* Condition Guide */}
 <section>
 <h2 className='text-3xl font-black text-text-primary mb-10 text-center'>Condition Guide</h2>
 <div className='space-y-4'>
 {CONDITIONS.map(c => (
 <div key={c.label} className={`rounded-2xl p-5 border-2 flex items-center gap-5 ${c.color}`}>
 <span className='font-black text-lg w-24 flex-shrink-0'>{c.label}</span>
 <p className='text-sm font-medium'>{c.desc}</p>
 </div>
 ))}
 </div>
 </section>

 {/* Photo Tips */}
 <section className='bg-primary/5 rounded-3xl p-10 border border-primary/10'>
 <h3 className='text-xl font-black text-text-primary mb-6 flex items-center gap-2'>
 <span className='material-symbols-outlined text-primary'>photo_camera</span>
 Photo Tips
 </h3>
 <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-secondary'>
 <p>• Use natural daylight — avoid flash</p>
 <p>• Capture the front, back, sides, and any labels</p>
 <p>• Show any damage or wear clearly</p>
 <p>• Use a clean, uncluttered background</p>
 <p>• Upload at least 2 photos (4 recommended)</p>
 <p>• Avoid screenshots of product pages</p>
 </div>
 </section>

 {/* Allowed / Not Allowed */}
 <section className='grid grid-cols-1 md:grid-cols-2 gap-8'>
 <div>
 <div className='border-l-4 border-success pl-6 mb-6'>
 <h3 className='text-xl font-black text-text-primary'>Allowed Items</h3>
 </div>
 <div className='space-y-3'>
 {ALLOWED_ITEMS.map(item => (
 <div key={item} className='flex items-center gap-3 bg-white rounded-xl p-4 border border-border shadow-sm'>
 <span className='material-symbols-outlined text-success' style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
 <span className='text-sm font-medium text-text-secondary'>{item}</span>
 </div>
 ))}
 </div>
 </div>
 <div>
 <div className='border-l-4 border-destructive pl-6 mb-6'>
 <h3 className='text-xl font-black text-text-primary'>Not Allowed</h3>
 </div>
 <div className='space-y-3'>
 {NOT_ALLOWED_ITEMS.map(item => (
 <div key={item} className='flex items-center gap-3 bg-white rounded-xl p-4 border border-border shadow-sm'>
 <span className='material-symbols-outlined text-destructive' style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
 <span className='text-sm font-medium text-text-secondary'>{item}</span>
 </div>
 ))}
 </div>
 </div>
 </section>

  {/* Timeline */}
  <section className='relative overflow-hidden'>
  <h2 className='text-3xl font-black text-text-primary mb-12 text-center'>After You List</h2>
  
  <div className='relative flex flex-col sm:flex-row justify-between gap-8 sm:gap-4 px-4'>
  {/* Connector Lines (Desktop) */}
  <div className='absolute top-10 left-12 right-12 h-0.5 bg-border hidden sm:block -z-10' />
  
  {TIMELINE.map((t, i) => (
  <div key={t.label} className='relative flex-1 group'>
  {/* Connector Line (Mobile) */}
  {i < TIMELINE.length - 1 && (
  <div className='absolute left-[31px] top-16 bottom-[-32px] w-0.5 bg-border sm:hidden' />
  )}

  <div className='flex flex-row sm:flex-col items-center gap-6 sm:gap-4'>
  <div className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-110 ${t.color} border-4 border-white`}>
  <span className='material-symbols-outlined text-white text-2xl' style={{ fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
  </div>
  
  <div className='flex flex-col sm:items-center'>
  <span className='text-sm font-black text-text-primary uppercase tracking-wider'>{t.label}</span>
  <p className='text-[10px] font-bold text-text-muted sm:text-center mt-0.5'>
  {i === 0 ? 'Initial Posting' : 
  i === 1 ? 'Verification Phase' :
  i === 2 ? 'Safety Check Passed' :
  i === 3 ? 'Active on Platform' : 'Deal Completed'}
  </p>
  </div>
  </div>
  </div>
  ))}
  </div>
  </section>

 {/* Listing Lifespan */}
 <section className='bg-primary/5 rounded-3xl p-10 border border-primary/10'>
 <h3 className='text-xl font-black text-text-primary mb-4 flex items-center gap-2'>
 <span className='material-symbols-outlined text-primary' style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
 Listing Lifespan
 </h3>
 <p className='text-text-secondary text-sm leading-relaxed'>
 To provide the best experience for our community, student listings have a <strong>30-day lifespan</strong>. 
 If your item hasn&apos;t sold within 30 days, it will be automatically removed from the marketplace. 
 This ensures that our listings stay current and buyers don&apos;t contact you about items that are no longer available.
 </p>
 </section>

 {/* Safety */}
 <section className='bg-amber-50 rounded-3xl p-10 border-2 border-amber-200'>
 <h3 className='text-xl font-black text-amber-900 mb-6 flex items-center gap-2'>
 <span className='material-symbols-outlined text-amber-600' style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
 Safety When Selling
 </h3>
 <div className='space-y-3'>
 {SAFETY_TIPS.map(tip => (
 <div key={tip} className='flex items-start gap-3'>
 <span className='material-symbols-outlined text-amber-600 text-lg mt-0.5'>priority_high</span>
 <p className='text-amber-900 text-sm font-medium'>{tip}</p>
 </div>
 ))}
 </div>
 </section>

 {/* CTA */}
 <section className='text-center'>
 <Link href='/dashboard?tab=sell' className='inline-flex items-center gap-2 bg-primary text-white px-10 py-5 rounded-full font-black uppercase tracking-widest text-sm shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95'>
 <span className='material-symbols-outlined'>add</span>
 List an Item
 </Link>
 </section>
 </div>
 </div>
 )
}
