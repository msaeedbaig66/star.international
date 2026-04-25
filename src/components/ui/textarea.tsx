import { cn } from '@/lib/utils'
import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className='flex flex-col gap-1.5 w-full'>
        {label && (
          <label htmlFor={inputId} className='text-sm font-medium text-text-primary'>
            {label}{props.required && <span className='text-destructive ml-1'>*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full min-h-[100px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm',
            'text-text-primary placeholder:text-text-muted transition-colors duration-150',
            'hover:border-border-strong',
            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
            'disabled:bg-surface disabled:text-text-disabled disabled:cursor-not-allowed',
            'resize-y',
            error && 'border-destructive focus:ring-destructive',
            className
          )}
          {...props}
        />
        {error && <p className='text-xs text-destructive'>{error}</p>}
        {hint && !error && <p className='text-xs text-text-muted'>{hint}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
