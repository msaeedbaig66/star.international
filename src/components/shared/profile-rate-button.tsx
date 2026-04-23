'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ProfileRateButtonProps {
  subjectId: string
  subjectName: string
  initialHasRated: boolean
}

export function ProfileRateButton({ subjectId, subjectName, initialHasRated }: ProfileRateButtonProps) {
  const [open, setOpen] = useState(false)
  const [score, setScore] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [hasRated, setHasRated] = useState(initialHasRated)
  const router = useRouter()

  const handleSubmit = async () => {
    if (submitting) return
    if (score < 1 || score > 5) {
      toast.error('Please select 1 to 5 stars')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: subjectId,
          listing_id: null,
          score,
        }),
      })

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login'
          return
        }
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to submit profile rating')
      }

      toast.success('Profile rated successfully')
      setHasRated(true)
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || 'Unable to rate profile')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        disabled={hasRated}
        onClick={() => setOpen(true)}
        className={`px-8 py-3.5 rounded-full font-black uppercase tracking-[0.2em] text-xs transition-all ${
          hasRated
            ? 'bg-surface text-text-muted border border-border cursor-not-allowed'
            : 'bg-white border border-border text-text-primary hover:bg-surface'
        }`}
      >
        {hasRated ? 'Profile Rated' : 'Rate Profile'}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Rate ${subjectName}`} size="md">
        <div className="space-y-5">
          <p className="text-sm text-text-secondary">Select stars only. Written reviews are disabled.</p>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                className="text-3xl leading-none"
                aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: n <= score ? "'FILL' 1" : "'FILL' 0" }}
                >
                  star
                </span>
              </button>
            ))}
            <span className="ml-2 text-sm font-semibold text-text-secondary">{score}/5</span>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              Submit Rating
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
