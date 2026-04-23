import Link from 'next/link'

export const metadata = { title: 'Community Guidelines | Allpanga' }

const ALLOWED = [
 'List academic items — textbooks, electronics, lab equipment',
 'Write project blogs and tutorials',
 'Create and join academic communities',
 'Share knowledge and help fellow students',
 'Give honest feedback and ratings',
 'Report violations and suspicious content',
]

const NOT_ALLOWED = [
 'Harass, bully, or threaten other students',
 'Post fake listings or misleading content',
 'Share copyrighted exam papers or cheat sheets',
 'Sell food, weapons, or illegal items',
 'Spam communities with promotional content',
 'Create duplicate accounts or fake profiles',
]

const STRIKES = [
 { step: 1, label: 'Warning', color: 'bg-amber-100 border-amber-300 text-amber-800', iconColor: 'bg-amber-500', desc: 'First violation: You receive a warning and your content is removed. This is your chance to learn the rules.' },
 { step: 2, label: '7-Day Suspension', color: 'bg-amber-100 border-amber-400 text-amber-900', iconColor: 'bg-amber-600', desc: 'Second violation: Your account is suspended for 7 days. You cannot access listings, blogs, or communities.' },
 { step: 3, label: '30-Day Ban', color: 'bg-red-50 border-red-300 text-red-800', iconColor: 'bg-red-500', desc: 'Third violation: Your account is banned for 30 days. All your active listings and blogs are hidden.' },
 { step: 4, label: 'Permanent Ban', color: 'bg-red-100 border-red-400 text-red-900', iconColor: 'bg-red-700', desc: 'Severe or repeated violations: Your account is permanently banned. This cannot be reversed.' },
]

