'use client'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

const sizes = { sm:'max-w-sm', md:'max-w-md', lg:'max-w-lg', xl:'max-w-2xl' }

export function Modal({ open, onClose, title, children, size='md', className }: {
 open:boolean; onClose:()=>void; title?:string; children:React.ReactNode; size?:'sm'|'md'|'lg'|'xl'; className?:string
}) {
 useEffect(() => {
 if (open) document.body.style.overflow = 'hidden'
 else document.body.style.overflow = ''
 return () => { document.body.style.overflow = '' }
 }, [open])
 if (!open) return null
 return (
 <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
 <div className='absolute inset-0 bg-black/50' onClick={onClose} />
 <div className={cn('relative w-full bg-white rounded-lg shadow-lg z-10 max-h-[90vh] overflow-y-auto', sizes[size], className)}>
 {title && (
 <div className='flex items-center justify-between p-5 border-b border-border'>
 <h2 className='text-lg font-semibold text-text-primary'>{title}</h2>
 <button onClick={onClose} className='text-text-muted hover:text-text-primary'>
 <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' /></svg>
 </button>
 </div>
 )}
 <div className='p-5'>{children}</div>
 </div>
 </div>
 )
}
