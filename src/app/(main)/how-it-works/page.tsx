'use client'
import { useState } from 'react'
import Link from 'next/link'

const BUYER_STEPS = [
  { icon: 'search', title: 'Find', desc: 'Browse listings by category, search by keyword, or filter by campus and condition.' },
  { icon: 'chat', title: 'Contact', desc: 'Message the seller directly through Allpanga\'s in-app messaging. Ask questions, negotiate, and arrange details.' },
  { icon: 'handshake', title: 'Meet', desc: 'Meet the seller on campus in a public area. Inspect the item and agree on the price.' },
  { icon: 'star', title: 'Review', desc: 'After the transaction, rate the seller. Your review helps build trust for the community.' },
]

const SELLER_STEPS = [
  { icon: 'add_photo_alternate', title: 'List', desc: 'Upload photos, write a description, set your price, and submit your listing for review.' },
  { icon: 'verified', title: 'Reviewed', desc: 'Our team reviews your listing within 24 hours. Once approved, your item goes live.' },
  { icon: 'forum', title: 'Connect', desc: 'Interested buyers will message you. Respond quickly and arrange a meeting point.' },
  { icon: 'check_circle', title: 'Complete', desc: 'Meet the buyer, complete the sale, and mark your listing as sold. That\'s it!' },
]

const FEATURES = [
  { icon: 'payments', title: 'Zero Fees', desc: 'No listing fees, no commissions, no hidden charges. Allpanga is 100% free.' },
  { icon: 'verified_user', title: 'Verified Students', desc: 'Every user is a real student. Student verification builds trust.' },
  { icon: 'speed', title: 'Fast Reviews', desc: 'Listings are reviewed and approved within 24 hours.' },
  { icon: 'forum', title: 'In-App Messaging', desc: 'Chat with buyers and sellers directly on the platform.' },
  { icon: 'groups', title: 'Campus Communities', desc: 'Join or create groups for your field, program, or interests.' },
  { icon: 'edit_note', title: 'Project Blogs', desc: 'Share your work and learn from other students\' projects.' },
]

const MINI_FAQ = [
  { q: 'Is Allpanga really free?', a: 'Yes. There are no fees of any kind. Allpanga is completely free for all students.' },
  { q: 'How do I know sellers are real students?', a: 'All users create accounts with their university email. We also offer optional student ID verification.' },
  { q: 'What if I have a problem with a transaction?', a: 'Use the Report button on any listing or profile. Our moderation team investigates every report within 24 hours.' },
]

export default function HowItWorksPage() {
  const [activeTab, setActiveTab] = useState<'buyers' | 'sellers'>('buyers')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const steps = activeTab === 'buyers' ? BUYER_STEPS : SELLER_STEPS

  return (
    <div className='bg-background min-h-screen'>
      {/* Header */}
      <section className='py-20 px-8 text-center'>
        <h1 className='text-5xl font-black tracking-tight text-text-primary mb-4'>How Allpanga Works</h1>
        <p className='text-text-secondary text-lg max-w-xl mx-auto'>Whether you&apos;re buying or selling, it&apos;s simple, safe, and free.</p>
      </section>

      <div className='max-w-5xl mx-auto px-8 pb-24 space-y-24'>
        {/* Tab Switcher */}
        <div className='flex justify-center'>
          <div className='bg-surface rounded-full p-1.5 inline-flex border border-border'>
            <button
              onClick={() => setActiveTab('buyers')}
              className={`px-8 py-3 rounded-full font-black text-sm transition-all ${activeTab === 'buyers' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
            >
              For Buyers
            </button>
            <button
              onClick={() => setActiveTab('sellers')}
              className={`px-8 py-3 rounded-full font-black text-sm transition-all ${activeTab === 'sellers' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
            >
              For Sellers
            </button>
          </div>
        </div>

        {/* Steps */}
        <section className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
          {steps.map((s, i) => (
            <div key={s.title} className='bg-white rounded-3xl p-8 border border-border shadow-sm text-center hover:shadow-xl transition-all group relative'>
              <div className='w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-all'>
                <span className='material-symbols-outlined text-primary text-3xl group-hover:text-white transition-colors' style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
              </div>
              <span className='text-xs font-black text-primary uppercase tracking-widest'>Step {i + 1}</span>
              <h3 className='text-xl font-black text-text-primary mt-2 mb-3'>{s.title}</h3>
              <p className='text-text-secondary text-sm leading-relaxed'>{s.desc}</p>
            </div>
          ))}
        </section>

        {/* Features */}
        <section>
          <div className='text-center mb-16'>
            <h2 className='text-4xl font-black tracking-tight text-text-primary mb-4'>Why Students Love Allpanga</h2>
            <p className='text-text-secondary text-lg'>Built around student needs.</p>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {FEATURES.map(feat => (
              <div key={feat.title} className='bg-white rounded-3xl p-8 border border-border shadow-sm hover:shadow-lg transition-all group'>
                <div className='w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary transition-all'>
                  <span className='material-symbols-outlined text-primary text-xl group-hover:text-white transition-colors' style={{ fontVariationSettings: "'FILL' 1" }}>{feat.icon}</span>
                </div>
                <h3 className='text-lg font-black text-text-primary mb-2'>{feat.title}</h3>
                <p className='text-text-secondary text-sm leading-relaxed'>{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Mini FAQ */}
        <section>
          <h2 className='text-3xl font-black text-text-primary mb-8 text-center'>Common Questions</h2>
          <div className='space-y-3 max-w-2xl mx-auto'>
            {MINI_FAQ.map((item, i) => (
              <div key={i} className='bg-white rounded-2xl border border-border overflow-hidden shadow-sm'>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className='w-full flex items-center justify-between px-6 py-5 text-left hover:bg-surface transition-colors'
                >
                  <span className='font-bold text-text-primary pr-4'>{item.q}</span>
                  <span className='material-symbols-outlined text-text-muted flex-shrink-0 transition-transform' style={{ transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)' }}>add</span>
                </button>
                {openFaq === i && (
                  <div className='px-6 pb-5 pt-0 text-text-secondary leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200'>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className='text-center mt-8'>
            <Link href='/faq' className='text-primary font-bold text-sm hover:underline underline-offset-4'>View Full Help Center →</Link>
          </div>
        </section>

        {/* CTA */}
        <section className='bg-primary rounded-[3rem] p-12 md:p-16 text-center text-white relative overflow-hidden'>
          <div className='absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-bl-full pointer-events-none' />
          <h2 className='text-3xl md:text-5xl font-black tracking-tight mb-6 relative z-10'>Ready to get started?</h2>
          <p className='text-white/80 text-lg mb-10 max-w-xl mx-auto relative z-10'>Join Allpanga today and start buying, selling, and collaborating with fellow students.</p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center relative z-10'>
            <Link href='/marketplace' className='bg-white text-primary px-10 py-5 rounded-full font-black uppercase tracking-[0.15em] text-sm hover:bg-surface transition-all active:scale-95 text-center'>
              Start Buying
            </Link>
            <Link href='/dashboard?tab=sell' className='border-2 border-white/40 text-white px-10 py-5 rounded-full font-black uppercase tracking-[0.15em] text-sm hover:bg-white/10 transition-all active:scale-95 text-center'>
              Start Selling
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
