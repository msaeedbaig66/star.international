'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface SlotRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currentLimits: {
    listing: number
    community: number
    blog: number
    blog_image: number
  }
}

export function SlotRequestModal({ isOpen, onClose, onSuccess, currentLimits }: SlotRequestModalProps) {
  const [requestType, setRequestType] = useState<'listing' | 'community' | 'blog' | 'blog_image'>('listing')
  const [requestedLimit, setRequestedLimit] = useState<number>(0)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  // Initialize requested limit based on type
  const currentVal = currentLimits[requestType]
  const defaultNext = currentVal + (requestType === 'blog_image' ? 5 : 5)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (requestedLimit <= currentVal) {
      toast.error(`Requested limit must be greater than current (${currentVal})`)
      return
    }

    if (reason.length < 10) {
      toast.error('Please provide a reason (at least 10 characters)')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/slot-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: requestType,
          requested_limit: requestedLimit,
          reason: reason.trim()
        })
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to submit request')

      toast.success('Slot request submitted successfully!')
      onSuccess()
      onClose()
      setReason('')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-border animate-in zoom-in-95 duration-200">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-black text-text-primary tracking-tight">Request More Slots</h2>
              <p className="text-text-secondary text-sm mt-1">Found a limit? Ask for more room to grow.</p>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface transition-colors"
            >
              <span className="material-symbols-outlined text-text-secondary">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type Selection */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['listing', 'community', 'blog', 'blog_image'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setRequestType(type)
                    setRequestedLimit(currentLimits[type] + 5)
                  }}
                  className={cn(
                    "px-3 py-2.5 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border text-center",
                    requestType === type 
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]" 
                      : "bg-surface text-text-secondary border-border hover:border-text-muted"
                  )}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="bg-surface-2/50 rounded-2xl p-4 border border-border/50">
                <div className="flex justify-between items-center text-xs font-bold text-text-secondary uppercase tracking-[0.1em]">
                    <span>Current Limit</span>
                    <span>Requested Limit</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-2xl font-black text-text-muted">{currentVal}</span>
                    <span className="material-symbols-outlined text-text-muted">trending_flat</span>
                    <input 
                      type="number" 
                      value={requestedLimit || ''}
                      onChange={(e) => setRequestedLimit(Number(e.target.value))}
                      className="w-24 text-center text-2xl font-black text-primary bg-transparent outline-none border-b-2 border-primary/20 focus:border-primary transition-colors"
                    />
                </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-text-muted ml-1">
                Why do you need more slots?
              </label>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., I have more items to sell from my graduation..."
                rows={4}
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none"
              />
            </div>

            <button
              disabled={loading}
              className={cn(
                "w-full py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all",
                "bg-primary text-white hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-primary/10"
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                "Send Request"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
