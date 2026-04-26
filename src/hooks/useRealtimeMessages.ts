import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export type Message = {
 id: string
 thread_id: string
 sender_id: string | null
 content: string
 attachment_url?: string | null
 parent_id?: string | null
 reactions?: Record<string, string[]> | null
 parent?: {
 id: string
 content: string
 sender?: { username: string; full_name: string } | null
 } | null
 created_at: string
 updated_at: string
 is_read: boolean
 sender?: {
 username: string
 avatar_url: string
 full_name: string
 } | null
}

const PAGE_SIZE = 50

export function useRealtimeMessages(threadId: string | null) {
 const [messages, setMessages] = useState<Message[]>([])
 const [loading, setLoading] = useState(true)
 const [loadingOlder, setLoadingOlder] = useState(false)
 const [hasMore, setHasMore] = useState(false)
 const messageIdsRef = useRef<Set<string>>(new Set())
 const channelRef = useRef<RealtimeChannel | null>(null)
 const supabase = useMemo(() => createClient(), [])

 useEffect(() => {
 messageIdsRef.current = new Set(messages.map((message) => message.id))
 }, [messages])

 const activeFetchIdRef = useRef<string | null>(null)

 const fetchInitialMessages = useCallback(async () => {
 if (!threadId) {
 setMessages([])
 setHasMore(false)
 setLoading(false)
 return
 }

 activeFetchIdRef.current = threadId
 setLoading(true)
 try {
 const res = await fetch(`/api/messages/${threadId}?limit=${PAGE_SIZE}`, { cache: 'no-store' })
 const json = await res.json().catch(() => ({}))
 
 // If the user switched threads during the fetch, ignore the result
 if (activeFetchIdRef.current !== threadId) return

 if (!res.ok) {
 throw new Error(json?.error || 'Failed to load messages')
 }
 const rows = Array.isArray(json?.data) ? (json.data as Message[]) : []
 setMessages(rows)
 setHasMore(Boolean(json?.hasMore))
 } catch (error) {
 if (activeFetchIdRef.current === threadId) {
 console.error('Error fetching messages:', error)
 setMessages([])
 setHasMore(false)
 }
 } finally {
 if (activeFetchIdRef.current === threadId) {
 setLoading(false)
 }
 }
 }, [threadId])

 const loadOlder = useCallback(async () => {
 if (!threadId || loadingOlder || !hasMore || messages.length === 0) return
 const cursor = messages[0]?.created_at
 if (!cursor) return

 setLoadingOlder(true)
 try {
 const params = new URLSearchParams({
 limit: String(PAGE_SIZE),
 before: cursor,
 })
 const res = await fetch(`/api/messages/${threadId}?${params.toString()}`, { cache: 'no-store' })
 const json = await res.json().catch(() => ({}))
 if (!res.ok) {
 throw new Error(json?.error || 'Failed to load older messages')
 }
 const rows = Array.isArray(json?.data) ? (json.data as Message[]) : []
 if (rows.length === 0) {
 setHasMore(false)
 return
 }
 setMessages((prev) => {
 const seen = new Set(prev.map((item) => item.id))
 const uniqueOlder = rows.filter((item) => !seen.has(item.id))
 if (uniqueOlder.length === 0) return prev
 return [...uniqueOlder, ...prev]
 })
 setHasMore(Boolean(json?.hasMore))
 } catch (error) {
 console.error('Error loading older messages:', error)
 } finally {
 setLoadingOlder(false)
 }
 }, [hasMore, loadingOlder, messages, threadId])

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let isMounted = true;
    let pollingInterval: ReturnType<typeof setInterval> | null = null;

    const stopPolling = () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };

    const startPolling = () => {
      if (pollingInterval) return;
      console.log('[Realtime] Falling back to polling for thread:', threadId);
      pollingInterval = setInterval(() => {
        if (isMounted && threadId) {
          fetchInitialMessages();
        }
      }, 10000); // Poll every 10s as a fallback
    };

    const connect = () => {
      if (!threadId || !isMounted || typeof document === 'undefined' || document.visibilityState === 'hidden') return;

      if (channel) {
        supabase.removeChannel(channel);
      }

      channel = supabase.channel(`thread:${threadId}`, {
        config: {
          broadcast: { self: false }
        }
      });
      
      channelRef.current = channel;

      channel
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
          async (payload) => {
            const newMessagePayload = payload.new as Message;
            if (!newMessagePayload?.id || messageIdsRef.current.has(newMessagePayload.id)) {
              return;
            }
            
            const { data } = await supabase
              .from('messages')
              .select(`
                id, thread_id, sender_id, content, attachment_url, parent_id, reactions,
                created_at, updated_at, is_read, 
                sender:profiles(username, avatar_url, full_name),
                parent:messages(id, content, sender:profiles(username, full_name))
              `)
              .eq('id', newMessagePayload.id)
              .single();
            
            if (isMounted && data) {
              const normalizedMessage: Message = {
                ...(data as any),
                sender: Array.isArray(data.sender) ? (data.sender[0] ?? null) : (data.sender ?? null),
              };
              setMessages((prev) => {
                if (prev.find(m => m.id === normalizedMessage.id)) return prev;
                
                // Deduplicate against optimistic messages
                const optimisticIndex = prev.findIndex(m => 
                  m.id.startsWith('temp-') && 
                  m.content === normalizedMessage.content && 
                  m.sender_id === normalizedMessage.sender_id
                );
                
                if (optimisticIndex !== -1) {
                  const next = [...prev];
                  next[optimisticIndex] = normalizedMessage;
                  return next;
                }
                
                return [...prev, normalizedMessage];
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
          async (payload) => {
            const updated = payload.new as Message;
            const { data } = await supabase
              .from('messages')
              .select(`
                id, thread_id, sender_id, content, attachment_url, parent_id, reactions,
                created_at, updated_at, is_read, 
                sender:profiles(username, avatar_url, full_name),
                parent:messages(id, content, sender:profiles(username, full_name))
              `)
              .eq('id', updated.id)
              .single();

            if (isMounted && data) {
              const normalized: Message = {
                ...(data as any),
                sender: Array.isArray(data.sender) ? (data.sender[0] ?? null) : (data.sender ?? null),
              };
              setMessages((prev) => prev.map(m => m.id === normalized.id ? normalized : m));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
          (payload) => {
            const deletedId = (payload.old as any)?.id;
            if (isMounted && deletedId) {
              setMessages((prev) => prev.filter(m => m.id !== deletedId));
            }
          }
        )
        .on(
          'broadcast',
          { event: 'reaction' },
          ({ payload }) => {
            if (isMounted) {
              setMessages((prev) => 
                prev.map(m => m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m)
              );
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            stopPolling();
          } else if (status === 'CLOSED' || status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            startPolling();
          }
        });
    };

    const disconnect = () => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
        channelRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchInitialMessages();
        connect();
      } else {
        disconnect();
        stopPolling();
      }
    };

    fetchInitialMessages();
    connect();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      isMounted = false;
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      disconnect();
      stopPolling();
    };
  }, [fetchInitialMessages, supabase, threadId]);

 const addMessage = useCallback((message: Message) => {
 setMessages((prev) => {
 if (prev.find(m => m.id === message.id)) return prev;
 return [...prev, message];
 })
 }, [])
 
 const removeMessage = useCallback((messageId: string) => {
 setMessages((prev) => prev.filter(m => m.id !== messageId))
 }, [])

 const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
 setMessages((prev) => prev.map(m => m.id === messageId ? { ...m, ...updates } : m))
 }, [])

 const sendBroadcast = useCallback((event: string, payload: any) => {
 if (channelRef.current) {
 channelRef.current.send({
 type: 'broadcast',
 event,
 payload
 })
 }
 }, [])
 
 return { messages, setMessages, loading, addMessage, removeMessage, updateMessage, hasMore, loadingOlder, loadOlder, sendBroadcast }
}
