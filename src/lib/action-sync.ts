/**
 * Action State Sync Utility
 * 
 * Provides a lightweight mechanism to synchronize UI states (like, wishlist, follow)
 * across multiple components on the same page using the native DOM event system.
 */

export const SYNC_EVENT = 'allpanga-action-sync';

export type SyncActionType = 'blog-like' | 'listing-wishlist' | 'user-follow';

export interface SyncPayload {
 type: SyncActionType;
 id: string;
 state: boolean;
 count?: number;
}

/**
 * Dispatch a sync event to update all observers
 */
export function dispatchSync(payload: SyncPayload) {
 if (typeof window === 'undefined') return;
 const event = new CustomEvent(SYNC_EVENT, { detail: payload });
 window.dispatchEvent(event);
}

/**
 * Hook to listen for sync events
 */
import { useEffect } from 'react';

export function useSyncListener(
 type: SyncActionType, 
 id: string, 
 onSync: (state: boolean, count?: number) => void
) {
 useEffect(() => {
 if (typeof window === 'undefined') return;

 const handler = (e: any) => {
 const payload = e.detail as SyncPayload;
 if (payload.type === type && payload.id === id) {
 onSync(payload.state, payload.count);
 }
 };

 window.addEventListener(SYNC_EVENT, handler);
 return () => window.removeEventListener(SYNC_EVENT, handler);
 }, [type, id, onSync]);
}
