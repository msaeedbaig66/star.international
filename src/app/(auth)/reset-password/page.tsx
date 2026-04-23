'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function ResetPasswordContent() {
 const [password, setPassword] = useState('')
 const [confirmPassword, setConfirmPassword] = useState('')
 const [showPassword, setShowPassword] = useState(false)
 const [loading, setLoading] = useState(false)
 
 const router = useRouter()
 const searchParams = useSearchParams()
 const supabase = createClient()

 // Ensure we have a session or exchange code
 useEffect(() => {
 const code = searchParams.get('code')
 if (code) {
 const handleExchange = async () => {
 const { error } = await supabase.auth.exchangeCodeForSession(code)
 if (error) {
 toast.error('Invalid or expired reset link.')
 router.push('/login')
 }
 }
 handleExchange()
 }
 }, [searchParams, supabase.auth, router])

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

 const handleUpdatePassword = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!passwordsMatch || strengthScore < 1) {
 toast.error('Please ensure your password is strong and both fields match.')
 return
 }
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

 return (
 <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl shadow-primary/5 p-8 border border-primary/10 mx-auto animate-in fade-in slide-in-from-top-5 duration-500">
 <div className="mb-8 text-center sm:text-left">
 <h2 className="text-slate-900 text-3xl font-black leading-tight mb-2">Create new password</h2>
 <p className="text-slate-500 text-sm font-medium">Pick a strong new password to regain access to your account.</p>
 </div>
 
 <form onSubmit={handleUpdatePassword} className="space-y-6">
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">New Password</label>
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
 <span className="material-symbols-outlined text-xl">
 {showPassword ? 'visibility_off' : 'visibility'}
 </span>
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
 <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Confirm Password</label>
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

export default function ResetPasswordPage() {
 return (
 <Suspense fallback={
 <div className="flex justify-center p-10">
 <span className="animate-spin h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full"></span>
 </div>
 }>
 <ResetPasswordContent />
 </Suspense>
 )
}
