import { cn } from '@/lib/utils';

interface PendingBadgeProps {
 count: number;
 className?: string;
}

export function PendingBadge({ count, className }: PendingBadgeProps) {
 if (count <= 0) return null;

 const displayCount = count > 99 ? '99+' : count;

 return (
 <span
 className={cn(
 "flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white shadow-sm ring-2 ring-white",
 count > 10 && "animate-pulse",
 className
 )}
 >
 {displayCount}
 </span>
 );
}
