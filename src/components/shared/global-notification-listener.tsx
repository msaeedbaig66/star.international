'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function GlobalNotificationListener() {
 const [userId, setUserId] = useState<string | null>(null)
 const router = useRouter()

 useEffect(() => {
 const fetchUser = async () => {
 const supabase = createClient()
 const { data: { user } } = await supabase.auth.getUser()
 if (user) {
 setUserId(user.id)
 }
 }
 fetchUser()
 }, [])

 useEffect(() => {
 if (!userId) return

 const supabase = createClient()
 const channel = supabase
 .channel(`global-notifications-${userId}`)
 .on(
 'postgres_changes',
 {
 event: 'INSERT',
 schema: 'public',
 table: 'notifications',
 filter: `user_id=eq.${userId}`,
 },
 (payload) => {
 const newNotification = payload.new as Record<string, any> | undefined
 if (!newNotification) return

 // Show a professional toast notification
 toast.message(
 <div className="flex flex-col gap-1 w-full relative">
 <div className="flex items-center gap-2">
 <span className="material-symbols-outlined text-primary text-[18px]">
 {newNotification.type === 'message' ? 'forum' : 'notifications_active'}
 </span>
 <span className="font-bold text-slate-900 text-sm">New Notification</span>
 </div>
 <p className="text-slate-600 text-xs leading-relaxed line-clamp-2 mt-1">
 {newNotification.message || 'You have a new notification'}
 </p>
 <button 
 onClick={() => router.push('/dashboard?tab=notifications')}
 className="mt-2 w-fit px-3 py-1.5 rounded-lg bg-surface hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest transition-colors"
 >
 View
 </button>
 </div>
 , {
 duration: 8000,
 })
 }
 )
 .subscribe()

 return () => {
 supabase.removeChannel(channel)
 }
 }, [userId, router])

 return null
}
