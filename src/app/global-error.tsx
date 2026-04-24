'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body>
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center font-sans">
          <div className="max-w-md w-full bg-white rounded-[2rem] p-12 shadow-xl border border-slate-100 flex flex-col items-center">
            <div className="w-24 h-24 rounded-3xl bg-red-50 flex items-center justify-center mb-8">
              <span className="material-symbols-outlined text-red-500" style={{ fontSize: '48px' }}>
                terminal
              </span>
            </div>
            
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-4 uppercase">
              Critical Error
            </h1>
            
            <p className="text-slate-500 text-lg font-medium leading-relaxed mb-10">
              A serious technical error occurred. Our team has been alerted via Sentry.
            </p>

            <button
              onClick={() => reset()}
              className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
            >
              Recover Application
            </button>
            
            <p className="mt-8 text-slate-400 text-xs font-bold uppercase tracking-widest">
              Error Digest: {error.digest || 'N/A'}
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
