'use client'

import { useState } from 'react'
import { useSyncListener, SyncActionType } from '@/lib/action-sync'
import { cn } from '@/lib/utils'

interface InteractionCounterProps {
 id: string;
 type: SyncActionType;
 initialCount: number;
 icon: string;
 className?: string;
 iconActive?: boolean;
}

export function InteractionCounter({ 
 id, 
 type, 
 initialCount, 
 icon, 
 className,
 iconActive = false 
}: InteractionCounterProps) {
 const [count, setCount] = useState(initialCount);
 const [active, setActive] = useState(iconActive);

 useSyncListener(type, id, (state, nextCount) => {
 setActive(state);
 if (typeof nextCount === 'number') setCount(nextCount);
 });

 return (
 <span className={cn("flex items-center gap-1.5 transition-colors", active && "text-primary", className)}>
 <span 
 className="material-symbols-outlined text-[16px]" 
 style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
 >
 {icon}
 </span>
 {count}
 </span>
 );
}
