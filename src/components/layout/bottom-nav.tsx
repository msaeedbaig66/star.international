'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/routes'

const getNavItems = () => [
  { label: 'Home', href: ROUTES.home(), icon: 'home' },
  { label: 'Market', href: ROUTES.marketplace.list(), icon: 'explore' },
  { label: 'Sell', href: ROUTES.dashboard.sell(), icon: 'add_circle', isPrimary: true },
  { label: 'Blogs', href: ROUTES.blog.list(), icon: 'auto_stories' },
  { label: 'Account', href: ROUTES.dashboard.home(), icon: 'person' },
]

export function BottomNav() {
  const pathname = usePathname()

  // Hide BottomNav on auth pages for a cleaner professional look
  const hideOnPaths = [ROUTES.auth.login(), ROUTES.auth.signup(), ROUTES.auth.forgotPassword(), ROUTES.auth.resetPassword(), '/register']
  if (hideOnPaths.includes(pathname)) return null

  const navItems = getNavItems()

  return (
    <div className="md:hidden fixed bottom-6 left-0 right-0 z-[100] px-4 animate-in slide-in-from-bottom-5 duration-700">
      <div className="max-w-md mx-auto rounded-[35px] bg-white/90 backdrop-blur-2xl border border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden">
        <div className="flex items-center justify-around h-[76px] px-2 relative">
          {navItems.map((item) => {
            const isActive = 
              item.href === '/' 
                ? pathname === '/' 
                : pathname.startsWith(item.href.split('?')[0])
            
            if (item.isPrimary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center flex-1 h-full -mt-10 active:scale-90 transition-all group"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl group-hover:bg-primary/50 transition-all" />
                    <div className="relative w-[60px] h-[60px] rounded-[22px] bg-primary text-white shadow-[0_10px_25px_rgba(16,185,129,0.3)] flex items-center justify-center border-4 border-white">
                      <span className="material-symbols-outlined text-[32px] font-medium" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {item.icon}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-primary mt-2 uppercase tracking-[0.2em] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Sell</span>
                </Link>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all relative",
                  isActive ? "text-primary" : "text-slate-400"
                )}
              >
                <div className="relative flex flex-col items-center btn-haptic">
                  <span className={cn(
                    "material-symbols-outlined text-[26px] transition-all duration-300",
                    isActive ? "scale-110" : "scale-100"
                  )} style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                    {item.icon}
                  </span>
                  <span className={cn(
                    "text-[8px] font-black tracking-widest uppercase transition-all",
                    isActive ? "opacity-100 scale-105" : "opacity-40"
                  )}>
                    {item.label}
                  </span>
                  
                  {/* Premium Glowing Dot */}
                  {isActive && (
                    <div className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-in zoom-in duration-300" />
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
