import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'

import './globals.css'

// ── Performance: use next/font for self-hosted optimized font loading ──
const inter = Inter({ 
 subsets: ['latin'],
 variable: '--font-inter',
 display: 'swap', // Show text immediately with fallback font
 preload: true, // Preload the font file
 fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
})

export const metadata: Metadata = {
 title: { default:'Allpanga', template:'%s | Allpanga' },
 description:'Student marketplace, project blogs, and collaboration communities.',
 icons: {
 icon: [
 { url: '/brand/logo-mark.png', type: 'image/png' },
 ],
 shortcut: ['/brand/logo-mark.png'],
 apple: ['/brand/logo-mark.png'],
 },
}



import { headers } from 'next/headers'

import { PageReveal } from '@/components/shared/page-reveal'
import { GlobalNotificationListener } from '@/components/shared/global-notification-listener'

export default async function RootLayout({ children }: { children:React.ReactNode }) {
 const nonce = headers().get('x-nonce') ?? undefined

  return (
  <html lang='en' className={inter.variable} suppressHydrationWarning>
  <head>
      <script
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('allpanga-theme', 'light');
              } catch (e) {}
            })();
          `,
        }}
      />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    {/* Material Symbols: CRITICAL PRELOAD for 100% performance (eliminates layout shift/flicker) */}
    <link
      rel="preload"
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
      as="style"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
      rel="stylesheet"
      crossOrigin="anonymous"
    />
    <script
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            if ('fonts' in document) {
              document.documentElement.classList.add('fonts-loading');
              document.fonts.load('1em "Material Symbols Outlined"').then(function() {
                document.documentElement.classList.remove('fonts-loading');
                document.documentElement.classList.add('fonts-loaded');
              });
            }
          })();
        `,
      }}
    />
 {/* ── Performance: DNS prefetch for Supabase ── */}
 {(() => {
 try {
 const url = process.env.NEXT_PUBLIC_SUPABASE_URL
 if (!url) return null
 const host = new URL(url).origin
 return (
 <>
 <link rel="dns-prefetch" href={host} />
 <link rel="preconnect" href={host} />
 </>
 )
 } catch {
 return null
 }
 })()}
 </head>
 <body className='min-h-screen font-sans antialiased transition-colors duration-300'>
 <PageReveal>
   <div className="page-entry min-h-screen flex flex-col bg-[var(--color-bg)]">
     <GlobalNotificationListener />
     <Toaster position='top-center' richColors />
     {children}
   </div>
 </PageReveal>
 </body>
 </html>
 )
}
