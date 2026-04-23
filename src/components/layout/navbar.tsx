import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import dynamic from 'next/dynamic'
const NavbarClient = dynamic(() => import('./navbar-client'), { ssr: false })


export async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, role')
      .eq('id', user.id)
      .single()
    profile = data
  }

  const headerList = headers()
  const pathname = headerList.get('x-pathname') || ''
  const isDashboard = pathname.startsWith('/dashboard')

  const socialLinks = [
    { name: 'Facebook', href: 'https://facebook.com/share/1BKma761M7/', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
    { name: 'Instagram', href: 'https://www.instagram.com/allpanga.sgi?igsh=MWE4YjZyZm43NHZveQ==', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
    { name: 'WhatsApp', href: 'https://wa.me/923226622632', path: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' },
    { name: 'YouTube', href: 'https://youtube.com', path: 'M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z' },
    { name: 'TikTok', href: 'https://www.tiktok.com/@allpanga.pk?_t=ZS-8v0vWc6M6u5&_r=1', path: 'M12.525.02c1.31-.032 2.61-.019 3.91-.006.031 1.22.651 2.35 1.551 3.22.951.86 2.241 1.39 3.602 1.39v4.03c-1.23-.01-2.42-.31-3.5-.86-.54-.28-1.03-.64-1.48-1.06V14c0 1.72-.46 3.32-1.28 4.72-.82 1.4-2.02 2.52-3.41 3.19-1.39.67-2.97.94-4.5.76-1.53-.18-2.95-.87-4.04-1.92-1.09-1.05-1.78-2.44-1.96-3.95-.18-1.51.05-3.07.72-4.44.67-1.37 1.77-2.52 3.15-3.32C6.12 8.44 8.27 8.08 10 8.53v4.22c-1.17-.31-2.41-.18-3.47.41-.53.3-.96.75-1.24 1.28-.28.53-.41 1.13-.36 1.73.05.6.29 1.17.68 1.63.39.46.91.79 1.48.96 1.15.3 2.37.04 3.3-.72.54-.42.94-1.01 1.13-1.68.1-.34.13-.7.13-1.05V.02z' }
  ]

  if (isDashboard) {
    return null
  }

  return (
    <header className="sticky top-0 z-[100] transition-all">
      {/* ── Tier 1: Premium Utility Bar ── */}
      <div className="bg-slate-50/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-slate-200/40 dark:border-zinc-800/40 py-1.5 hidden sm:block">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Platform Status: Active</span>
             </div>
             <div className="h-3 w-[1px] bg-slate-200 dark:bg-zinc-800" />
             <div className="flex items-center gap-3">
               {socialLinks.map((s, i) => (
                 <a 
                   key={i} 
                   href={s.href} 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   className="text-slate-400 hover:text-emerald-500 transition-all hover:scale-110"
                   title={s.name}
                 >
                   <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d={s.path}/></svg>
                 </a>
               ))}
             </div>
          </div>
          <div className="flex items-center gap-5">
             <Link href="/help" className="text-[10px] font-black text-slate-400 hover:text-emerald-600 dark:text-zinc-500 uppercase tracking-widest transition-colors">Support</Link>
             <Link href="/contact" className="text-[10px] font-black text-slate-400 hover:text-emerald-600 dark:text-zinc-500 uppercase tracking-widest transition-colors">Contact</Link>
          </div>
        </div>
      </div>

      {/* ── Tier 2: Main Navigation Unit ── */}
      <div className="premium-glass bg-white/90 dark:bg-zinc-950/90">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-8">
            
            {/* Branding Section */}
            <div className="flex items-center shrink-0">
              <Link href="/" className="flex items-center gap-3 group relative">
                <div className="absolute -inset-2 bg-emerald-500/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Image 
                  src="/brand/logo-full.png" 
                  alt="Allpanga" 
                  height={40} 
                  width={140} 
                  className="h-8 sm:h-9 w-auto relative z-10 transition-all duration-300 group-hover:brightness-110 group-active:scale-95" 
                  priority 
                />
              </Link>
            </div>

            {/* Search Palette Area (Desktop Only) */}
            <div className="flex-1 max-w-2xl hidden sm:block">
              <NavbarClient user={user} profile={profile} />
            </div>

            {/* Global Actions */}
            <div className="flex items-center gap-4">
               <div className="hidden lg:flex items-center gap-1 border-r border-slate-100 dark:border-zinc-800 pr-4 mr-1 opacity-0 pointer-events-none" />
               
               <div className="sm:hidden">
                  <NavbarClient 
                    user={user} 
                    profile={profile} 
                    hideSearch={true} 
                  />
               </div>

               {!user ? (
                 <Link 
                   href="/login" 
                   className="hidden sm:inline-flex items-center px-6 py-3.5 rounded-full bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 translate-y-0 hover:-translate-y-0.5"
                 >
                   Log In
                 </Link>
               ) : null}
            </div>
          </div>

          {/* ── Mobile-Only Search Row ── */}
          <div className="sm:hidden pb-4 px-2">
             <NavbarClient 
               user={user} 
               profile={profile} 
               hideActions={true} 
             />
          </div>

          {/* ── Tier 3: Contextual Navigation ── */}
          {!isDashboard && (
            <div className="flex items-center justify-center pb-4 pt-1 overflow-x-auto hide-scrollbar sm:overflow-visible">
              <nav className="flex items-center p-1.5 bg-slate-100/50 dark:bg-zinc-900/50 rounded-2xl border border-slate-200/50 dark:border-zinc-800/50 shadow-inner">
                {[
                  { label: 'Marketplace', href: '/marketplace?view=items&source=market' },
                  { label: 'Blogs', href: '/marketplace?view=blogs&source=store' },
                  { label: 'Nexus Hub', href: '/marketplace?view=communities&source=market', status: 'live' },
                  { label: 'Origins', href: '/about' }
                ].map((link, idx) => (
                  <Link 
                    key={idx}
                    href={link.href} 
                    className="px-3 sm:px-6 py-2 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-zinc-800 transition-all flex items-center gap-2 whitespace-nowrap group/nav"
                  >
                    <span className="opacity-0 group-hover/nav:opacity-100 transition-opacity text-emerald-500">•</span>
                    {link.label}
                    {link.status === 'live' && (
                      <span className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[8px] font-black px-2 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-500/20 uppercase tracking-widest">
                        Live
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

