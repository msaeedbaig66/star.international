'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        window.location.replace('/')
      }
    }
    void checkUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setError('Email is required')
      setLoading(false)
      return
    }
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }
    if (!password) {
      setError('Password is required')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember_me: rememberMe }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result?.error?.message || result?.error || 'Login failed')
        setLoading(false)
        return
      }

      toast.success('Welcome back!')
      setIsSuccess(true)
      router.push('/')
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[480px] bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl shadow-emerald-500/5 p-10 border border-slate-200/50 dark:border-zinc-800/50 mx-auto transition-all duration-500">
      <div className="mb-10 text-center sm:text-left">
        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Login</h2>
        <p className="text-emerald-500 font-bold mt-2 text-sm tracking-widest uppercase">The Allpanga Professional Experience</p>
      </div>

      <div className="space-y-6">
        <form noValidate onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-zinc-500 pl-1">
              Email Identifier
            </label>
            <input
              autoFocus
              className="w-full h-14 px-6 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-white focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 font-bold"
              placeholder="student@university.edu"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center pl-1">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-zinc-500">
                Security Key
              </label>
              <Link className="text-[11px] font-black text-emerald-500 hover:underline underline-offset-4 uppercase tracking-widest" href="/forgot-password">
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <input
                className="w-full h-14 px-6 pr-14 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-white focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 font-bold"
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            disabled={loading || isSuccess}
            className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 disabled:opacity-70 disabled:cursor-not-allowed group active:scale-95"
            type="submit"
          >
            {isSuccess ? (
              <span className="material-symbols-outlined text-white animate-in zoom-in">check_circle</span>
            ) : loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="uppercase tracking-[0.2em] text-xs">Verify & Access</span>
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">bolt</span>
              </>
            )}
          </button>

          {error && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-2xl flex items-start gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-2">
              <span className="material-symbols-outlined text-sm">warning</span>
              <p>{error}</p>
            </div>
          )}
        </form>

        <div className="pt-8 border-t border-slate-100 dark:border-zinc-900 text-center">
          <p className="text-slate-500 dark:text-zinc-500 text-xs font-black uppercase tracking-widest">
            New Prospect?
            <Link className="text-emerald-500 font-black hover:underline underline-offset-4 ml-3" href="/signup">
              Create Identity
            </Link>
          </p>
        </div>
      </div>
    </div>
)
}
