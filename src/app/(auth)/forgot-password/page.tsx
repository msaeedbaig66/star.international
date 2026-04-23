'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Suspense } from 'react'

function ForgotPasswordContent() {
 const [pageState, setPageState] = useState<'request' | 'sent' | 'reset'>('request')
 const [email, setEmail] = useState('')
 const [password, setPassword] = useState('')
 const [confirmPassword, setConfirmPassword] = useState('')
 const [showPassword, setShowPassword] = useState(false)
 const [loading, setLoading] = useState(false)
 const [resendTimer, setResendTimer] = useState(0)
 
 const searchParams = useSearchParams()
 const router = useRouter()
 const supabase = createClient()

 // Handle flow state on mount (detect if we're resetting)
 useEffect(() => {
 const checkSession = async () => {
 const { data: { session } } = await supabase.auth.getSession()
 if (session) {
 setPageState('reset')
 }
 }
 
 // Check for "code" (direct link fallback) or existing session (from our new callback)
 const code = searchParams.get('code')
 if (code) {
 const handleExchange = async () => {
 try {
 const { error } = await supabase.auth.exchangeCodeForSession(code)
 if (!error) {
 setPageState('reset')
 } else {
 toast.error('Invalid or expired reset link.')
 setPageState('request')
 }
 } catch (err) {
 setPageState('request')
 }
 }
 handleExchange()
 } else {
 checkSession()
 }
 }, [searchParams, supabase.auth])

 // Resend timer countdown
 useEffect(() => {
 if (resendTimer > 0) {
 const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
 return () => clearTimeout(timer)
 }
 }, [resendTimer])

 const calculatePasswordStrength = (pwd: string) => {
 let score = 0
 if (!pwd) return 0
 if (pwd.length >= 8) score += 1
 if (/[A-Z]/.test(pwd)) score += 1
 if (/[0-9]/.test(pwd)) score += 1
 return score
 }

 const strengthScore = calculatePasswordStrength(password)
 const strengthLabel = strengthScore === 3 ? 'Strong' : strengthScore === 2 ? 'Fair' : strengthScore === 1 ? 'Weak' : ''
 const strengthColor = strengthScore === 3 ? 'bg-primary' : strengthScore === 2 ? 'bg-amber-500' : 'bg-red-500'

 const passwordsMatch = !confirmPassword || password === confirmPassword

 const handleRequestReset = async (e: React.FormEvent) => {
 e.preventDefault()
 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 if (!emailRegex.test(email.trim())) {
 toast.error('Please enter a valid email address')
 return
 }
 setLoading(true)
 try {
 const { error } = await supabase.auth.resetPasswordForEmail(email, {
 redirectTo: `${window.location.origin}/auth/callback?next=/forgot-password`,
 })
 if (error) {
 toast.error(error.message)
 return
 }
 setPageState('sent')
 setResendTimer(60)
 } catch (err) {
 toast.error('An unexpected error occurred.')
 } finally {
 setLoading(false)
 }
 }

 const handleUpdatePassword = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!passwordsMatch || strengthScore < 1) return
 setLoading(true)
 try {
 const { error } = await supabase.auth.updateUser({ password })
 if (error) {
 toast.error(error.message)
 return
 }
 toast.success('Password updated successfully!')
 setTimeout(() => router.push('/login'), 2000)
 } catch (err) {
 toast.error('An unexpected error occurred.')
 } finally {
 setLoading(false)
 }
 }

 if (pageState === 'request') {
 return (
 <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl shadow-primary/5 p-8 border border-primary/10 mx-auto transition-all animate-in fade-in slide-in-from-bottom-5 duration-500">
 <Link href="/login" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-all mb-8 group">
 <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
 Back to login
 </Link>
 <div className="mb-8">
 <h2 className="text-slate-900 text-3xl font-black leading-tight mb-2">Forgot password?</h2>
 <p className="text-slate-500 text-sm font-medium">No worries! Enter your email and we&apos;ll send you a secure link to reset it.</p>
 </div>
 <form onSubmit={handleRequestReset} className="space-y-6">
 <div className="flex flex-col gap-2">
 <label className="text-slate-900 text-[10px] font-black uppercase tracking-widest">Email Address</label>
 <input 
 required
 className="w-full h-13 px-4 rounded-xl bg-slate-50 border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 font-medium" 
 placeholder="student@example.com" 
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 />
 </div>
 <button 
 disabled={loading}
 className="w-full bg-primary hover:bg-primary/95 text-white font-black h-14 rounded-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-primary/20 group disabled:opacity-50" 
 type="submit"
 >
 {loading ? (
 <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></span>
 ) : (
 <>
 Send Reset Link
 <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
 </>
 )}
 </button>
 </form>

 <div className="mt-8 p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
 <div className="flex gap-3">
 <span className="material-symbols-outlined text-slate-400 text-lg">verified_user</span>
 <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
 <span className="text-slate-500 font-bold uppercase tracking-tight">Security Note:</span> This recovery link 
 proves your ownership of the account. It is a one-time use link that expires quickly for your safety.
 </p>
 </div>
 </div>
 </div>
 )
 }

 if (pageState === 'sent') {
 return (
 <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl shadow-primary/5 p-10 border border-primary/10 text-center animate-in zoom-in-95 duration-500 mx-auto">
 <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
 <span className="material-symbols-outlined text-4xl font-black">mark_email_read</span>
 </div>
 <h2 className="text-slate-900 text-3xl font-black mb-4">Check your inbox</h2>
 <p className="text-slate-500 text-sm leading-relaxed mb-10 font-medium">
 We&apos;ve sent a secure reset link to <br /><span className="font-bold text-slate-900 underline decoration-primary decoration-2 underline-offset-4">{email}</span>
 </p>

 <div className="space-y-4 pt-6 border-t border-slate-100">
 <p className="text-xs text-slate-400 font-medium">
 Didn&apos;t receive the email? Check your spam folder or try again below.
 </p>
 <button 
 onClick={handleRequestReset}
 disabled={resendTimer > 0}
 className={cn(
 "h-12 w-full rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all",
 resendTimer > 0 
 ? "bg-slate-50 text-slate-400 cursor-not-allowed" 
 : "bg-primary/5 text-primary hover:bg-primary/10 border border-primary/10"
 )}
 >
 {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend link'}
 </button>
 </div>
 </div>
 )
 }

 if (pageState === 'reset') {
 return (
 <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl shadow-primary/5 p-8 border border-primary/10 mx-auto animate-in fade-in slide-in-from-top-5 duration-500">
 <div className="mb-8 text-center sm:text-left">
 <h2 className="text-slate-900 text-3xl font-black leading-tight mb-2">Almost there!</h2>
 <p className="text-slate-500 text-sm font-medium">Pick a strong new password to regain access to your account.</p>
 </div>
 <form onSubmit={handleUpdatePassword} className="space-y-6">
 <div className="flex flex-col gap-2">
 <label className="text-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-500">New Password</label>
 <div className="relative">
 <input 
 required
 autoFocus
 className="w-full h-13 px-4 pr-12 rounded-xl bg-slate-50 border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-slate-900 font-medium" 
 placeholder="••••••••" 
 type={showPassword ? 'text' : 'password'}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 />
 <button 
 type="button"
 className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
 onClick={() => setShowPassword(!showPassword)}
 >
 <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
 </button>
 </div>

 {password && (
 <div className="mt-2 animate-in fade-in duration-500">
 <div className="flex justify-between items-center mb-1.5">
 <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Strength</span>
 <span className={cn('text-[9px] font-black uppercase tracking-widest', strengthColor.replace('bg-', 'text-'))}>
 {strengthLabel}
 </span>
 </div>
 <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
 <div className={cn('h-full flex-1 transition-all duration-500 rounded-full', strengthScore >= 1 ? strengthColor : 'bg-transparent')} />
 <div className={cn('h-full flex-1 transition-all duration-500 rounded-full', strengthScore >= 2 ? strengthColor : 'bg-transparent')} />
 <div className={cn('h-full flex-1 transition-all duration-500 rounded-full', strengthScore >= 3 ? strengthColor : 'bg-transparent')} />
 </div>
 </div>
 )}
 </div>
 
 <div className="flex flex-col gap-2">
 <label className="text-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-500">Confirm Password</label>
 <input 
 required
 className={cn(
 "w-full h-13 px-4 rounded-xl bg-slate-50 border transition-all outline-none text-slate-900 font-medium focus:ring-4",
 !passwordsMatch ? "border-red-300 focus:ring-red-500/10" : "border-slate-200 focus:ring-primary/10 focus:border-primary"
 )}
 placeholder="••••••••" 
 type="password"
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 />
 </div>

 <button 
 disabled={loading || !passwordsMatch || strengthScore < 1}
 className="w-full bg-primary hover:bg-primary/95 text-white font-black h-15 rounded-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-primary/20 active:scale-[0.98] disabled:opacity-50 mt-4 group" 
 type="submit"
 >
 {loading ? (
 <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></span>
 ) : (
 <>
 Confirm & Reset Password
 <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">check_circle</span>
 </>
 )}
 </button>
 </form>
 </div>
 )
 }

 return null
}

export default function ForgotPasswordPage() {
 return (
 <Suspense fallback={<div className="flex justify-center p-10"><span className="animate-spin h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full"></span></div>}>
 <ForgotPasswordContent />
 </Suspense>
 )
}
