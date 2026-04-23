import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default function NotFound() {
 return (
 <div className='min-h-screen flex flex-col bg-surface'>
 <Navbar />
 <main className='flex-grow flex items-center justify-center p-6 relative overflow-hidden'>
 {/* Dot grid background */}
 <div className='absolute inset-0 pointer-events-none' style={{ backgroundImage: 'radial-gradient(#007f8020 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

 {/* Floating emoji cards */}
 <div className='absolute top-1/4 left-[10%] animate-bounce' style={{ animationDuration: '6s' }}>
 <div className='bg-white p-4 rounded-2xl shadow-xl -rotate-12 border border-border'>
 <span className='text-4xl'>📚</span>
 </div>
 </div>
 <div className='absolute top-1/3 right-[15%] animate-bounce' style={{ animationDuration: '6s', animationDelay: '1.5s' }}>
 <div className='bg-white p-5 rounded-2xl shadow-xl rotate-6 border border-border'>
 <span className='text-5xl'>💻</span>
 </div>
 </div>
 <div className='absolute bottom-1/4 left-[20%] animate-bounce' style={{ animationDuration: '6s', animationDelay: '0.8s' }}>
 <div className='bg-white p-4 rounded-2xl shadow-xl -rotate-6 border border-border'>
 <span className='text-4xl'>🎓</span>
 </div>
 </div>
 <div className='absolute bottom-1/3 right-[8%] animate-bounce' style={{ animationDuration: '6s', animationDelay: '2.2s' }}>
 <div className='bg-white p-3 rounded-2xl shadow-xl rotate-12 border border-border'>
 <span className='text-3xl'>🛠️</span>
 </div>
 </div>

 {/* Main content */}
 <div className='relative w-full max-w-4xl mx-auto text-center z-10'>
 {/* Giant 404 */}
 <div className='relative inline-block mb-12'>
 <h1 className='text-[10rem] md:text-[16rem] font-black leading-none text-primary tracking-tighter select-none' style={{ textShadow: '0 1px 0 #00696a, 0 2px 0 #005f60, 0 3px 0 #005455, 0 4px 0 #004a4b, 0 5px 0 #004041, 0 10px 20px rgba(0,0,0,0.1)' }}>
 404
 </h1>
 <div className='absolute -bottom-4 left-1/2 -translate-x-1/2'>
 <div className='bg-primary p-4 rounded-3xl shadow-lg border-4 border-white inline-flex items-center justify-center'>
 <span className='material-symbols-outlined text-white text-5xl' style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
 </div>
 </div>
 </div>

 <div className='max-w-2xl mx-auto'>
 <h2 className='text-4xl md:text-5xl font-black tracking-tight text-text-primary mb-6'>
 Class Discontinued?
 </h2>
 <p className='text-xl md:text-2xl text-text-secondary font-medium leading-relaxed mb-12'>
 It looks like this course material has graduated or been moved to another building.
 Don&apos;t worry, you haven&apos;t failed the assignment yet!
 </p>

 {/* Buttons */}
 <div className='flex flex-col sm:flex-row gap-4 justify-center'>
 <Link href='/' className='px-12 py-5 bg-primary text-white font-black rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-95 transition-all text-xl text-center'>
 Go Home
 </Link>
 <Link href='/marketplace' className='px-12 py-5 border-2 border-border text-primary font-black rounded-full hover:bg-primary/5 active:scale-95 transition-all text-xl text-center'>
 Browse Marketplace
 </Link>
 </div>

 {/* Quick links */}
 <div className='mt-20 pt-10 border-t border-border'>
 <p className='text-xs font-black uppercase tracking-[0.2em] text-text-muted mb-8'>
 Looking for something specific?
 </p>
 <div className='flex flex-wrap justify-center gap-4'>
 <Link href='/marketplace?category=Books' className='px-8 py-3 bg-white border border-border text-text-secondary rounded-full font-bold hover:border-primary hover:text-primary shadow-sm transition-all'>
 Textbooks
 </Link>
 <Link href='/marketplace?category=Electronics' className='px-8 py-3 bg-white border border-border text-text-secondary rounded-full font-bold hover:border-primary hover:text-primary shadow-sm transition-all'>
 Electronics
 </Link>
 <Link href='/communities' className='px-8 py-3 bg-white border border-border text-text-secondary rounded-full font-bold hover:border-primary hover:text-primary shadow-sm transition-all'>
 Communities
 </Link>
 </div>
 </div>
 </div>
 </div>
 </main>
 <Footer />
 </div>
 )
}
