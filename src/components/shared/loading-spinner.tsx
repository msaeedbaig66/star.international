import { cn } from '@/lib/utils'

export function LoadingSpinner({ className, size='md' }: { className?:string; size?:'sm'|'md'|'lg' }) {
 const sizes = { sm:'w-4 h-4', md:'w-6 h-6', lg:'w-8 h-8' }
 return <div className={cn('border-2 border-border border-t-primary rounded-full animate-spin', sizes[size], className)} />
 }

export function PageLoader() {
 return (
 <div className='min-h-screen flex items-center justify-center'><LoadingSpinner size='lg' /></div>
 )
}
