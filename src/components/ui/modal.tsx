'use client'

import { cn } from '@/lib/utils'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

const sizes = { sm:'max-w-sm', md:'max-w-md', lg:'max-w-lg', xl:'max-w-2xl' }

export function Modal({ open, onClose, title, children, size='md', className }: {
  open:boolean; onClose:()=>void; title?:string; children:React.ReactNode; size?:'sm'|'md'|'lg'|'xl'; className?:string
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className='fixed inset-0 z-[10000] flex items-center justify-center p-4'>
      {/* Backdrop */}
      <div 
        className='absolute inset-0 bg-black/60 backdrop-blur-sm' 
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div className={cn(
        'relative w-full bg-white rounded-2xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200', 
        sizes[size], 
        className
      )}>
        {title && (
          <div className='flex items-center justify-between p-6 border-b border-border'>
            <h2 className='text-xl font-bold text-text-primary tracking-tight'>{title}</h2>
            <button 
              onClick={onClose} 
              className='w-10 h-10 rounded-full flex items-center justify-center text-text-muted hover:bg-surface-variant hover:text-text-primary transition-colors'
            >
              <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>
        )}
        <div className='p-6'>{children}</div>
      </div>
    </div>,
    document.body
  )
}
