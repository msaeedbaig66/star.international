'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

type SectorTypeOption = {
  id: string
  name: string
}

type InstitutionOption = {
  id: string
  name: string
  sector_type_id: string
}

type DepartmentOption = {
  id: string
  name: string
  institution_id: string
}

export default function SignupPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    sectorTypeId: '',
    institutionId: '',
    departmentId: '',
    password: '',
    confirmPassword: '',
    terms: false,
  })

  const [sectorTypes, setSectorTypes] = useState<SectorTypeOption[]>([])
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([])
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  
  const [loadingSectors, setLoadingSectors] = useState(true)
  const [loadingUnis, setLoadingUnis] = useState(false)
  const [loadingDepts, setLoadingDepts] = useState(false)
  const [optionsError, setOptionsError] = useState<string | null>(null)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendTimer, setResendTimer] = useState(0)

  // 1. Initial Load: Sector Types
  useEffect(() => {
    let mounted = true
    const loadSectors = async () => {
      setLoadingSectors(true)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
      
      try {
        const res = await fetch('/api/academic-structure', { signal: controller.signal })
        clearTimeout(timeoutId)
        if (!res.ok) throw new Error('Could not connect to academic server')
        const json = await res.json()
        if (mounted) {
          if (json.data?.sector_types && json.data.sector_types.length > 0) {
            setSectorTypes(json.data.sector_types)
          } else {
            console.warn('No sectors found')
            // Don't set error here yet, maybe list is just empty
          }
        }
      } catch (err: any) {
        if (mounted) {
           setError('Could not load academic data. Please check your internet connection or refresh the page.')
           console.error('Failed to load sectors:', err)
        }
      } finally {
        if (mounted) setLoadingSectors(false)
      }
    }
    loadSectors()
    return () => { mounted = false }
  }, [])

  // 2. Dynamic Universities
  useEffect(() => {
    if (!formData.sectorTypeId) {
      setInstitutions([])
      return
    }
    const loadUnis = async () => {
      setLoadingUnis(true)
      setOptionsError(null)
      try {
        const res = await fetch(`/api/academic-structure?sector_type_id=${formData.sectorTypeId}`)
        if (!res.ok) throw new Error('Failed to load universities')
        const json = await res.json()
        if (json.data?.institutions) setInstitutions(json.data.institutions)
      } catch (err: any) {
        setOptionsError(err.message)
      } finally {
        setLoadingUnis(false)
      }
    }
    loadUnis()
  }, [formData.sectorTypeId])

  // 3. Dynamic Departments
  useEffect(() => {
    if (!formData.institutionId) {
      setDepartments([])
      return
    }
    const loadDepts = async () => {
      setLoadingDepts(true)
      setOptionsError(null)
      try {
        const res = await fetch(`/api/academic-structure?institution_id=${formData.institutionId}`)
        if (!res.ok) throw new Error('Failed to load departments')
        const json = await res.json()
        if (json.data?.departments) setDepartments(json.data.departments)
      } catch (err: any) {
        setOptionsError(err.message)
      } finally {
        setLoadingDepts(false)
      }
    }
    loadDepts()
  }, [formData.institutionId])

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
    if (/[!@#$%^&*(),.?":{}|<>_\-\\[\]\\/`~+=;]/.test(pwd)) score += 1
    return score
  }

  const strengthScore = calculatePasswordStrength(formData.password)
  const strengthLabel = strengthScore >= 4 ? 'Strong' : strengthScore >= 2 ? 'Fair' : strengthScore === 1 ? 'Weak' : ''
  const strengthColor = strengthScore >= 4 ? 'bg-primary' : strengthScore >= 2 ? 'bg-amber-500' : 'bg-red-500'

  const passwordsMatch = !formData.confirmPassword || formData.password === formData.confirmPassword

  const isBasicsFilled =
    formData.firstName &&
    formData.lastName &&
    formData.email &&
    formData.sectorTypeId &&
    formData.institutionId &&
    formData.departmentId &&
    formData.password &&
    formData.terms &&
    !loading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;

    if (!formData.firstName.trim()) return setError('First name is required')
    if (formData.firstName.length > 50) return setError('First name is too long (max 50 chars)')
    if (!formData.lastName.trim()) return setError('Last name is required')
    if (formData.lastName.length > 50) return setError('Last name is too long (max 50 chars)')
    if (!formData.email.trim()) return setError('Email is required')
    if (!emailRegex.test(formData.email.trim())) return setError('Please enter a valid email address')
    if (formData.phoneNumber && !phoneRegex.test(formData.phoneNumber.trim())) {
      return setError('Please enter a valid phone number (e.g. +92300...)')
    }
    if (!formData.sectorTypeId) return setError('Please select a sector')
    if (!formData.institutionId) return setError('Please select an institute')
    if (!formData.departmentId) return setError('Please select a department')
    if (formData.password.length < 8) return setError('Password must be at least 8 characters')
    if (!passwordsMatch) return setError('Passwords do not match')
    if (!formData.terms) return setError('Please agree to the terms')

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          phone_number: formData.phoneNumber.trim() || '',
          email: formData.email.trim(),
          sector_type_id: formData.sectorTypeId,
          institution_id: formData.institutionId,
          department_id: formData.departmentId,
          password: formData.password,
          confirm_password: formData.confirmPassword,
          terms: formData.terms,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(result?.error?.message || result?.error || 'Signup failed')
        return
      }

      setSignupSuccess(true)
      toast.success('Registration successful! Please check your email.')
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0 || resending) return
    if (!formData.email) {
      toast.error('Email is missing. Please sign up again.')
      return
    }

    setResending(true)
    try {
      const response = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim() }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(result?.error || 'Could not resend verification email. Please try again.')
        return
      }

      toast.success('Verification email resent!')
      setResendTimer(60)
    } catch {
      toast.error('Could not resend verification email. Please try again.')
    } finally {
      setResending(false)
    }
  }

  const handleGoogleSignup = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      toast.error('Could not connect to Google')
      setError(error.message)
    }
  }

  if (signupSuccess) {
    return (
      <div className="bg-surface min-h-screen flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-[480px] rounded-2xl shadow-2xl p-8 border border-primary/10 text-center animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl font-bold">mail</span>
          </div>
          <h2 className="text-3xl font-black mb-4">Verification Sent!</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            We sent a verification link to <span className="font-bold text-slate-900">{formData.email}</span>.
            Please check your inbox.
          </p>
          <button
            onClick={handleResend}
            disabled={resendTimer > 0 || resending}
            className="w-full h-14 border-2 border-primary text-primary font-bold rounded-full hover:bg-primary/5 transition-all disabled:opacity-50 disabled:border-slate-200 disabled:text-slate-400"
          >
            {resending ? 'Sending...' : resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Email'}
          </button>
          <Link href="/login" className="block mt-6 text-sm font-semibold text-slate-500 hover:text-primary transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white w-full max-w-[560px] rounded-2xl shadow-2xl shadow-primary/5 p-8 border border-primary/10">
        <div className="mb-8 text-center sm:text-left">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create account</h2>
          <p className="text-slate-500 mt-2 text-sm">Join the largest academic marketplace</p>
        </div>

        <div className="space-y-6">
          {/* Social Signup Option */}
          <button
            onClick={handleGoogleSignup}
            className="w-full h-14 bg-white border border-slate-200 hover:border-primary/30 text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md group"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335" />
            </svg>
            Sign up with Google
          </button>

          <p className="text-[10px] text-slate-400 text-center px-4 leading-relaxed">
            <span className="font-bold text-slate-500">Note:</span> If you already have an account, 
            Google will correctly sign you into your main profile. No duplicates will be made.
          </p>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-black uppercase tracking-widest italic">or use email</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>
        </div>

        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5 mt-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                First Name <span className="text-primary">*</span>
              </label>
              <input
                className="w-full h-12 px-5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-slate-400 font-medium"
                placeholder="First name"
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                Last Name <span className="text-primary">*</span>
              </label>
              <input
                className="w-full h-12 px-5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-slate-400 font-medium"
                placeholder="Last name"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-700">
              Phone Number <span className="text-slate-400">(Optional)</span>
            </label>
            <input
              className="w-full h-12 px-5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-slate-400 font-medium"
              placeholder="e.g. +923001234567"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-700">
              Email Address <span className="text-primary">*</span>
            </label>
            <input
              required
              className="w-full h-12 px-5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-slate-400 font-medium"
              placeholder="student@example.com"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                Sector Type <span className="text-primary">*</span>
              </label>
              <select
                value={formData.sectorTypeId}
                disabled={loadingSectors}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all appearance-none disabled:opacity-60 font-medium"
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sectorTypeId: e.target.value,
                    institutionId: '',
                    departmentId: '',
                  }))
                }
              >
                <option value="">{loadingSectors ? 'Loading...' : 'Select sector'}</option>
                {sectorTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                Institute Name <span className="text-primary">*</span>
              </label>
              <select
                value={formData.institutionId}
                disabled={!formData.sectorTypeId || loadingUnis}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all appearance-none disabled:opacity-60 font-medium"
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    institutionId: e.target.value,
                    departmentId: '',
                  }))
                }
              >
                <option value="">
                  {!formData.sectorTypeId
                    ? 'Select sector first'
                    : loadingUnis
                      ? 'Loading...'
                      : institutions.length === 0
                        ? 'No options'
                        : 'Select institute'}
                </option>
                {institutions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                Department <span className="text-primary">*</span>
              </label>
              <select
                value={formData.departmentId}
                disabled={!formData.institutionId || loadingDepts}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all appearance-none disabled:opacity-60 font-medium"
                onChange={(e) => setFormData((prev) => ({ ...prev, departmentId: e.target.value }))}
              >
                <option value="">
                  {!formData.institutionId
                    ? 'Select institute first'
                    : loadingDepts
                      ? 'Loading...'
                      : departments.length === 0
                        ? 'No options'
                        : 'Select department'}
                </option>
                {departments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {optionsError && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-[10px] text-red-600 font-black uppercase tracking-widest">{optionsError}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-700">
              Password <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <input
                name="password"
                className="w-full h-12 px-5 pr-12 rounded-xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-slate-400 font-medium"
                placeholder="Min. 8 characters"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-primary transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>

            {formData.password && (
              <div className="mt-2 animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Security Strength</span>
                  <span
                    className={cn(
                      'text-[9px] font-black uppercase tracking-widest',
                      strengthScore === 3 ? 'text-primary' : strengthScore === 2 ? 'text-amber-500' : 'text-red-500'
                    )}
                  >
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

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-700">
              Confirm Password <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <input
                name="confirm_password"
                className={cn(
                  'w-full h-12 px-5 pr-12 rounded-xl border bg-slate-50 focus:ring-4 outline-none transition-all placeholder:text-slate-400 font-medium',
                  !passwordsMatch ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-primary/10 focus:border-primary'
                )}
                placeholder="Repeat your password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-primary transition-colors"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <span className="material-symbols-outlined text-xl">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
            {!passwordsMatch && formData.confirmPassword && (
              <p className="text-[9px] text-red-500 font-black uppercase tracking-widest px-1">Passwords do not match</p>
            )}
          </div>

          <div className="flex items-start gap-3 mt-4">
            <div className="flex items-center h-5">
              <input
                id="terms"
                className="w-4 h-4 rounded text-primary border-slate-300 focus:ring-primary/20 cursor-pointer"
                type="checkbox"
                checked={formData.terms}
                onChange={(e) => setFormData((prev) => ({ ...prev, terms: e.target.checked }))}
              />
            </div>
            <label htmlFor="terms" className="text-xs text-slate-500 leading-relaxed font-medium cursor-pointer">
              I certify that I am a student and I agree to the{' '}
              <Link className="text-primary font-bold hover:underline" href="/terms" target="_blank" rel="noopener noreferrer">
                Terms
              </Link>{' '}
              and{' '}
              <Link className="text-primary font-bold hover:underline" href="/privacy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </Link>
              .
            </label>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl animate-shake">
              <p className="text-[10px] text-red-600 font-black uppercase tracking-widest">{error}</p>
            </div>
          )}

          <button
            disabled={!isBasicsFilled}
            className="w-full h-14 bg-primary text-white font-black uppercase tracking-[0.2em] rounded-full mt-4 flex items-center justify-center gap-3 hover:bg-primary/95 transition-all shadow-xl shadow-primary/20 hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed group text-xs active:scale-95"
            type="submit"
          >
            {loading ? (
              <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                Create Account
                <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </>
            )}
          </button>
        </form>
      </div>

      <p className="mt-8 text-slate-600 text-sm font-medium">
        Joined us before?
        <Link className="text-primary font-black uppercase tracking-widest text-[11px] ml-2 hover:underline" href="/login">
          Log in here
        </Link>
      </p>
    </>
  )
}
