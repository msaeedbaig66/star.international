export const metadata = { title: 'Privacy Policy | Allpanga' }

const SECTIONS = [
 {
 title: '1. What We Collect',
 content: 'When you create an account, we collect your name, email address, university name, and phone number (optional). When you list items or write blogs, we store that content. We also collect basic usage data like which pages you visit and what you search for. We do not collect any payment information because Allpanga is completely free.'
 },
 {
 title: '2. How We Use It',
 content: 'We use your information to run the platform — showing your listings to other students, sending you notifications, and reviewing content for safety. We use usage data only to improve the platform, not to track you for advertising.'
 },
 {
 title: '3. Who We Share It With',
 content: 'We never sell your data. We never share your data with advertisers. Other students can see your public profile, listings, and blogs. We may share data with authorities only if required by Pakistani law.'
 },
 {
 title: '4. How We Protect It',
 content: 'All your data is stored securely using Supabase infrastructure with encryption in transit and at rest. We use industry-standard security practices.'
 },
 {
 title: '5. Your Control',
 content: 'You can edit your profile anytime. You can control your privacy settings from your dashboard — choose who sees your photo, listings, blogs, and online status. You can delete your account anytime and all your data will be permanently removed.'
 },
 {
 title: '6. Cookies',
 content: 'We use essential cookies only to keep you logged in and remember your preferences. We do not use advertising cookies or third-party tracking.'
 },
 {
 title: '7. Age',
 content: 'Allpanga is for students 16 years and older. If you are under 18, you need your parent or guardian\'s permission to use the platform.'
 },
 {
 title: '8. Changes',
 content: 'If we make significant changes to this policy, we will notify you by email or with a notice on the platform.'
 },
 {
 title: '9. Contact',
 content: 'Questions about your privacy? Email us at star.international.sgi@gmail.com and we will respond within 24 hours.'
 },
]

export default function PrivacyPage() {
 return (
 <div className='bg-background min-h-screen py-20 px-8'>
 <div className='max-w-2xl mx-auto'>
 {/* Header */}
 <h1 className='text-4xl font-black text-text-primary mb-2 tracking-tight'>Privacy Policy</h1>
 <p className='text-text-muted mb-8'>Last updated: March 2026</p>

 {/* Green banner */}
 <div className='bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-12 flex items-center gap-3'>
 <span className='material-symbols-outlined text-emerald-600 text-xl flex-shrink-0' style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
 <p className='text-emerald-800 font-medium text-sm'>
 Allpanga never sells your personal data to third parties. Your privacy is our priority.
 </p>
 </div>

 {/* Sections */}
 <div className='space-y-10'>
 {SECTIONS.map(section => (
 <section key={section.title}>
 <h2 className='text-xl font-black text-text-primary mb-3'>{section.title}</h2>
 <p className='text-text-secondary leading-relaxed'>
 {section.title === '9. Contact' ? (
 <>
 Questions about your privacy? Email us at{' '}
 <a href='mailto:star.international.sgi@gmail.com' className='text-primary hover:underline underline-offset-4 font-medium'>
 star.international.sgi@gmail.com
 </a>{' '}
 and we will respond within 24 hours.
 </>
 ) : section.content}
 </p>
 </section>
 ))}
 </div>

 {/* Contact footer */}
 <div className='mt-16 p-8 bg-surface rounded-2xl border border-border'>
 <p className='text-text-secondary text-sm'>
 Questions about this privacy policy?{' '}
 <a href='mailto:star.international.sgi@gmail.com' className='text-primary hover:underline font-medium'>
 star.international.sgi@gmail.com
 </a>
 </p>
 </div>
 </div>
 </div>
 )
}
