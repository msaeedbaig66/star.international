import { cn } from '@/lib/utils'

export function EmptyState({ icon, title, description, action, className }: {
 icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; className?: string
}) {
 return (
 <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
 {icon && <div className='mb-4 text-text-muted'>{icon}</div>}
 <h3 className='text-lg font-semibold text-text-primary mb-1'>{title}</h3>
 {description && <p className='text-sm text-text-muted max-w-sm mb-4'>{description}</p>}
 {action && <div className='mt-2'>{action}</div>}
 </div>
 )
}
