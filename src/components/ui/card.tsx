import { cn } from '@/lib/utils'

export function Card({ className, children, hover, padding='md' }: {
 className?: string; children: React.ReactNode; hover?: boolean; padding?: 'none'|'sm'|'md'|'lg'
}) {
 const pads = { none:'', sm:'p-4', md:'p-5', lg:'p-6' }
 return (
 <div className={cn('bg-white rounded-xl border border-border shadow-sm', hover && 'transition-shadow hover:shadow-xl cursor-pointer', pads[padding], className)}>
 {children}
 </div>
 )
 }

export function CardHeader({ className, children }: { className?:string; children:React.ReactNode }) {
 return <div className={cn('mb-4', className)}>{children}</div>
 }

export function CardTitle({ className, children }: { className?:string; children:React.ReactNode }) {
 return <h3 className={cn('text-lg font-semibold text-text-primary', className)}>{children}</h3>
 }

export function CardContent({ className, children }: { className?:string; children:React.ReactNode }) {
 return <div className={cn('text-text-secondary', className)}>{children}</div>
 }

export function CardFooter({ className, children }: { className?:string; children:React.ReactNode }) {
 return <div className={cn('mt-4 pt-4 border-t border-border', className)}>{children}</div>
 }
