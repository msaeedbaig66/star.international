import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-100 pt-12 pb-8 sm:pb-12 relative overflow-hidden">
      {/* Decorative gradient orb */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-12 pb-16">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-600 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">Allpanga</h2>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed max-w-sm">The ultimate peer-to-peer marketplace and community hub designed exclusively for students to trade, learn, and grow together.</p>
            
            {/* Social Links - Professional SVG Brand Icons */}
            <div className="flex flex-wrap gap-3">
              <a title="Facebook" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-emerald-600 hover:text-white hover:scale-110 transition-all text-emerald-600 shadow-sm" href="https://www.facebook.com/share/1BKma761M7/">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a title="Instagram" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-[#E4405F] hover:text-white hover:scale-110 transition-all text-[#E4405F] shadow-sm" href="https://www.instagram.com/allpanga.sgi?igsh=MWE4YjZyZm43NHZveQ==">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a title="TikTok" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-black hover:text-white hover:scale-110 transition-all text-black shadow-sm" href="https://www.tiktok.com/@allpanga.pk?_t=ZS-8v0vWc6M6u5&_r=1">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.032 2.61-.019 3.91-.006.031 1.22.651 2.35 1.551 3.22.951.86 2.241 1.39 3.602 1.39v4.03c-1.23-.01-2.42-.31-3.5-.86-.54-.28-1.03-.64-1.48-1.06V14c0 1.72-.46 3.32-1.28 4.72-.82 1.4-2.02 2.52-3.41 3.19-1.39.67-2.97.94-4.5.76-1.53-.18-2.95-.87-4.04-1.92-1.09-1.05-1.78-2.44-1.96-3.95-.18-1.51.05-3.07.72-4.44.67-1.37 1.77-2.52 3.15-3.32C6.12 8.44 8.27 8.08 10 8.53v4.22c-1.17-.31-2.41-.18-3.47.41-.53.3-.96.75-1.24 1.28-.28.53-.41 1.13-.36 1.73.05.6.29 1.17.68 1.63.39.46.91.79 1.48.96 1.15.3 2.37.04 3.3-.72.54-.42.94-1.01 1.13-1.68.1-.34.13-.7.13-1.05V.02z"/></svg>
              </a>
              <a title="YouTube" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-[#FF0000] hover:text-white hover:scale-110 transition-all text-[#FF0000] shadow-sm" href="http://www.youtube.com/@allpangaofficial">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              <a title="WhatsApp" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-[#25D366] hover:text-white hover:scale-110 transition-all text-[#25D366] shadow-sm" href="https://wa.me/923226622632">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            </div>
          </div>

          {/* Explore */}
          <div className="space-y-4 sm:space-y-5">
            <h4 className="font-bold text-xs uppercase tracking-[0.2em] text-slate-900">Explore</h4>
            <ul className="space-y-4 text-slate-500 text-sm">
              <li><Link className="hover:text-emerald-600 hover:pl-1 transition-all" href="/marketplace">Marketplace</Link></li>
              <li><Link className="hover:text-emerald-600 hover:pl-1 transition-all" href="/blogs">Student Blogs</Link></li>
              <li><Link className="hover:text-emerald-600 hover:pl-1 transition-all" href="/communities">Nexus Hub</Link></li>
              <li><Link className="hover:text-emerald-600 hover:pl-1 transition-all" href="/how-it-works">How It Works</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4 sm:space-y-5">
            <h4 className="font-bold text-xs uppercase tracking-[0.2em] text-slate-900">Support</h4>
            <ul className="space-y-4 text-slate-500 text-sm">
              <li><Link className="hover:text-emerald-600 hover:pl-1 transition-all" href="/help">Help Center</Link></li>
              <li><Link className="hover:text-emerald-600 hover:pl-1 transition-all" href="/contact">Contact Us</Link></li>
              <li><Link className="hover:text-emerald-600 hover:pl-1 transition-all" href="/guidelines">Community Guidelines</Link></li>
              <li><Link className="hover:text-emerald-600 hover:pl-1 transition-all" href="/selling-guidelines">Selling Guidelines</Link></li>
              <li><Link className="hover:text-emerald-600 hover:pl-1 transition-all" href="/about">Origins</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4 sm:space-y-5">
            <h4 className="font-bold text-xs uppercase tracking-[0.2em] text-slate-900">Legal</h4>
            <ul className="space-y-4 text-slate-500 text-sm">
              <li><Link className="hover:text-emerald-600 hover:pl-1 transition-all" href="/privacy">Privacy Policy</Link></li>
              <li><Link className="hover:text-emerald-600 hover:pl-1 transition-all" href="/terms">Terms of Service</Link></li>
              <li><Link className="hover:text-emerald-600 hover:pl-1 transition-all" href="/guidelines">Community Guidelines</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-200 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>© <span suppressHydrationWarning>{new Date().getFullYear()}</span> ALLPANGA. All rights reserved.</p>
          <div className="flex gap-6">
            <Link className="hover:text-slate-900 transition-colors" href="/privacy">Privacy Policy</Link>
            <Link className="hover:text-slate-900 transition-colors" href="/terms">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
