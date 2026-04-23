'use client'
import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary'|'secondary'|'outline'|'ghost'|'destructive'|'link'
type Size = 'sm'|'md'|'lg'|'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
 variant?: Variant
 size?: Size
 loading?: boolean
 fullWidth?: boolean
}

const variants: Record<Variant,string> = {
 primary: 'bg-primary text-white hover:bg-primary-hover active:scale-[0.98]',
 secondary: 'bg-secondary text-white hover:bg-secondary/90 active:scale-[0.98]',
 outline: 'border border-border bg-white text-text-primary hover:bg-surface active:scale-[0.98]',
 ghost: 'bg-transparent text-text-secondary hover:bg-surface hover:text-text-primary',
 destructive: 'bg-destructive text-white hover:bg-destructive/90 active:scale-[0.98]',
 link: 'bg-transparent text-primary underline-offset-4 hover:underline p-0 h-auto',
}

const sizes: Record<Size,string> = {
 sm: 'h-8 px-3 text-sm rounded-full',
 md: 'h-10 px-6 text-sm rounded-full',
 lg: 'h-12 px-8 text-base rounded-full',
 icon: 'h-10 w-10 rounded-full',
}

export const Button = forwardRef<HTMLButtonElement,ButtonProps>(
 ({ variant='primary', size='md', loading, fullWidth, className, children, disabled, ...props }, ref) => (
 <button
 ref={ref}
 disabled={disabled || loading}
 className={cn(
 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150',
 'disabled:opacity-50 disabled:pointer-events-none',
 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
 variants[variant], sizes[size],
 fullWidth && 'w-full', className
 )}
 {...props}
 >
 {loading && <span className='w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin' />}
 {children}
 </button>
 )
)

Button.displayName = 'Button'
