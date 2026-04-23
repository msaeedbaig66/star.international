'use client'
import { useState } from 'react'
import Link from 'next/link'

const FAQ_DATA = [
 { category: 'Getting Started', questions: [
 { q: 'What is Allpanga?', a: 'Allpanga is a free student marketplace and collaboration platform. You can buy and sell academic items, write project blogs, and join student communities — all in one place.' },
 { q: 'Is Allpanga free to use?', a: 'Yes. Allpanga is completely free for all students. There are no listing fees, no commissions, and no hidden charges.' },
 { q: 'Who can join Allpanga?', a: 'Any student from a college, university, or technical institute can create an account and start using Allpanga.' },
 { q: 'How do I create an account?', a: 'Click Sign Up on the homepage, fill in your details (name, email, university), verify your email, and you\'re ready to go.' },
 { q: 'Do I need to verify my email?', a: 'Yes, email verification is required to activate your account and start listing items or publishing blogs.' },
 ]},
 { category: 'Buying & Selling', questions: [
 { q: 'How do I list an item for sale?', a: 'Go to your dashboard, click "Sell Item", fill in the details (title, price, condition, photos), and submit. Our team reviews every listing within 24 hours.' },
 { q: 'How long does listing review take?', a: 'Our team reviews most listings within 24 hours. You\'ll be notified when your item is approved and live.' },
 { q: 'Why was my listing rejected?', a: 'Check your dashboard for the rejection reason. Common reasons include missing photos, inaccurate pricing, or prohibited item categories.' },
 { q: 'How do I contact a seller?', a: 'Click "Contact Seller" on any listing page to start a conversation through our in-app messaging system.' },
 { q: 'Is there any fee for selling?', a: 'No. Listing and selling on Allpanga is completely free. We don\'t charge any commissions or fees.' },
 { q: 'What items can I sell?', a: 'Academic items — textbooks, electronics, lab equipment, tools, project components, stationery, and other student-related goods.' },
 { q: 'What items are not allowed?', a: 'Food, non-academic personal items, dangerous goods, copyrighted exam papers, and anything illegal under Pakistani law.' },
 { q: 'How do I mark an item as sold?', a: 'Go to My Listings in your dashboard, find the item, and click "Mark as Sold". The listing will be removed from the marketplace.' },
 ]},
 { category: 'Account & Safety', questions: [
 { q: 'How do I verify my student status?', a: 'Go to Dashboard → Verification. You can upload your student ID card and we\'ll verify your status within 48 hours.' },
 { q: 'How do I change my password?', a: 'Go to Dashboard → Security Settings. You can update your password from there at any time.' },
 { q: 'How do I report a user or listing?', a: 'Click the "Report" button on any listing, blog, or profile. Our moderation team investigates every report.' },
 { q: 'Can I delete my account?', a: 'Yes. Go to Dashboard → Account Settings → Delete Account. All your data will be permanently removed.' },
 { q: 'What happens if I get scammed?', a: 'Report the user immediately using the Report button. Our team will investigate and take action. Always meet in public campus areas.' },
 ]},
 { category: 'Communities', questions: [
 { q: 'What is a community?', a: 'Communities are groups for a specific field, project, or interest. You can join existing ones or create your own to connect with students.' },
 { q: 'How do I create a community?', a: 'Go to Communities → Create Community. Fill in the name, description, and field. Your community will be reviewed before going live.' },
 { q: 'What is an official community?', a: 'Official communities are verified by Allpanga and typically represent academic departments or university organizations.' },
 ]},
 { category: 'Blogs', questions: [
 { q: 'How do I publish a blog?', a: 'Go to Dashboard → My Blogs → Create Blog. Write your content, add tags, and submit for review. Approved blogs become public.' },
 { q: 'Who can read my blogs?', a: 'Approved blogs are public by default. Anyone visiting Allpanga can read them, even without an account.' },
 { q: 'Why was my blog rejected?', a: 'Check your dashboard for the rejection reason. Common reasons include inappropriate content, spam, or very short posts.' },
 ]},
]

const CATEGORY_PILLS = ['All', 'Getting Started', 'Buying & Selling', 'Account & Safety', 'Communities', 'Blogs']

