'use client'

import React from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

interface SlotRequestModalProps {
  open: boolean
  onClose: () => void
  slotLimit: number
  slotUsed: number
  requestedSlotLimit: number
  setRequestedSlotLimit: (val: number) => void
  slotRequestReason: string
  setSlotRequestReason: (val: string) => void
  loading: boolean
  onSubmit: () => void
}

export function SlotRequestModal({
  open,
  onClose,
  slotLimit,
  slotUsed,
  requestedSlotLimit,
  setRequestedSlotLimit,
  slotRequestReason,
  setSlotRequestReason,
  loading,
  onSubmit
}: SlotRequestModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request More Listing Slots"
      size="lg"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Current Limit</p>
            <p className="text-2xl font-black text-text-primary mt-1">{slotLimit}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Used Slots</p>
            <p className="text-2xl font-black text-text-primary mt-1">{slotUsed}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">Requested total listing slots</label>
          <input
            type="number"
            min={slotLimit + 1}
            value={requestedSlotLimit}
            onChange={(e) => setRequestedSlotLimit(Number(e.target.value || 0))}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">Reason</label>
          <textarea
            value={slotRequestReason}
            onChange={(e) => setSlotRequestReason(e.target.value)}
            rows={4}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none resize-none"
            placeholder="Explain why you need more listing slots."
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button variant="outline" fullWidth onClick={onClose} className="order-2 sm:order-1">
            Cancel
          </Button>
          <Button fullWidth loading={loading} onClick={onSubmit} className="order-1 sm:order-2">
            Submit Request
          </Button>
        </div>
      </div>
    </Modal>
  )
}
