'use client'
import Link from 'next/link'
import { useState } from 'react'

const HELP_CATEGORIES = [
  {
    title: 'Getting Started',
    icon: 'rocket_launch',
    description: 'Learn how to create an account, verify your status, and start using Allpanga.',
    links: [
      { label: 'How to create an account', href: '/faq' },
      { label: 'Verification process', href: '/faq' },
      { label: 'Platform overview', href: '/about' },
    ]
  },
  {
    title: 'Buying & Selling',
    icon: 'shopping_bag',
    description: 'Everything you need to know about trading items in the marketplace.',
    links: [
      { label: 'Listing an item', href: '/selling-guidelines' },
      { label: 'Safety tips for buying', href: '/faq' },
      { label: 'Prohibited items', href: '/terms' },
    ]
  },
  {
    title: 'Community & Blogs',
    icon: 'groups',
    description: 'Connect with other students and share your project journey.',
    links: [
      { label: 'Joining Nexus Hub', href: '/faq' },
      { label: 'Writing your first blog', href: '/faq' },
      { label: 'Community guidelines', href: '/guidelines' },
    ]
  },
  {
    title: 'Account Settings',
    icon: 'manage_accounts',
    description: 'Manage your profile, security, and notification preferences.',
    links: [
      { label: 'Changing your password', href: '/faq' },
      { label: 'Deleting your account', href: '/faq' },
      { label: 'Privacy settings', href: '/privacy' },
    ]
  },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className='bg-background min-h-screen'>
      {/* Hero Section */}
      <section className='bg-surface py-20 border-b border-border px-8 relative overflow-hidden'>
        {/* Background decorative elements */}
        <div className='absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48'></div>
        <div className='absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -ml-32 -mb-32'></div>
        
        <div className='max-w-4xl mx-auto text-center relative z-10'>
          <p className='text-xs font-black uppercase tracking-[0.3em] text-primary mb-4'>Help Center</p>
          <h1 className='text-4xl md:text-6xl font-black tracking-tight text-text-primary mb-6'>How can we help you?</h1>
          <p className='text-text-secondary text-lg mb-10 max-w-xl mx-auto'>Search our articles or browse categories below to find what you need.</p>
          
          <div className='relative max-w-2xl mx-auto'>
            <span className='material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-text-muted text-2xl'>search</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type='text'
              placeholder='Search for help articles...'
              className='w-full pl-16 pr-8 py-5 rounded-3xl border border-border bg-white shadow-xl shadow-primary/5 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-base transition-all'
            />
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className='max-w-7xl mx-auto px-8 py-20'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
          {HELP_CATEGORIES.map((cat) => (
            <div key={cat.title} className='bg-white rounded-[2.5rem] p-8 border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group'>
              <div className='w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300'>
                <span className='material-symbols-outlined text-3xl'>{cat.icon}</span>
              </div>
              <h3 className='text-xl font-black text-text-primary mb-3'>{cat.title}</h3>
              <p className='text-text-secondary text-sm leading-relaxed mb-8'>{cat.description}</p>
              
              <ul className='space-y-4'>
                {cat.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className='text-sm font-bold text-primary hover:underline underline-offset-4 flex items-center gap-2'>
                      {link.label}
                      <span className='material-symbols-outlined text-xs'>arrow_forward</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Support CTA */}
      <section className='max-w-7xl mx-auto px-8 pb-24'>
        <div className='bg-primary rounded-[3rem] p-12 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl shadow-primary/30'>
          {/* Decorative icons */}
          <div className='absolute top-0 right-0 opacity-10 translate-x-1/4 -translate-y-1/4'>
            <span className='material-symbols-outlined text-[300px]'>support_agent</span>
          </div>
          
          <div className='relative z-10 max-w-xl text-center md:text-left'>
            <h2 className='text-3xl md:text-4xl font-black mb-4'>Still can&apos;t find what you need?</h2>
            <p className='text-white/80 text-lg mb-0'>Our dedicated support team is ready to assist you with any questions or issues.</p>
          </div>
          
          <div className='relative z-10 flex flex-col sm:flex-row gap-4 shrink-0'>
            <Link href='/contact' className='px-10 py-5 rounded-full bg-white text-primary font-black text-sm uppercase tracking-widest hover:bg-surface transition-all active:scale-95 shadow-lg shadow-black/10'>
              Contact Support
            </Link>
            <Link href='/faq' className='px-10 py-5 rounded-full border-2 border-white/30 text-white font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95'>
              Browse All FAQ
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Info */}
      <section className='max-w-4xl mx-auto px-8 pb-20 text-center space-y-4'>
        <div className='flex flex-wrap items-center justify-center gap-4'>
          <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border text-xs font-bold text-text-muted'>
            <span className='material-symbols-outlined text-sm'>schedule</span>
            Office Hours: 8:00 AM - 10:00 PM
          </div>
          <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border text-xs font-bold text-text-muted'>
            <span className='material-symbols-outlined text-sm'>mail</span>
            star.international.sgi@gmail.com
          </div>
        </div>
        <p className='text-[10px] text-text-muted uppercase tracking-widest font-black'>
          Location: 31.408036, 73.053886 • IT Center, NTU, Faisalabad
        </p>
      </section>
    </div>
  )
}
