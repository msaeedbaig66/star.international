import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
 label?: string
 error?: string
 hint?: string
 leftIcon?: React.ReactNode
 rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement,InputProps>(
 ({ label, error, hint, leftIcon, rightIcon, className, id, ...props }, ref) => {
 const inputId = id || label?.toLowerCase().replace(/\s+/g,'-')
 return (
 <div className='flex flex-col gap-1.5 w-full'>
 {label && (
 <label htmlFor={inputId} className='text-sm font-medium text-text-primary'>
 {label}{props.required && <span className='text-destructive ml-1'>*</span>}
 </label>
 )}
 <div className='relative'>
 {leftIcon && <span className='absolute left-3 top-1/2 -translate-y-1/2 text-text-muted'>{leftIcon}</span>}
 <input
 ref={ref} id={inputId}
 className={cn(
 'w-full h-12 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm',
 'text-text-primary placeholder:text-text-muted transition-colors duration-150',
 'hover:border-border-strong',
 'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
 'disabled:bg-surface disabled:text-text-disabled disabled:cursor-not-allowed',
 error && 'border-destructive focus:ring-destructive',
 leftIcon && 'pl-10', rightIcon && 'pr-10', className
 )}
 {...props}
 />
 {rightIcon && <span className='absolute right-3 top-1/2 -translate-y-1/2 text-text-muted'>{rightIcon}</span>}
 </div>
 {error && <p className='text-xs text-destructive'>{error}</p>}
 {hint && !error && <p className='text-xs text-text-muted'>{hint}</p>}
 </div>
 )
 }
)

Input.displayName = 'Input'