export default function FAQPage() {
 const [activeCategory, setActiveCategory] = useState('All')
 const [openQuestion, setOpenQuestion] = useState<string | null>(null)
 const [searchQuery, setSearchQuery] = useState('')

 const filteredData = FAQ_DATA.filter(section =>
 activeCategory === 'All' || section.category === activeCategory
 ).map(section => ({
 ...section,
 questions: section.questions.filter(q =>
 !searchQuery || q.q.toLowerCase().includes(searchQuery.toLowerCase()) || q.a.toLowerCase().includes(searchQuery.toLowerCase())
 )
 })).filter(section => section.questions.length > 0)

 return (
 <div className='bg-background min-h-screen'>
 {/* Header */}
 <section className='bg-surface py-16 border-b border-border px-8'>
 <div className='max-w-4xl mx-auto text-center'>
 <h1 className='text-5xl font-black tracking-tight text-text-primary mb-4'>Frequently Asked Questions</h1>
 <p className='text-text-secondary text-lg mb-10 max-w-xl mx-auto'>Find answers to common questions about using Allpanga.</p>
 <div className='relative max-w-xl mx-auto'>
 <span className='material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-text-muted'>search</span>
 <input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 type='text'
 placeholder='Search questions...'
 className='w-full pl-14 pr-6 py-4 rounded-full border border-border bg-white shadow-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm'
 />
 </div>
 </div>
 </section>

 <div className='max-w-7xl mx-auto px-8 py-12 flex flex-col lg:flex-row gap-12'>
 {/* Main content */}
 <div className='flex-1'>
 {/* Category pills */}
 <div className='flex flex-wrap gap-3 mb-12'>
 {CATEGORY_PILLS.map(cat => (
 <button
 key={cat}
 onClick={() => setActiveCategory(cat)}
 className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
 activeCategory === cat
 ? 'bg-primary text-white shadow-md'
 : 'bg-white border border-border text-text-secondary hover:border-primary hover:text-primary'
 }`}
 >
 {cat}
 </button>
 ))}
 </div>

 {/* FAQ sections */}
 <div className='space-y-12'>
 {filteredData.map(section => (
 <div key={section.category}>
 <h3 className='text-xl font-black text-text-primary mb-6 pl-4 border-l-4 border-primary'>{section.category}</h3>
 <div className='space-y-3'>
 {section.questions.map(item => {
 const key = `${section.category}-${item.q}`
 const isOpen = openQuestion === key
 return (
 <div key={key} className='bg-white rounded-2xl border border-border overflow-hidden shadow-sm'>
 <button
 onClick={() => setOpenQuestion(isOpen ? null : key)}
 className='w-full flex items-center justify-between px-6 py-5 text-left hover:bg-surface transition-colors'
 >
 <span className='font-bold text-text-primary pr-4'>{item.q}</span>
 <span className='material-symbols-outlined text-text-muted flex-shrink-0 transition-transform' style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}>add</span>
 </button>
 {isOpen && (
 <div className='px-6 pb-5 pt-0 text-text-secondary leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200'>
 {item.a}
 </div>
 )}
 </div>
 )
 })}
 </div>
 </div>
 ))}
 {filteredData.length === 0 && (
 <div className='text-center py-16'>
 <span className='material-symbols-outlined text-5xl text-text-muted mb-4 block'>search_off</span>
 <p className='text-text-secondary font-medium'>No questions match your search.</p>
 </div>
 )}
 </div>
 </div>

 {/* Sidebar */}
 <aside className='w-full lg:w-80 shrink-0 space-y-6'>
 <div className='bg-white rounded-3xl p-8 border border-border shadow-sm'>
 <h4 className='font-black text-text-primary mb-2'>Still need help?</h4>
 <p className='text-text-secondary text-sm mb-6'>Our support team is happy to assist you.</p>
 <p className='text-sm text-text-muted mb-4'>
 <span className='material-symbols-outlined text-sm align-text-bottom mr-1'>mail</span>
 star.international.sgi@gmail.com
 </p>
 <p className='text-sm text-text-muted mb-6'>
 <span className='material-symbols-outlined text-sm align-text-bottom mr-1'>schedule</span>
 8:00 AM - 10:00 PM
 </p>
 <Link href='/contact' className='block w-full text-center bg-primary text-white py-3 rounded-full font-bold text-sm hover:bg-primary/90 transition-all active:scale-95'>
 Get in Touch
 </Link>
 </div>

 <div className='bg-white rounded-3xl p-8 border border-border shadow-sm'>
 <h4 className='font-black text-text-primary mb-4'>Quick Links</h4>
 <div className='space-y-3'>
 <Link href='/guidelines' className='block text-sm text-text-secondary hover:text-primary transition-colors font-medium'>Community Guidelines</Link>
 <Link href='/privacy' className='block text-sm text-text-secondary hover:text-primary transition-colors font-medium'>Privacy Policy</Link>
 <Link href='/terms' className='block text-sm text-text-secondary hover:text-primary transition-colors font-medium'>Terms of Service</Link>
 <Link href='/selling-guidelines' className='block text-sm text-text-secondary hover:text-primary transition-colors font-medium'>Selling Guidelines</Link>
 </div>
 </div>
 </aside>
 </div>
 </div>
 )
}
