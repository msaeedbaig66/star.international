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
    { value: (studentsCount || 0).toLocaleString(), label: 'Verified Students', icon: 'school', color: 'text-emerald-400' },
    { value: (itemsCount || 0).toLocaleString(), label: 'Items Listed', icon: 'shopping_bag', color: 'text-primary' },
    { value: (communitiesCount || 0).toLocaleString(), label: 'Nexus Hubs', icon: 'hub', color: 'text-emerald-500' },
    { value: (unisCount || 5).toLocaleString(), label: 'Institutions', icon: 'account_balance', color: 'text-emerald-400' },
  ]

  return (
    <div className='bg-white min-h-screen font-sans overflow-x-hidden selection:bg-primary/20 selection:text-primary'>
      {/* Hero: Cyber-Scholar Aesthetic */}
      <section className='relative bg-[#020617] text-white py-32 md:py-64 px-6 overflow-hidden'>
        {/* Advanced Background Layer */}
        <div className='absolute inset-0 z-0'>
          <div className='absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#0f172a,transparent)]' />
          <div className='absolute inset-0 bg-[url("https://www.transparenttextures.com/patterns/carbon-fibre.png")] opacity-10' />
          <div className='absolute top-[-10%] right-[-10%] w-[500px] md:w-[1000px] h-[500px] md:h-[1000px] rounded-full bg-primary/10 blur-[120px] animate-pulse' />
          <div className='absolute bottom-[-10%] left-[-10%] w-[400px] md:w-[800px] h-[400px] md:h-[800px] rounded-full bg-emerald-500/5 blur-[100px]' />
          
          {/* Scanning Line Animation */}
          <div className='absolute inset-0 pointer-events-none overflow-hidden'>
            <div className='w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent absolute top-0 left-0 animate-scan' />
          </div>
        </div>
        
        <div className='max-w-7xl mx-auto text-center relative z-10'>
          <div className='inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-2xl text-primary text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] mb-12 animate-in slide-in-from-top-10 duration-1000'>
            <span className='w-2 h-2 rounded-full bg-primary shadow-[0_0_15px_rgba(16,185,129,0.8)]' />
            System Status: Autonomous
          </div>
          
          <h1 className='text-[clamp(2rem,10vw,8rem)] font-black tracking-tighter mb-10 leading-[0.9] text-white animate-in zoom-in-95 duration-1000'>
            Trade Assets. <br />
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-primary to-emerald-500 italic'>Build Intelligence.</span> <br />
            Reclaim Value.
          </h1>
          
          <p className='text-base md:text-2xl text-slate-400 max-w-3xl mx-auto mb-16 leading-relaxed font-medium tracking-tight text-balance opacity-0 animate-in fade-in slide-in-from-bottom-10 fill-mode-forwards duration-1000 delay-300'>
            Allpanga is the definitive operating system for the modern student economy — a decentralized network engineered for zero-fee trade and collaborative academic breakthroughs.
          </p>
          
          <div className='flex flex-col sm:flex-row items-center justify-center gap-6 opacity-0 animate-in fade-in slide-in-from-bottom-10 fill-mode-forwards duration-1000 delay-500'>
            <Link href='/signup' className='group relative w-full sm:w-auto px-16 py-7 rounded-full bg-primary text-slate-950 font-black uppercase tracking-[0.3em] text-[11px] shadow-[0_20px_50px_-10px_rgba(0,186,124,0.5)] hover:bg-emerald-400 transition-all active:scale-95 overflow-hidden'>
              <div className='absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12' />
              Initialize Node
            </Link>
            <Link href='/marketplace' className='w-full sm:w-auto bg-white/5 border border-white/10 backdrop-blur-xl text-white px-16 py-7 rounded-full font-black uppercase tracking-[0.3em] text-[11px] hover:bg-white/10 transition-all border-b-2 border-b-white/5'>
              Scan Ecosystem
            </Link>
          </div>
        </div>
      </section>

      {/* Grid Stats Layer: Floating Neomorphic Nodes */}
      <section className='relative z-20 -mt-16 md:-mt-32 px-6'>
        <div className='max-w-7xl mx-auto'>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
            {stats.map((stat, idx) => (
              <div key={stat.label} 
                className='bg-white/80 backdrop-blur-3xl p-6 md:p-10 rounded-[3rem] border border-slate-200/50 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] group hover:-translate-y-3 transition-all duration-700'
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                <div className='flex items-center justify-between mb-8'>
                  <div className='w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-primary/10 transition-all duration-500'>
                    <span className={`material-symbols-outlined text-3xl ${stat.color}`}>{stat.icon}</span>
                  </div>
                  <div className='flex gap-1'>
                    <div className='w-1.5 h-1.5 rounded-full bg-slate-200' />
                    <div className='w-1.5 h-1.5 rounded-full bg-slate-200' />
                    <div className='w-1.5 h-1.5 rounded-full bg-primary animate-pulse' />
                  </div>
                </div>
                <div className='space-y-1'>
                  <p className='text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none'>{stat.value}</p>
                  <p className='text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]'>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Origin: Architectural Split */}
      <section className='max-w-7xl mx-auto px-6 py-32 md:py-64'>
        <div className='grid lg:grid-cols-12 gap-20 md:gap-32 items-center'>
          <div className='lg:col-span-5'>
            <div className='flex items-center gap-4 mb-10'>
              <div className='w-16 h-[2px] bg-primary' />
              <span className='text-[11px] font-black uppercase tracking-[0.6em] text-primary'>Protocol Genesis</span>
            </div>
            
            <h2 className='text-4xl md:text-8xl font-black tracking-tighter text-slate-900 mb-14 leading-[0.85] uppercase'>
              Engineered <br /> for the <br /> <span className='text-slate-300 italic'>Collective.</span>
            </h2>
            
            <div className='space-y-10'>
              {MISSION_CARDS.map((card) => (
                <div key={card.title} className='flex gap-6 items-start group/card'>
                  <div className='w-14 h-14 shrink-0 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 group-hover/card:bg-primary group-hover/card:text-white group-hover/card:scale-110 transition-all duration-500'>
                    <span className='material-symbols-outlined text-2xl'>{card.icon}</span>
                  </div>
                  <div className='pt-1'>
                    <h3 className='text-lg font-black text-slate-900 mb-2 uppercase tracking-tight'>{card.title}</h3>
                    <p className='text-slate-500 text-sm md:text-base leading-relaxed font-medium opacity-80'>{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className='lg:col-span-7 relative'>
            <div className='aspect-square rounded-[4rem] md:rounded-[6rem] bg-slate-900 border-[12px] md:border-[20px] border-white shadow-[0_60px_120px_-30px_rgba(0,0,0,0.2)] overflow-hidden relative group'>
              {/* Complex Visual Engine Mockup */}
              <div className='absolute inset-0 bg-[#020617]'>
                <div className='absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,#10b981,transparent_50%),radial-gradient(circle_at_80%_80%,#00ba7c,transparent_50%)] animate-pulse' />
                <div className='absolute inset-0 bg-[url("https://www.transparenttextures.com/patterns/asfalt-dark.png")] opacity-5' />
              </div>
              
              <div className='absolute inset-10 md:inset-20 border border-white/10 rounded-[3rem] flex flex-col items-center justify-center text-center p-10 backdrop-blur-md'>
                <div className='w-32 h-32 md:w-48 md:h-48 rounded-full border-2 border-primary/30 flex items-center justify-center relative mb-12 animate-slow-spin'>
                  <div className='absolute inset-2 border-2 border-dashed border-primary/20 rounded-full' />
                  <span className='material-symbols-outlined text-6xl md:text-8xl text-primary drop-shadow-[0_0_30px_rgba(0,186,124,0.6)]'>hub</span>
                </div>
                <h4 className='text-4xl md:text-7xl font-black text-white tracking-tighter mb-4 uppercase'>Nexus Core</h4>
                <div className='h-[1px] w-48 bg-gradient-to-r from-transparent via-primary to-transparent mb-6' />
                <p className='text-[10px] md:text-[13px] text-emerald-400/80 font-black uppercase tracking-[0.6em]'>
                  {studentsCount || 0}+ Sync Points Active
                </p>
              </div>
              
              {/* Interactive Labels */}
              <div className='absolute top-12 left-12 flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full'>
                <span className='w-2 h-2 rounded-full bg-emerald-400 animate-ping' />
                <span className='text-[8px] font-black text-white uppercase tracking-widest'>Encryption V4.0</span>
              </div>
            </div>
            
            {/* Draggable-feel tags */}
            <div className='absolute -top-6 -right-6 md:-right-12 bg-white p-6 md:p-8 rounded-[2rem] shadow-2xl border border-slate-100 rotate-6 hover:rotate-0 transition-transform cursor-default z-30'>
              <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1'>Protocol</p>
              <p className='text-xl md:text-2xl font-black text-slate-900 tracking-tight'>Zero Platform Tax</p>
            </div>
          </div>
        </div>
      </section>

      {/* Wisdom Fragment: High Contrast Section */}
      <section className='bg-[#020617] text-white py-48 md:py-72 relative overflow-hidden'>
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,#064e3b_0%,transparent_50%)] opacity-30' />
        <div className='max-w-5xl mx-auto px-6 relative z-10 text-center'>
          <span className='material-symbols-outlined text-emerald-500/20 text-[10rem] md:text-[16rem] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none pointer-events-none'>format_quote</span>
          <h2 className='text-3xl md:text-7xl font-black italic tracking-tighter leading-[1.1] mb-24 relative z-10 text-balance'>
            &ldquo;Allpanga is more than infrastructure; it is an autonomous movement to reclaim the latent value students generate within campus ecosystems.&rdquo;
          </h2>
          
          <div className='flex flex-wrap justify-center gap-10 md:gap-20 border-t border-white/10 pt-20'>
            <div className='text-left'>
              <p className='text-primary text-4xl font-black mb-1'>100%</p>
              <p className='text-[10px] font-black uppercase tracking-[0.4em] text-slate-500'>Fee-Free Protocol</p>
            </div>
            <div className='text-left border-l border-white/10 pl-10 md:pl-20'>
              <p className='text-primary text-4xl font-black mb-1'>Instant</p>
              <p className='text-[10px] font-black uppercase tracking-[0.4em] text-slate-500'>Network Settlement</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Architecture: High Density Bento */}
      <section className='py-32 md:py-64 px-6 bg-slate-50'>
        <div className='max-w-7xl mx-auto'>
          <div className='text-center mb-32'>
            <span className='text-[11px] font-black uppercase tracking-[0.6em] text-primary mb-8 block'>System Capabilities</span>
            <h2 className='text-5xl md:text-9xl font-black tracking-tighter text-slate-900 uppercase leading-[0.85]'>
              Integrated <br /> Intelligence.
            </h2>
          </div>
          
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
            {FEATURES.map((feat) => (
              <div key={feat.title} className='group bg-white p-6 md:p-10 rounded-[3rem] border border-slate-200/60 hover:border-primary/30 hover:shadow-[0_40px_80px_-20px_rgba(0,186,124,0.15)] transition-all duration-700 relative overflow-hidden'>
                <div className='w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-10 group-hover:bg-primary group-hover:text-slate-900 transition-all duration-500'>
                  <span className='material-symbols-outlined text-3xl'>{feat.icon}</span>
                </div>
                <h3 className='text-xl font-black text-slate-900 mb-4 uppercase tracking-tight'>{feat.title}</h3>
                <p className='text-slate-500 text-sm md:text-base leading-relaxed font-medium opacity-80'>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Authorization: Full Screen CTA */}
      <section className='px-6 pb-32 md:pb-64'>
        <div className='max-w-7xl mx-auto bg-slate-900 rounded-[4rem] md:rounded-[8rem] px-6 py-20 md:p-48 text-center text-white relative overflow-hidden shadow-3xl'>
          <div className='absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[160px] -mr-96 -mt-96' />
          <div className='absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] -ml-80 -mb-80' />
          
          <div className='relative z-10'>
            <h2 className='text-[clamp(2.5rem,12vw,10rem)] font-black tracking-tighter mb-12 leading-[0.8] uppercase'>
              Own your <br /><span className='text-primary italic'>Future.</span>
            </h2>
            <p className='text-slate-400 text-base md:text-3xl mb-16 md:mb-24 max-w-2xl mx-auto font-medium text-balance'>
              Platform taxation is a legacy bug. <br className='hidden md:block' /> Reclaim the campus ecosystem today.
            </p>
            <Link href='/signup' className='inline-block px-10 md:px-24 py-6 md:py-8 rounded-full bg-primary text-slate-950 font-black uppercase tracking-[0.4em] text-[10px] md:text-[12px] shadow-[0_20px_60px_-10px_rgba(0,186,124,0.6)] hover:bg-emerald-400 transition-all active:scale-95'>
              Authorize Profile
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Branding Overlay */}
      <div className='py-20 text-center'>
        <p className='text-[9px] font-black text-slate-300 uppercase tracking-[1em]'>Allpanga Collective // Origins V1.2.4</p>
      </div>
    </div>
  )
}
