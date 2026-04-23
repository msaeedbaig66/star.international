'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ContactPage() {
  const router = useRouter()
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const charCount = form.message.length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      setSubmitting(true)
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 401) {
          setError('Please login first, then submit your question.')
          return
        }
        throw new Error(json?.error || 'Failed to send message')
      }
      setSubmitted(true)
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch (err: any) {
      setError(err?.message || 'Failed to send message')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className='bg-background min-h-screen flex items-center justify-center px-8 py-24'>
        <div className='text-center max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500'>
          <div className='w-24 h-24 mx-auto mb-8 rounded-full bg-success-light flex items-center justify-center'>
            <span className='material-symbols-outlined text-success text-5xl' style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <h1 className='text-3xl font-black text-text-primary mb-4'>Message sent successfully!</h1>
          <p className='text-text-secondary text-lg mb-10'>Admin will review it in Support Inbox and reply in your Notifications tab.</p>
          <button
            onClick={() => setSubmitted(false)}
            className='text-primary font-bold hover:underline underline-offset-4'
          >
            Send another message
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='bg-background min-h-screen'>
      {/* Header */}
      <section className='bg-surface py-10 sm:py-16 border-b border-border px-4 sm:px-8'>
        <div className='max-w-4xl mx-auto text-center'>
          <h1 className='text-3xl sm:text-5xl font-black tracking-tight text-text-primary mb-3 sm:mb-4'>Get in Touch</h1>
          <p className='text-text-secondary text-sm sm:text-lg max-w-xl mx-auto'>Have a question, suggestion, or need help? We&apos;d love to hear from you.</p>
        </div>
      </section>

      <div className='max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-16 flex flex-col lg:flex-row gap-8 sm:gap-12'>
        {/* Form */}
        <div className='flex-1'>
          <form onSubmit={handleSubmit} className='bg-white rounded-2xl sm:rounded-3xl border border-border shadow-sm p-6 sm:p-10 space-y-5 sm:space-y-6'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6'>
              <div className='space-y-2'>
                <label className='text-sm font-bold text-text-primary'>Full Name</label>
                <input
                  required
                  type='text'
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder='Your name'
                  className='w-full px-5 py-3.5 rounded-xl border border-border bg-surface focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm'
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-bold text-text-primary'>Email Address</label>
                <input
                  required
                  type='email'
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder='you@example.com'
                  className='w-full px-5 py-3.5 rounded-xl border border-border bg-surface focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm'
                />
              </div>
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-bold text-text-primary'>Subject</label>
              <select
                required
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                className='w-full px-5 py-3.5 rounded-xl border border-border bg-surface focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm'
              >
                <option value=''>Select a topic</option>
                <option>General Inquiry</option>
                <option>Bug Report</option>
                <option>Feature Request</option>
                <option>Account Issue</option>
                <option>Report a Problem</option>
                <option>Partnership</option>
                <option>Other</option>
              </select>
            </div>

            <div className='space-y-2'>
              <div className='flex justify-between'>
                <label className='text-sm font-bold text-text-primary'>Message</label>
                <span className='text-xs text-text-muted'>{charCount}/1000</span>
              </div>
              <textarea
                required
                maxLength={1000}
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                rows={6}
                placeholder='Tell us what you need help with...'
                className='w-full px-5 py-3.5 rounded-xl border border-border bg-surface focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm resize-none'
              />
            </div>

            {error && (
              <div className='rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
                {error}
                {error.toLowerCase().includes('login') && (
                  <button type='button' onClick={() => router.push('/login')} className='ml-2 underline font-bold'>
                    Go to Login
                  </button>
                )}
              </div>
            )}

            <button
              type='submit'
              disabled={submitting}
              className='w-full bg-primary text-white py-4 rounded-full font-black uppercase tracking-widest text-sm shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60'
            >
              {submitting ? 'Sending...' : 'Send Message'}
              <span className='material-symbols-outlined text-lg'>arrow_forward</span>
            </button>
          </form>
        </div>

        {/* Sidebar */}
        <aside className='w-full lg:w-80 shrink-0 space-y-6'>
          <div className='bg-white rounded-3xl p-8 border border-border shadow-sm'>
            <h4 className='font-black text-text-primary mb-6'>Contact Information</h4>
            <div className='space-y-5'>
              <div className='flex items-start gap-3'>
                <span className='material-symbols-outlined text-primary mt-0.5'>mail</span>
                <div>
                  <p className='text-sm font-bold text-text-primary'>Email</p>
                  <a href='mailto:star.international.sgi@gmail.com' className='text-sm text-primary hover:underline'>star.international.sgi@gmail.com</a>
                </div>
              </div>
              <div className='flex items-start gap-3'>
                <span className='material-symbols-outlined text-primary mt-0.5'>location_on</span>
                <div>
                  <p className='text-sm font-bold text-text-primary'>Location</p>
                  <p className='text-sm text-text-secondary'>IT Center, NTU, Faisalabad</p>
                </div>
              </div>
              <div className='flex items-start gap-3'>
                <span className='material-symbols-outlined text-primary mt-0.5'>schedule</span>
                <div>
                  <p className='text-sm font-bold text-text-primary'>Office Hours</p>
                  <p className='text-sm text-text-secondary'>8:00 AM - 10:00 PM</p>
                </div>
              </div>
              <div className='flex items-start gap-3'>
                <span className='material-symbols-outlined text-primary mt-0.5'>history</span>
                <div>
                  <p className='text-sm font-bold text-text-primary'>Response Time</p>
                  <p className='text-sm text-text-secondary'>Within 24 hours</p>
                </div>
              </div>
            </div>
          </div>

          <div className='bg-primary rounded-3xl p-8 text-white'>
            <h4 className='font-black mb-3'>Need immediate help?</h4>
            <p className='text-white/80 text-sm mb-6'>Check our FAQ for instant answers to common questions.</p>
            <Link href='/faq' className='block w-full text-center bg-white text-primary py-3 rounded-full font-bold text-sm hover:bg-surface transition-all active:scale-95'>
              Browse FAQ
            </Link>
          </div>

          <div className='bg-white rounded-3xl p-8 border border-border shadow-sm'>
            <div className='w-full h-48 bg-surface rounded-2xl overflow-hidden mb-4 border border-border'>
              <iframe
                title="Allpanga Location"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src="https://www.google.com/maps?q=31.408036,73.053886&hl=en&z=16&output=embed"
              />
            </div>
            <p className='text-sm font-bold text-text-primary'>IT Center, NTU</p>
            <p className='text-xs text-text-muted'>31.408036, 73.053886 • Faisalabad, Pakistan</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
