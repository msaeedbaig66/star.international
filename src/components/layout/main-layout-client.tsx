'use client'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'


export function MainLayoutClient({ 
  navbar, 
  children, 
  footer 
}: { 
  navbar: ReactNode
  children: ReactNode
  footer: ReactNode 
}) {
  const pathname = usePathname()
  const isDashboard = pathname.startsWith('/dashboard')
  
  return (
    <div className={cn('flex flex-col', isDashboard ? 'h-screen overflow-hidden' : 'min-h-screen')}>
      {!isDashboard && navbar}
      <main className={cn('flex-1', isDashboard ? 'overflow-hidden relative' : '')}>
        {children}
      </main>
      {!isDashboard && footer}
    </div>
  )
}