export default function GuidelinesPage() {
 return (
 <div className='bg-background min-h-screen'>
 {/* Header */}
 <section className='py-20 px-8 text-center'>
 <div className='w-20 h-20 mx-auto mb-8 rounded-3xl bg-primary/10 flex items-center justify-center'>
 <span className='material-symbols-outlined text-primary text-4xl' style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
 </div>
 <h1 className='text-5xl font-black tracking-tight text-text-primary mb-4'>Community Guidelines</h1>
 <p className='text-text-secondary text-lg max-w-xl mx-auto mb-3'>Rules that keep Allpanga safe and respectful for everyone.</p>
 <p className='text-text-muted text-sm'>Last Updated: March 2026</p>
 </section>

 <div className='max-w-4xl mx-auto px-8 pb-24 space-y-16'>
 {/* Intro Banner */}
 <div className='bg-primary/5 rounded-3xl p-8 border border-primary/10'>
 <p className='text-text-secondary leading-relaxed'>
 These guidelines apply to all content on Allpanga — marketplace listings, blog posts, community discussions, messages, profiles, and comments.
 By using Allpanga, you agree to follow these rules. Violations result in warnings, suspensions, or permanent bans.
 </p>
 </div>

 {/* What you CAN do */}
 <section>
 <div className='border-l-4 border-success pl-6 mb-8'>
 <h2 className='text-3xl font-black text-text-primary'>What You Can Do</h2>
 </div>
 <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
 {ALLOWED.map(item => (
 <div key={item} className='flex items-start gap-3 bg-white rounded-2xl p-5 border border-border shadow-sm'>
 <span className='material-symbols-outlined text-success mt-0.5 flex-shrink-0' style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
 <p className='text-text-secondary text-sm font-medium'>{item}</p>
 </div>
 ))}
 </div>
 </section>

 {/* What you CANNOT do */}
 <section>
 <div className='border-l-4 border-destructive pl-6 mb-8'>
 <h2 className='text-3xl font-black text-text-primary'>What You Cannot Do</h2>
 </div>
 <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
 {NOT_ALLOWED.map(item => (
 <div key={item} className='flex items-start gap-3 bg-white rounded-2xl p-5 border border-border shadow-sm'>
 <span className='material-symbols-outlined text-destructive mt-0.5 flex-shrink-0' style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
 <p className='text-text-secondary text-sm font-medium'>{item}</p>
 </div>
 ))}
 </div>
 </section>

 {/* Selling + Communities side by side */}
 <section className='grid grid-cols-1 md:grid-cols-2 gap-8'>
 <div className='bg-white rounded-3xl p-8 border border-border shadow-sm'>
 <h3 className='text-xl font-black text-text-primary mb-6 flex items-center gap-2'>
 <span className='material-symbols-outlined text-primary'>storefront</span>
 Selling on Allpanga
 </h3>
 <ol className='space-y-4 text-text-secondary text-sm'>
 <li className='flex gap-3'><span className='w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center flex-shrink-0'>1</span>Only sell academic and student-related items.</li>
 <li className='flex gap-3'><span className='w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center flex-shrink-0'>2</span>Price items fairly and describe condition honestly.</li>
 <li className='flex gap-3'><span className='w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center flex-shrink-0'>3</span>Upload clear, real photos of the actual item.</li>
 <li className='flex gap-3'><span className='w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center flex-shrink-0'>4</span>Do not include personal contact info in listings.</li>
 <li className='flex gap-3'><span className='w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center flex-shrink-0'>5</span>Mark items as sold once the transaction is complete.</li>
 </ol>
 </div>
 <div className='bg-white rounded-3xl p-8 border border-border shadow-sm'>
 <h3 className='text-xl font-black text-text-primary mb-6 flex items-center gap-2'>
 <span className='material-symbols-outlined text-primary'>forum</span>
 Inside Communities
 </h3>
 <ul className='space-y-4 text-text-secondary text-sm'>
 <li className='flex gap-3'><span className='w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0' />Keep discussions relevant to the community topic.</li>
 <li className='flex gap-3'><span className='w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0' />Respect differing opinions and academic perspectives.</li>
 <li className='flex gap-3'><span className='w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0' />Do not spam with advertisements or off-topic content.</li>
 <li className='flex gap-3'><span className='w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0' />Community owners moderate posts — follow their rules.</li>
 <li className='flex gap-3'><span className='w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0' />Report harmful content using the Report button.</li>
 </ul>
 </div>
 </section>

 {/* Data Lifecycle */}
 <section className='bg-slate-50 rounded-3xl p-8 border border-slate-200'>
 <h3 className='text-xl font-black text-text-primary mb-6 flex items-center gap-2'>
 <span className='material-symbols-outlined text-primary'>history_toggle_off</span>
 Data Lifecycle & Hygiene
 </h3>
 <p className='text-text-secondary text-sm leading-relaxed mb-6'>
 To keep Allpanga fast, secure, and focused on active campus life, we implement an automated data cleanup policy.
 </p>
 <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
 <div className='bg-white p-4 rounded-2xl border border-border shadow-sm'>
 <p className='text-xs font-black uppercase text-primary mb-2'>Marketplace</p>
 <p className='text-xs text-text-secondary'>Items (listings) from student accounts are removed after 30 days to ensure only available products are shown.</p>
 </div>
 <div className='bg-white p-4 rounded-2xl border border-border shadow-sm'>
 <p className='text-xs font-black uppercase text-primary mb-2'>Discussions</p>
 <p className='text-xs text-text-secondary'>Community posts and comments are deleted after 30 days to keep conversations relevant and current.</p>
 </div>
 <div className='bg-white p-4 rounded-2xl border border-border shadow-sm'>
 <p className='text-xs font-black uppercase text-primary mb-2'>Private Chat</p>
 <p className='text-xs text-text-secondary'>Messages and chat histories are purged after 30 days. Please save any important transaction details externally.</p>
 </div>
 </div>
 <p className='mt-6 text-[10px] text-text-muted italic px-2'>
 * Official platform content (Blogs, Admin listings, and Nexus Hub announcements) may have a longer retention period.
 </p>
 </section>

 {/* Enforcement Policy */}
 <section>
 <h2 className='text-3xl font-black text-text-primary mb-10 text-center'>Our Enforcement Policy</h2>
 <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
 {STRIKES.map(strike => (
 <div key={strike.step} className={`rounded-3xl p-6 border-2 ${strike.color}`}>
 <div className={`w-12 h-12 rounded-full ${strike.iconColor} text-white text-xl font-black flex items-center justify-center mb-4`}>
 {strike.step}
 </div>
 <h4 className='font-black text-lg mb-2'>{strike.label}</h4>
 <p className='text-sm leading-relaxed opacity-80'>{strike.desc}</p>
 </div>
 ))}
 </div>
 </section>

 {/* Report CTA */}
 <section className='bg-primary rounded-[3rem] p-12 text-center text-white relative overflow-hidden'>
 <div className='absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-bl-full pointer-events-none' />
 <h2 className='text-3xl font-black mb-4 relative z-10'>See something that violates these guidelines?</h2>
 <p className='text-white/80 mb-8 max-w-md mx-auto relative z-10'>Help us keep Allpanga safe by reporting violations. Every report is reviewed by our team.</p>
 <Link href='/faq' className='inline-block bg-white text-primary px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest hover:bg-surface transition-all active:scale-95 relative z-10'>
 Learn How to Report →
 </Link>
 </section>
 </div>
 </div>
 )
}
