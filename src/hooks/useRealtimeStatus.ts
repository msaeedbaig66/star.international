import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useRealtimeStatus() {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    
    // We can monitor connection state by checking if any channel is joined
    // Supabase JS doesn't have a direct global connection status hook out of the box easily,
    // intercepting system channels or just using a synthetic online/offline listener is easiest.
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);
    
    setIsConnected(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Optionally check if a dummy realtime channel connects successfully
    const channel = supabase.channel('system_status')
    
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true)
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setIsConnected(false)
      }
    })

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      supabase.removeChannel(channel)
    }
  }, [])

  return { isConnected }
}
