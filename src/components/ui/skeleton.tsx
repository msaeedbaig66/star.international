import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
 return <div className={cn('animate-pulse rounded-md bg-surface-2', className)} />
 }

export function ListingCardSkeleton() {
 return (
 <div className='bg-white rounded-lg border border-border overflow-hidden'>
 <Skeleton className='h-48 w-full rounded-none' />
 <div className='p-4 space-y-2'>
 <Skeleton className='h-4 w-3/4' />
 <Skeleton className='h-4 w-1/2' />
 <Skeleton className='h-6 w-1/3' />
 </div>
 </div>
 )
 }

export function BlogCardSkeleton() {
 return (
 <div className='bg-white rounded-lg border border-border overflow-hidden'>
 <Skeleton className='h-40 w-full rounded-none' />
 <div className='p-4 space-y-2'>
 <Skeleton className='h-4 w-1/4' />
 <Skeleton className='h-5 w-full' />
 <Skeleton className='h-4 w-2/3' />
 </div>
 </div>
 )
}
