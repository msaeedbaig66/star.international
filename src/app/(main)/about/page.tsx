import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata = { title: 'Origins | Allpanga' }

const MISSION_CARDS = [
  { icon: 'volunteer_activism', title: 'Free Forever', desc: 'No fees, no commissions, no hidden charges. Allpanga is and always will be completely free for students.' },
  { icon: 'verified_user', title: 'Safe & Verified', desc: 'Student-only platform with verified accounts, content moderation, and community-driven trust.' },
  { icon: 'groups', title: 'Community First', desc: 'Built around campus communities — collaborate on projects, join field groups, and grow together.' },
]

const FEATURES = [
  { icon: 'storefront', title: 'Marketplace', desc: 'Securely buy and sell academic gear — textbooks, laptops, and specialized lab tools — with absolute zero fees.' },
  { icon: 'edit_note', title: 'Nexus Feed', desc: 'A sophisticated knowledge stream where students share research, tutorials, and academic breakthroughs.' },
  { icon: 'hub', title: 'Nexus Hubs', desc: 'Join or spearhead field-specific hubs to coordinate projects, events, and collaborative study groups.' },
  { icon: 'verified', title: 'Reputation', desc: 'Forge your professional student identity with our peer-verified rating system and trust protocols.' },
]

export default async function AboutPage() {
  const supabase = await createClient()

  // Fetch Real Stats
  const [
    { count: studentsCount },
    { count: itemsCount },
    { count: communitiesCount },
    { count: unisCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('listings').select('*', { count: 'exact', head: true }),
    supabase.from('communities').select('*', { count: 'exact', head: true }),
    supabase.from('institutions').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { value: (studentsCount || 0).toLocaleString(), label: 'Verified Students', icon: 'school', color: 'text-primary' },
    { value: (itemsCount || 0).toLocaleString(), label: 'Items Listed', icon: 'shopping_bag', color: 'text-emerald-500' },
    { value: (communitiesCount || 0).toLocaleString(), label: 'Nexus Hubs', icon: 'hub', color: 'text-emerald-600' },
    { value: (unisCount || 5).toLocaleString(), label: 'Institutions', icon: 'account_balance', color: 'text-primary/80' },
  ]

  return (
    <div className='bg-background min-h-screen font-sans overflow-x-hidden selection:bg-emerald-100 selection:text-emerald-900'>
      {/* Hero: Ultra-Premium Mesh Gradient */}
      <section className='relative bg-[#0a0f18] text-white py-24 md:py-48 px-6 sm:px-8 overflow-hidden'>
        <div className='absolute inset-0'>
          <div className='absolute top-[-20%] right-[-10%] w-[300px] md:w-[800px] h-[300px] md:h-[800px] rounded-full bg-primary/20 blur-[80px] md:blur-[120px] animate-pulse' />
          <div className='absolute bottom-[-20%] left-[-10%] w-[250px] md:w-[700px] h-[250px] md:h-[700px] rounded-full bg-emerald-500/10 blur-[60px] md:blur-[100px]' />
          <div className='absolute inset-0 bg-[url("https://www.transparenttextures.com/patterns/carbon-fibre.png")] opacity-[0.03]' />
        </div>
        
        <div className='max-w-6xl mx-auto text-center relative z-10'>
          <div className='inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl text-emerald-400 text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] mb-12 animate-in slide-in-from-top-10 duration-1000'>
            <span className='w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse' />
            The Peer-to-Peer Scholar Engine
          </div>
          <h1 className='text-[clamp(2.5rem,15vw,9rem)] font-black tracking-tighter mb-8 leading-[0.85] text-white animate-in zoom-in-95 duration-1000'>
            Trade. <span className='text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-primary italic'>Thrive.</span> <br />Together.
          </h1>
          <p className='text-base md:text-2xl text-white/60 max-w-2xl mx-auto mb-14 leading-tight md:leading-relaxed font-medium tracking-tight text-balance opacity-0 animate-in fade-in slide-in-from-bottom-10 fill-mode-forwards duration-1000 delay-300'>
            Allpanga is an autonomous infrastructure designed to empower students through 
            zero-fee trade, verified intelligence, and community protocols.
          </p>
          <div className='flex flex-col sm:flex-row items-center justify-center gap-5 opacity-0 animate-in fade-in slide-in-from-bottom-10 fill-mode-forwards duration-1000 delay-500'>
            <Link href='/signup' className='w-full sm:w-auto bg-primary text-white px-14 py-6 rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-[0_20px_40px_-10px_rgba(0,186,124,0.4)] hover:bg-emerald-400 hover:text-slate-950 transition-all active:scale-95'>
              Initialize Account
            </Link>
            <Link href='/marketplace' className='w-full sm:w-auto bg-white/5 border border-white/15 backdrop-blur-md text-white px-14 py-6 rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-white/10 transition-all'>
              Explore Ecosystem
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section: 1x2 Grid for compact Mobile, 4x1 for Desktop */}
      <section className='relative z-20 -mt-8 md:-mt-12 px-6 sm:px-8'>
        <div className='max-w-7xl mx-auto'>
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8'>
            {stats.map((stat) => (
              <div key={stat.label} className='bg-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[4rem] border border-slate-100 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.06)] group hover:-translate-y-2 transition-all duration-700'>
                <div className='flex items-center justify-between mb-8'>
                  <div className='w-12 h-12 md:w-20 md:h-20 rounded-[1.5rem] md:rounded-[2.5rem] bg-slate-50 flex items-center justify-center group-hover:bg-primary/5 transition-all duration-500'>
                    <span className={`material-symbols-outlined text-2xl md:text-5xl ${stat.color}`}>{stat.icon}</span>
                  </div>
                  <span className='material-symbols-outlined text-emerald-500/20 group-hover:text-emerald-500 group-hover:rotate-12 transition-all duration-500'>insights</span>
                </div>
                <p className='text-3xl md:text-7xl font-black text-slate-900 tracking-tighter mb-2 leading-none'>{stat.value}</p>
                <p className='text-[8px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]'>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission: Modern Split Section */}
      <section className='max-w-7xl mx-auto px-6 sm:px-8 py-24 md:py-56'>
        <div className='flex flex-col lg:flex-row gap-20 md:gap-32 items-center'>
            <div className='lg:w-5/12 w-full'>
                <div className='flex items-center gap-3 mb-8'>
                    <div className='w-12 h-[2px] bg-primary' />
                    <span className='text-[10px] md:text-[12px] font-black uppercase tracking-[0.5em] text-primary'>The Origins</span>
                </div>
                <h2 className='text-4xl md:text-7xl font-black tracking-tighter text-slate-900 mb-12 leading-[0.9] uppercase'>Architected for excellence.</h2>
                <div className='space-y-12'>
                    {MISSION_CARDS.map((card) => (
                        <div key={card.title} className='flex gap-6 md:gap-10 items-start group/card'>
                            <div className='w-16 h-16 shrink-0 rounded-[1.75rem] bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 group-hover/card:bg-primary group-hover/card:border-primary group-hover/card:text-white group-hover/card:scale-110 transition-all duration-700'>
                                <span className='material-symbols-outlined text-3xl md:text-4xl'>{card.icon}</span>
                            </div>
                            <div className='pt-2'>
                                <h3 className='text-lg md:text-xl font-black text-slate-900 mb-3 uppercase tracking-tight'>{card.title}</h3>
                                <p className='text-slate-500 text-sm md:text-base leading-relaxed font-medium opacity-80'>{card.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className='lg:w-7/12 w-full relative'>
                <div className='aspect-video md:aspect-[4/5] rounded-[4rem] md:rounded-[6rem] bg-slate-50 border-8 border-white shadow-2xl overflow-hidden relative group'>
                    <div className='absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-primary/10 opacity-60 group-hover:scale-125 transition-transform duration-[3000ms]' />
                    <div className='absolute inset-8 md:inset-20 border-2 border-dashed border-emerald-500/20 rounded-[3rem] md:rounded-[5rem] flex flex-col items-center justify-center text-center p-8 backdrop-blur-[2px]'>
                        <div className='relative mb-10'>
                          <div className='absolute inset-0 bg-emerald-500/30 blur-4xl rounded-full scale-150 animate-pulse' />
                          <span className='material-symbols-outlined text-7xl md:text-[120px] text-emerald-600 relative z-10' style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
                        </div>
                        <p className='text-3xl md:text-6xl font-black text-slate-900 tracking-tighter mb-4 uppercase'>Nexus Grid</p>
                        <p className='text-xs md:text-xl text-slate-400 font-black uppercase tracking-widest leading-relaxed'>
                          Connecting <span className='text-emerald-600'>{studentsCount || 0}+</span> scholars <br className='hidden md:block' /> via decentralized protocols.
                        </p>
                    </div>
                </div>
                {/* Visual Anchors */}
                <div className='absolute -top-10 -right-4 md:-right-10 bg-[#0a0f18] text-white p-5 px-8 rounded-3xl shadow-2xl border border-white/10 animate-float'>
                    <span className='text-[10px] md:text-[11px] font-black tracking-[0.3em] uppercase'>#Autonomous_Economy</span>
                </div>
                <div className='absolute -bottom-10 -left-4 md:-left-10 bg-emerald-500 text-slate-900 p-5 px-8 rounded-3xl shadow-2xl animate-float delay-1000'>
                    <span className='text-[10px] md:text-[11px] font-black tracking-[0.3em] uppercase'>#Zero_Platform_Tax</span>
                </div>
            </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className='bg-[#0a0f18] text-white py-32 md:py-56 px-6 sm:px-8 relative overflow-hidden'>
        <div className='absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent' />
        <div className='max-w-6xl mx-auto relative z-10 text-center'>
          <span className='material-symbols-outlined text-emerald-400 text-8xl md:text-[140px] mb-12 block opacity-10 leading-none'>emergency_share</span>
          <h2 className='text-3xl md:text-7xl font-black italic tracking-tighter mb-20 leading-[1] md:leading-[1.1] text-balance'>
            &ldquo;Allpanga is more than infrastructure; it is a movement to reclaim the latent value students generate within university ecosystems.&rdquo;
          </h2>
          <div className='flex flex-wrap items-center justify-center gap-10 md:gap-24 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-700'>
            <div className='flex items-center gap-5 text-left'>
              <div className='w-14 h-14 rounded-2xl border border-emerald-400/20 flex items-center justify-center bg-white/5'>
                <span className='material-symbols-outlined text-emerald-400 text-3xl'>verified</span>
              </div>
              <div>
                <p className='text-lg font-black uppercase tracking-tight'>Vetted Protocol</p>
                <p className='text-[10px] text-emerald-400/60 font-black uppercase tracking-widest'>Identity V1.0</p>
              </div>
            </div>
            <div className='flex items-center gap-5 text-left'>
              <div className='w-14 h-14 rounded-2xl border border-primary/20 flex items-center justify-center bg-white/5'>
                <span className='material-symbols-outlined text-primary text-3xl'>rocket_launch</span>
              </div>
              <div>
                <p className='text-lg font-black uppercase tracking-tight'>Instant Sync</p>
                <p className='text-[10px] text-primary/60 font-black uppercase tracking-widest'>Global Uptime</p>
              </div>
            </div>
          </div>
        </div>
        <div className='absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent' />
      </section>

      {/* Features Grid: High Density */}
      <section className='py-32 md:py-64 px-6 sm:px-8 bg-white'>
        <div className='max-w-7xl mx-auto'>
          <div className='text-center mb-24 md:mb-40'>
            <div className='inline-block px-5 py-2 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-[0.4em] mb-8'>
              Core Architecture
            </div>
            <h2 className='text-5xl md:text-9xl font-black tracking-tighter text-slate-900 mb-8 uppercase leading-[0.85]'>Integrated <br />Intelligence.</h2>
            <p className='text-slate-500 text-base md:text-2xl max-w-2xl mx-auto font-medium leading-tight opacity-70'>
              The definitive operating system for campus collaboration.
            </p>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-12'>
            {FEATURES.map((feat) => (
              <div key={feat.title} className='group bg-slate-50/50 p-10 md:p-16 rounded-[4rem] border border-slate-100 hover:bg-white hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-700 relative overflow-hidden'>
                <div className='w-20 h-20 rounded-[2rem] bg-white shadow-sm flex items-center justify-center mb-12 group-hover:bg-primary group-hover:text-white group-hover:scale-110 transition-all duration-500'>
                  <span className='material-symbols-outlined text-4xl'>{feat.icon}</span>
                </div>
                <h3 className='text-2xl font-black text-slate-900 mb-4 tracking-tighter uppercase'>{feat.title}</h3>
                <p className='text-slate-500 text-sm md:text-lg leading-snug md:leading-relaxed font-medium opacity-80'>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Box: Bold Final Statement */}
      <section className='px-6 sm:px-8 pb-32 md:pb-64'>
        <div className='max-w-7xl mx-auto bg-[#0a0f18] rounded-[5rem] md:rounded-[8rem] p-16 md:p-48 text-center text-white relative overflow-hidden shadow-2xl'>
          <div className='absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] -mr-64 -mt-64 animate-pulse' />
          <div className='absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] -ml-40 -mb-40' />

          <h2 className='text-5xl md:text-[160px] font-black tracking-tighter mb-12 md:mb-16 relative z-10 leading-[0.8] text-balance uppercase'>
            Own your <br /><span className='text-emerald-400 italic'>Future.</span>
          </h2>
          <p className='text-white/40 text-base md:text-3xl mb-16 md:mb-24 max-w-2xl mx-auto relative z-10 font-medium text-balance leading-tight'>
            Platform taxation is a relic. Reclaim the campus. <br className='hidden md:block' /> Join the autonomous student economy.
          </p>
          <Link href='/signup' className='inline-block w-full sm:w-auto bg-primary text-white px-20 py-8 rounded-[2rem] font-black uppercase tracking-[0.4em] text-[12px] shadow-3xl hover:bg-emerald-400 hover:text-slate-950 transition-all active:scale-95 relative z-10'>
            Initialize OS
          </Link>
        </div>
      </section>
    </div>
  )
}
