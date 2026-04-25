export const metadata = { title: 'Terms & Conditions | Allpanga' }

const SECTIONS = [
 {
 title: '1. Acceptance',
 content: 'By creating an account on Allpanga, you agree to these terms. If you do not agree, please do not use the platform.'
 },
 {
 title: '2. What Allpanga Is',
 content: 'Allpanga is a free student marketplace and collaboration platform. We connect students to buy, sell, share blogs, and join communities. Allpanga is not a party to any transaction between students. We do not handle payments or guarantees.'
 },
 {
 title: '3. Your Account',
 content: 'You must be a student 16 or older to create an account. You must provide accurate information during signup. You are responsible for keeping your password secure. One account per person — no duplicate accounts.'
 },
 {
 title: '4. Selling Rules',
 content: 'You can only sell academic items relevant to student life. Your listings must be accurate — condition, price, and description must be honest. Do not include contact information (phone, email, WhatsApp) in listings. All listings are reviewed by our team before going live.'
 },
 {
 title: '5. Prohibited Content',
 content: 'You cannot post food, non-academic personal items, or dangerous goods. You cannot harass, threaten, or bully other students. You cannot create fake listings or mislead buyers. You cannot share copyrighted exam papers or academic cheat sheets. You cannot use Allpanga for commercial business purposes.'
 },
 {
 title: '6. Your Content',
 content: 'You own the content you post on Allpanga. By posting, you give us permission to display it on the platform. We can remove any content that violates these terms.'
 },
 {
 title: '7. Safety',
 content: 'Always meet buyers and sellers in public places on campus. Never share your home address or personal contact details. Report suspicious behavior immediately using the Report button. Allpanga is not responsible for the outcome of transactions between students.'
 },
 {
 title: '8. Termination',
 content: 'We can suspend or ban accounts that repeatedly violate these terms. You can delete your account anytime from your dashboard.'
 },
 {
 title: '9. Changes',
 content: 'We may update these terms from time to time. We will notify you of major changes by email. Continued use of Allpanga after changes means you accept the new terms.'
 },
 {
 title: '10. Contact',
 content: 'Questions about these terms? Email us at star.international.sgi@gmail.com'
 },
]

export default function TermsPage() {
 return (
 <div className='bg-background min-h-screen py-20 px-8'>
 <div className='max-w-2xl mx-auto'>
 {/* Header */}
 <h1 className='text-4xl font-black text-text-primary mb-2 tracking-tight'>Terms & Conditions</h1>
 <p className='text-text-muted mb-8'>Last updated: March 2026</p>

 {/* Emerald banner */}
 <div className='bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-12 flex items-center gap-3'>
 <span className='material-symbols-outlined text-emerald-600 text-xl flex-shrink-0' style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
 <p className='text-emerald-800 font-medium text-sm'>
 By using Allpanga, you agree to these terms. They&apos;re short and simple — please read them.
 </p>
 </div>

 {/* Sections */}
 <div className='space-y-10'>
 {SECTIONS.map(section => (
 <section key={section.title}>
 <h2 className='text-xl font-black text-text-primary mb-3'>{section.title}</h2>
 <p className='text-text-secondary leading-relaxed'>
 {section.title === '10. Contact' ? (
 <>
 Questions about these terms? Email us at{' '}
 <a href='mailto:star.international.sgi@gmail.com' className='text-primary hover:underline underline-offset-4 font-medium'>
 star.international.sgi@gmail.com
 </a>
 </>
 ) : section.content}
 </p>
 </section>
 ))}
 </div>

 {/* Contact footer */}
 <div className='mt-16 p-8 bg-surface rounded-2xl border border-border'>
 <p className='text-text-secondary text-sm'>
 Questions about these terms?{' '}
 <a href='mailto:star.international.sgi@gmail.com' className='text-primary hover:underline font-medium'>
 star.international.sgi@gmail.com
 </a>
 </p>
 </div>
 </div>
 </div>
 )
}
