'use client'

import { toast } from 'sonner'

interface ListingMetaActionsProps {
  title: string
  listingId: string
}

const REPORT_CATEGORIES = ['spam', 'fraudulent', 'misleading', 'inappropriate', 'harassment', 'copyright', 'other'] as const

export function ListingMetaActions({ title, listingId }: ListingMetaActionsProps) {
  const handleShare = async () => {
    const url = window.location.href

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: `Check this item on Allpanga: ${title}`,
          url,
        })
        return
      }

      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Unable to share right now')
    }
  }

  const handleReport = async () => {
    const categoryInput = window
      .prompt(
        'Report category:\nspam | fraudulent | misleading | inappropriate | harassment | copyright | other',
        'other'
      )
      ?.trim()
      .toLowerCase()

    if (!categoryInput) return
    if (!REPORT_CATEGORIES.includes(categoryInput as (typeof REPORT_CATEGORIES)[number])) {
      toast.error('Invalid report category')
      return
    }

    const description = window.prompt('Optional: Add report details (or leave blank).', '')?.trim() || ''

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: 'listing',
          target_id: listingId,
          category: categoryInput,
          description,
          evidence_url: '',
        }),
      })

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login'
          return
        }
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to submit report')
      }

      toast.success('Report submitted successfully')
    } catch (error: any) {
      toast.error(error?.message || 'Unable to submit report')
    }
  }

  return (
    <div className="flex items-center justify-between mt-6 pt-6 border-t border-surface-container-high">
      <button
        onClick={handleShare}
        className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors text-sm font-semibold"
      >
        <span className="material-symbols-outlined text-lg">share</span>
        Share Item
      </button>
      <button
        onClick={handleReport}
        className="flex items-center gap-2 text-on-surface-variant hover:text-error transition-colors text-sm font-semibold"
      >
        <span className="material-symbols-outlined text-lg">report</span>
        Report
      </button>
    </div>
  )
}
