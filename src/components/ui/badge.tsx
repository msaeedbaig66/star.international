import { cn } from '@/lib/utils'

type BadgeVariant = 'default'|'primary'|'secondary'|'success'|'warning'|'destructive'|'outline'

const variants: Record<BadgeVariant,string> = {
 default: 'bg-surface text-text-secondary border border-border',
 primary: 'bg-primary-light text-primary border border-primary/20',
 secondary: 'bg-secondary-light text-secondary border border-secondary/20',
 success: 'bg-success-light text-success border border-success/20',
 warning: 'bg-warning-light text-warning border border-warning/20',
 destructive: 'bg-destructive-light text-destructive border border-destructive/20',
 outline: 'bg-transparent text-text-primary border border-border',
}

export function Badge({ variant='default', className, children }: {
 variant?: BadgeVariant; className?: string; children: React.ReactNode
}) {
 return (
 <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
 {children}
 </span>
 )
}
