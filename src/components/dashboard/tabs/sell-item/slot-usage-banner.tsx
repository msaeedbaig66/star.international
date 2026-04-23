'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface SlotUsageBannerProps {
 slotUsed: number
 slotLimit: number
 pendingSlotRequest: any
 reachedSlotLimit: boolean
 onOpenSlotRequest: () => void
}

export function SlotUsageBanner({
 slotUsed,
 slotLimit,
 pendingSlotRequest,
 reachedSlotLimit,
 onOpenSlotRequest
}: SlotUsageBannerProps) {
 return (
 <div
 className={cn(
 'rounded-2xl border px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4',
 reachedSlotLimit ? 'bg-destructive-light/40 border-destructive/30' : 'bg-primary-light/30 border-primary/20'
 )}
 >
 <div>
 <p className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">Listing Slots</p>
 <p className="text-sm font-semibold text-text-primary mt-1">
 Used <span className="font-black">{slotUsed}</span> of <span className="font-black">{slotLimit}</span>
 </p>
 {pendingSlotRequest && (
 <p className="text-xs text-text-secondary mt-1">
 Pending request: {pendingSlotRequest.requested_limit} total slots
 </p>
 )}
 </div>
 <div className="flex items-center gap-3">
 {reachedSlotLimit ? (
 <span className="text-xs font-bold text-destructive">Limit reached</span>
 ) : (
 <span className="text-xs font-bold text-primary">Slots available</span>
 )}
 <Button
 variant="outline"
 onClick={onOpenSlotRequest}
 disabled={!!pendingSlotRequest}
 >
 {pendingSlotRequest ? 'Request Pending' : 'Request More Slots'}
 </Button>
 </div>
 </div>
 )
}
