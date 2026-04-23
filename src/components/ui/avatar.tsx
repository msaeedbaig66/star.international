import { cn } from '@/lib/utils'
import Image from 'next/image'
import { getOptimizedImageUrl } from '@/lib/cloudinary'

type AvatarSize = 'xs'|'sm'|'md'|'lg'|'xl'

const sizes: Record<AvatarSize,{container:string;text:string;px:number}> = {
 xs:{ container:'w-6 h-6', text:'text-xs', px:24 },
 sm:{ container:'w-8 h-8', text:'text-xs', px:32 },
 md:{ container:'w-10 h-10', text:'text-sm', px:40 },
 lg:{ container:'w-14 h-14', text:'text-base', px:56 },
 xl:{ container:'w-20 h-20', text:'text-xl', px:80 },
}

export function Avatar({ src, alt='avatar', fallback, size='md', className }: {
 src?: string|null; alt?: string; fallback?: string; size?: AvatarSize; className?: string
}) {
 const s = sizes[size]
 const initials = fallback?.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?'
 return (
 <div className={cn('relative rounded-full overflow-hidden bg-primary-light flex-shrink-0', s.container, className)}>
 {src ? (
 <Image 
   src={getOptimizedImageUrl(src, s.px, s.px)} 
   alt={alt} 
   fill 
   className='object-cover' 
   sizes={`${s.px}px`} 
 />
 ) : (
 <span className={cn('flex items-center justify-center w-full h-full font-semibold text-primary', s.text)}>{initials}</span>
 )}
 </div>
 )
}
