'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

interface ListingRatingActionProps {
  listingId: string
  sellerId: string
  sellerName: string
  hasRated: boolean
}

export function ListingRatingAction({
  listingId,
  sellerId,
  sellerName,
  hasRated,
}: ListingRatingActionProps) {
  const [open, setOpen] = useState(false)
  const [score, setScore] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [alreadyRated, setAlreadyRated] = useState(hasRated)
  const router = useRouter()

  const handleSubmit = async () => {
    if (submitting) return
    if (score < 1 || score > 5) {
      toast.error('Please select a rating between 1 and 5')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: sellerId,
          listing_id: listingId,
          score,
        }),
      })

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login'
          return
        }
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to submit rating')
      }

      setAlreadyRated(true)
      setOpen(false)
      toast.success('Rating submitted')
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || 'Unable to submit rating')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        variant={alreadyRated ? 'outline' : 'secondary'}
        fullWidth
        className="mt-3"
        disabled={alreadyRated}
        onClick={() => setOpen(true)}
      >
        <span className="material-symbols-outlined text-[18px]">star</span>
        {alreadyRated ? 'Already Rated' : 'Rate Seller'}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Rate ${sellerName}`} size="md">
        <div className="space-y-5">
          <p className="text-sm text-text-secondary">
            Share your rating using stars only.
          </p>

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
