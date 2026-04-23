'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error, reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div className='min-h-screen bg-surface flex flex-col items-center justify-center p-8 relative overflow-hidden'>
      {/* Background decorative icons */}
      <div className='absolute inset-0 pointer-events-none' style={{ backgroundImage: 'radial-gradient(circle, #007f80 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: 0.05 }} />
      <div className='absolute top-1/4 left-1/4 opacity-10 -rotate-12 pointer-events-none'>
        <span className='material-symbols-outlined text-primary' style={{ fontSize: '120px' }}>engineering</span>
      </div>
      <div className='absolute bottom-1/4 right-1/4 opacity-10 rotate-12 pointer-events-none'>
        <span className='material-symbols-outlined text-primary' style={{ fontSize: '160px' }}>settings</span>
      </div>
      <div className='absolute top-1/3 right-1/4 opacity-5 pointer-events-none'>
        <span className='material-symbols-outlined text-primary' style={{ fontSize: '80px' }}>build</span>
      </div>

      {/* Main content */}
      <div className='relative z-10 text-center max-w-lg mx-auto flex flex-col items-center'>
        <div className='mb-8 p-8 rounded-2xl bg-white shadow-lg flex items-center justify-center border border-border'>
          <span className='material-symbols-outlined text-primary' style={{ fontSize: '96px' }}>construction</span>
        </div>

        <h1 className='text-3xl md:text-4xl font-black tracking-tight text-text-primary mb-4'>
          Something went wrong
        </h1>
        <p className='text-text-secondary text-lg leading-relaxed mb-10 max-w-md'>
          Our team has been notified and is working to fix this. This is not your fault.
        </p>

        <div className='flex flex-col sm:flex-row gap-4 mb-8 w-full justify-center'>
          <button
            onClick={reset}
            className='px-10 py-4 rounded-full bg-primary text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95'
          >
            Try Again
          </button>
          <Link href='/' className='px-10 py-4 rounded-full border-2 border-border text-text-secondary font-bold text-lg hover:bg-surface transition-all active:scale-95 text-center'>
            Go Home
          </Link>
        </div>

        <p className='text-sm text-text-muted font-medium'>
          If this keeps happening contact us at{' '}
          <a className='text-primary hover:underline underline-offset-4' href='mailto:star.international.sgi@gmail.com'>
            star.international.sgi@gmail.com
          </a>
        </p>
      </div>
    </div>
  )
}
