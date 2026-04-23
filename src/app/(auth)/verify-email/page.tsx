'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function VerifyEmailPage() {
 const [email, setEmail] = useState<string | null>(null)
 const [resendTimer, setResendTimer] = useState(0)
 const [loading, setLoading] = useState(false)
 const [checking, setChecking] = useState(true)
 
 const router = useRouter()

 useEffect(() => {
 const getSession = async () => {
 const supabase = createClient()
 const { data: { user } } = await supabase.auth.getUser()
 if (!user) {
 router.push('/login')
 return
 }
 if (user.email_confirmed_at) {
 router.push('/dashboard')
 return
 }
 setEmail(user.email ?? null)
 setChecking(false)
 }
 getSession()
 }, [router])

 useEffect(() => {
 if (resendTimer > 0) {
 const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
 return () => clearTimeout(timer)
 }
 }, [resendTimer])

 const handleResend = async () => {
 if (!email || resendTimer > 0) return
 setLoading(true)
 try {
 const response = await fetch('/api/auth/resend', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ email }),
 })
 
 if (!response.ok) {
 const data = await response.json()
 throw new Error(data.error || 'Failed to resend')
 }

 toast.success('Verification email resent!')
 setResendTimer(60)
 } catch (err: any) {
 toast.error(err.message)
 } finally {
 setLoading(false)
 }
 }

 const handleLogout = async () => {
 const supabase = createClient()
 await supabase.auth.signOut()
 router.push('/login')
 }

 if (checking) {
 return (
 <div className="min-h-screen flex items-center justify-center p-6 bg-surface ">
 <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
 </div>
 )
 }

 return (
 <div className="bg-surface min-h-screen flex items-center justify-center p-6">
 <div className="bg-white w-full max-w-[480px] rounded-xl shadow-xl p-8 border border-primary/10 text-center animate-in zoom-in-95 duration-300">
 <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
 <span className="material-symbols-outlined text-4xl font-bold">mail</span>
 </div>
 
 <h2 className="text-3xl font-bold mb-4 font-headline text-slate-900">Verify your email</h2>
 
 <p className="text-slate-600 mb-8 leading-relaxed font-medium">
 We sent a verification link to <span className="font-bold text-primary">{email}</span>. 
 Please check your inbox to activate your Allpanga account.
 </p>

 <div className="space-y-4">
 <button 
 onClick={handleResend}
 disabled={resendTimer > 0 || loading}
 className="w-full h-14 bg-primary text-white font-black uppercase tracking-[0.2em] rounded-full flex items-center justify-center gap-3 hover:bg-primary/95 transition-all shadow-xl shadow-primary/20 hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed group text-xs active:scale-95"
 >
 {loading ? (
 <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></span>
 ) : resendTimer > 0 ? (
 `Resend in ${resendTimer}s`
 ) : (
 <>
 Resend Email
 <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">send</span>
 </>
 )}
 </button>

 <button 
 onClick={handleLogout}
 className="w-full h-14 border-2 border-slate-200 text-slate-600 font-bold rounded-full hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
 >
 <span className="material-symbols-outlined">logout</span>
 Login with another account
 </button>
 </div>

 <p className="mt-8 text-sm text-slate-500 font-medium">
 Checked your spam folder? If you still haven&apos;t received it, our support team can help.
 </p>
 </div>
 </div>
 )
}
